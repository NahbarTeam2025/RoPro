import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Plus, Trash2, ExternalLink, Link as LinkIcon, Tag, Edit2, X, Settings2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { CategorySelect } from '../components/CategorySelect';
import { CategoryManager } from '../components/CategoryManager';
import { useCategories } from '../lib/categories';

interface LinkItem {
  id: string;
  title: string;
  url: string;
  categoryId: string;
  userId: string;
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
  const [isUpdating, setIsUpdating] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const { categories } = useCategories('link');

  const [filterCategory, setFilterCategory] = useState<string>('all');
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
        const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
        const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
        return timeB - timeA;
      });
      setLinks(docs);
    });

    return () => unsubscribe();
  }, [user]);

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
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setTitle('');
      setUrl('');
      setCategoryId('');
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
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-full relative z-10 w-full pb-20">
      <header className="mb-6 sm:mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-brand">Projekt-Links</h1>
          <p className="mt-1 font-medium text-brand-muted">Deine Sammlung wichtiger Lesezeichen.</p>
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center gap-2">
           <button 
             onClick={() => setShowCatManager(true)}
             className="glass-button-secondary h-10 w-full sm:w-10 p-0 flex items-center justify-center shrink-0 mb-2 sm:mb-0"
             title="Kategorien verwalten"
           >
             <Settings2 size={20} />
           </button>
           <div className="flex w-full sm:w-auto gap-2">
             <select 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)}
                className="glass-input h-10 w-full sm:w-48 appearance-none bg-white dark:bg-[#050505] text-xs font-bold uppercase tracking-wider px-4"
             >
               <option value="all">Alle Kategorien</option>
               {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
           </div>
           <button
             onClick={() => setShowAdd(!showAdd)}
             className="glass-button-primary flex w-full sm:w-auto justify-center items-center gap-2 h-10 px-4 shrink-0"
           >
             <Plus size={16} />
             <span>Link hinzufügen</span>
           </button>
        </div>
      </header>

      {showAdd && (
        <form onSubmit={addLink} className="glass-card p-6 rounded-3xl flex flex-col md:flex-row gap-4 items-end mb-6 animate-in fade-in slide-in-from-top-2">
          <div className="w-full space-y-1.5">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Website-Titel</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. GitHub Repository"
              className="glass-input"
              required
            />
          </div>
          <div className="w-full space-y-1.5">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="glass-input"
              required
            />
          </div>
          <div className="w-full space-y-1.5">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Kategorie</label>
            <CategorySelect 
              type="link" 
              value={categoryId} 
              onChange={setCategoryId}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="w-full md:w-auto h-10 px-4 glass-button-secondary shrink-0"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="w-full md:w-auto h-10 px-6 glass-button-primary shrink-0"
            >
              Speichern
            </button>
          </div>
        </form>
      )}

      {filteredLinks.length === 0 && !showAdd ? (
        <div className="p-12 text-center glass-card rounded-3xl flex-1 flex flex-col items-center justify-center">
          <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LinkIcon size={24} />
          </div>
          <h3 className="text-sm font-bold text-brand">Keine Links gefunden</h3>
          <p className="mt-1 text-sm font-medium text-brand-muted">Füge dein erstes Lesezeichen hinzu, oder ändere den Filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLinks.map(link => {
            const catName = categories.find(c => c.id === link.categoryId)?.name || link.categoryId || '';
            return (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group glass-card rounded-3xl p-6 transition-all flex flex-col hover:shadow-xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 dark:bg-green-500/10 dark:text-green-500 transition-colors">
                  <LinkIcon size={20} />
                </div>
                <div className="flex gap-1 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleEdit(link, e)}
                    className="p-1.5 text-brand-muted hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all cursor-pointer"
                    aria-label="Link bearbeiten"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={(e) => deleteLink(e, link.id)}
                    className="p-1.5 text-brand-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                    aria-label="Link löschen"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-brand mb-1 line-clamp-1">{link.title}</h3>
              <p className="text-sm font-medium text-brand-muted line-clamp-1 mb-4 flex items-center gap-1.5">
                <ExternalLink size={12} className="opacity-50" />
                {getDomain(link.url)}
              </p>
              
              <div className="mt-auto pt-4 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-between text-[10px] font-bold text-brand-muted uppercase tracking-wider">
                <span>{link.createdAt?.toDate ? format(link.createdAt.toDate(), 'd. MMM yyyy') : 'Gerade eben'}</span>
                {catName && (
                  <span className="flex items-center gap-1 bg-slate-200/50 dark:bg-black/20 px-2 py-0.5 rounded truncate max-w-[100px]">
                    <Tag size={10} />
                    <span className="truncate">{catName}</span>
                  </span>
                )}
              </div>
            </a>
          )})}
        </div>
      )}
      {/* Custom Delete Modal */}
      {deleteModal && deleteModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/10 backdrop-blur-md">
          <div className="glass-card w-full max-w-sm rounded-[2.5rem] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.12)]">
            <h3 className="text-2xl font-black text-red-500 mb-2 tracking-tight">Löschen?</h3>
            <p className="text-sm text-[#86868B] mb-8">Dieser Link wird unwiderruflich entfernt.</p>
            <div className="flex flex-col gap-3">
              <button 
                type="button"
                onClick={confirmDelete}
                className="w-full h-12 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all"
              >
                Löschen
              </button>
              <button 
                type="button"
                onClick={() => setDeleteModal(null)}
                className="w-full h-12 bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-bold rounded-2xl hover:bg-[#E8E8ED] dark:hover:bg-[#3A3A3C] transition-all"
              >
                Behalten
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
          <div className="glass-card shadow-2xl w-full max-w-md rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 pb-0 flex justify-between items-start">
               <div>
                  <h3 className="text-2xl font-black text-brand tracking-tight">Link bearbeiten</h3>
                  <p className="text-sm text-brand-muted font-medium">Passe Titel, URL oder Kategorie an.</p>
               </div>
               <button onClick={() => setEditLink(null)} className="p-2 hover:bg-slate-500/10 rounded-xl transition-colors text-brand-muted">
                  <X size={24} />
               </button>
            </div>
            
            <form onSubmit={updateLink} className="p-8 pt-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Titel</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="glass-input h-12"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">URL</label>
                <input
                  type="text"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="glass-input h-12"
                  required
                />
              </div>
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Kategorie</label>
                <CategorySelect 
                  type="link" 
                  value={editCategoryId} 
                  onChange={setEditCategoryId}
                  className="h-12 border-none px-0"
                />
              </div>
              <div className="pt-4 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-full h-14 bg-[#007AFF] text-white font-bold rounded-2xl hover:bg-[#0071E3] transition-all shadow-lg shadow-blue-500/20"
                >
                  {isUpdating ? 'Speichert...' : 'Speichern'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditLink(null)}
                  className="w-full h-14 bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-bold rounded-2xl hover:bg-[#E8E8ED] dark:hover:bg-[#3A3A3C] transition-all"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showCatManager && <CategoryManager type="link" onClose={() => setShowCatManager(false)} />}
    </div>
  );
}
