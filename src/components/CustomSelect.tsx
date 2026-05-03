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
          "flex w-full items-center justify-between gap-2 rounded-xl h-12 px-4 transition-all duration-300",
          "bg-white/40 dark:bg-[#1c1c1e]/40 backdrop-blur-md border border-black/5 dark:border-white/10",
          "text-[#1D1D1F] dark:text-[#F5F5F7] text-sm",
          "hover:bg-white/60 dark:hover:bg-black/60 hover:border-white/20",
          "focus:outline-none focus:ring-2 focus:ring-accent/40",
          triggerClassName
        )}
      >
        <span className="truncate text-sm font-bold uppercase tracking-wider">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={16} 
          className={cn("text-white/60 transition-transform duration-300 shadow-sm", isOpen && "rotate-180")} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute z-[100] mt-3 w-full overflow-hidden rounded-2xl",
              "bg-black border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl",
              dropdownClassName
            )}
          >
            <div className="max-h-[148px] overflow-y-auto py-2 custom-scrollbar">
              {options.length === 0 ? (
                <div className="px-5 py-3 text-sm text-brand-muted italic flex items-center justify-center">
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
                      "flex w-full items-center justify-between px-5 py-3 text-sm font-medium transition-all duration-200",
                      "text-white/70 hover:text-white hover:bg-white/[0.08]",
                      value === option.value && "bg-white/[0.1] text-white font-bold"
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {value === option.value && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="bg-white rounded-full p-0.5"
                      >
                        <Check size={10} className="text-black shrink-0" strokeWidth={4} />
                      </motion.div>
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
