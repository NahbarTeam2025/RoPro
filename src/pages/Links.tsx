import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Plus, Trash2, ExternalLink, Link as LinkIcon, Tag, Edit2, X, Settings2, Pin, Save } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { CategorySelect } from '../components/CategorySelect';
import { CategoryManager } from '../components/CategoryManager';
import { useCategories } from '../lib/categories';
import { cn } from '../lib/utils';

interface LinkItem {
  id: string;
  title: string;
  url: string;
  categoryId: string;
  userId: string;
  isPinned?: boolean;
  color?: string;
  createdAt: any;
}

export default function Links() {
  const { user } = useAuth();
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, id: string } | null>(null);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editLink, setEditLink] = useState<LinkItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editColor, setEditColor] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [color, setColor] = useState('#5856D6');
  const { categories } = useCategories('link');

  const colors = [
    { name: 'Standard', value: '' },
    { name: 'Blau', value: '#60A5FA' },
    { name: 'Grün', value: '#34C759' },
    { name: 'Orange', value: '#FF9500' },
    { name: 'Lila', value: '#5856D6' },
    { name: 'Pink', value: '#FF2D55' },
  ];

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [showCatManager, setShowCatManager] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'links'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LinkItem));
      docs.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
        const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
        return timeB - timeA;
      });
      setLinks(docs);
    });

    return () => unsubscribe();
  }, [user]);

  const togglePin = async (link: LinkItem) => {
    if (!user) return;
    try {
      if (editLink?.id === link.id) {
        setEditLink({ ...editLink, isPinned: !editLink.isPinned });
      }
      await updateDoc(doc(db, 'links', link.id), {
        isPinned: !link.isPinned,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error toggling pin:", err);
    }
  };

  const addLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !url.trim()) return;
    
    // Ensure URL has protocol
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    try {
      await addDoc(collection(db, 'links'), {
        title: title.trim(),
        url: finalUrl,
        categoryId,
        color,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setTitle('');
      setUrl('');
      setCategoryId('');
      setColor('');
      setShowAdd(false);
    } catch (error) {
      console.error("Error adding link:", error);
    }
  };

  const deleteLink = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteModal({ open: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteModal || !user) return;
    try {
      if (editLink?.id === deleteModal.id) {
        setEditLink(null);
      }
      await deleteDoc(doc(db, 'links', deleteModal.id));
      setDeleteModal(null);
    } catch (error) {
      console.error("Error deleting link:", error);
    }
  };

  const handleEdit = (link: LinkItem, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditLink(link);
    setEditTitle(link.title);
    setEditUrl(link.url);
    setEditCategoryId(link.categoryId || '');
    setEditColor(link.color || '');
  };

  const updateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editLink || !editTitle.trim() || !editUrl.trim()) return;
    
    setIsUpdating(true);
    let finalUrl = editUrl.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    try {
      await updateDoc(doc(db, 'links', editLink.id), {
        title: editTitle.trim(),
        url: finalUrl,
        categoryId: editCategoryId,
        color: editColor,
        updatedAt: serverTimestamp()
      });
      setEditLink(null);
    } catch (error) {
      console.error("Error updating link:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getDomain = (urlStr: string) => {
    try {
      return new URL(urlStr).hostname.replace('www.', '');
    } catch (e) {
      return urlStr;
    }
  };

  const availableMonths = Array.from(new Set(links.map(l => {
    if (l.createdAt?.toDate) return format(l.createdAt.toDate(), 'yyyy-MM');
    return null;
  }).filter(Boolean) as string[])).sort().reverse();

  const filteredLinks = links.filter(l => {
    if (filterCategory !== 'all' && l.categoryId !== filterCategory) return false;
    if (filterMonth !== 'all') {
      const monthStr = l.createdAt?.toDate ? format(l.createdAt.toDate(), 'yyyy-MM') : null;
      if (monthStr !== filterMonth) return false;
    }
    return true;
  });
  return (
    <div className="h-full flex flex-col md:flex-row gap-6 relative z-10 w-full pb-6">
      {/* Sidebar List */}
      <div className={cn(
        "w-full md:w-80 flex-col glass-card rounded-3xl overflow-hidden flex-shrink-0 transition-all",
        editLink || showAdd ? "hidden md:flex" : "flex h-full"
      )}>
        <div className="p-4 border-b border-slate-200/50 dark:border-white/10 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-bold text-slate-900 dark:text-white text-sm uppercase">Links</h2>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowCatManager(true)}
                className="p-2 text-brand-muted hover:text-accent hover:bg-accent/10 rounded-xl transition-all cursor-pointer"
                title="Kategorien verwalten"
              >
                <Settings2 size={18} />
              </button>
              <button 
                onClick={() => { setShowAdd(true); setEditLink(null); }} 
                className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl transition-all cursor-pointer font-bold flex items-center justify-center"
              >
                 <Plus size={18} />
              </button>
            </div>
          </div>
          <div className="flex gap-2">
             <select 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)}
                className="glass-input h-10 flex-1 appearance-none bg-white dark:bg-[#050505] text-xs font-bold uppercase tracking-wider px-2"
             >
               <option value="all">Kategorie</option>
               {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
             <select 
                value={filterMonth} 
                onChange={(e) => setFilterMonth(e.target.value)}
                className="glass-input h-10 flex-1 appearance-none bg-white dark:bg-[#050505] text-xs font-bold uppercase tracking-wider px-2"
             >
               <option value="all">Zeitraum</option>
               {availableMonths.map(m => (
                 <option key={m} value={m}>{format(new Date(`${m}-01`), 'MMM yy', { locale: de })}</option>
               ))}
             </select>
          </div>
        </div>
        <div className="flex-1 bg-transparent rounded-[2rem] m-4 mt-0 overflow-hidden">
          <div className="h-full overflow-y-auto custom-scrollbar">
            {filteredLinks.length === 0 ? (
              <div className="p-8 text-center text-xs uppercase font-bold text-brand-muted tracking-widest">Keine Links gefunden</div>
            ) : (
              <div className="flex flex-col">
                {filteredLinks.map(link => {
                  const catName = categories.find(c => c.id === link.categoryId)?.name || link.categoryId || 'Allgemein';
                  return (
                    <div
                      key={link.id}
                      onClick={() => { setEditLink(link); setShowAdd(false); setEditTitle(link.title); setEditUrl(link.url); setEditCategoryId(link.categoryId); setEditColor(link.color || ''); }}
                      className={cn(
                        "w-full text-left p-4 refined-list-item transition-all focus:outline-none cursor-pointer group relative border-l-[3px] rounded-none",
                        editLink?.id === link.id ? "bg-black/[0.03] dark:bg-white/[0.05]" : "bg-transparent"
                      )}
                      style={{ borderLeftColor: link.color || '#2563EB' }}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-3 overflow-hidden">
                           <div className="w-8 h-8 shrink-0">
                             <img 
                                src={`https://www.google.com/s2/favicons?sz=64&domain=${getDomain(link.url)}`} 
                                alt="" 
                                className="w-8 h-8 object-contain rounded-md"
                                referrerPolicy="no-referrer"
                                onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%2386868B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>'; }} 
                              />
                           </div>
                           <h3 className="font-bold truncate text-base tracking-tight text-slate-900 dark:text-white">{link.title}</h3>
                        </div>
                        {link.isPinned && (
                          <div className="text-accent shrink-0">
                             <Pin size={12} className="fill-accent" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="pro-heading !text-[8px] uppercase tracking-widest">{catName}</span>
                         <a 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-brand-muted/50 hover:text-brand transition-colors"
                          title="Öffnen"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Pane / Main Content */}
      <div className={cn(
        "flex-1 glass-card rounded-3xl overflow-hidden flex-col min-w-0 transition-all h-full",
        !editLink && !showAdd ? "hidden md:flex" : "flex"
      )}>
        {editLink ? (
          <div className="flex-1 flex flex-col h-full bg-transparent p-6 sm:p-10 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-10">
               <div className="flex flex-col gap-1 items-start">
                 <h3 className="text-2xl font-black text-brand tracking-tight">Bearbeiten</h3>
                 <div className="flex items-center gap-1">
                    <button
                      onClick={() => togglePin(editLink)}
                      className={cn(
                        "p-2 rounded-xl transition-all",
                        editLink.isPinned ? "bg-accent/10 text-accent" : "text-brand-muted hover:bg-accent/10 hover:text-accent"
                      )}
                      title={editLink.isPinned ? "Fixierung lösen" : "Anpinnen"}
                    >
                      <Pin size={20} className={cn(editLink.isPinned && "fill-accent")} />
                    </button>
                    <button
                      onClick={(e) => deleteLink(e, editLink.id)}
                      className="p-2 text-brand-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                      title="Link löschen"
                    >
                      <Trash2 size={20} />
                    </button>
                 </div>
               </div>
               <button onClick={() => setEditLink(null)} className="p-2 text-brand-muted hover:text-brand transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                 <X size={24} />
               </button>
            </div>
            
            <form onSubmit={updateLink} className="max-w-xl mx-auto w-full space-y-8">
              <div className="space-y-6">
                <div className="space-y-2 flex flex-col">
                  <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Titel</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="glass-input h-12 bg-accent/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-accent/50 font-bold w-full transition-all"
                    required
                  />
                </div>
                <div className="space-y-2 flex flex-col">
                  <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">URL</label>
                  <input
                    type="text"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className="glass-input h-12 bg-accent/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-accent/50 font-bold w-full transition-all"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-2 flex flex-col">
                    <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Kategorie</label>
                    <CategorySelect 
                      type="link" 
                      value={editCategoryId} 
                      onChange={setEditCategoryId}
                      className="h-12 bg-accent/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-accent/50 font-bold w-full transition-all px-4 uppercase text-xs"
                    />
                  </div>
                  <div className="space-y-2 flex flex-col">
                    <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Farbe</label>
                    <div className="flex items-center gap-2 h-12 bg-accent/[0.03] dark:bg-white/[0.03] rounded-2xl px-4 border-none w-full">
                       {colors.map(c => (
                         <button
                            key={c.name}
                            type="button"
                            onClick={() => setEditColor(c.value)}
                            className={cn(
                              "w-6 h-6 rounded-full border-2 transition-all",
                              editColor === c.value ? "border-accent scale-110" : "border-transparent",
                              !c.value ? "bg-slate-200 dark:bg-white/20" : ""
                            )}
                            style={c.value ? { backgroundColor: c.value } : {}}
                            title={c.name}
                         />
                       ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 flex flex-col gap-3">
                <button
                   type="submit"
                   disabled={isUpdating}
                   className="btn-green-glow w-full h-14 font-black uppercase tracking-widest"
                 >
                   {isUpdating ? 'Speichert...' : 'Speichern'}
                 </button>
                <button
                   type="button"
                   onClick={() => setEditLink(null)}
                   className="btn-red-glow w-full h-14 font-black uppercase tracking-widest"
                 >
                   Abbrechen
                 </button>
              </div>
            </form>
          </div>
        ) : showAdd ? (
          <div className="flex-1 flex flex-col h-full bg-transparent p-6 sm:p-10 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-10">
               <h3 className="text-2xl font-black text-brand tracking-tight">Hinzufügen</h3>
               <button onClick={() => setShowAdd(false)} className="p-2 text-brand-muted hover:text-brand transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                 <X size={24} />
               </button>
            </div>
            
            <form onSubmit={addLink} className="max-w-xl mx-auto w-full space-y-8">
              <div className="space-y-6">
                <div className="space-y-2 flex flex-col">
                  <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Website-Titel</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="z.B. GitHub Repository"
                    className="glass-input h-12 bg-accent/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-accent/50 font-bold w-full transition-all"
                    required
                  />
                </div>
                <div className="space-y-2 flex flex-col">
                  <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">URL</label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="glass-input h-12 bg-accent/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-accent/50 font-bold w-full transition-all"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-2 flex flex-col">
                    <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Kategorie</label>
                    <CategorySelect 
                      type="link" 
                      value={categoryId} 
                      onChange={setCategoryId}
                      className="h-12 bg-accent/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-accent/50 font-bold w-full transition-all px-4 uppercase text-xs"
                    />
                  </div>
                  <div className="space-y-2 flex flex-col">
                    <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Farbe</label>
                    <div className="flex items-center gap-2 h-12 bg-accent/[0.03] dark:bg-white/[0.03] rounded-2xl px-4 border-none w-full">
                       {colors.map(c => (
                         <button
                            key={c.name}
                            type="button"
                            onClick={() => setColor(c.value)}
                            className={cn(
                              "w-6 h-6 rounded-full border-2 transition-all",
                              color === c.value ? "border-accent scale-110 shadow-[0_0_15px_rgba(37,99,235,0.4)]" : "border-transparent",
                              !c.value ? "bg-slate-200 dark:bg-white/20" : ""
                            )}
                            style={c.value ? { backgroundColor: c.value } : {}}
                            title={c.name}
                         />
                       ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 flex flex-col gap-3">
                  <button
                   type="submit"
                   className="btn-green-glow w-full h-14 font-black uppercase tracking-widest"
                 >
                   Hinzufügen
                 </button>
                <button
                   type="button"
                   onClick={() => setShowAdd(false)}
                   className="btn-red-glow w-full h-14 font-black uppercase tracking-widest"
                 >
                   Abbrechen
                 </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-brand-muted">
            <div className="w-16 h-16 flex items-center justify-center mb-4 text-brand dark:text-white">
               <LinkIcon size={48} />
            </div>
            <p className="font-medium">Wähle einen Link aus oder füge einen neuen hinzu</p>
          </div>
        )}
      </div>

      {/* Custom Delete Modal */}
      {deleteModal && deleteModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
          <div className="glass-card w-full max-w-sm rounded-[2.5rem] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.12)]">
            <h3 className="text-2xl font-black text-red-500 mb-2 tracking-tight">Löschen?</h3>
            <p className="text-sm text-[#86868B] mb-8">Dieser Link wird unwiderruflich entfernt.</p>
            <div className="flex flex-col gap-3">
              <button 
                type="button"
                onClick={confirmDelete}
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

      {showCatManager && <CategoryManager type="link" onClose={() => setShowCatManager(false)} />}
    </div>
  );
}
