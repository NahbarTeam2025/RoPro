import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Trash2, Edit2, X, Phone, Mail, MapPin, 
  Cake, ChevronRight, User, MoreVertical, FileText
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
  userId: string;
  createdAt: any;
  updatedAt: any;
}

export default function Contacts() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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
    color: '#007AFF'
  });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'contacts'),
      where('userId', '==', user.uid),
      orderBy('name', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Contact[];
      setContacts(data);
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
      color: contact.color || '#007AFF'
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
      color: '#007AFF'
    });
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  return (
    <div className="max-w-6xl mx-auto flex flex-col h-full px-0 sm:px-0 pb-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sm:mb-12">
        <div>
          <h1 className="text-4xl font-black text-brand tracking-tight mb-1 uppercase">Kontakte</h1>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="glass-button-primary flex items-center gap-2 px-6 py-3 h-12"
        >
          <Plus size={20} />
          <span className="font-bold">Kontakt hinzufügen</span>
        </button>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 flex-1 min-h-0">
        {/* Left: Contact List */}
        <div className="lg:w-1/3 flex flex-col gap-4">
          <div className="relative mb-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
            <input 
              type="text"
              placeholder="Suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-input w-full pl-11 pr-4 py-3 text-sm shadow-sm"
            />
          </div>

          <div className="border border-slate-200/50 dark:border-white/5 rounded-[2.5rem] shadow-inner overflow-hidden h-[200px]">
            <div className="h-full overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="text-center py-10 text-brand-muted font-medium">Laden...</div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-10 text-brand-muted font-bold tracking-tight uppercase text-[10px]">Keine Kontakte</div>
              ) : (
                <div className="flex flex-col">
                  {filteredContacts.map(contact => (
                    <button
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className={cn(
                        "w-full text-left px-6 py-4 refined-list-item flex items-center gap-3 transition-all group",
                        selectedContact?.id === contact.id 
                          ? "bg-brand text-white shadow-lg shadow-blue-500/20 z-10" 
                          : ""
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 flex items-center justify-center font-black text-sm shrink-0 transition-colors lowercase",
                        selectedContact?.id === contact.id ? "bg-white/20" : "text-brand"
                      )}>
                        {contact.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn("font-bold truncate tracking-tight text-xs", selectedContact?.id === contact.id ? "text-white" : "text-brand")}>
                          {contact.name}
                        </div>
                        {(contact.email || contact.phone) && (
                          <div className={cn("text-[10px] truncate font-medium uppercase tracking-tighter opacity-70", selectedContact?.id === contact.id ? "text-white/70" : "text-brand-muted")}>
                            {contact.phone || contact.email}
                          </div>
                        )}
                      </div>
                      <ChevronRight size={14} className={cn("shrink-0 transition-opacity", selectedContact?.id === contact.id ? "text-white/40" : "text-brand-muted opacity-0 group-hover:opacity-100")} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Contact Detail */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            {selectedContact ? (
              <motion.div 
                key={selectedContact.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-card rounded-[2.5rem] p-8 h-full flex flex-col overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 text-brand flex items-center justify-center text-5xl sm:text-6xl font-black shrink-0">
                      {selectedContact.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-2xl sm:text-3xl font-black text-brand tracking-tight mb-2 uppercase break-words">{selectedContact.name}</h2>
                      <div className="flex flex-wrap gap-2 text-xs font-bold text-brand-muted uppercase tracking-widest">
                         {selectedContact.birthday && (
                           <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200/30 dark:border-white/5">
                             <Cake size={14} className="text-brand" />
                             {format(parseISO(selectedContact.birthday), 'd. MMMM', { locale: de })}
                           </div>
                         )}
                         <div className="px-3 py-1.5 rounded-full border border-slate-200/30 dark:border-white/5">
                           Seit {format(selectedContact.createdAt?.toDate?.() || new Date(), 'dd.MM.yyyy')}
                         </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:self-start">
                    <button 
                      onClick={(e) => openEditModal(selectedContact, e)}
                      className="p-2.5 rounded-xl text-brand-muted hover:text-brand hover:bg-slate-200 transition-all shadow-sm border border-slate-200/50 dark:border-white/5"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(selectedContact.id, e)}
                      className="p-2.5 rounded-xl text-brand-muted hover:text-red-500 hover:bg-red-500/10 transition-all shadow-sm border border-slate-200/50 dark:border-white/5"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-6">
                    <section>
                      <h4 className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Phone size={12} className="text-brand" /> Kontaktinfo
                      </h4>
                      <div className="space-y-4">
                        <div className="group">
                          <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1 px-4 opacity-50 group-hover:opacity-100 transition-opacity">Telefon</label>
                          <div className="px-4 py-3 rounded-2xl border border-slate-200/30 dark:border-white/5 text-brand font-medium">
                            {selectedContact.phone || '--'}
                          </div>
                        </div>
                        <div className="group">
                          <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1 px-4 opacity-50 group-hover:opacity-100 transition-opacity">E-Mail</label>
                          <div className="px-4 py-3 rounded-2xl border border-slate-200/30 dark:border-white/5 text-brand font-medium">
                            {selectedContact.email || '--'}
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="space-y-6">
                    <section>
                      <h4 className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <MapPin size={12} className="text-brand" /> Adresse
                      </h4>
                      <div className="px-4 py-3 rounded-2xl border border-slate-200/30 dark:border-white/5 text-brand font-medium min-h-[100px] whitespace-pre-wrap">
                        {selectedContact.address || '--'}
                      </div>
                    </section>
                  </div>
                </div>

                <section className="flex-1 flex flex-col min-h-0">
                  <h4 className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-2 shrink-0">
                    <FileText size={12} className="text-brand" /> Notizen
                  </h4>
                  <div className="flex-1 px-4 py-3 rounded-2xl border border-slate-200/30 dark:border-white/5 text-brand font-medium overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                    {selectedContact.notes || '--'}
                  </div>
                </section>
              </motion.div>
            ) : (
              <div className="glass-card rounded-[2.5rem] p-8 h-full flex flex-col items-center justify-center text-brand-muted text-center animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6">
                  <User size={40} className="opacity-20" />
                </div>
                <h3 className="text-xl font-bold text-brand mb-2 tracking-tight uppercase">Kein Kontakt ausgewählt</h3>
                <p className="max-w-xs text-sm font-medium">Wähle einen Kontakt aus der Liste links aus, um die Details zu sehen.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card w-full max-w-[480px] rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-200/50 dark:border-white/10 flex justify-between items-center bg-[#FBFBFD]/50 dark:bg-[#1C1C1E]/50">
                <h2 className="text-2xl font-black text-brand tracking-tight uppercase">
                  {editingContact ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}
                </h2>
                <button onClick={closeModal} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors text-brand-muted">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateOrUpdate} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest px-1">Vollständiger Name</label>
                    <input 
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="z.B. Robert Erbach"
                      className="glass-input w-full p-4"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest px-1">Geburtstag</label>
                    <input 
                      type="date"
                      value={formData.birthday}
                      onChange={(e) => setFormData({...formData, birthday: e.target.value})}
                      className="glass-input w-full p-4"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest px-1">E-Mail</label>
                    <input 
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="email@beispiel.de"
                      className="glass-input w-full p-4"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest px-1">Telefonnummer</label>
                    <input 
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="+49 ..."
                      className="glass-input w-full p-4"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest px-1">Adresse</label>
                  <textarea 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Straße, Hausnummer, PLZ, Ort"
                    className="glass-input w-full p-4 min-h-[80px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest px-1">Notizen</label>
                  <textarea 
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Besondere Merkmale, Vorlieben..."
                    className="glass-input w-full p-4 min-h-[120px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest px-1">Farbe</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#FF2D55'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormData({...formData, color: c})}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all shadow-sm",
                          formData.color === c ? "border-brand scale-110" : "border-transparent"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={closeModal} className="px-6 py-3 glass-button-secondary font-bold">Abbrechen</button>
                  <button type="submit" className="px-10 py-3 glass-button-primary font-bold">
                    {editingContact ? 'Speichern' : 'Kontakt erstellen'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
