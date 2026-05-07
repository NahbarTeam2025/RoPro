import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value?: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
}

export function CustomSelect({
  value,
  options,
  onChange,
  placeholder = 'Auswählen...',
  className,
  triggerClassName,
  dropdownClassName
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("relative inline-block w-full text-left font-sans", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between text-left h-12 pl-4 pr-3 glass-card rounded-xl group transition-all duration-300",
          triggerClassName
        )}
      >
        <span className="truncate text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={18} 
          className={cn("text-brand-muted transition-transform shrink-0", isOpen && "rotate-180")} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute z-[100] mt-2 w-full",
              "bg-white dark:bg-[#1C1C1E] rounded-xl shadow-2xl p-2 border border-black/10 dark:border-white/10",
              dropdownClassName
            )}
          >
            <div className="max-h-64 overflow-y-auto flex flex-col gap-1 custom-scrollbar">
              {options.length === 0 ? (
                <div className="px-3 py-3 text-sm text-brand-muted italic flex items-center justify-center">
                  Keine Optionen
                </div>
              ) : (
                options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg font-bold transition-colors text-sm",
                      "hover:bg-black/5 dark:hover:bg-white/5",
                      value === option.value ? "bg-brand/10 text-brand" : "text-slate-900 dark:text-white"
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {value === option.value && (
                      <Check size={16} className="text-brand shrink-0 ml-2" strokeWidth={3} />
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
