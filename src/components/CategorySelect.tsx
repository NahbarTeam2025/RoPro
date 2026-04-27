import React, { useState } from 'react';
import { useCategories } from '../lib/categories';
import { Plus, Tag, X, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface CategorySelectProps {
  type: 'note' | 'task' | 'link' | 'prompt' | 'household';
  value: string; // The categoryId
  onChange: (categoryId: string) => void;
  className?: string;
  readOnly?: boolean;
  hideIcon?: boolean;
}

export function CategorySelect({ type, value, onChange, className, readOnly, hideIcon }: CategorySelectProps) {
  const { categories, addCategory, deleteCategory } = useCategories(type);
  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const handleAdd = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
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
    <div className={cn("relative flex items-center gap-2 font-sans", className)} onClick={e => e.stopPropagation()}>
      {!hideIcon && <Tag size={16} className="text-brand-muted shrink-0" />}
      
      {isAdding ? (
        <div className="flex items-center gap-1 w-full relative z-20">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd(e);
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                setIsAdding(false);
              }
            }}
            placeholder="Kategorie..."
            aria-label="Name der neuen Kategorie"
            className="flex-1 min-w-0 border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-green-500"
            autoFocus
          />
          <button 
            type="button" 
            onClick={handleAdd} 
            className="p-1 text-green-500 hover:bg-green-500/10 rounded shrink-0 cursor-pointer font-bold text-[10px] px-2 uppercase" 
            aria-label="Hinzufügen"
          >
            Hinzufügen
          </button>
          <button 
            type="button" 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsAdding(false); }} 
            className="p-1 text-red-500 hover:bg-red-500/10 rounded shrink-0 cursor-pointer font-bold text-[10px] px-2 uppercase" 
            aria-label="Abbrechen"
          >
            Abbrechen
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-1 min-w-0 relative group">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Kategorie auswählen"
            className="flex-1 min-w-0 bg-transparent text-xs font-bold text-slate-900 dark:text-white group-hover:text-accent cursor-pointer outline-none uppercase tracking-wider appearance-none pr-6"
            title={value ? categories.find(c => c.id === value)?.name : "Kategorie wählen..."}
          >
            <option value="" disabled hidden>Wähle Kategorie</option>
            <option value="" className="bg-white dark:bg-[#050505]">Keine Kategorie</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id} className="bg-white dark:bg-[#050505]">
                {cat.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-8 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none group-hover:text-accent transition-colors" />
          <button 
            type="button"
            onClick={(e) => { 
              if (readOnly) return;
              e.preventDefault(); 
              e.stopPropagation(); 
              setIsAdding(true); 
            }} 
            className={cn(
              "p-1 rounded-md transition-colors shrink-0 cursor-pointer",
              readOnly ? "hidden" : "text-brand-muted hover:text-green-500 hover:bg-green-500/10"
            )}
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
