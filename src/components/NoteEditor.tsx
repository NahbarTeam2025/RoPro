import React, { useState, useEffect } from 'react';
import { updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Trash2, Bold, Italic, List, ListOrdered, Heading2, Save } from 'lucide-react';
import { cn } from '../lib/utils';
import { CategorySelect } from '../components/CategorySelect';

interface Note {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  tags: string[];
  userId: string;
  updatedAt: any;
  createdAt?: any;
}

export function NoteEditor({ note, onBack }: { note: Note, onBack: () => void }) {
  const [title, setTitle] = useState(note.title);
  const [category, setCategory] = useState(note.categoryId || '');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, id: string } | null>(null);

  const handleSave = async () => {
    if (!editor) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'notes', note.id), {
        title: title.trim() || 'Unbenannte Notiz',
        categoryId: category.trim(),
        content: editor.getHTML(),
        updatedAt: serverTimestamp()
      });
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving note:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await deleteDoc(doc(db, 'notes', deleteModal.id));
      setDeleteModal(null);
      onBack();
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  useEffect(() => {
    if (title !== note.title || category !== note.categoryId) {
      setHasChanges(true);
    }
  }, [title, category, note.title, note.categoryId]);

  const editor = useEditor({
    extensions: [StarterKit],
    content: note.content,
    editorProps: {
      attributes: {
        class: 'prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[300px] h-full px-4 sm:px-8 py-4 sm:py-6'
      }
    },
    onUpdate: () => {
      setHasChanges(true);
    }
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-transparent min-h-0">
      <div className="p-4 sm:p-6 border-b border-slate-200/50 dark:border-white/10 flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <button 
              onClick={onBack}
              className="p-2 -ml-2 text-brand-muted hover:text-brand hover:bg-slate-500/10 rounded-xl"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notiz Titel"
              className="text-2xl sm:text-3xl font-bold text-brand border-none focus:ring-0 p-0 w-full bg-transparent placeholder-brand-muted/50 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button 
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={cn(
                "h-10 px-6 rounded-2xl font-bold transition-all flex items-center gap-2",
                hasChanges 
                  ? "bg-[#007AFF] text-white hover:bg-[#0071E3] shadow-lg shadow-blue-500/20" 
                  : "bg-slate-200 dark:bg-white/10 text-brand-muted cursor-not-allowed opacity-50"
              )}
            >
              <Save size={18} />
              <span className="hidden sm:inline">{isSaving ? "Speichert..." : "Speichern"}</span>
            </button>
            <button 
              onClick={() => setDeleteModal({ open: true, id: note.id })}
              className="p-2 text-brand-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors flex-shrink-0 cursor-pointer"
              title="Notiz löschen"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 w-full">
          <CategorySelect 
            type="note" 
            value={category} 
            onChange={setCategory}
            className="flex-1 max-w-sm"
          />
        </div>
      </div>

      {editor && (
        <div className="flex items-center gap-1 px-4 sm:px-6 py-2 sm:py-3 border-b border-slate-200/50 dark:border-white/10 bg-slate-100/50 dark:bg-black/20 flex-wrap shrink-0">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn("p-2 rounded-xl cursor-pointer transition-colors", editor.isActive('heading', { level: 2 }) ? 'bg-blue-500/20 text-blue-600 dark:text-green-400 dark:bg-green-500/20' : 'text-brand-muted hover:bg-slate-200 dark:hover:bg-white/10')}
          >
            <Heading2 size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn("p-2 rounded-xl cursor-pointer transition-colors", editor.isActive('bold') ? 'bg-blue-500/20 text-blue-600 dark:text-green-400 dark:bg-green-500/20' : 'text-brand-muted hover:bg-slate-200 dark:hover:bg-white/10')}
          >
            <Bold size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn("p-2 rounded-xl cursor-pointer transition-colors", editor.isActive('italic') ? 'bg-blue-500/20 text-blue-600 dark:text-green-400 dark:bg-green-500/20' : 'text-brand-muted hover:bg-slate-200 dark:hover:bg-white/10')}
          >
            <Italic size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn("p-2 rounded-xl cursor-pointer transition-colors", editor.isActive('bulletList') ? 'bg-blue-500/20 text-blue-600 dark:text-green-400 dark:bg-green-500/20' : 'text-brand-muted hover:bg-slate-200 dark:hover:bg-white/10')}
          >
            <List size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn("p-2 rounded-xl cursor-pointer transition-colors", editor.isActive('orderedList') ? 'bg-blue-500/20 text-blue-600 dark:text-green-400 dark:bg-green-500/20' : 'text-brand-muted hover:bg-slate-200 dark:hover:bg-white/10')}
          >
            <ListOrdered size={16} />
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto w-full prose-container custom-scrollbar">
        <EditorContent editor={editor} />
      </div>

      {deleteModal && deleteModal.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
          <div className="glass-card w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl">
            <h3 className="text-2xl font-black text-red-500 mb-2 tracking-tight">Löschen?</h3>
            <p className="text-sm text-[#86868B] mb-8">Diese Notiz wird unwiderruflich entfernt.</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleDelete} className="w-full h-12 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all">Löschen</button>
              <button onClick={() => setDeleteModal(null)} className="w-full h-12 bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-bold rounded-2xl hover:bg-[#E8E8ED] dark:hover:bg-[#3A3A3C] transition-all">Behalten</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
