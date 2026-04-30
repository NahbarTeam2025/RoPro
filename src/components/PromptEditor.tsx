import React, { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Trash2, Copy, Save, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { CategorySelect } from '../components/CategorySelect';

interface Prompt {
  id: string;
  title: string;
  content: string;
  category: string;
  userId: string;
  isDraft?: boolean;
  color?: string;
  updatedAt: any;
  createdAt: any;
}

export function PromptEditor({ prompt, onBack, onSave }: { prompt: Prompt, onBack: () => void, onSave?: (prompt: Prompt) => void }) {
  const [title, setTitle] = useState(prompt.title);
  const [category, setCategory] = useState(prompt.category || '');
  const [content, setContent] = useState(prompt.content || '');
  const [color, setColor] = useState(prompt.color || '');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, id: string } | null>(null);

  const colors = [
    { name: 'Standard', value: '' },
    { name: 'Blau', value: '#60A5FA' },
    { name: 'Grün', value: '#34C759' },
    { name: 'Orange', value: '#FF9500' },
    { name: 'Lila', value: '#5856D6' },
    { name: 'Pink', value: '#FF2D55' },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const promptData = {
        title: title.trim() || 'Unbenannt',
        category: category.trim(),
        content: content,
        color,
        userId: prompt.userId,
        updatedAt: serverTimestamp()
      };

      if (prompt.isDraft) {
        const docRef = await addDoc(collection(db, 'prompts'), {
          ...promptData,
          createdAt: serverTimestamp()
        });
        
        // Call onSave with the new document data (estimated)
        if (onSave) {
          onSave({
            ...promptData,
            id: docRef.id,
            isDraft: false,
            createdAt: new Date(),
            updatedAt: new Date()
          } as Prompt);
        }
      } else {
        await updateDoc(doc(db, 'prompts', prompt.id), promptData);
        setHasChanges(false);
      }
    } catch (error) {
      console.error("Error saving prompt:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal || prompt.isDraft) {
        setDeleteModal(null);
        if (prompt.isDraft) onBack();
        return;
    }
    try {
      await deleteDoc(doc(db, 'prompts', deleteModal.id));
      setDeleteModal(null);
      onBack();
    } catch (error) {
      console.error("Error deleting prompt:", error);
    }
  };

  useEffect(() => {
    const isDifferent = title !== prompt.title || 
                        category !== prompt.category || 
                        content !== prompt.content || 
                        color !== (prompt.color || '');
    setHasChanges(isDifferent);
  }, [title, category, content, color, prompt.title, prompt.category, prompt.content, prompt.color]);

  const copyContent = async () => {
    try {
        await navigator.clipboard.writeText(content);
    } catch (err) {}
  };

  return (
    <div className="flex-1 flex flex-col h-full dark:bg-transparent">
      <div className="p-4 sm:p-6 border-b border-slate-200/50 dark:border-white/10 flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <button 
              type="button"
              onClick={onBack}
              className="p-2 -ml-2 text-brand-muted hover:text-slate-900 dark:text-white hover:bg-slate-500/10 rounded-xl"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Prompt Titel"
              className="text-lg sm:text-xl font-bold text-brand border-none focus:ring-0 p-0 w-full bg-transparent placeholder-brand-muted/50 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button 
              type="button"
              onClick={() => setDeleteModal({ open: true, id: prompt.id })}
              className="p-2 text-brand-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors flex-shrink-0 cursor-pointer"
              title="Prompt löschen"
            >
              <Trash2 size={20} />
            </button>
            <button 
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={cn(
                "px-6 flex items-center gap-2",
                hasChanges ? "btn-save" : "glass-button-secondary opacity-50"
              )}
            >
              <Save size={18} />
              <span className="hidden sm:inline">{isSaving ? "Speichert..." : "Speichern"}</span>
            </button>
            <button 
              type="button"
              onClick={copyContent}
              className="p-2 text-brand-muted hover:text-accent hover:bg-slate-500/10 rounded-xl transition-all flex-shrink-0 cursor-pointer"
              title="Prompt kopieren"
            >
              <Copy size={20} />
            </button>
            <button 
              type="button"
              onClick={onBack}
              className="p-2 text-brand-muted hover:bg-slate-500/10 rounded-xl transition-all flex-shrink-0 cursor-pointer"
              title="Schließen"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2 w-full flex-wrap">
          <CategorySelect 
            type="prompt" 
            value={category} 
            onChange={setCategory}
            className="flex-1 max-w-sm"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-brand-muted uppercase tracking-wider">Farbe:</span>
            <div className="flex items-center gap-1.5">
               {colors.map(c => (
                 <button
                    key={c.name}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all",
                      color === c.value ? "border-accent scale-110" : "border-transparent",
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
      


      <div className="flex-1 p-4 sm:p-6 overflow-y-auto min-h-[200px]">
          <textarea 
            className="w-full h-full bg-transparent resize-none outline-none text-brand focus:ring-0 border-none placeholder-brand-muted font-mono text-[16px] sm:text-sm leading-relaxed"
            placeholder="Schreibe hier deinen genialen Prompt..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
      </div>

      {deleteModal && deleteModal.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
          <div className="glass-card w-full max-w-[480px] rounded-[2.5rem] p-10 shadow-2xl">
            <h3 className="text-2xl font-black text-red-500 mb-2 tracking-tight">Löschen?</h3>
            <p className="text-sm text-[#86868B] mb-8">Dieser Prompt wird unwiderruflich entfernt.</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleDelete} className="btn-cancel w-full">Löschen</button>
              <button onClick={() => setDeleteModal(null)} className="glass-button-secondary w-full">Behalten</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
