import React, { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Trash2, Bold, Italic, List, ListOrdered, Heading2, Save, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { CategorySelect } from '../components/CategorySelect';

interface Note {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  tags: string[];
  userId: string;
  isDraft?: boolean;
  color?: string;
  updatedAt: any;
  createdAt?: any;
}

export function NoteEditor({ note, onBack, onSave }: { note: Note, onBack: () => void, onSave?: (note: Note) => void }) {
  const [title, setTitle] = useState(note.title);
  const [category, setCategory] = useState(note.categoryId || '');
  const [color, setColor] = useState(note.color || '');
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
    if (!editor) return;
    setIsSaving(true);
    try {
      const data = {
        title: title.trim() || 'Unbenannte Notiz',
        categoryId: category.trim(),
        content: editor.getHTML(),
        color,
        updatedAt: serverTimestamp(),
        userId: note.userId
      };

      if (note.isDraft) {
        const docRef = await addDoc(collection(db, 'notes'), {
          ...data,
          createdAt: serverTimestamp()
        });
        if (onSave) {
          onSave({
            ...note,
            id: docRef.id,
            isDraft: false,
            title: data.title,
            content: data.content,
            categoryId: data.categoryId,
            color: data.color,
            updatedAt: new Date()
          });
        }
      } else {
        await updateDoc(doc(db, 'notes', note.id), data);
      }
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
    if (title !== note.title || category !== note.categoryId || color !== (note.color || '')) {
      setHasChanges(true);
    }
  }, [title, category, color, note.title, note.categoryId, note.color]);

  const editor = useEditor({
    extensions: [StarterKit],
    content: note.content,
    editorProps: {
      attributes: {
        class: 'prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[300px] h-full px-4 sm:px-8 py-2'
      }
    },
    onUpdate: () => {
      setHasChanges(true);
    }
  });

  return (
    <div className="flex-1 flex flex-col h-full dark:bg-transparent min-h-0">
      <div className="p-4 sm:p-6 border-b border-slate-200/50 dark:border-white/10 flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <button 
              onClick={onBack}
              className="p-2 -ml-2 text-brand-muted hover:text-slate-900 dark:text-white hover:bg-slate-500/10 rounded-xl"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notiz Titel"
              className="text-lg sm:text-xl font-bold text-brand border-none focus:ring-0 p-0 w-full bg-transparent placeholder-brand-muted/50 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button 
              onClick={() => setDeleteModal({ open: true, id: note.id })}
              className="p-2 text-brand-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors flex-shrink-0 cursor-pointer"
              title="Notiz löschen"
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
            type="note" 
            value={category} 
            onChange={setCategory}
            className="flex-1 max-w-sm"
          />
          <div className="flex items-center gap-2">
            <span className="pro-heading">Farbe:</span>
            <div className="flex items-center gap-1.5">
               {colors.map(c => (
                 <button
                    key={c.name}
                    onClick={() => setColor(c.value)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all shadow-sm",
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

      <div className="flex-1 overflow-y-auto w-full prose-container custom-scrollbar tiptap-note-editor relative">
        {editor && (
          <div className="sticky top-0 z-[50] bg-[#F2F2F7]/95 dark:bg-[#1C1C1E]/95  flex items-center gap-1 px-4 sm:px-6 py-2 border-b border-slate-200/50 dark:border-white/10 flex-wrap shrink-0 shadow-sm glass-glossy">
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={cn("p-2 rounded-xl cursor-pointer transition-colors", editor.isActive('heading', { level: 2 }) ? 'bg-accent/10 text-accent font-black' : 'text-brand-muted hover:bg-slate-200 dark:hover:bg-white/10')}
            >
              <Heading2 size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={cn("p-2 rounded-xl cursor-pointer transition-colors", editor.isActive('bold') ? 'bg-accent/10 text-accent font-black' : 'text-brand-muted hover:bg-slate-200 dark:hover:bg-white/10')}
            >
              <Bold size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={cn("p-2 rounded-xl cursor-pointer transition-colors", editor.isActive('italic') ? 'bg-accent/10 text-accent font-black' : 'text-brand-muted hover:bg-slate-200 dark:hover:bg-white/10')}
            >
              <Italic size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={cn("p-2 rounded-xl cursor-pointer transition-colors", editor.isActive('bulletList') ? 'bg-accent/10 text-accent font-black' : 'text-brand-muted hover:bg-slate-200 dark:hover:bg-white/10')}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={cn("p-2 rounded-xl cursor-pointer transition-colors", editor.isActive('orderedList') ? 'bg-accent/10 text-accent font-black' : 'text-brand-muted hover:bg-slate-200 dark:hover:bg-white/10')}
            >
              <ListOrdered size={16} />
            </button>
          </div>
        )}
        <div className="pt-4 sm:pt-6">
          <EditorContent editor={editor} />
        </div>
      </div>

      {deleteModal && deleteModal.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
          <div className="glass-card w-full max-w-[480px] rounded-[2.5rem] p-10 shadow-2xl">
            <h3 className="text-2xl font-black text-red-500 mb-2 tracking-tight">Löschen?</h3>
            <p className="text-sm text-[#86868B] mb-8">Diese Notiz wird unwiderruflich entfernt.</p>
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
