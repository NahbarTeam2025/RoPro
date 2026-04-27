import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { NoteEditor } from '../components/NoteEditor';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Plus, Search, Trash2, Tag, Bold, Italic, List, ListOrdered, Heading2, FileText, Settings2, Pin } from 'lucide-react';
import { cn } from '../lib/utils';
import { CategorySelect } from '../components/CategorySelect';
import { CategoryManager } from '../components/CategoryManager';
import { useCategories } from '../lib/categories';

interface Note {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  tags: string[];
  userId: string;
  isPinned?: boolean;
  isDraft?: boolean;
  color?: string;
  updatedAt: any;
  createdAt?: any;
}

export default function Notes() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { categories } = useCategories('note');

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [showCatManager, setShowCatManager] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, id: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notes'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note));
      docs.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const timeA = a.updatedAt?.toDate?.()?.getTime() || 0;
        const timeB = b.updatedAt?.toDate?.()?.getTime() || 0;
        return timeB - timeA;
      });
      setNotes(docs);
      
      // Auto-select if ID in URL
      const selectedId = searchParams.get('id');
      if (selectedId && !activeNote) {
        const found = docs.find(d => d.id === selectedId);
        if (found) setActiveNote(found);
      }

      if (activeNote && !activeNote.isDraft) {
        // Update active note if it changed remotely
        const updated = docs.find(d => d.id === activeNote.id);
        if (updated) setActiveNote(updated);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const createNote = () => {
    if (!user) return;
    const newNote: Note = {
      id: 'draft-' + Date.now(),
      title: '',
      content: '',
      categoryId: '',
      tags: [],
      userId: user.uid,
      isDraft: true,
      updatedAt: new Date()
    };
    setActiveNote(newNote);
  };

  const togglePin = async (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) return;
    try {
      await updateDoc(doc(db, 'notes', note.id), {
        isPinned: !note.isPinned,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error toggling pin:", err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal || !user) return;
    try {
      await deleteDoc(doc(db, 'notes', deleteModal.id));
      if (activeNote?.id === deleteModal.id) setActiveNote(null);
      setDeleteModal(null);
    } catch (err) {
      console.error("Error deleting note:", err);
      alert('Fehler beim Löschen der Notiz');
    }
  };

  const availableMonths = Array.from(new Set(notes.map(n => {
    if (n.updatedAt?.toDate) return format(n.updatedAt.toDate(), 'yyyy-MM');
    if (n.createdAt?.toDate) return format(n.createdAt.toDate(), 'yyyy-MM');
    return null;
  }).filter(Boolean) as string[])).sort().reverse();

  const filteredNotes = [
    ...(activeNote?.isDraft ? [activeNote] : []),
    ...notes
  ].filter(note => {
    if (filterCategory !== 'all' && note.categoryId !== filterCategory) return false;
    if (filterMonth !== 'all') {
       const monthStr = note.updatedAt?.toDate ? format(note.updatedAt.toDate(), 'yyyy-MM') : 
                        (note.createdAt?.toDate ? format(note.createdAt.toDate(), 'yyyy-MM') : null);
       if (monthStr !== filterMonth) return false;
    }
    const queryStr = searchQuery.toLowerCase();
    const catName = categories.find(c => c.id === note.categoryId)?.name || note.categoryId;
    return note.title.toLowerCase().includes(queryStr) || 
           note.content.toLowerCase().includes(queryStr) ||
           (catName && catName.toLowerCase().includes(queryStr));
  });

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 relative z-10 w-full pb-6">
      {/* Sidebar / List */}
      <div className={cn(
        "w-full md:w-80 flex-col glass-card rounded-3xl overflow-hidden flex-shrink-0 transition-all",
        activeNote ? "hidden md:flex" : "flex h-full"
      )}>
        <div className="p-4 border-b border-slate-200/50 dark:border-white/10 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-bold text-slate-900 dark:text-white text-sm uppercase">Notizen</h2>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowCatManager(true)} 
                className="p-2 text-brand-muted hover:text-accent hover:bg-accent/10 rounded-xl transition-all cursor-pointer"
                title="Kategorien verwalten"
              >
                <Settings2 size={18} />
              </button>
              <button onClick={createNote} className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl transition-all cursor-pointer font-bold flex items-center justify-center">
                 <Plus size={18} />
              </button>
            </div>
          </div>
          <div className="flex gap-2">
             <select 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)}
                className="glass-input h-10 flex-1 appearance-none bg-white dark:bg-[#050505] text-[10px] font-bold uppercase tracking-wider px-2"
             >
               <option value="all">Alle</option>
               {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
             <select 
                value={filterMonth} 
                onChange={(e) => setFilterMonth(e.target.value)}
                className="glass-input h-10 flex-1 appearance-none bg-white dark:bg-[#050505] text-[10px] font-bold uppercase tracking-wider px-2"
             >
               <option value="all">Datum</option>
               {availableMonths.map(m => (
                 <option key={m} value={m}>{format(new Date(`${m}-01`), 'MMMM', { locale: de })}</option>
               ))}
             </select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-brand-muted opacity-50" size={16} />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input pl-9 rounded-xl"
            />
          </div>
        </div>
        <div className="flex-1 bg-transparent rounded-[2rem] m-4 mt-0 overflow-hidden">
          <div className="h-full overflow-y-auto custom-scrollbar">
            {filteredNotes.length === 0 ? (
              <div className="p-6 text-center text-sm font-medium text-brand-muted">Keine Notizen gefunden.</div>
            ) : (
              <div className="flex flex-col">
                {filteredNotes.map(note => {
                  const catName = categories.find(c => c.id === note.categoryId)?.name || note.categoryId || 'Allgemein';
                  return (
                    <div
                      key={note.id}
                      className={cn(
                        "w-full text-left p-5 refined-list-item transition-all focus:outline-none cursor-pointer group relative border-l-2 rounded-none",
                        activeNote?.id === note.id ? "bg-black/[0.03] dark:bg-white/[0.05]" : "bg-transparent border-transparent"
                      )}
                      style={{ borderLeftColor: note.color ? `${note.color}99` : 'rgba(37, 99, 235, 0.6)' }}
                      onClick={() => setActiveNote(note)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={cn(
                              "font-bold truncate text-sm tracking-tight",
                              activeNote?.id === note.id ? "text-slate-900 dark:text-white" : "text-slate-900 dark:text-white/80"
                            )}>{note.title || 'Unbenannte Notiz'}</h3>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => togglePin(e, note)}
                            className={cn(
                              "p-1.5 rounded-lg transition-all md:opacity-0 md:group-hover:opacity-100",
                              note.isPinned ? "text-brand bg-accent/10" : "text-brand-muted hover:bg-slate-500/10"
                            )}
                            title={note.isPinned ? "Fixierung lösen" : "Anpinnen"}
                          >
                            <Pin size={14} className={cn(note.isPinned && "fill-brand")} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setDeleteModal({ open: true, id: note.id });
                            }}
                            className="p-1.5 text-brand-muted hover:text-red-500 md:opacity-0 group-hover:opacity-100 transition-opacity z-20"
                            title="Notiz löschen"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="pro-heading">
                          {catName}
                        </span>
                        {note.isDraft && (
                          <span className="text-[8px] font-black text-brand uppercase tracking-tighter ml-auto">Neu</span>
                        )}
                        <span className="text-[9px] font-bold text-brand-muted/50 truncate ml-auto uppercase tracking-tighter">
                          {note.updatedAt?.toDate ? format(note.updatedAt.toDate(), 'd. MMM yyyy') : 'Gerade eben'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor pane */}
      <div className={cn(
        "flex-1 glass-card rounded-3xl overflow-hidden flex-col min-w-0 transition-all h-full",
        !activeNote ? "hidden md:flex" : "flex"
      )}>
        {activeNote ? (
          <NoteEditor 
            key={activeNote.id} 
            note={activeNote} 
            onBack={() => setActiveNote(null)}
            onSave={(newNote) => setActiveNote(newNote)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-brand-muted">
            <div className="w-16 h-16 flex items-center justify-center mb-4 text-brand dark:text-white">
               <FileText size={48} />
            </div>
            <p className="font-medium">Wähle eine Notiz aus oder erstelle eine neue</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && deleteModal.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/10 backdrop-blur-md">
          <div className="glass-card w-full max-w-[480px] rounded-[2.5rem] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.12)]">
            <h3 className="text-2xl font-black text-red-500 mb-2 tracking-tight">Löschen?</h3>
            <p className="text-sm text-[#86868B] mb-8">Diese Notiz wird unwiderruflich entfernt.</p>
            <div className="flex flex-col gap-3">
              <button 
                type="button"
                onClick={handleConfirmDelete}
                className="btn-cancel w-full"
              >
                Löschen
              </button>
              <button 
                type="button"
                onClick={() => setDeleteModal(null)}
                className="glass-button-secondary w-full"
              >
                Behalten
              </button>
            </div>
          </div>
        </div>
      )}

      {showCatManager && <CategoryManager type="note" onClose={() => setShowCatManager(false)} />}
    </div>
  );
}
