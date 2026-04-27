import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, Unlock, Key, Eye, EyeOff, Copy, Search, Plus, 
  Trash2, Globe, Shield, RefreshCw, Check, X, AlertTriangle, ExternalLink,
  Save, Edit2
} from 'lucide-react';
import { 
  collection, query, where, onSnapshot, addDoc, updateDoc, 
  deleteDoc, doc, serverTimestamp, getDocs
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { 
  deriveKey, encryptData, decryptData, generateRandomSalt 
} from '../lib/cryptoUtils';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

// --- Types ---
interface PasswordEntry {
  id: string;
  name: string; // encrypted
  username: string; // encrypted
  password: string; // encrypted
  url: string; // encrypted
  note: string; // encrypted
  category: string; // encrypted
  userId: string;
  createdAt: any;
  updatedAt: any;
}

interface DecryptedEntry {
  id: string;
  name: string;
  username: string;
  password: string;
  url: string;
  note: string;
  category: string;
  createdAt: any;
}

interface VaultConfig {
  id: string;
  validationString: string; // encrypted "VALID"
  salt: string; // plaintext salt
  userId: string;
}

// --- Constants ---
const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes


enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function Passwords() {
  const { user } = useAuth();
  const [isLocked, setIsLocked] = useState(true);
  const [masterPassword, setMasterPassword] = useState('');
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [config, setConfig] = useState<VaultConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Decrypted data
  const [passwords, setPasswords] = useState<DecryptedEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    url: '',
    note: '',
    category: ''
  });

  // UI state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DecryptedEntry | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Generator state
  const [genLength, setGenLength] = useState(16);
  const [genSpecial, setGenSpecial] = useState(true);
  const [genNumbers, setGenNumbers] = useState(true);

  // Timeout handling
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!user) return;

    // Load Vault Config
    const q = query(collection(db, 'vaultConfigs'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        setConfig({ id: snapshot.docs[0].id, ...docData } as VaultConfig);
      } else {
        setConfig(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Load Entries Effect
  useEffect(() => {
    if (isLocked || !cryptoKey || !user) {
      setPasswords([]);
      return;
    }

    setIsRefreshing(true);
    const q = query(collection(db, 'passwords'), where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const decryptedData: DecryptedEntry[] = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as PasswordEntry;
        try {
          const entry: DecryptedEntry = {
            id: docSnap.id,
            name: await decryptData(data.name, cryptoKey),
            username: await decryptData(data.username, cryptoKey),
            password: await decryptData(data.password, cryptoKey),
            url: data.url ? await decryptData(data.url, cryptoKey) : '',
            note: data.note ? await decryptData(data.note, cryptoKey) : '',
            category: data.category ? await decryptData(data.category, cryptoKey) : '',
            createdAt: data.createdAt
          };
          decryptedData.push(entry);
        } catch (err) {
          console.error('Error decrypting entry:', docSnap.id, err);
        }
      }
      
      setPasswords(decryptedData);
      setIsRefreshing(false);
    }, (err) => {
      console.error('Firestore listener error:', err);
      setError('Fehler beim Laden der Einträge.');
      setIsRefreshing(false);
    });

    return () => unsubscribe();
  }, [isLocked, cryptoKey, user]);

  // Activity timer
  useEffect(() => {
    if (isLocked) return;

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    const interval = setInterval(() => {
      if (Date.now() - lastActivityRef.current > SESSION_TIMEOUT) {
        lockVault();
      }
    }, 10000);

    return () => {
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      clearInterval(interval);
    };
  }, [isLocked]);

  const lockVault = () => {
    setIsLocked(true);
    setCryptoKey(null);
    setMasterPassword('');
    setPasswords([]);
    setError(null);
  };

  const handleCreateVault = async () => {
    if (!user || masterPassword.length < 8) {
      setError('Master-Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }

    try {
      setLoading(true);
      const salt = generateRandomSalt();
      const key = await deriveKey(masterPassword, salt);
      const validationString = await encryptData('VALID', key);

      await addDoc(collection(db, 'vaultConfigs'), {
        userId: user.uid,
        salt,
        validationString,
        updatedAt: serverTimestamp()
      });

      setCryptoKey(key);
      setIsLocked(false);
      setMasterPassword('');
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.name === 'FirebaseError') {
        handleFirestoreError(err, OperationType.CREATE, 'vaultConfigs');
      }
      setError('Fehler beim Initialisieren des Vaults.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!config || !masterPassword) return;

    try {
      setLoading(true);
      setError(null);
      const key = await deriveKey(masterPassword, config.salt);
      
      try {
        const decrypted = await decryptData(config.validationString, key);
        if (decrypted === 'VALID') {
          setCryptoKey(key);
          setIsLocked(false);
          setMasterPassword('');
        } else {
          setError('Falsches Master-Passwort.');
        }
      } catch {
        setError('Falsches Master-Passwort.');
      }
    } catch (err) {
      console.error(err);
      setError('Fehler beim Entsperren.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
      // Clear clipboard after 30s as requested
      setTimeout(() => {
        navigator.clipboard.writeText('');
      }, 30000);
    }, 2000);
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    const syms = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
    
    let pool = chars;
    if (genNumbers) pool += nums;
    if (genSpecial) pool += syms;
    
    let result = '';
    for (let i = 0; i < genLength; i++) {
      result += pool.charAt(Math.floor(Math.random() * pool.length));
    }
    setFormData(prev => ({ ...prev, password: result }));
  };

  const handleOpenAddModal = (entry: DecryptedEntry | null = null) => {
    if (entry) {
      setEditingEntry(entry);
      setFormData({
        name: entry.name,
        username: entry.username,
        password: entry.password,
        url: entry.url,
        note: entry.note,
        category: entry.category
      });
    } else {
      setEditingEntry(null);
      setFormData({
        name: '',
        username: '',
        password: '',
        url: '',
        note: '',
        category: ''
      });
    }
    setShowAddModal(true);
  };

  const saveEntry = async () => {
    if (!user || !cryptoKey) return;
    if (!formData.url || !formData.username || !formData.password) {
      setError('Bitte fülle URL, Benutzername und Passwort aus.');
      return;
    }

    try {
      setLoading(true);
      const encrypted = {
        name: await encryptData(formData.name, cryptoKey),
        username: await encryptData(formData.username, cryptoKey),
        password: await encryptData(formData.password, cryptoKey),
        url: await encryptData(formData.url, cryptoKey),
        note: await encryptData(formData.note, cryptoKey),
        category: await encryptData(formData.category, cryptoKey),
        userId: user.uid,
        updatedAt: serverTimestamp()
      };

      if (editingEntry) {
        try {
          await updateDoc(doc(db, 'passwords', editingEntry.id), encrypted);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `passwords/${editingEntry.id}`);
        }
      } else {
        try {
          await addDoc(collection(db, 'passwords'), {
            ...encrypted,
            createdAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'passwords');
        }
      }

      setShowAddModal(false);
      setEditingEntry(null);
      setFormData({
        name: '',
        username: '',
        password: '',
        url: '',
        note: '',
        category: ''
      });
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Fehler beim Speichern.');
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (id: string) => {
    console.log('deleteEntry called for ID:', id);
    try {
      setError(null);
      await deleteDoc(doc(db, 'passwords', id));
      console.log('Delete successful for ID:', id);
    } catch (err) {
      console.error('Detailed delete error:', err);
      try {
        handleFirestoreError(err, OperationType.DELETE, `passwords/${id}`);
      } catch (wrapperErr) {
        setError('Löschen fehlgeschlagen: Keine Berechtigung oder Datenbankfehler.');
      }
    }
  };

  const filteredPasswords = passwords.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-slate-900 dark:text-white" size={32} />
          <p className="text-brand-muted font-bold text-sm tracking-widest uppercase">Safe wird vorbereitet...</p>
        </div>
      </div>
    );
  }

  // --- RENDERING ---

  if (isLocked) {
    return (
      <div className="max-w-md mx-auto px-6 pt-12 sm:pt-24 flex items-start justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-10 rounded-[2.5rem] flex flex-col items-center gap-8 relative overflow-hidden w-full"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand to-transparent opacity-20" />
          
          <div className="w-20 h-20 flex items-center justify-center text-slate-900 dark:text-white">
            <Lock size={48} strokeWidth={1.5} />
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
              {config ? 'Safe entsperren' : 'Safe einrichten'}
            </h1>
            <p className="text-sm text-brand-muted font-medium px-4">
              {config 
                ? 'Gib dein Master-Passwort ein, um auf deine verschlüsselten Daten zuzugreifen.' 
                : 'Wähle ein starkes Master-Passwort. Es kann nicht wiederhergestellt werden!'}
            </p>
          </div>

          <div className="w-full space-y-4">
            <div className="relative group">
              <input
                type="password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (config ? handleUnlock() : handleCreateVault())}
                placeholder="Master-Passwort"
                className="glass-input w-full pl-12 h-14"
                autoFocus
              />
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted transition-colors group-focus-within:text-brand" size={20} />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold animate-shake">
                <AlertTriangle size={14} />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={config ? handleUnlock : handleCreateVault}
              disabled={!masterPassword}
              className="btn-briefing-glow w-full disabled:opacity-50"
            >
              {config ? 'Entsperren' : 'Vault Erstellen'}
            </button>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-black text-brand-muted/40 uppercase tracking-widest pt-4">
            <Shield size={12} />
            <span>AES-256-GCM Verschlüsselt</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-0 sm:px-0 pb-20">
      <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-8 bg-white/5 p-8 rounded-[3rem] border border-white/5 backdrop-blur-xl">
        <div className="flex items-center gap-4 sm:gap-6 min-w-0 flex-1">
          <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-brand shrink-0">
            <Shield size={32} className="sm:hidden" />
            <Shield size={48} className="hidden sm:block" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-4xl font-black text-brand tracking-tighter mb-1 select-none leading-none break-words">Password Safe</h1>
            <div className="flex items-center gap-2 text-[10px] font-bold text-brand-muted uppercase tracking-widest leading-none">
              <Check size={12} className="text-green-500" />
              <span>Vault Entsperrt</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[10px] font-bold animate-shake">
              <AlertTriangle size={14} />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-2 hover:opacity-70"><X size={12} /></button>
            </div>
          )}
          <div className="relative flex-1 md:w-80">
            <input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input pl-12 h-14 w-full"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" size={20} />
          </div>
          <button 
            onClick={() => handleOpenAddModal()}
            className="btn-briefing-glow h-14 w-14 sm:w-auto sm:px-6 flex items-center justify-center gap-2 shrink-0"
            title="Passwort hinzufügen"
          >
            <Plus size={24} />
            <span className="hidden sm:inline">Hinzufügen</span>
          </button>
          <button 
            onClick={lockVault}
            className="btn-briefing-glow h-14 px-6 flex items-center justify-center gap-3 transition-all"
          >
            <Lock size={16} className="group-hover:animate-bounce" />
            <span>Sperren</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredPasswords.map((entry) => (
            <motion.div
              key={entry.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card group flex flex-col p-6 rounded-[2.5rem] relative overflow-hidden h-fit"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                    {entry.url ? (
                      <img 
                        src={`https://www.google.com/s2/favicons?sz=128&domain=${entry.url.replace(/^https?:\/\//, '')}`} 
                        alt="" 
                        className="w-10 h-10 object-contain rounded-md"
                        onError={(e) => (e.currentTarget.src = 'https://www.google.com/s2/favicons?sz=128&domain=lock.com')}
                      />
                    ) : (
                      <Globe size={32} className="text-brand-muted" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-brand truncate pr-2">{entry.name || entry.url}</h3>
                    <div className="text-[10px] font-bold text-brand-muted uppercase tracking-widest truncate">{entry.category || 'Allgemein'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => handleOpenAddModal(entry)}
                    className="p-2 text-brand-muted hover:text-accent transition-colors rounded-xl hover:bg-accent/5"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(entry.id);
                    }}
                    className="p-2 text-brand-muted hover:text-red-500 transition-colors rounded-xl hover:bg-red-500/5"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-white/40 dark:bg-black/20 rounded-2xl border border-white/5 space-y-4">
                  <div className="space-y-1">
                    <div className="text-[9px] font-black text-brand-muted uppercase tracking-tighter">Benutzername</div>
                    <div className="flex items-center justify-between gap-2 overflow-hidden">
                      <div className="text-sm font-bold text-brand truncate flex-1">{entry.username}</div>
                      <button 
                        onClick={() => handleCopy(entry.username, entry.id + 'user')}
                        className="shrink-0 p-1.5 text-brand-muted hover:text-brand transition-colors"
                      >
                        {copiedId === entry.id + 'user' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 pt-3 border-t border-white/5">
                    <div className="text-[9px] font-black text-brand-muted uppercase tracking-tighter">Passwort</div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-mono font-bold text-brand tracking-widest overflow-hidden truncate">
                        {visiblePasswords[entry.id] ? entry.password : '••••••••••••'}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button 
                          onClick={() => setVisiblePasswords(prev => ({ ...prev, [entry.id]: !prev[entry.id] }))}
                          className="p-1.5 text-brand-muted hover:text-brand transition-colors"
                        >
                          {visiblePasswords[entry.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button 
                          onClick={() => handleCopy(entry.password, entry.id + 'pass')}
                          className="p-1.5 text-brand-muted hover:text-brand transition-colors"
                        >
                          {copiedId === entry.id + 'pass' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {entry.url && (
                  <a 
                    href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-brand/5 hover:bg-brand/10 text-brand dark:text-white rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest border border-accent/10"
                  >
                    <span>Website öffnen</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredPasswords.length === 0 && !searchTerm && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-brand-muted opacity-40">
            <Shield size={64} strokeWidth={1} className="mb-4" />
            <p className="font-bold tracking-tight">Dein Safe ist leer. Füge dein erstes Passwort hinzu.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-[480px] rounded-[3rem] overflow-hidden relative z-10 flex flex-col h-[90vh]"
            >
              <div className="flex justify-between items-center p-8 pb-4 shrink-0">
                <h2 className="text-3xl font-black text-brand tracking-tighter">{editingEntry ? 'Passwort bearbeiten' : 'Neues Passwort'}</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 text-brand-muted hover:text-brand transition-colors"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6 custom-scrollbar">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest px-1">Logo URL / Domain *</label>
                  <input 
                    type="text" 
                    placeholder="google.com" 
                    value={formData.url} 
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    className="glass-input w-full" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest px-1">Bezeichnung</label>
                  <input 
                    type="text" 
                    placeholder="z.B. Google Account" 
                    value={formData.name} 
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="glass-input w-full" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest px-1">Kategorie</label>
                  <input 
                    type="text" 
                    placeholder="Social Media, Arbeit..." 
                    value={formData.category} 
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="glass-input w-full" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest px-1">Benutzername *</label>
                  <input 
                    type="text" 
                    placeholder="Email oder Nutzername" 
                    value={formData.username} 
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="glass-input w-full" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest px-1">Passwort *</label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      placeholder="Sicheres Passwort" 
                      value={formData.password} 
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="glass-input w-full pr-12 font-mono" 
                    />
                    <button 
                      onClick={generatePassword}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-brand/5 rounded-lg text-brand-muted hover:text-brand transition-colors"
                      title="Generieren"
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest px-1">Notiz</label>
                  <textarea 
                    rows={3} 
                    value={formData.note} 
                    onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                    className="glass-input w-full resize-none py-3" 
                  />
                </div>
              </div>

              <div className="flex gap-3 p-5 shrink-0 bg-white/5 backdrop-blur-xl border-t border-white/5">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 btn-red-glow"
                >
                  Abbrechen
                </button>
                <button 
                  onClick={saveEntry}
                  className="flex-[2] btn-green-glow"
                >
                  {editingEntry ? 'Aktualisieren' : 'Speichern'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card w-full max-w-[480px] rounded-[2.5rem] overflow-hidden relative z-10 p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-brand tracking-tight mb-2">Eintrag löschen?</h3>
              <p className="text-sm text-brand-muted mb-8 font-medium">Diese Aktion kann nicht rückgängig gemacht werden.</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 glass-button-secondary"
                >
                  Abbrechen
                </button>
                <button 
                  onClick={() => {
                    deleteEntry(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }}
                  className="flex-1 btn-cancel"
                >
                  Löschen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
