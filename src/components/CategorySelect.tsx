import React, { useState } from 'react';
import { useCategories } from '../lib/categories';
import { Plus, Tag, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { CustomSelect } from './CustomSelect';

interface CategorySelectProps {
  type: 'note' | 'task' | 'link' | 'prompt' | 'household';
  value?: string; // The categoryId
  defaultValue?: string;
  id?: string;
  onChange?: (categoryId: string) => void;
  className?: string;
  readOnly?: boolean;
  hideIcon?: boolean;
}

export function CategorySelect({ type, value, defaultValue, id, onChange, className, readOnly, hideIcon }: CategorySelectProps) {
  const { categories, addCategory } = useCategories(type);
  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const handleAdd = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (newCatName.trim()) {
      const id = await addCategory(newCatName.trim());
      if (id && onChange) {
        onChange(id);
      }
    }
    setIsAdding(false);
    setNewCatName('');
  };

  const options = [
    { value: 'none', label: 'Keine Kategorie' },
    ...categories.map(c => ({ value: c.id, label: c.name }))
  ];

  const currentValue = value || defaultValue || 'none';

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
            className="flex-1 min-w-0 border border-black/5 dark:border-white/10 rounded-xl px-3 py-1.5 h-10 text-sm bg-white/20 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-white/20"
            autoFocus
          />
          <button 
            type="button" 
            onClick={handleAdd} 
            className="h-10 px-3 bg-white/10 dark:bg-white/10 hover:bg-white/20 text-slate-900 dark:text-white rounded-xl shrink-0 cursor-pointer text-xs font-bold uppercase transition-colors" 
            aria-label="Hinzufügen"
          >
            Hinzufügen
          </button>
          <button 
            type="button" 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsAdding(false); }} 
            className="h-10 w-10 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl shrink-0 cursor-pointer transition-colors" 
            aria-label="Abbrechen"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-1 min-w-0 relative group">
          <CustomSelect
            value={currentValue === 'none' ? '' : currentValue}
            options={options.map(o => o.value === 'none' ? { ...o, value: '' } : o)}
            onChange={(val) => onChange?.(val)}
            placeholder="Kategorie wählen..."
            className="flex-1 min-w-0"
          />
          {!readOnly && (
            <button 
              type="button"
              onClick={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                setIsAdding(true); 
              }} 
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 dark:bg-white/5 border border-black/5 dark:border-white/10 text-slate-900 dark:text-white hover:bg-white/20 transition-all shrink-0 shadow-sm"
              title="Neue Kategorie anlegen"
              aria-label="Neue Kategorie anlegen"
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

