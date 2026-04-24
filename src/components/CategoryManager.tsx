import React, { useState } from 'react';
import { useCategories } from '../lib/categories';
import { Trash2, Edit2, Plus, Check, X, Tag } from 'lucide-react';
import { cn } from '../lib/utils';

interface CategoryManagerProps {
  type: 'note' | 'task' | 'link' | 'prompt' | 'household';
  onClose: () => void;
}

export function CategoryManager({ type, onClose }: CategoryManagerProps) {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories(type);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      await addCategory(newName.trim());
      setNewName('');
    }
  };

  const handleUpdate = async (id: string) => {
    if (editName.trim()) {
      await updateCategory(id, editName.trim());
      setEditingId(null);
      setEditName('');
    }
  };

  const typeLabels: Record<string, string> = {
    note: 'Notizen',
    task: 'Aufgaben',
    link: 'Links',
    prompt: 'Prompts',
    household: 'Haushaltsbuch'
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-md rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-200/50 dark:border-white/10 flex justify-between items-center bg-[#FBFBFD]/50 dark:bg-[#1C1C1E]/50">
          <div>
            <h3 className="text-2xl font-black text-brand tracking-tight">Kategorien verwalten</h3>
            <p className="text-sm text-brand-muted font-medium mt-1">Für {typeLabels[type]}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-500/10 rounded-xl transition-colors text-brand-muted cursor-pointer">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Neue Kategorie..."
              className="glass-input h-12 flex-1"
            />
            <button type="submit" className="glass-button-primary h-12 w-12 px-0 flex items-center justify-center shrink-0">
              <Plus size={24} />
            </button>
          </form>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-2 p-3 bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-2xl group border border-transparent hover:border-blue-500/20 transition-all">
                <Tag size={16} className="text-brand-muted" />
                
                {editingId === cat.id ? (
                  <div className="flex-1 flex gap-2">
                    <input 
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="glass-input h-8 py-0 px-2 flex-1 text-sm bg-white dark:bg-[#3A3A3C]"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdate(cat.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                    <button onClick={() => handleUpdate(cat.id)} className="p-1.5 text-green-500 hover:bg-green-500/10 rounded-lg shrink-0">
                      <Check size={16} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg shrink-0">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-bold text-brand truncate">{cat.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
                        className="p-1.5 text-brand-muted hover:text-blue-500 hover:bg-blue-500/10 rounded-lg cursor-pointer transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => deleteCategory(cat.id)}
                        className="p-1.5 text-brand-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {categories.length === 0 && (
              <div className="text-center py-8 text-brand-muted font-medium opacity-50">
                Noch keine Kategorien angelegt.
              </div>
            )}
          </div>
        </div>

        <div className="p-8 pt-0 border-t border-slate-200/50 dark:border-white/10 bg-[#FBFBFD]/50 dark:bg-[#1C1C1E]/50">
          <button onClick={onClose} className="w-full mt-6 h-12 bg-[#F5F5F7] dark:bg-[#3A3A3C] text-brand font-bold rounded-2xl hover:bg-[#E8E8ED] dark:hover:bg-[#4A4A4C] transition-all">
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
