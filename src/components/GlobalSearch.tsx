import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, X, CheckSquare, FileText, Link as LinkIcon, 
  MessageSquare, Users, Wallet, Calendar as CalendarIcon,
  ChevronRight, Clock, AlertCircle, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react';
import { useGlobalSearchData, SearchResult } from '../hooks/useGlobalSearchData';
import { cn } from '../lib/utils';
import { format, isToday, isTomorrow, isThisWeek, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { de } from 'date-fns/locale';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const data = useGlobalSearchData();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  const results = useMemo(() => {
    if (!query.trim()) return [];

    const q = query.toLowerCase();
    const allResults: SearchResult[] = [];

    // Filter Logic & Intelligence
    const isHeute = q.includes('heute');
    const isMorgen = q.includes('morgen');
    const isDieseWoche = q.includes('diese woche');
    const isAusgaben = q.includes('ausgaben');
    const isEinnahmen = q.includes('einnahmen');
    const isHoch = q.includes('hoch');
    const isMittel = q.includes('mittel');
    const isNiedrig = q.includes('niedrig');

    const months = ['januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember'];
    const monthIndex = months.findIndex(m => q.includes(m));

    // CLEAN SEARCH QUERY (remove keywords for better matching)
    let cleanQ = q.replace(/heute|morgen|diese woche|ausgaben|einnahmen|hoch|mittel|niedrig/g, '').trim();
    months.forEach(m => { cleanQ = cleanQ.replace(m, '').trim(); });

    // 1. TASKS
    const filteredTasks = data.tasks.filter(t => {
      const matchesText = !cleanQ || t.task.toLowerCase().includes(cleanQ);
      if (!matchesText) return false;

      if (isHoch && t.priority !== 'high') return false;
      if (isMittel && t.priority !== 'medium') return false;
      if (isNiedrig && t.priority !== 'low') return false;

      if (isHeute || isMorgen || isDieseWoche || monthIndex !== -1) {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        if (isHeute && !isToday(d)) return false;
        if (isMorgen && !isTomorrow(d)) return false;
        if (isDieseWoche && !isThisWeek(d, { weekStartsOn: 1 })) return false;
        if (monthIndex !== -1 && d.getMonth() !== monthIndex) return false;
      }
      return true;
    }).slice(0, 3).map(t => ({
      id: t.id,
      module: 'tasks' as const,
      title: t.task,
      subtitle: t.dueDate ? `Fällig: ${format(new Date(t.dueDate), 'dd.MM. HH:mm')}` : 'Kein Datum',
      path: '/tasks',
      metadata: { completed: t.completed, priority: t.priority }
    }));
    allResults.push(...filteredTasks);

    // 2. NOTES
    const filteredNotes = data.notes.filter(n => {
      const plainContent = n.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const matchesText = !cleanQ || n.title.toLowerCase().includes(cleanQ) || plainContent.toLowerCase().includes(cleanQ);
      return matchesText;
    }).slice(0, 3).map(n => {
      const plainContent = n.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return {
        id: n.id,
        module: 'notes' as const,
        title: n.title || 'Unbenannte Notiz',
        subtitle: plainContent.length > 0 ? (plainContent.substring(0, 60) + (plainContent.length > 60 ? '...' : '')) : 'Kein Inhalt',
        path: `/notes?id=${n.id}`
      };
    });
    allResults.push(...filteredNotes);

    // 3. LINKS
    const filteredLinks = data.links.filter(l => {
      const matchesText = !cleanQ || l.title.toLowerCase().includes(cleanQ) || l.url.toLowerCase().includes(cleanQ);
      return matchesText;
    }).slice(0, 3).map(l => ({
      id: l.id,
      module: 'links' as const,
      title: l.title,
      subtitle: l.url,
      path: `/links?id=${l.id}`
    }));
    allResults.push(...filteredLinks);

    // 4. PROMPTS
    const filteredPrompts = data.prompts.filter(p => {
      const matchesText = !cleanQ || p.title.toLowerCase().includes(cleanQ) || p.content.toLowerCase().includes(cleanQ);
      return matchesText;
    }).slice(0, 3).map(p => ({
      id: p.id,
      module: 'prompts' as const,
      title: p.title,
      subtitle: p.content.length > 0 ? (p.content.substring(0, 60) + (p.content.length > 60 ? '...' : '')) : 'Kein Inhalt',
      path: `/prompts?id=${p.id}`
    }));
    allResults.push(...filteredPrompts);

    // 5. CONTACTS
    const filteredContacts = data.contacts.filter(c => {
      const matchesText = !cleanQ || c.name.toLowerCase().includes(cleanQ) || c.email?.toLowerCase().includes(cleanQ) || c.phone?.includes(cleanQ);
      return matchesText;
    }).slice(0, 3).map(c => ({
      id: c.id,
      module: 'contacts' as const,
      title: c.name,
      subtitle: c.phone || c.email || 'Kontakt',
      path: `/contacts?id=${c.id}`
    }));
    allResults.push(...filteredContacts);

    // 6. HOUSEHOLD (Transactions)
    const filteredTransactions = data.transactions.filter(t => {
      const matchesText = !cleanQ || t.description.toLowerCase().includes(cleanQ);
      if (!matchesText && cleanQ) return false;

      if (isAusgaben && t.type !== 'expense') return false;
      if (isEinnahmen && t.type !== 'income') return false;

      if (monthIndex !== -1) {
        const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
        if (d.getMonth() !== monthIndex) return false;
      }
      return true;
    }).slice(0, 3).map(t => ({
      id: t.id,
      module: 'household' as const,
      title: t.description,
      subtitle: `${t.type === 'income' ? '+' : '-'} ${t.amount.toLocaleString('de-DE')}€`,
      path: `/household?id=${t.id}`,
      metadata: { type: t.type }
    }));
    allResults.push(...filteredTransactions);

    // 7. CALENDAR (Appointments)
    const filteredAppointments = data.appointments.filter(a => {
      const matchesText = !cleanQ || a.task.toLowerCase().includes(cleanQ);
      if (!matchesText) return false;

      if (isHeute || isMorgen || isDieseWoche || monthIndex !== -1) {
        if (!a.dueDate) return false;
        const d = new Date(a.dueDate);
        if (isHeute && !isToday(d)) return false;
        if (isMorgen && !isTomorrow(d)) return false;
        if (isDieseWoche && !isThisWeek(d, { weekStartsOn: 1 })) return false;
        if (monthIndex !== -1 && d.getMonth() !== monthIndex) return false;
      }
      return true;
    }).slice(0, 3).map(a => ({
      id: a.id,
      module: 'calendar' as const,
      title: a.task,
      subtitle: a.dueDate ? format(new Date(a.dueDate), 'dd.MM. HH:mm') : 'Termin',
      path: `/calendar?id=${a.id}`
    }));
    allResults.push(...filteredAppointments);

    return allResults;
  }, [query, data]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(results.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    onClose();
  };

  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'tasks': return <CheckSquare size={16} />;
      case 'notes': return <FileText size={16} />;
      case 'links': return <LinkIcon size={16} />;
      case 'prompts': return <MessageSquare size={16} />;
      case 'contacts': return <Users size={16} />;
      case 'household': return <Wallet size={16} />;
      case 'calendar': return <CalendarIcon size={16} />;
      default: return <Search size={16} />;
    }
  };

  const getModuleName = (module: string) => {
    switch (module) {
      case 'tasks': return 'Aufgaben';
      case 'notes': return 'Notizen';
      case 'links': return 'Links';
      case 'prompts': return 'Prompts';
      case 'contacts': return 'Kontakte';
      case 'household': return 'Haushalt';
      case 'calendar': return 'Kalender';
      default: return module;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#000000] opacity-90 backdrop-blur-xl"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-[480px] bg-[#1c1c1e]/40 backdrop-blur-lg rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="relative border-b border-black/5 dark:border-white/5">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-muted" size={20} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Suche"
                className="w-full pl-16 pr-6 h-14 sm:h-16 bg-transparent text-lg font-medium text-slate-900 dark:text-white placeholder:text-brand-muted outline-none"
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-[10px] font-bold text-brand-muted bg-accent/5 px-2 py-1 rounded-lg uppercase tracking-widest hidden sm:block">ESC zum Schließen</span>
                <button onClick={onClose} className="p-1 hover:bg-accent/10 rounded-lg text-brand-muted transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className={cn("max-h-[60vh] overflow-y-auto custom-scrollbar p-2", !query.trim() && "hidden")}>
              {results.length > 0 ? (
                <div className="flex flex-col gap-1 p-2">
                  {results.map((result, index) => {
                    const isFirstInModule = index === 0 || results[index - 1].module !== result.module;
                    
                    return (
                      <React.Fragment key={`${result.module}-${result.id}`}>
                        {isFirstInModule && (
                          <div className="px-4 pt-4 pb-2 text-[10px] font-black text-brand-muted uppercase tracking-[0.2em]">
                            {getModuleName(result.module)}
                          </div>
                        )}
                        <button
                          onClick={() => handleSelect(result)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={cn(
                            "w-full text-left p-4 rounded-2xl flex items-center gap-4 transition-all group relative",
                            selectedIndex === index ? "bg-accent/10 shadow-sm" : "hover:bg-brand/5"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                            selectedIndex === index ? "bg-brand text-white" : "bg-brand/10 text-slate-900 dark:text-white"
                          )}>
                            {getModuleIcon(result.module)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className={cn("font-bold text-sm truncate tracking-tight transition-colors", selectedIndex === index ? "text-slate-900 dark:text-white" : "text-slate-900 dark:text-white/80")}>
                                {result.title}
                              </h4>
                              {result.metadata?.priority === 'high' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />}
                            </div>
                            <p className="text-[10px] font-medium text-brand-muted truncate uppercase tracking-wide opacity-70">
                              {result.subtitle}
                            </p>
                          </div>
                          
                          <ChevronRight 
                            size={14} 
                            className={cn(
                              "text-brand-muted transition-all",
                              selectedIndex === index ? "translate-x-0 opacity-100" : "opacity-0 -translate-x-2"
                            )} 
                          />
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              ) : query.trim() ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-brand/5 rounded-[2rem] flex items-center justify-center mb-6 opacity-30">
                    <Search size={32} strokeWidth={1} />
                  </div>
                  <h3 className="pro-heading !text-brand text-lg">Nichts gefunden</h3>
                  <p className="text-sm font-medium text-brand-muted mt-2">Versuche es mit anderen Schlagworten.</p>
                </div>
              ) : (
                null
              )}
            </div>
            
            <div className="p-4 border-t border-black/5 dark:border-white/5 bg-black/[0.02] flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-1 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[9px] font-black font-mono">↑↓</kbd>
                <span className="text-[9px] font-bold text-brand-muted uppercase tracking-wider">Navigieren</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-1 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[9px] font-black font-mono">ENTER</kbd>
                <span className="text-[9px] font-bold text-brand-muted uppercase tracking-wider">Öffnen</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-1 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[9px] font-black font-mono">ESC</kbd>
                <span className="text-[9px] font-bold text-brand-muted uppercase tracking-wider">Schließen</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
