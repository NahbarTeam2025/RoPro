import React, { useState } from 'react';
import { useCategories } from '../lib/categories';
import { Plus, Tag, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface CategorySelectProps {
  type: 'note' | 'task' | 'link' | 'prompt' | 'household';
  value: string; // The categoryId
  onChange: (categoryId: string) => void;
  className?: string;
}

export function CategorySelect({ type, value, onChange, className }: CategorySelectProps) {
  const { categories, addCategory, deleteCategory } = useCategories(type);
  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const handleAdd = async () => {
    if (newCatName.trim()) {
      const id = await addCategory(newCatName.trim());
      if (id) {
        onChange(id);
      }
    }
    setIsAdding(false);
    setNewCatName('');
  };

  return (
    <div className={cn("relative flex items-center gap-2", className)}>
      <Tag size={16} className="text-brand-muted shrink-0" />
      
      {isAdding ? (
        <div className="flex items-center gap-1 w-full relative z-20">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') setIsAdding(false);
            }}
            placeholder="Kategorie Name..."
            aria-label="Name der neuen Kategorie"
            className="flex-1 min-w-0 bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-xs text-brand focus:outline-none focus:border-green-500"
            autoFocus
          />
          <button onClick={handleAdd} className="p-1 text-green-500 hover:bg-green-500/10 rounded shrink-0 cursor-pointer font-bold text-xs px-2" aria-label="Hinzufügen">
            Hinzufügen
          </button>
          <button onClick={() => setIsAdding(false)} className="p-1 text-red-500 hover:bg-red-500/10 rounded shrink-0 cursor-pointer font-bold text-xs px-2" aria-label="Abbrechen">
            Abbrechen
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Kategorie auswählen"
            className="flex-1 min-w-0 bg-transparent text-xs font-bold text-brand-muted hover:text-brand cursor-pointer outline-none uppercase tracking-wider appearance-none"
          >
            <option value="">Kategorie wählen...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <button 
            onClick={() => setIsAdding(true)} 
            className="p-1 rounded-md text-brand-muted hover:text-green-500 hover:bg-green-500/10 transition-colors shrink-0 cursor-pointer"
            title="Neue Kategorie anlegen"
            aria-label="Neue Kategorie anlegen"
          >
            <Plus size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
