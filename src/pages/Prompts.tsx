import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Plus, Search, Trash2, Tag, Copy, Check, MessageSquare, Settings2, Pin } from 'lucide-react';
import { PromptEditor } from '../components/PromptEditor';
import { cn } from '../lib/utils';
import { CategorySelect } from '../components/CategorySelect';
import { CategoryManager } from '../components/CategoryManager';
import { useCategories } from '../lib/categories';

interface Prompt {
  id: string;
  title: string;
  content: string;
  category: string;
  userId: string;
  isPinned?: boolean;
  isDraft?: boolean;
  color?: string;
  updatedAt: any;
  createdAt: any;
}

export default function Prompts() {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [activePrompt, setActivePrompt] = useState<Prompt | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { categories } = useCategories('prompt');

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showCatManager, setShowCatManager] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'prompts'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prompt));
      docs.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const timeA = a.updatedAt?.toDate?.()?.getTime() || 0;
        const timeB = b.updatedAt?.toDate?.()?.getTime() || 0;
        return timeB - timeA;
      });
      setPrompts(docs);
      
      // Sync active prompt if it's not a draft
      if (activePrompt && !activePrompt.isDraft) {
        const updated = docs.find(d => d.id === activePrompt.id);
        if (updated) setActivePrompt(updated);
      }
    });
    return () => unsubscribe();
  }, [user, activePrompt?.isDraft]);

  const togglePin = async (e: React.MouseEvent, prompt: Prompt) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user || prompt.isDraft) return;
    try {
      await updateDoc(doc(db, 'prompts', prompt.id), {
        isPinned: !prompt.isPinned,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error toggling pin:", err);
    }
  };

  const createPrompt = () => {
    if (!user) return;
    const newPrompt: Prompt = {
      id: 'draft-' + Date.now(),
      title: '',
      content: '',
      category: '',
      userId: user.uid,
      isDraft: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setActivePrompt(newPrompt);
  };

  const copyToClipboard = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const filteredPrompts = [
    ...(activePrompt?.isDraft ? [activePrompt] : []),
    ...prompts
  ].filter(p => {
    if (filterCategory !== 'all' && p.category !== filterCategory) return false;
    const queryStr = searchQuery.toLowerCase();
    const catName = categories.find(c => c.id === p.category)?.name || p.category;
    return p.title.toLowerCase().includes(queryStr) || 
           p.content.toLowerCase().includes(queryStr) ||
           catName.toLowerCase().includes(queryStr);
  });

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 relative z-10 w-full p-2 sm:p-0">
      {/* Sidebar List */}
      <div className={cn(
        "w-full md:w-80 flex-col glass-card rounded-3xl overflow-hidden flex-shrink-0 transition-all",
        activePrompt ? "hidden md:flex" : "flex h-full"
      )}>
        <div className="p-4 border-b border-slate-200/50 dark:border-white/10 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-bold text-brand text-xl">Prompts</h2>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowCatManager(true)}
                className="p-2 text-brand-muted hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all cursor-pointer"
                title="Kategorien verwalten"
              >
                <Settings2 size={18} />
              </button>
              <button onClick={createPrompt} className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl transition-all cursor-pointer font-bold flex items-center justify-center">
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
               <option value="all">Kategorie</option>
               {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {filteredPrompts.length === 0 ? (
            <div className="p-4 text-center text-sm font-medium text-brand-muted">Keine Prompts gefunden.</div>
          ) : (
            filteredPrompts.map(prompt => {
              const catName = categories.find(c => c.id === prompt.category)?.name || prompt.category || 'Allgemein';
              return (
                <div
                  key={prompt.id}
                  onClick={() => setActivePrompt(prompt)}
                  className={cn(
                    "w-full text-left p-4 hover:bg-slate-500/10 transition-colors focus:outline-none cursor-pointer rounded-2xl border-2",
                    activePrompt?.id === prompt.id ? "bg-slate-500/10" : ""
                  )}
                  style={{ borderColor: activePrompt?.id === prompt.id ? (prompt.color || '#34C759') : (prompt.color || 'transparent') }}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {prompt.isPinned && <Pin size={12} className="text-green-500 fill-green-500 shrink-0" />}
                      <h3 className={cn(
                        "font-bold truncate",
                        activePrompt?.id === prompt.id ? "text-green-500" : "text-brand"
                      )}>{prompt.title || 'Unbenannt'}</h3>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => togglePin(e, prompt)}
                        disabled={prompt.isDraft}
                        className={cn(
                          "p-1 rounded-md transition-all",
                          prompt.isPinned ? "text-green-500 bg-green-500/10" : "text-brand-muted hover:bg-slate-500/20",
                          prompt.isDraft && "opacity-0"
                        )}
                        title={prompt.isPinned ? "Fixierung lösen" : "Anpinnen"}
                      >
                        <Pin size={14} className={cn(prompt.isPinned && "fill-green-500")} />
                      </button>
                      <div
                        onClick={(e) => {
                          if (prompt.isDraft) return;
                          e.stopPropagation();
                          copyToClipboard(prompt.content, prompt.id);
                        }}
                        className={cn(
                          "p-1 rounded-md hover:bg-slate-500/20 text-brand-muted hover:text-brand transition-colors cursor-pointer",
                          prompt.isDraft && "opacity-0"
                        )}
                        title="Kopieren"
                      >
                         {copiedId === prompt.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold text-brand-muted uppercase tracking-widest bg-slate-200/50 dark:bg-black/20 px-2 py-0.5 rounded truncate max-w-[120px]">
                      {catName}
                    </span>
                    {prompt.isDraft && (
                      <span className="text-[8px] font-black text-blue-500 uppercase tracking-tighter ml-auto">Neu</span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Editor Pane */}
      <div className={cn(
        "flex-1 glass-card rounded-3xl overflow-hidden flex-col min-w-0 transition-all h-full",
        !activePrompt ? "hidden md:flex" : "flex"
      )}>
        {activePrompt ? (
          <PromptEditor 
            key={activePrompt.id} 
            prompt={activePrompt} 
            onBack={() => setActivePrompt(null)} 
            onSave={(newPrompt) => {
              // Replace the draft with the real one
              setActivePrompt(newPrompt);
            }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-brand-muted">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/20 text-blue-500 dark:text-green-500 dark:bg-green-500/10 dark:border-green-500/20">
               <MessageSquare size={32} />
            </div>
            <p className="font-medium">Wähle einen Prompt aus oder erstelle einen neuen</p>
          </div>
        )}
      </div>
      {showCatManager && <CategoryManager type="prompt" onClose={() => setShowCatManager(false)} />}
    </div>
  );
}

