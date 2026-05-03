import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { format, startOfDay, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { CheckSquare, Calendar as CalendarIcon, Clock as ClockIcon, FileText, MessageSquare, Link as LinkIcon, Plus, ChevronRight, Check, Edit2, Trash2, Search, X, Save, Wallet, ArrowUpCircle, ArrowDownCircle, Zap, Pin, Users, Shield, Rss, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '../lib/utils';
import Holidays from 'date-holidays';
import { NoteEditor } from '../components/NoteEditor';
import { PromptEditor } from '../components/PromptEditor';
import { CategorySelect } from '../components/CategorySelect';
import { createPortal } from 'react-dom';

import { CustomSelect } from '../components/CustomSelect';

const hd = new Holidays('DE', 'BB');

function LiveClock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-center w-full">
      <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-white leading-none">
        {format(currentTime, 'HH:mm')}
      </h1>
      <p className="text-xs font-medium text-[#86868B] mt-2 sm:mt-3 capitalize">
        {format(currentTime, 'EEEE, d. MMMM', { locale: de })}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { modules } = useSettings();
  
  const [todos, setTodos] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [shoppingItems, setShoppingItems] = useState<any[]>([]);
  const [nextHoliday, setNextHoliday] = useState<{ date: Date, name: string } | null>(null);

  const [loading, setLoading] = useState(true);

  const [editItem, setEditItem] = useState<{ type: 'todos' | 'notes' | 'prompts' | 'links' | 'appointments', data: any } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, coll: string, id: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    
    let dateIter = new Date();
    let foundHoliday = null;
    for (let i = 0; i < 365; i++) {
      const holidayArr = hd.isHoliday(dateIter);
      if (holidayArr && holidayArr.length > 0) {
        foundHoliday = { date: new Date(dateIter), name: holidayArr[0].name };
        break;
      }
      dateIter = addDays(dateIter, 1);
    }
    setNextHoliday(foundHoliday);

    const unsubscribes: any[] = [];
    
    const shoppingQ = query(collection(db, 'shoppinglist'), where('userId', '==', user.uid));
    unsubscribes.push(onSnapshot(shoppingQ, snap => {
      const allItems = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const pendingItems = allItems.filter(i => !i.completed).sort((a,b) => a.order - b.order);
      setShoppingItems(pendingItems);
    }));

    const todosQ = query(collection(db, 'todos'), where('userId', '==', user.uid));
    unsubscribes.push(onSnapshot(todosQ, snap => {
      const todayStart = startOfDay(new Date());
      const allTodos = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const processedTodos = allTodos
        .filter(t => !t.completed && (!t.dueDate || new Date(t.dueDate) >= todayStart))
        .sort((a, b) => {
           if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
           if (a.dueDate) return -1;
           if (b.dueDate) return 1;
           const pMap = { high: 0, medium: 1, low: 2 };
           const pDiff = (pMap[a.priority as keyof typeof pMap] || 1) - (pMap[b.priority as keyof typeof pMap] || 1);
           if (pDiff !== 0) return pDiff;
           return (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0);
        });
      setTodos(processedTodos);
    }));

    const appQ = query(collection(db, 'appointments'), where('userId', '==', user.uid));
    unsubscribes.push(onSnapshot(appQ, snap => {
      const todayStart = startOfDay(new Date());
      const allApp = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const upApp = allApp
        .filter(t => t.dueDate && (new Date(t.dueDate) >= todayStart))
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      setAppointments(upApp);
    }));

    const notesQ = query(collection(db, 'notes'), where('userId', '==', user.uid));
    unsubscribes.push(onSnapshot(notesQ, snap => {
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))
        .filter(n => n.isPinned)
        .sort((a, b) => (b.updatedAt?.toDate?.()?.getTime() || 0) - (a.updatedAt?.toDate?.()?.getTime() || 0)));
    }));

    const promptsQ = query(collection(db, 'prompts'), where('userId', '==', user.uid));
    unsubscribes.push(onSnapshot(promptsQ, snap => {
      setPrompts(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))
        .filter(p => p.isPinned)
        .sort((a, b) => {
          const aDate = a.updatedAt?.toDate?.() || (a.updatedAt ? new Date(a.updatedAt) : new Date(0));
          const bDate = b.updatedAt?.toDate?.() || (b.updatedAt ? new Date(b.updatedAt) : new Date(0));
          return bDate.getTime() - aDate.getTime();
        }));
    }));

    const linksQ = query(collection(db, 'links'), where('userId', '==', user.uid));
    unsubscribes.push(onSnapshot(linksQ, snap => {
      setLinks(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))
        .filter(l => l.isPinned)
        .sort((a, b) => {
          const aDate = a.createdAt?.toDate?.() || (a.createdAt ? new Date(a.createdAt) : new Date(0));
          const bDate = b.createdAt?.toDate?.() || (b.createdAt ? new Date(b.createdAt) : new Date(0));
          return bDate.getTime() - aDate.getTime();
        }));
    }));

    const contactsQ = query(collection(db, 'contacts'), where('userId', '==', user.uid), orderBy('name', 'asc'));
    unsubscribes.push(onSnapshot(contactsQ, snap => {
      setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    }));

    const transQ = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    unsubscribes.push(onSnapshot(transQ, snap => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))
        .sort((a, b) => {
          const aDate = a.date?.toDate?.() || (a.date ? new Date(a.date) : new Date(0));
          const bDate = b.date?.toDate?.() || (b.date ? new Date(b.date) : new Date(0));
          return bDate.getTime() - aDate.getTime();
        }));
    }));

    const loadTimeout = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => {
      unsubscribes.forEach(u => u());
      clearTimeout(loadTimeout);
    };
  }, [user]);

  const handleDelete = async () => {
    if (!deleteModal) return;
    try { 
      await deleteDoc(doc(db, deleteModal.coll, deleteModal.id));
      setDeleteModal(null);
    } catch (e: any) { 
      console.error('Delete error:', e); 
      alert('Fehler beim Löschen: ' + (e.message || 'Unbekannter Fehler'));
    }
  };

  const handleToggleTodo = async (e: React.MouseEvent, todo: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const todoRef = doc(db, 'todos', todo.id);
      const isCompleted = !todo.completed;
      await updateDoc(todoRef, { 
        completed: isCompleted, 
        updatedAt: serverTimestamp() 
      });
    } catch (e: any) { 
      console.error('Toggle todo error:', e);
    }
  };

  const handleToggleShoppingItem = async (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'shoppinglist', item.id), { completed: !item.completed });
    } catch (err) {
      console.error('Toggle shopping item error:', err);
    }
  };

    const stats = transactions.reduce((acc, t) => {
      const d = t.date?.toDate?.() || (t.date ? new Date(t.date) : new Date());
      const isThisMonth = format(d, 'yyyy-MM') === format(new Date(), 'yyyy-MM');
      if (isThisMonth) {
      if (t.type === 'income') acc.income += t.amount;
      else acc.expenses += t.amount;
    }
    return acc;
  }, { income: 0, expenses: 0 });

  const balance = stats.income - stats.expenses;

  const formatEuro = (amount: number) => {
    return amount.toLocaleString('de-DE', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).replace(',', '.');
  };

  const DashboardCard = ({ title, icon: Icon, hColor, to, children, color = '#60A5FA' }: any) => (
    <div className="w-full max-w-[480px] mx-auto md:max-w-none">
      <div className="glass-card flex flex-col rounded-[2.5rem] overflow-hidden h-full border border-black/5 dark:border-white/[0.06] shadow-sm hover:shadow-md transition-shadow">
        <div className="px-6 py-5 flex justify-between items-center">
          <Link to={to} className="flex items-center gap-3">
             <div style={{ color: color }} className="shrink-0">
               <Icon size={20} />
             </div>
             <h2 className="pro-heading">{title}</h2>
          </Link>
        </div>
        <div className="px-6 pb-6 pt-0 flex-1 flex flex-col gap-3">
          {children}
        </div>
      </div>
    </div>
  );

  const renderCard = (moduleId: string) => {
    switch (moduleId) {
      case 'calendar':
        return (
          <DashboardCard key="calendar" title="Termine" icon={CalendarIcon} to="/calendar" color="#60A5FA">
            {appointments.length > 0 ? (
               <div className={cn("flex flex-col -mx-6 max-h-[222px] md:max-h-[296px] overflow-y-auto custom-scrollbar", nextHoliday ? "-mb-3" : "-mb-6")}>
                {appointments.map(app => (
                  <div key={app.id} className="refined-list-item h-[74px] shrink-0 flex items-center gap-4 px-6 relative group border-l-[3px] rounded-none" style={{ borderLeftColor: app.color || '#60A5FA' }}>
                    <div className="w-10 h-10 flex flex-col items-center justify-center shrink-0 ml-1">
                       <span className="text-xs font-black text-slate-900 dark:text-white leading-none">{format(app.dueDate?.toDate?.() || new Date(app.dueDate), 'dd')}</span>
                       <span className="text-[8px] font-bold text-brand-muted uppercase tracking-tighter" style={{ opacity: 0.7 }}>{format(app.dueDate?.toDate?.() || new Date(app.dueDate), 'MMM', { locale: de })}</span>
                    </div>
                    <div className="flex-1 min-w-0 pr-10">
                      <span className="text-xs font-bold text-brand block truncate tracking-tight">{app.task}</span>
                      {app.hasTime !== false && <span className="text-xs font-medium text-brand-muted">{format(app.dueDate?.toDate?.() || new Date(app.dueDate), 'HH:mm')} Uhr</span>}
                    </div>
                    <div className="absolute right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setEditItem({ type: 'appointments', data: app }); }} className="p-1.5 text-brand-muted hover:text-accent transition-colors"><Edit2 size={12} /></button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteModal({ open: true, coll: 'appointments', id: app.id }); }} className="p-1.5 text-brand-muted hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
               </div>
            ) : (
               <div className="text-center py-10 opacity-20 flex flex-col items-center">
                 <CalendarIcon size={40} strokeWidth={1} />
                 <span className="text-xs font-bold uppercase mt-3 tracking-widest text-xs">Frei</span>
               </div>
            )}
            {nextHoliday && (
              <div className="mt-auto pt-6 border-t border-black/5 dark:border-white/5 flex justify-between items-center -mx-6 -mb-6 p-6">
                 <span className="text-xs font-bold text-[#86868B] uppercase tracking-wider">Feiertag</span>
                 <div className="text-right">
                    <div className="text-sm font-bold text-brand dark:text-white">{nextHoliday.name}</div>
                    <div className="text-xs font-medium text-[#86868B]">{format(nextHoliday.date, 'dd.MM')}</div>
                 </div>
              </div>
            )}
          </DashboardCard>
        );
      case 'tasks':
        return (
          <DashboardCard key="tasks" title="Aufgaben" icon={CheckSquare} to="/tasks" color="#60A5FA">
            {todos.length > 0 ? (
               <div className="flex flex-col -mx-6 -mb-6 max-h-[222px] md:max-h-[296px] overflow-y-auto custom-scrollbar">
                  {todos.map(todo => (
                    <div key={todo.id} className="refined-list-item flex items-center gap-4 px-6 relative group border-l-[3px] rounded-none shrink-0"
                      style={{ 
                        height: todo.dueDate ? '74px' : '37px',
                        borderLeftColor: 
                          todo.priority === 'high' ? '#FF3B30' : 
                          todo.priority === 'medium' ? '#FF9500' : 
                          '#34C759'
                      }}
                    >
                      <button 
                        type="button" 
                        onClick={(e) => handleToggleTodo(e, todo)} 
                        className={cn(
                          "flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ml-1 relative z-30", 
                          todo.completed ? "bg-accent border-accent text-white" : "border-slate-300 dark:border-white/10 text-transparent hover:border-accent bg-transparent"
                        )}
                      >
                        <Check size={10} className="stroke-[4]" />
                      </button>
                      <div 
                        className="flex-1 min-w-0 pr-10 cursor-pointer" 
                        onClick={() => setEditItem({ type: 'todos', data: todo })}
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xs font-bold block truncate tracking-tight", todo.completed ? "text-brand-muted line-through opacity-60" : "text-slate-900 dark:text-white")}>{todo.task}</span>
                        </div>
                        {todo.dueDate && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-xs font-bold text-brand-muted uppercase tracking-tighter">
                              {format(todo.dueDate && todo.dueDate.toDate ? todo.dueDate.toDate() : new Date(todo.dueDate), 'dd. MMM', { locale: de })}{todo.hasTime ? ` • ${format(todo.dueDate && todo.dueDate.toDate ? todo.dueDate.toDate() : new Date(todo.dueDate), 'HH:mm')} Uhr` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="absolute right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setEditItem({ type: 'todos', data: todo }); }} className="p-1.5 text-brand-muted hover:text-brand transition-colors"><Edit2 size={12} /></button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteModal({ open: true, coll: 'todos', id: todo.id }); }} className="p-1.5 text-brand-muted hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
               </div>
            ) : (
               <div className="text-center py-10 opacity-20 flex flex-col items-center">
                 <CheckSquare size={40} strokeWidth={1} />
                 <span className="text-xs font-bold uppercase mt-3 tracking-widest text-xs">Gute Arbeit</span>
               </div>
            )}
          </DashboardCard>
        );
      case 'notes':
        return (
          <DashboardCard key="notes" title="Notizen" icon={FileText} to="/notes" color="#AF52DE">
            {notes.length > 0 ? (
               <div className="flex flex-col -mx-6 -mb-6 max-h-[222px] md:max-h-[296px] overflow-y-auto custom-scrollbar">
                {notes.map(note => (
                  <div key={note.id} className="refined-list-item h-[74px] shrink-0 flex items-center justify-between gap-3 px-6 relative group border-l-[3px] rounded-none" style={{ borderLeftColor: note.color || '#AF52DE' }}>
                    <div className="flex items-center gap-3 overflow-hidden ml-1">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate tracking-tight">{note.title || 'Ohne Titel'}</h4>
                        <span className="text-xs font-bold text-brand-muted/70 block mt-0.5 uppercase tracking-tighter">
                          {format(note.updatedAt?.toDate?.() || (note.updatedAt ? new Date(note.updatedAt) : new Date()), 'dd. MMM', { locale: de })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setEditItem({ type: 'notes', data: note }); }} className="p-1.5 text-brand-muted hover:text-brand transition-colors"><Edit2 size={12} /></button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteModal({ open: true, coll: 'notes', id: note.id }); }} className="p-1.5 text-brand-muted hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
               </div>
            ) : (
               <div className="text-center py-10 opacity-20 flex flex-col items-center">
                 <FileText size={40} strokeWidth={1} />
                 <span className="text-xs font-bold uppercase mt-3 tracking-widest text-xs">Leer</span>
               </div>
            )}
          </DashboardCard>
        );
      case 'household':
        return (
          <DashboardCard key="household" title="Haushaltsbuch" icon={Wallet} to="/household" color="#34C759">
            <div className="grid grid-cols-3 gap-2 mb-2 p-3">
              <div className="text-center">
                <div className="text-[8px] font-bold text-[#86868B] uppercase tracking-wider mb-0.5">Plus</div>
                <div className="text-xs font-black text-slate-900 dark:text-white">{formatEuro(stats.income || 0)}€</div>
              </div>
              <div className="text-center border-x border-black/5 dark:border-white/5">
                <div className="text-[8px] font-bold text-[#86868B] uppercase tracking-wider mb-0.5">Minus</div>
                <div className="text-xs font-black text-slate-900 dark:text-white">{formatEuro(stats.expenses || 0)}€</div>
              </div>
              <div className="text-center">
                <div className="text-[8px] font-bold text-[#86868B] uppercase tracking-wider mb-0.5">Bilanz</div>
                <div className="text-xs font-black text-slate-900 dark:text-white">{formatEuro(balance || 0)}€</div>
              </div>
            </div>
            {transactions.length > 0 ? (
               <div className="flex flex-col -mx-6 -mb-6 max-h-[168px] md:max-h-[224px] overflow-y-auto custom-scrollbar">
                 {transactions.map(t => (
                   <div key={t.id} className="flex items-center gap-3 px-6 h-[56px] shrink-0 refined-list-item rounded-none">
                     <div className={cn("w-8 h-8 flex items-center justify-center shrink-0 ml-1", t.type === 'income' ? "text-green-500" : "text-red-500")}>
                       {t.type === 'income' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                     </div>
                     <div className="flex-1 min-w-0">
                       <div className="text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7]"> {t.description}</div>
                       <div className="text-xs font-medium text-[#86868B]">
                        {format(t.date?.toDate?.() || (t.date ? new Date(t.date) : new Date()), 'dd.MM')}
                      </div>
                     </div>
                     <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1">
                       <span className={t.type === 'income' ? "text-green-500" : "text-red-500"}>
                         {t.type === 'income' ? '+' : '-'}
                       </span>
                       {formatEuro(t.amount)}€
                     </div>
                   </div>
                 ))}
               </div>
            ) : (
               <div className="text-center py-10 opacity-20 flex flex-col items-center">
                 <Wallet size={40} strokeWidth={1} />
                 <span className="text-xs font-bold uppercase mt-3 tracking-widest text-xs">Keine Einträge</span>
               </div>
            )}
          </DashboardCard>
        );
      case 'prompts':
        return (
          <DashboardCard key="prompts" title="Prompts" icon={MessageSquare} to="/prompts" color="#FF9500">
            {prompts.length > 0 ? (
               <div className="flex flex-col -mx-6 -mb-6 max-h-[222px] md:max-h-[296px] overflow-y-auto custom-scrollbar">
                {prompts.map(prompt => (
                  <div key={prompt.id} className="refined-list-item h-[74px] shrink-0 flex items-center justify-between gap-3 px-6 relative group border-l-[3px] rounded-none" style={{ borderLeftColor: prompt.color || '#FF9500' }}>
                    <div className="flex items-center gap-3 overflow-hidden ml-1">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-brand truncate tracking-tight">{prompt.title || 'Ohne Titel'}</h4>
                        <p className="text-xs font-medium text-brand-muted line-clamp-1 mt-0.5">{prompt.content}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setEditItem({ type: 'prompts', data: prompt }); }} className="p-1.5 text-brand-muted hover:text-brand transition-colors"><Edit2 size={12} /></button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteModal({ open: true, coll: 'prompts', id: prompt.id }); }} className="p-1.5 text-brand-muted hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
               </div>
            ) : (
               <div className="text-center py-10 opacity-20 flex flex-col items-center">
                 <MessageSquare size={40} strokeWidth={1} />
                 <span className="text-xs font-bold uppercase mt-3 tracking-widest text-xs">Keine</span>
               </div>
            )}
          </DashboardCard>
        );
      case 'links':
        return (
          <DashboardCard key="links" title="Links" icon={LinkIcon} to="/links" color="#5856D6">
            {links.length > 0 ? (
               <div className="flex flex-col -mx-6 -mb-6 max-h-[222px] md:max-h-[296px] overflow-y-auto custom-scrollbar">
                {links.map(link => {
                  const domain = link.url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
                  return (
                  <div key={link.id} className="refined-list-item relative group overflow-hidden border-l-[3px] rounded-none shrink-0 h-[74px]" style={{ borderLeftColor: link.color || '#5856D6' }}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-6 pr-10 ml-1 h-full w-full">
                      <div className="w-10 h-10 flex items-center justify-center shrink-0 overflow-hidden relative">
                        <img src={`https://www.google.com/s2/favicons?sz=64&domain=${domain}`} alt="" className="w-6 h-6 object-contain shadow-sm" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%2386868B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>'; }} />
                        {link.isPinned && <div className="absolute top-0 right-0 p-0.5 bg-accent rounded-bl-lg"><Pin size={6} className="text-white fill-white" /></div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-brand block truncate tracking-tight">{link.title}</span>
                        <span className="text-xs text-brand-muted block font-medium uppercase tracking-tighter opacity-70 leading-normal mt-0.5 break-all line-clamp-1">{domain}</span>
                      </div>
                    </a>
                  </div>
                )})}
               </div>
            ) : (
               <div className="text-center py-10 opacity-20 flex flex-col items-center">
                 <LinkIcon size={40} strokeWidth={1} />
                 <span className="text-xs font-bold uppercase mt-3 tracking-widest text-xs">Keine</span>
               </div>
            )}
          </DashboardCard>
        );
      case 'contacts':
        return (
          <DashboardCard key="contacts" title="Kontakte" icon={Users} to="/contacts" color="#FF2D55">
            {contacts.length > 0 ? (
              <div className="flex flex-col -mx-6 -mb-6 max-h-[222px] md:max-h-[296px] overflow-y-auto custom-scrollbar">
                {contacts.map(contact => (
                  <Link 
                    key={contact.id} 
                    to={`/contacts?id=${contact.id}`} 
                    className="refined-list-item h-[74px] shrink-0 flex flex-col items-center justify-center gap-0.5 px-6 cursor-pointer border-l-[3px] rounded-none text-center"
                    style={{ borderLeftColor: '#FFFFFF' }}
                  >
                    <div className="min-w-0 w-full flex flex-col items-center justify-center">
                      <span className="text-base font-bold text-slate-900 dark:text-white block truncate tracking-tight w-full">{contact.name}</span>
                      {contact.phone && <span className="text-sm text-brand-muted block truncate font-medium uppercase tracking-tighter opacity-70 leading-tight w-full">{contact.phone}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 opacity-20 flex flex-col items-center">
                <Users size={40} strokeWidth={1} />
                <span className="text-xs font-bold uppercase mt-3 tracking-widest text-xs">Keine Kontakte</span>
              </div>
            )}
          </DashboardCard>
        );
      case 'shoppinglist':
        return (
          <DashboardCard key="shoppinglist" title="Einkaufsliste" icon={ShoppingCart} to="/shoppinglist" color="#FF3B30">
            {shoppingItems.length > 0 ? (
               <div className="flex flex-col -mx-6 -mb-6 max-h-[222px] md:max-h-[296px] overflow-y-auto custom-scrollbar">
                  {shoppingItems.map(item => (
                    <div key={item.id} className="refined-list-item h-[56px] flex items-center gap-4 px-6 shrink-0 relative group">
                      <button 
                        type="button" 
                        onClick={(e) => handleToggleShoppingItem(e, item)} 
                        className="flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer border-[#86868B]/30 text-transparent hover:border-[#FF3B30] bg-transparent"
                      >
                        <Check size={12} className="stroke-[3]" />
                      </button>
                      <div className="flex-1 min-w-0 cursor-pointer">
                        <span className="text-[15px] font-medium block truncate tracking-tight text-slate-900 dark:text-[#F5F5F7]">{item.name}</span>
                      </div>
                    </div>
                  ))}
               </div>
            ) : (
               <div className="text-center py-10 opacity-20 flex flex-col items-center">
                 <ShoppingCart size={40} strokeWidth={1} />
                 <span className="text-[10px] font-bold uppercase mt-3 tracking-widest">Alles erledigt</span>
               </div>
            )}
          </DashboardCard>
        );
      case 'news':
        return <NewsWidget key="news" />;
    }
  };

  return (
    <div className="max-w-[1500px] mx-auto flex flex-col relative z-10 w-full px-6 sm:px-8 pb-10">
      <header className="mb-8 mt-4 flex justify-center w-full px-1">
        <LiveClock />
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {[1,2,3,4,5,6,7,8,9].map(i => <div key={i} className="h-80 bg-[#1c1c1e]/10 rounded-[2.5rem] border border-white/5 shadow-sm" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8 mt-4 md:mt-0 flex-1">
          {modules
             .filter(m => m.enabled && m.id !== 'dashboard' && m.id !== 'settings' && m.id !== 'passwords')
             .map(m => renderCard(m.id))}
        </div>
      )}

      {editItem && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
           <div className="glass-card w-full max-w-[480px] md:max-w-4xl h-full max-h-[85vh] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl relative">
              <div className="flex-1 overflow-hidden">
                {editItem.type === 'notes' && <NoteEditor note={editItem.data} onBack={() => setEditItem(null)} />}
                {editItem.type === 'prompts' && <PromptEditor prompt={editItem.data} onBack={() => setEditItem(null)} />}
                {editItem.type === 'todos' && <TaskEditForm todo={editItem.data} onBack={() => setEditItem(null)} />}
                {editItem.type === 'appointments' && <AppointmentEditForm appointment={editItem.data} onBack={() => setEditItem(null)} />}
                {editItem.type === 'links' && <LinkEditForm link={editItem.data} onBack={() => setEditItem(null)} />}
              </div>
           </div>
        </div>,
        document.body
      )}

      {deleteModal && deleteModal.open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="glass-card w-full max-w-[480px] rounded-[2.5rem] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.12)]">
            <h3 className="text-2xl font-black text-red-500 mb-2 tracking-tight">Löschen?</h3>
            <p className="text-sm text-[#86868B] mb-8">Dieser Eintrag wird unwiderruflich entfernt.</p>
            <div className="flex flex-col gap-3">
              <button type="button" onClick={handleDelete} className="btn-cancel w-full">Löschen</button>
              <button type="button" onClick={() => setDeleteModal(null)} className="glass-button-secondary w-full">Behalten</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function TaskEditForm({ todo, onBack }: { todo: any, onBack: () => void }) {
  const [task, setTask] = useState(todo.task);
  const [priority, setPriority] = useState(todo.priority || 'medium');
  const [date, setDate] = useState(() => {
    if (!todo.dueDate) return '';
    try {
      return format(new Date(todo.dueDate), 'yyyy-MM-dd');
    } catch { return ''; }
  });
  const [time, setTime] = useState(() => {
    if (!todo.dueDate || todo.hasTime === false) return '';
    try {
      return format(new Date(todo.dueDate), 'HH:mm');
    } catch { return ''; }
  });
  const [categoryId, setCategoryId] = useState(todo.categoryId || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let finalDueDate = todo.dueDate;
      if (date) {
        finalDueDate = new Date(`${date}T${time || '00:00'}:00`).toISOString();
      } else {
        finalDueDate = null;
      }

      await updateDoc(doc(db, 'todos', todo.id), {
        task: task.trim(),
        priority,
        dueDate: finalDueDate,
        hasTime: !!time,
        categoryId,
        updatedAt: serverTimestamp()
      });
      onBack();
    } catch (error) {
      console.error("Error updating task:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-10 overflow-y-auto max-h-[85vh] custom-scrollbar relative">
      <div className="flex items-center justify-between mb-10">
        <h3 className="text-2xl font-black text-brand tracking-tight">Aufgabe bearbeiten</h3>
        <button onClick={onBack} className="p-2 text-brand-muted hover:text-brand transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5">
          <X size={24} />
        </button>
      </div>
      
      <div className="space-y-4 mb-8">
        <div className="space-y-1.5 flex flex-col">
          <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Aufgabe</label>
          <input type="text" value={task} onChange={(e) => setTask(e.target.value)} className="glass-input h-12" required />
        </div>
        <div className="space-y-1.5 flex flex-col">
          <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Priorität</label>
          <CustomSelect 
            value={priority} 
            onChange={(val) => setPriority(val as any)} 
            options={[
              { value: 'high', label: '🔴 Hoch' },
              { value: 'medium', label: '🟡 Mittel' },
              { value: 'low', label: '🟢 Niedrig' }
            ]}
            placeholder="Priorität wählen"
          />
        </div>
        <div className="space-y-1.5 flex flex-col">
          <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Kategorie</label>
          <CategorySelect type="task" value={categoryId} onChange={setCategoryId} className="h-12" />
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5 flex flex-col">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Datum</label>
            <div className="relative">
              <input type="date" id="task-edit-date" value={date} onChange={(e) => setDate(e.target.value)} className="glass-input h-12 w-full" />
              <CalendarIcon 
                size={18} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted cursor-pointer hover:text-brand" 
                onClick={() => {
                  const input = document.getElementById('task-edit-date') as any;
                  if (input) {
                    if (document.activeElement === input) {
                      input.blur();
                    } else {
                      input.showPicker?.() || input.focus();
                    }
                  }
                }}
              />
            </div>
          </div>
          <div className="space-y-1.5 flex flex-col">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Uhrzeit</label>
            <div className="relative">
              <input type="time" id="task-edit-time" value={time} onChange={(e) => setTime(e.target.value)} className="glass-input h-12 w-full" />
              <ClockIcon 
                size={18} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted cursor-pointer hover:text-brand" 
                onClick={() => {
                  const input = document.getElementById('task-edit-time') as any;
                  if (input) {
                    if (document.activeElement === input) {
                      input.blur();
                    } else {
                      input.showPicker?.() || input.focus();
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button type="button" onClick={handleSave} disabled={isSaving} className="btn-green-glow w-full h-14">
          {isSaving ? "Speichert..." : "Speichern"}
        </button>
        <button type="button" onClick={onBack} className="btn-red-glow w-full h-14">
          Abbrechen
        </button>
      </div>
    </div>
  );
}

function AppointmentEditForm({ appointment, onBack }: { appointment: any, onBack: () => void }) {
  const [task, setTask] = useState(appointment.task);
  const [date, setDate] = useState(() => {
    if (!appointment.dueDate) return '';
    try {
      return format(new Date(appointment.dueDate), 'yyyy-MM-dd');
    } catch { return ''; }
  });
  const [time, setTime] = useState(() => {
    if (!appointment.dueDate || appointment.hasTime === false) return '';
    try {
      return format(new Date(appointment.dueDate), 'HH:mm');
    } catch { return ''; }
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let finalDueDate = appointment.dueDate;
      if (date) {
        finalDueDate = new Date(`${date}T${time || '00:00'}:00`).toISOString();
      }
      
      await updateDoc(doc(db, 'appointments', appointment.id), {
        task: task.trim(),
        dueDate: finalDueDate,
        hasTime: !!time,
        updatedAt: serverTimestamp()
      });
      onBack();
    } catch (error) {
      console.error("Error updating appointment:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-10 relative">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-black text-brand tracking-tight">Termin bearbeiten</h3>
        <button onClick={onBack} className="p-2 text-brand-muted hover:text-brand transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5">
          <X size={24} />
        </button>
      </div>
      
      <div className="space-y-4 mb-8">
        <div className="space-y-1.5 flex flex-col">
          <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Titel</label>
          <input type="text" value={task} onChange={(e) => setTask(e.target.value)} className="glass-input h-12" required />
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5 flex flex-col">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Datum</label>
            <div className="relative">
              <input type="date" id="app-date-input" value={date} onChange={(e) => setDate(e.target.value)} className="glass-input h-12 w-full" />
              <CalendarIcon 
                size={18} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted cursor-pointer hover:text-brand" 
                onClick={() => {
                  const input = document.getElementById('app-date-input') as any;
                  if (input) {
                    if (document.activeElement === input) {
                      input.blur();
                    } else {
                      input.showPicker?.() || input.focus();
                    }
                  }
                }}
              />
            </div>
          </div>
          <div className="space-y-1.5 flex flex-col">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Uhrzeit</label>
            <div className="relative">
              <input type="time" id="app-time-input" value={time} onChange={(e) => setTime(e.target.value)} className="glass-input h-12 w-full" />
              <ClockIcon 
                size={18} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted cursor-pointer hover:text-brand" 
                onClick={() => {
                  const input = document.getElementById('app-time-input') as any;
                  if (input) {
                    if (document.activeElement === input) {
                      input.blur();
                    } else {
                      input.showPicker?.() || input.focus();
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button type="button" onClick={handleSave} disabled={isSaving || !task.trim()} className="btn-green-glow w-full h-14">
          {isSaving ? "Speichert..." : "Speichern"}
        </button>
        <button type="button" onClick={onBack} className="btn-red-glow w-full h-14">
          Abbrechen
        </button>
      </div>
    </div>
  );
}

function NewsWidget() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent('https://www.tagesschau.de/xml/rss2/')}`);
        const data = await res.json();
        if (data.items) {
          setItems(data.items.slice(0, 3));
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchNews();
  }, []);

  return (
    <div className="w-full max-w-[480px] mx-auto md:max-w-none">
      <div className="glass-card flex flex-col rounded-[2.5rem] overflow-hidden h-full border border-black/5 dark:border-white/[0.06] shadow-sm hover:shadow-md transition-shadow">
        <div className="px-6 py-5 flex justify-between items-center">
          <Link to="/news" className="flex items-center gap-3">
             <div style={{ color: '#FF9500' }} className="shrink-0">
               <Rss size={20} />
             </div>
             <h2 className="pro-heading">Nachrichten</h2>
          </Link>
        </div>
        <div className="px-6 pb-6 pt-0 flex-1 flex flex-col gap-3">
          {loading ? (
             <div className="space-y-4">
               {[1,2,3].map(i => (
                 <div key={i} className="animate-pulse h-12 bg-black/5 dark:bg-white/5 rounded-xl" />
               ))}
             </div>
          ) : items.length > 0 ? (
             <div className="flex flex-col gap-3">
               {items.map((item, i) => (
                 <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" className="block group hover:bg-black/5 dark:hover:bg-white/5 p-2 -mx-2 rounded-xl transition-colors">
                   <h3 className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight line-clamp-2">{item.title}</h3>
                   <div className="flex items-center gap-1.5 mt-1.5 opacity-70">
                     <span className="text-[10px] font-bold uppercase tracking-wider text-brand">Tagesschau</span>
                     <span className="text-[10px]">&bull;</span>
                     <span className="text-[10px] font-medium text-brand-muted">{new Date(item.pubDate).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                   </div>
                 </a>
               ))}
             </div>
          ) : (
             <div className="text-center py-6 opacity-40 flex flex-col items-center">
               <Rss size={32} strokeWidth={1.5} />
               <span className="text-[10px] font-bold uppercase mt-2 tracking-widest">Keine News</span>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LinkEditForm({ link, onBack }: { link: any, onBack: () => void }) {
  const [title, setTitle] = useState(link.title);
  const [url, setUrl] = useState(link.url);
  const [categoryId, setCategoryId] = useState(link.categoryId || '');
  const [color, setColor] = useState(link.color || '');
  const [isSaving, setIsSaving] = useState(false);

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
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }
    try {
      await updateDoc(doc(db, 'links', link.id), {
        title: title.trim(),
        url: finalUrl,
        categoryId,
        color,
        updatedAt: serverTimestamp()
      });
      onBack();
    } catch (error) {
      console.error("Error updating link:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-10 relative">
      <div className="flex items-center justify-between mb-10">
        <h3 className="text-2xl font-black text-brand tracking-tight">Link bearbeiten</h3>
        <button onClick={onBack} className="p-2 text-brand-muted hover:text-brand transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5">
          <X size={24} />
        </button>
      </div>
      
      <div className="space-y-4 mb-8">
        <div className="space-y-1.5 flex flex-col">
          <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Titel</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="glass-input h-12" required />
        </div>
        <div className="space-y-1.5 flex flex-col">
          <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">URL</label>
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} className="glass-input h-12" required />
        </div>
        <div className="space-y-1.5 flex flex-col">
          <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Kategorie</label>
          <CategorySelect type="link" value={categoryId} onChange={setCategoryId} className="h-12" />
        </div>
        <div className="space-y-1.5 flex flex-col">
          <label className="text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Farbe</label>
          <div className="flex items-center gap-2 h-10">
             {colors.map(c => (
               <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all",
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

      <div className="flex flex-col gap-3">
        <button type="button" onClick={handleSave} disabled={isSaving} className="btn-green-glow w-full h-14">
          {isSaving ? "Speichert..." : "Speichern"}
        </button>
        <button type="button" onClick={onBack} className="btn-red-glow w-full h-14">
          Abbrechen
        </button>
      </div>
    </div>
  );
}
