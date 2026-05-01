import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Trash2, Edit2, X, Phone, Mail, MapPin, 
  Cake, ChevronRight, User, MoreVertical, FileText, Check
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, query, where, onSnapshot, addDoc, 
  updateDoc, deleteDoc, doc, serverTimestamp, orderBy 
} from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { useSearchParams } from 'react-router-dom';

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  birthday?: string;
  address?: string;
  notes?: string;
  color?: string;
  isFavorite?: boolean;
  userId: string;
  createdAt: any;
  updatedAt: any;
}

export default function Contacts() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthday: '',
    address: '',
    notes: '',
    color: '#60A5FA',
    isFavorite: false
  });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'contacts'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Contact[];
      
      const sorted = [...data].sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.name.localeCompare(b.name, 'de');
      });

      setContacts(sorted);
      setLoading(false);

      // Handle search selection
      const selectedId = searchParams.get('id');
      if (selectedId) {
        const found = data.find(c => c.id === selectedId);
        if (found) setSelectedContact(found);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const data = {
        ...formData,
        userId: user.uid,
        updatedAt: serverTimestamp()
      };

      if (editingContact) {
        await updateDoc(doc(db, 'contacts', editingContact.id), data);
      } else {
        await addDoc(collection(db, 'contacts'), {
          ...data,
          createdAt: serverTimestamp()
        });
      }

      closeModal();
    } catch (err) {
      console.error("Error saving contact:", err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Kontakt wirklich löschen?')) return;
    try {
      await deleteDoc(doc(db, 'contacts', id));
      if (selectedContact?.id === id) setSelectedContact(null);
    } catch (err) {
      console.error("Error deleting contact:", err);
    }
  };

  const openEditModal = (contact: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      birthday: contact.birthday || '',
      address: contact.address || '',
      notes: contact.notes || '',
      color: contact.color || '#60A5FA',
      isFavorite: !!contact.isFavorite
    });
    setIsAddModalOpen(true);
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingContact(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      birthday: '',
      address: '',
      notes: '',
      color: '#60A5FA',
      isFavorite: false
    });
  };

  const filteredContacts = contacts;

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 relative z-10 w-full pb-6">
      {/* Sidebar: Contact List */}
      <div className={cn(
        "w-full md:w-80 flex-col glass-card rounded-3xl overflow-hidden flex-shrink-0 transition-all",
        selectedContact || isAddModalOpen ? "hidden md:flex" : "flex h-full"
      )}>
        <div className="p-4 border-b border-slate-200/50 dark:border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-tight">Kontakte</h2>
            <button 
              onClick={() => { setIsAddModalOpen(true); setEditingContact(null); setSelectedContact(null); }}
              className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl transition-all cursor-pointer font-bold flex items-center justify-center"
            >
               <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="text-center py-10 text-brand-muted font-medium">Laden...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-10 text-brand-muted font-bold tracking-tight uppercase text-xs">Keine Kontakte</div>
          ) : (
            <div className="flex flex-col">
              {filteredContacts.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={cn(
                      "w-full px-6 py-5 refined-list-item flex items-center gap-3 transition-all group relative border-l-2 rounded-none",
                      selectedContact?.id === contact.id 
                        ? "bg-black/[0.03] dark:bg-white/[0.03] border-l-accent" 
                        : "border-l-transparent"
                    )}
                  >
                    <div className="flex-1 min-w-0 text-left ml-2">
                      <div className="flex items-center gap-2">
                        <div className={cn("font-bold truncate tracking-tight text-base", selectedContact?.id === contact.id ? "text-brand" : "text-slate-900 dark:text-white")}>
                          {contact.name}
                        </div>
                        {contact.isFavorite && (
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        )}
                      </div>
                      {contact.phone && (
                        <div className="text-sm truncate font-medium uppercase tracking-tighter text-brand-muted opacity-70 mt-0.5">
                          {contact.phone}
                        </div>
                      )}
                    </div>
                  </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Contact Detail or Add/Edit Form */}
      <div className={cn(
        "flex-1 glass-card rounded-3xl overflow-hidden flex-col min-w-0 transition-all h-full",
        !selectedContact && !isAddModalOpen ? "hidden md:flex" : "flex"
      )}>
        {isAddModalOpen ? (
          <div className="flex-1 flex flex-col h-full bg-transparent p-6 sm:p-10 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-10">
               <button 
                  onClick={closeModal}
                  className="md:hidden p-2 text-brand-muted hover:text-brand"
                >
                  <ChevronRight size={24} className="rotate-180" />
                </button>
                <h3 className="text-2xl font-black text-brand tracking-tight">
                  {editingContact ? 'BEARBEITEN' : 'HINZUFÜGEN'}
                </h3>
                <button onClick={closeModal} className="p-2 text-brand-muted hover:text-brand transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                  <X size={24} />
                </button>
            </div>

            <form onSubmit={handleCreateOrUpdate} className="max-w-xl mx-auto w-full space-y-8">
              {!editingContact && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-muted uppercase tracking-widest px-1">Vorlagen</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        notes: 'Geschäftlicher Kontakt\nAbteilung: \nPosition: ',
                        color: '#3B82F6'
                      })}
                      className="px-4 py-2 rounded-xl bg-slate-500/10 text-brand-muted text-xs font-bold uppercase tracking-wider hover:bg-brand hover:text-white transition-all"
                    >
                      Geschäftlich
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        notes: 'Privater Kontakt\nVerwandtschaftsgrad: ',
                        color: '#EF4444'
                      })}
                      className="px-4 py-2 rounded-xl bg-slate-500/10 text-brand-muted text-xs font-bold uppercase tracking-wider hover:bg-brand hover:text-white transition-all"
                    >
                      Privat
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-8">
                <div className="space-y-2 flex flex-col">
                  <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Vollständiger Name</label>
                  <input 
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="z.B. Robert Erbach"
                    className="glass-input h-12 focus:ring-2 focus:ring-accent/50 font-bold w-full transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">E-Mail</label>
                      <input 
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="email@beispiel.de"
                        className="glass-input h-12 focus:ring-2 focus:ring-accent/50 font-bold"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Telefon</label>
                      <input 
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="+49 ..."
                        className="glass-input h-12 focus:ring-2 focus:ring-accent/50 font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Geburtstag</label>
                      <input 
                        type="date"
                        value={formData.birthday}
                        onChange={(e) => setFormData({...formData, birthday: e.target.value})}
                        className="glass-input h-12 focus:ring-2 focus:ring-accent/50 font-bold"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Favorit</label>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, isFavorite: !formData.isFavorite})}
                        className={cn(
                          "glass-input h-12 rounded-2xl border-none flex items-center justify-center gap-2 transition-all font-black text-xs uppercase tracking-wider",
                          formData.isFavorite ? "bg-amber-500/20 text-amber-500" : "bg-accent/[0.03] dark:bg-white/[0.03] text-brand-muted hover:bg-slate-500/10"
                        )}
                      >
                        {formData.isFavorite ? <Check size={14} strokeWidth={3} /> : null}
                        <span>{formData.isFavorite ? 'Favorit' : 'Zu Favoriten'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Adresse</label>
                  <textarea 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Straße, Hausnummer, PLZ, Ort"
                    className="glass-input w-full p-4 min-h-[100px] focus:ring-2 focus:ring-accent/50 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Notizen</label>
                  <textarea 
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Besondere Merkmale..."
                    className="glass-input w-full p-4 min-h-[120px] focus:ring-2 focus:ring-accent/50 font-bold"
                  />
                </div>

                <div className="flex flex-col gap-3 pt-8">
                  <button type="submit" className="btn-green-glow w-full h-14 font-black uppercase tracking-widest">
                    Hinzufügen
                  </button>
                  <button type="button" onClick={closeModal} className="btn-red-glow w-full h-14 font-black uppercase tracking-widest">Abbrechen</button>
                </div>
              </div>
            </form>
          </div>
        ) : selectedContact ? (
          <div className="flex-1 flex flex-col h-full bg-transparent p-6 sm:p-10 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-10">
               <button 
                  onClick={() => setSelectedContact(null)}
                  className="md:hidden p-2 text-brand-muted hover:text-brand"
                >
                  <ChevronRight size={24} className="rotate-180" />
                </button>
                <div />
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => openEditModal(selectedContact, e)}
                    className="p-2.5 rounded-xl text-brand-muted hover:text-accent hover:bg-slate-200 dark:hover:bg-white/5 transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(selectedContact.id, e)}
                    className="p-2.5 rounded-xl text-brand-muted hover:text-red-500 hover:bg-red-500/10 transition-all font-bold"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button onClick={() => setSelectedContact(null)} className="p-2 text-brand-muted hover:text-brand transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                    <X size={24} />
                  </button>
                </div>
            </div>

            <div className="max-w-xl mx-auto w-full space-y-12">
                <div className="flex flex-col items-start gap-4 pb-8 border-b border-slate-200/30 dark:border-white/5">
                  <div className="flex items-start justify-start gap-3">
                    <h2 className="text-3xl font-black text-brand tracking-tight uppercase break-words">{selectedContact.name}</h2>
                    {selectedContact.isFavorite && (
                      <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(255,149,0,0.6)] mt-2" />
                    )}
                  </div>
                  <div className="flex flex-wrap justify-start gap-2 text-xs font-black text-brand-muted uppercase tracking-widest">
                     {selectedContact.birthday && (
                        <span className="px-3 py-1.5 rounded-full border border-slate-200/30 dark:border-white/5">
                          🎂 {format(parseISO(selectedContact.birthday), 'd. MMMM', { locale: de })}
                        </span>
                     )}
                     <span className="px-3 py-1.5 rounded-full border border-slate-200/30 dark:border-white/5">
                        Seit {format(selectedContact.createdAt?.toDate?.() || new Date(), 'dd.MM.yyyy')}
                     </span>
                  </div>
                </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <section>
                    <h4 className="text-xs font-black text-brand-muted uppercase tracking-[0.2em] mb-4">Kontaktinfo</h4>
                    <div className="space-y-4">
                      <div className="group">
                        <label className="block text-[8px] font-black text-brand-muted uppercase tracking-wider mb-1 px-1 opacity-50">Telefon</label>
                        <div className="text-sm font-black text-brand break-all">
                          {selectedContact.phone || '--'}
                        </div>
                      </div>
                      <div className="group">
                        <label className="block text-[8px] font-black text-brand-muted uppercase tracking-wider mb-1 px-1 opacity-50">E-Mail</label>
                        <div className="text-sm font-black text-brand break-all">
                          {selectedContact.email || '--'}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
                <div className="space-y-6">
                  <section>
                    <h4 className="text-xs font-black text-brand-muted uppercase tracking-[0.2em] mb-4">Adresse</h4>
                    <div className="text-sm font-black text-brand whitespace-pre-wrap leading-relaxed text-left">
                      {selectedContact.address || '--'}
                    </div>
                  </section>
                </div>
              </div>

              {selectedContact.notes && (
                <section className="text-left">
                  <h4 className="text-xs font-black text-brand-muted uppercase tracking-[0.2em] mb-4">Notizen</h4>
                  <div className="text-sm font-black text-brand whitespace-pre-wrap leading-relaxed bg-accent/[0.03] p-4 rounded-2xl text-left">
                    {selectedContact.notes}
                  </div>
                </section>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-brand-muted">
            <div className="w-16 h-16 flex items-center justify-center mb-4 text-brand dark:text-white">
               <User size={48} />
            </div>
            <p className="font-medium">Wähle einen Kontakt aus</p>
          </div>
        )}
      </div>
    </div>
  );
}
