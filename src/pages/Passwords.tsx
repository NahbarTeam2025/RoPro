import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, Unlock, Key, Eye, EyeOff, Copy, Search, Plus, 
  Trash2, Globe, Shield, RefreshCw, Check, X, AlertTriangle, ExternalLink,
  Save, Edit2, ChevronRight
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
  const [selectedEntry, setSelectedEntry] = useState<DecryptedEntry | null>(null);
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-50/50 dark:bg-black/50 backdrop-blur-xl p-4 sm:p-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="glass-card w-full max-w-xl h-fit rounded-[3rem] sm:rounded-[4rem] flex flex-col items-center gap-8 sm:gap-12 relative p-10 sm:p-20 shadow-2xl"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-brand to-transparent opacity-30" />
          
          <div className="w-24 h-24 flex items-center justify-center text-brand dark:text-white bg-brand/5 rounded-full ring-8 ring-accent/20">
            <Lock size={56} strokeWidth={1} className="drop-shadow-glow" />
          </div>

          <div className="text-center space-y-4">
            <h1 className="text-4xl sm:text-5xl font-black text-brand tracking-tighter leading-none">
              {config ? 'SAFE ENTSPERREN' : 'SAFE EINRICHTEN'}
            </h1>
            <p className="text-sm sm:text-base text-brand-muted font-medium px-4 max-w-sm mx-auto leading-relaxed">
              {config 
                ? 'Gib dein Master-Passwort ein, um auf deine verschlüsselten Daten zuzugreifen.' 
                : 'Wähle ein starkes Master-Passwort. Es kann nicht wiederhergestellt werden!'}
            </p>
          </div>

          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-brand-muted uppercase tracking-[0.2em] px-2">Master-Passwort</label>
              <div className="relative group">
                <input
                  type="password"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (config ? handleUnlock() : handleCreateVault())}
                  placeholder="••••••••••••"
                  className="glass-input w-full pl-12 h-16 text-lg tracking-widest transition-all focus:ring-4 focus:ring-accent/50/5"
                  autoFocus
                />
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted transition-colors group-focus-within:text-brand" size={24} />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold"
              >
                <AlertTriangle size={16} />
                <span>{error}</span>
              </motion.div>
            )}

            <button
              onClick={config ? handleUnlock : handleCreateVault}
              disabled={!masterPassword || loading}
              className="btn-green-glow w-full h-16 text-sm font-black uppercase tracking-[0.2em] disabled:opacity-30 flex items-center justify-center gap-3"
            >
              {loading ? (
                <RefreshCw size={20} className="animate-spin" />
              ) : (
                <>
                  <Unlock size={20} />
                  <span>{config ? 'Entsperren' : 'Erstellen'}</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs font-black text-brand-muted/40 uppercase tracking-[0.3em] pt-6 group">
            <Shield size={14} className="group-hover:text-brand transition-colors" />
            <span>AES-256-GCM Verschlüsselt</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 relative z-10 w-full pb-6">
      {/* Sidebar: Password List */}
      <div className={cn(
        "w-full md:w-80 flex-col glass-card rounded-3xl overflow-hidden flex-shrink-0 transition-all",
        selectedEntry || showAddModal ? "hidden md:flex" : "flex h-full"
      )}>
        <div className="p-4 border-b border-slate-200/50 dark:border-white/10 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-tight">Safe</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={lockVault}
                className="p-2 text-brand-muted hover:text-brand transition-all"
                title="Safe sperren"
              >
                <Lock size={18} />
              </button>
              <button 
                onClick={() => handleOpenAddModal()}
                className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl transition-all font-bold flex items-center justify-center"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input pl-10 h-10 w-full text-xs"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredPasswords.length === 0 ? (
            <div className="text-center py-10 px-4">
              <Shield className="mx-auto mb-3 opacity-10" size={40} />
              <div className="text-brand-muted font-bold tracking-tight uppercase text-xs">Keine Einträge</div>
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredPasswords.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className={cn(
                    "w-full text-left px-6 py-4 refined-list-item flex items-center gap-3 transition-all group relative border-l-2 rounded-none",
                    selectedEntry?.id === entry.id 
                      ? "bg-black/[0.03] dark:bg-white/[0.03] border-l-accent" 
                      : "border-l-transparent"
                  )}
                >
                  <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                    {entry.url ? (
                      <img 
                        src={`https://www.google.com/s2/favicons?sz=64&domain=${entry.url.replace(/^https?:\/\//, '')}`} 
                        alt="" 
                        className="w-6 h-6 object-contain rounded-md"
                        onError={(e) => (e.currentTarget.src = 'https://www.google.com/s2/favicons?sz=64&domain=lock.com')}
                      />
                    ) : (
                      <Key size={18} className="text-brand-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn("font-bold truncate tracking-tight text-xs", selectedEntry?.id === entry.id ? "text-brand" : "text-slate-900 dark:text-white")}>
                      {entry.name || entry.url}
                    </div>
                    <div className="text-xs truncate font-medium uppercase tracking-tighter text-brand-muted opacity-70">
                      {entry.category || 'Allgemein'}
                    </div>
                  </div>
                  <ChevronRight size={14} className={cn("shrink-0 transition-opacity", selectedEntry?.id === entry.id ? "text-brand" : "text-brand-muted opacity-0 group-hover:opacity-100")} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Entry Detail or Add/Edit Form */}
      <div className={cn(
        "flex-1 glass-card rounded-3xl overflow-hidden flex-col min-w-0 transition-all h-full",
        !selectedEntry && !showAddModal ? "hidden md:flex" : "flex"
      )}>
        {showAddModal ? (
          <div className="flex-1 flex flex-col h-full p-6 sm:p-10 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-10">
              <button 
                onClick={() => setShowAddModal(false)}
                className="md:hidden p-2 text-brand-muted hover:text-brand"
              >
                <ChevronRight size={24} className="rotate-180" />
              </button>
              <h3 className="text-2xl font-black text-brand tracking-tight">
                {editingEntry ? 'BEARBEITEN' : 'HINZUFÜGEN'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-brand-muted hover:text-brand transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                <X size={24} />
              </button>
            </div>

            <div className="max-w-xl mx-auto w-full space-y-8">
              <div className="space-y-6 text-slate-900 dark:text-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5 text-slate-900 dark:text-white">
                    <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Website / URL *</label>
                    <input 
                      type="text" 
                      placeholder="google.com" 
                      value={formData.url} 
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      className="glass-input w-full h-12 focus:ring-2 focus:ring-accent/50 font-bold" 
                    />
                  </div>
                  <div className="space-y-1.5 text-slate-900 dark:text-white">
                    <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Bezeichnung</label>
                    <input 
                      type="text" 
                      placeholder="z.B. Google Account" 
                      value={formData.name} 
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="glass-input w-full h-12 focus:ring-2 focus:ring-accent/50 font-bold" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5 text-slate-900 dark:text-white">
                    <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Kategorie</label>
                    <input 
                      type="text" 
                      placeholder="Arbeit, Social..." 
                      value={formData.category} 
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="glass-input w-full h-12 focus:ring-2 focus:ring-accent/50 font-bold" 
                    />
                  </div>
                  <div className="space-y-1.5 text-slate-900 dark:text-white">
                    <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Benutzername *</label>
                    <input 
                      type="text" 
                      placeholder="Nutzer oder Email" 
                      value={formData.username} 
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      className="glass-input w-full h-12 focus:ring-2 focus:ring-accent/50 font-bold" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-slate-900 dark:text-white">
                  <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Passwort *</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Sicheres Passwort" 
                      value={formData.password} 
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="glass-input w-full h-12 pr-12 font-mono focus:ring-2 focus:ring-accent/50 font-bold text-sm" 
                    />
                    <button 
                      onClick={generatePassword}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-brand/5 rounded-lg text-brand-muted hover:text-brand transition-colors"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-slate-900 dark:text-white">
                  <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Notiz</label>
                  <textarea 
                    rows={4} 
                    value={formData.note} 
                    onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                    className="glass-input w-full resize-none p-4 focus:ring-2 focus:ring-accent/50 font-bold" 
                  />
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <button onClick={saveEntry} className="w-full btn-green-glow h-14 font-black uppercase tracking-widest">
                    {editingEntry ? 'Aktualisieren' : 'Speichern'}
                  </button>
                  <button onClick={() => setShowAddModal(false)} className="w-full btn-red-glow h-14 font-black uppercase tracking-widest">
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : selectedEntry ? (
          <div className="flex-1 flex flex-col h-full p-6 sm:p-10 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-10">
              <button 
                onClick={() => setSelectedEntry(null)}
                className="md:hidden p-2 text-brand-muted hover:text-brand"
              >
                <ChevronRight size={24} className="rotate-180" />
              </button>
              <h3 className="text-2xl font-black text-brand tracking-tight">DETAILS</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleOpenAddModal(selectedEntry)}
                  className="p-2.5 rounded-xl text-brand-muted hover:text-accent hover:bg-slate-200 dark:hover:bg-white/5 transition-all"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => setDeleteConfirmId(selectedEntry.id)}
                  className="p-2.5 rounded-xl text-brand-muted hover:text-red-500 hover:bg-red-500/10 transition-all font-bold"
                >
                  <Trash2 size={18} />
                </button>
                <button onClick={() => setSelectedEntry(null)} className="p-2 text-brand-muted hover:text-brand transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="max-w-xl mx-auto w-full space-y-10">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 shrink-0 flex items-center justify-center p-2 bg-white/5 rounded-3xl border border-white/10">
                  {selectedEntry.url ? (
                    <img 
                      src={`https://www.google.com/s2/favicons?sz=128&domain=${selectedEntry.url.replace(/^https?:\/\//, '')}`} 
                      alt="" 
                      className="w-12 h-12 object-contain"
                    />
                  ) : (
                    <Globe size={40} className="text-brand-muted" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-3xl font-black text-brand tracking-tight truncate">{selectedEntry.name || selectedEntry.url}</h2>
                  <div className="text-xs font-black text-brand-muted uppercase tracking-[0.2em]">{selectedEntry.category || 'Allgemein'}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-6">
                  <div className="p-6 bg-accent/[0.03] dark:bg-white/[0.03] rounded-3xl border border-white/5 space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                         <label className="text-xs font-black text-brand-muted uppercase tracking-[0.1em]">Benutzername</label>
                         <button 
                            onClick={() => handleCopy(selectedEntry.username, selectedEntry.id + 'user')}
                            className="text-accent text-xs font-black uppercase hover:underline"
                          >
                            {copiedId === selectedEntry.id + 'user' ? 'Kopiert!' : 'Kopieren'}
                          </button>
                      </div>
                      <div className="text-lg font-bold text-brand break-all">{selectedEntry.username}</div>
                    </div>

                    <div className="space-y-2 pt-6 border-t border-white/5">
                      <div className="flex items-center justify-between">
                         <label className="text-xs font-black text-brand-muted uppercase tracking-[0.1em]">Passwort</label>
                         <div className="flex items-center gap-4">
                           <button 
                              onClick={() => setVisiblePasswords(prev => ({ ...prev, [selectedEntry.id]: !prev[selectedEntry.id] }))}
                              className="text-brand-muted hover:text-brand"
                            >
                              {visiblePasswords[selectedEntry.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                           <button 
                              onClick={() => handleCopy(selectedEntry.password, selectedEntry.id + 'pass')}
                              className="text-accent text-xs font-black uppercase hover:underline"
                            >
                              {copiedId === selectedEntry.id + 'pass' ? 'Kopiert!' : 'Kopieren'}
                            </button>
                         </div>
                      </div>
                      <div className="text-xl font-mono font-bold text-brand tracking-widest break-all">
                        {visiblePasswords[selectedEntry.id] ? selectedEntry.password : '••••••••••••'}
                      </div>
                    </div>
                  </div>

                  {selectedEntry.url && (
                    <div className="space-y-2">
                       <label className="text-xs font-black text-brand-muted uppercase tracking-[0.1em] px-1 text-brand">Website</label>
                       <a 
                        href={selectedEntry.url.startsWith('http') ? selectedEntry.url : `https://${selectedEntry.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group"
                      >
                        <span className="text-sm font-bold text-brand truncate pr-4">{selectedEntry.url}</span>
                        <ExternalLink size={16} className="text-brand-muted group-hover:text-brand" />
                      </a>
                    </div>
                  )}

                  {selectedEntry.note && (
                    <div className="space-y-2">
                       <label className="text-xs font-black text-brand-muted uppercase tracking-[0.1em] px-1 text-brand">Notizen</label>
                       <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-sm font-medium whitespace-pre-wrap leading-relaxed text-brand opacity-80">
                         {selectedEntry.note}
                       </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-brand-muted">
            <div className="w-16 h-16 flex items-center justify-center mb-4 text-brand dark:text-white border-none bg-transparent">
               <Shield size={48} />
            </div>
            <p className="font-medium">Wähle einen Eintrag aus</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-sm p-10 rounded-[3rem] relative z-10 text-center"
            >
              <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-brand tracking-tight mb-4 uppercase">Eintrag löschen?</h3>
              <p className="text-sm text-brand-muted font-medium mb-10 px-4">
                Möchtest du diesen Eintrag wirklich unwiderruflich aus deinem Safe entfernen?
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="btn-cancel h-14 font-black uppercase tracking-widest"
                >
                  Abbruch
                </button>
                <button 
                  onClick={() => {
                    deleteEntry(deleteConfirmId);
                    if (selectedEntry?.id === deleteConfirmId) setSelectedEntry(null);
                    setDeleteConfirmId(null);
                  }}
                  className="btn-red-glow h-14 font-black uppercase tracking-widest"
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
