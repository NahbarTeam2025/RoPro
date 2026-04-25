import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { format, startOfDay, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { CheckSquare, Calendar as CalendarIcon, FileText, MessageSquare, Link as LinkIcon, Plus, ChevronRight, Check, Edit2, Trash2, Search, X, Save, Wallet, ArrowUpCircle, ArrowDownCircle, Zap, Pin, Users, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import Holidays from 'date-holidays';
import { NoteEditor } from '../components/NoteEditor';
import { PromptEditor } from '../components/PromptEditor';
import { CategorySelect } from '../components/CategorySelect';
import { createPortal } from 'react-dom';

const hd = new Holidays('DE', 'BB');

function Clock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-left">
      <h1 className="text-6xl font-black tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] leading-none">
        {format(currentTime, 'HH:mm')}
      </h1>
      <p className="text-xl font-medium text-[#86868B] mt-3 capitalize font-sans">
        {format(currentTime, 'EEEE, d. MMMM', { locale: de })}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  
  const [todos, setTodos] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
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
    
    const todosQ = query(collection(db, 'todos'), where('userId', '==', user.uid));
    unsubscribes.push(onSnapshot(todosQ, snap => {
      const allTodos = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const processedTodos = allTodos
        .sort((a, b) => {
           if (a.completed !== b.completed) return a.completed ? 1 : -1;
           if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
           if (a.dueDate) return -1;
           if (b.dueDate) return 1;
           const pMap = { high: 0, medium: 1, low: 2 };
           const pDiff = (pMap[a.priority as keyof typeof pMap] || 1) - (pMap[b.priority as keyof typeof pMap] || 1);
           if (pDiff !== 0) return pDiff;
           return (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0);
        })
        .slice(0, 3);
      setTodos(processedTodos);
    }));

    const appQ = query(collection(db, 'appointments'), where('userId', '==', user.uid));
    unsubscribes.push(onSnapshot(appQ, snap => {
      const todayStart = startOfDay(new Date());
      const allApp = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const upApp = allApp
        .filter(t => t.dueDate && (new Date(t.dueDate) >= todayStart))
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 3);
      setAppointments(upApp);
    }));

    const notesQ = query(collection(db, 'notes'), where('userId', '==', user.uid));
    unsubscribes.push(onSnapshot(notesQ, snap => {
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))
        .sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return (b.updatedAt?.toDate?.()?.getTime() || 0) - (a.updatedAt?.toDate?.()?.getTime() || 0);
        })
        .slice(0, 3));
    }));

    const promptsQ = query(collection(db, 'prompts'), where('userId', '==', user.uid));
    unsubscribes.push(onSnapshot(promptsQ, snap => {
      setPrompts(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))
        .sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return (b.updatedAt?.toDate?.()?.getTime() || 0) - (a.updatedAt?.toDate?.()?.getTime() || 0);
        })
        .slice(0, 3));
    }));

    const linksQ = query(collection(db, 'links'), where('userId', '==', user.uid));
    unsubscribes.push(onSnapshot(linksQ, snap => {
      setLinks(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))
        .sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0);
        })
        .slice(0, 3));
    }));

    const contactsQ = query(collection(db, 'contacts'), where('userId', '==', user.uid), orderBy('name', 'asc'));
    unsubscribes.push(onSnapshot(contactsQ, snap => {
      setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    }));

    const transQ = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    unsubscribes.push(onSnapshot(transQ, snap => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))
        .sort((a, b) => (b.date?.toDate?.()?.getTime() || 0) - (a.date?.toDate?.()?.getTime() || 0)));
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
    e.stopPropagation();
    try {
      const todoRef = doc(db, 'todos', todo.id);
      await updateDoc(todoRef, { 
        completed: !todo.completed, 
        updatedAt: serverTimestamp() 
      });
    } catch (e: any) { 
      console.error('Toggle todo error:', e);
    }
  };

  const stats = transactions.reduce((acc, t) => {
    const d = t.date?.toDate?.() || new Date();
    const isThisMonth = format(d, 'yyyy-MM') === format(new Date(), 'yyyy-MM');
    if (isThisMonth) {
      if (t.type === 'income') acc.income += t.amount;
      else acc.expenses += t.amount;
    }
    return acc;
  }, { income: 0, expenses: 0 });

  const balance = stats.income - stats.expenses;

  const DashboardCard = ({ title, icon: Icon, hColor, to, children, color = '#007AFF' }: any) => (
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

  return (
    <div className="max-w-[1500px] mx-auto flex flex-col relative z-10 w-full px-0 sm:px-8 pb-10">
      <header className="mb-12 mt-4 flex flex-row items-start justify-between relative w-full">
        <Clock />
        <div className="flex flex-col gap-3">
          <a href="https://www.google.com" target="_blank" rel="noopener noreferrer" className="p-1 hover:scale-110 transition-all group flex items-center justify-center" title="Google Suche">
            <img 
              src="https://www.google.com/s2/favicons?sz=64&domain=google.com" 
              alt="Google" 
              className="w-6 h-6 object-contain" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) {
                  const icon = document.createElement('div');
                  icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';
                  icon.className = "text-[#1D1D1F] dark:text-[#F5F5F7]";
                  parent.appendChild(icon);
                }
              }}
            />
          </a>
          <a href="https://roberterbach.de/" target="_blank" rel="noopener noreferrer" className="p-1 hover:scale-110 transition-all group flex items-center justify-center" title="Robert Erbach Webseite">
             <img 
               src="https://www.google.com/s2/favicons?sz=64&domain=roberterbach.de" 
               alt="" 
               className="w-6 h-6 object-contain" 
               referrerPolicy="no-referrer"
               onError={(e) => {
                 (e.target as HTMLImageElement).style.display = 'none';
                 const parent = (e.target as HTMLImageElement).parentElement;
                 if (parent) {
                   const icon = document.createElement('div');
                   icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
                   icon.className = "text-[#1D1D1F] dark:text-[#F5F5F7]";
                   parent.appendChild(icon);
                 }
               }}
             />
          </a>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {[1,2,3,4,5,6,7,8,9].map(i => <div key={i} className="h-80 bg-white dark:bg-[#1C1C1E] rounded-[2.5rem] border border-black/5 dark:border-white/5" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8 mt-4 md:mt-0 flex-1">
          <DashboardCard title="Termine" icon={CalendarIcon} to="/calendar" color="#007AFF">
            {appointments.length > 0 ? (
               <div className="flex flex-col -mx-6">
                {appointments.map(app => (
                  <div key={app.id} className="refined-list-item flex items-center gap-4 px-6 py-4 relative group border-l-[3px] rounded-none" style={{ borderLeftColor: app.color || '#007AFF' }}>
                    <div className="w-10 h-10 flex flex-col items-center justify-center shrink-0 ml-1">
                       <span className="text-xs font-black text-brand leading-none" style={{ color: app.color || '#007AFF' }}>{format(new Date(app.dueDate), 'dd')}</span>
                       <span className="text-[8px] font-bold text-brand-muted uppercase tracking-tighter" style={{ color: app.color || '#007AFF', opacity: 0.7 }}>{format(new Date(app.dueDate), 'MMM', { locale: de })}</span>
                    </div>
                    <div className="flex-1 min-w-0 pr-10">
                      <span className="text-xs font-bold text-brand block truncate tracking-tight">{app.task}</span>
                      <span className="text-[10px] font-medium text-brand-muted">{format(new Date(app.dueDate), 'HH:mm')} Uhr</span>
                    </div>
                    <div className="absolute right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setEditItem({ type: 'appointments', data: app }); }} className="p-1.5 text-brand-muted hover:text-brand transition-colors"><Edit2 size={12} /></button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteModal({ open: true, coll: 'appointments', id: app.id }); }} className="p-1.5 text-brand-muted hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
               </div>
            ) : (
               <div className="text-center py-10 opacity-20 flex flex-col items-center">
                 <CalendarIcon size={40} strokeWidth={1} />
                 <span className="text-xs font-bold uppercase mt-3 tracking-widest text-[9px]">Frei</span>
               </div>
            )}
            {nextHoliday && (
              <div className="mt-auto pt-6 border-t border-black/5 dark:border-white/5 flex justify-between items-center -mx-6 -mb-6 p-6">
                 <span className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider">Feiertag</span>
                 <div className="text-right">
                    <div className="text-sm font-bold text-[#007AFF]">{nextHoliday.name}</div>
                    <div className="text-[11px] font-medium text-[#86868B]">{format(nextHoliday.date, 'dd.MM')}</div>
                 </div>
              </div>
            )}
          </DashboardCard>

          <DashboardCard title="Aufgaben" icon={CheckSquare} to="/tasks" color="#007AFF">
            {todos.length > 0 ? (
               <div className="flex flex-col -mx-6 min-h-[180px]">
                <AnimatePresence initial={false}>
                  {todos.map(todo => (
                    <motion.div 
                      layout
                      key={todo.id} 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="refined-list-item flex items-center gap-4 px-6 py-4 relative group border-l-[3px] rounded-none"
                      style={{ borderLeftColor: todo.color || 'rgba(37, 99, 235, 0.6)' }}
                    >
                      <button type="button" onClick={(e) => handleToggleTodo(e, todo)} className={cn("w-5 h-5 rounded-lg border transition-all flex items-center justify-center shrink-0 shadow-sm ml-1", todo.completed ? "bg-brand border-brand text-white" : "bg-white dark:bg-white/10 border-slate-200 dark:border-white/10")}>
                        {todo.completed && <Check size={12} strokeWidth={3} />}
                      </button>
                      <div className="flex-1 min-w-0 pr-10">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xs font-bold block truncate tracking-tight", todo.completed ? "text-brand-muted line-through opacity-60" : "text-brand")}>{todo.task}</span>
                          {!todo.completed && (
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", todo.priority === 'high' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : todo.priority === 'medium' ? "bg-orange-500" : "bg-brand")} title={todo.priority} />
                          )}
                        </div>
                      </div>
                      <div className="absolute right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setEditItem({ type: 'todos', data: todo }); }} className="p-1.5 text-brand-muted hover:text-brand transition-colors"><Edit2 size={12} /></button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteModal({ open: true, coll: 'todos', id: todo.id }); }} className="p-1.5 text-brand-muted hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
               </div>
            ) : (
               <div className="text-center py-10 opacity-20 flex flex-col items-center">
                 <CheckSquare size={40} strokeWidth={1} />
                 <span className="text-xs font-bold uppercase mt-3 tracking-widest text-[9px]">Gute Arbeit</span>
               </div>
            )}
          </DashboardCard>

          <DashboardCard title="Notizen" icon={FileText} to="/notes" color="#AF52DE">
            {notes.length > 0 ? (
               <div className="flex flex-col -mx-6">
                {notes.map(note => (
                  <div key={note.id} className="refined-list-item flex items-center justify-between gap-3 px-6 py-4 relative group border-l-[3px] rounded-none" style={{ borderLeftColor: note.color || '#AF52DE' }}>
                    <div className="flex items-center gap-3 overflow-hidden ml-1">
                      {note.isPinned && <Pin size={10} className="shrink-0" style={{ color: note.color || '#AF52DE', fill: note.color || '#AF52DE' }} />}
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-brand truncate tracking-tight">{note.title || 'Ohne Titel'}</h4>
                        <span className="text-[9px] font-bold text-brand-muted/70 block mt-0.5 uppercase tracking-tighter">{format(note.updatedAt?.toDate() || new Date(), 'dd. MMM', { locale: de })}</span>
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
                 <span className="text-xs font-bold uppercase mt-3 tracking-widest text-[9px]">Leer</span>
               </div>
            )}
          </DashboardCard>

          <DashboardCard title="Haushaltsbuch" icon={Wallet} to="/household" color="#34C759">
            <div className="grid grid-cols-3 gap-2 mb-2 p-3">
              <div className="text-center">
                <div className="text-[8px] font-bold text-[#86868B] uppercase tracking-wider mb-0.5">Plus</div>
                <div className="text-[11px] font-black text-green-500">+{stats.income?.toLocaleString('de-DE') || '0'}€</div>
              </div>
              <div className="text-center border-x border-black/5 dark:border-white/5">
                <div className="text-[8px] font-bold text-[#86868B] uppercase tracking-wider mb-0.5">Minus</div>
                <div className="text-[11px] font-black text-red-500">-{stats.expenses?.toLocaleString('de-DE') || '0'}€</div>
              </div>
              <div className="text-center">
                <div className="text-[8px] font-bold text-[#86868B] uppercase tracking-wider mb-0.5">Bilanz</div>
                <div className={cn("text-[11px] font-black", balance >= 0 ? "text-[#1D1D1F] dark:text-[#F5F5F7]" : "text-red-500")}>{balance?.toLocaleString('de-DE') || '0'}€</div>
              </div>
            </div>
            {transactions.slice(0, 3).length > 0 ? (
               <div className="flex flex-col -mx-6 -mb-6">
                 {transactions.slice(0, 3).map(t => (
                   <div key={t.id} className={cn("flex items-center gap-3 px-6 py-4 refined-list-item border-l-[3px] rounded-none", t.type === 'income' ? "border-l-green-500" : "border-l-red-500")}>
                     <div className={cn("w-8 h-8 flex items-center justify-center shrink-0 ml-1", t.type === 'income' ? "text-green-500" : "text-red-500")}>
                       {t.type === 'income' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                     </div>
                     <div className="flex-1 min-w-0">
                       <div className="text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7]"> {t.description}</div>
                       <div className="text-[10px] font-medium text-[#86868B]">{format(t.date?.toDate() || new Date(), 'dd.MM')}</div>
                     </div>
                     <div className={cn("text-xs font-black", t.type === 'income' ? "text-green-500" : "text-[#1D1D1F] dark:text-[#F5F5F7]")}>{t.type === 'income' ? '+' : '-'} {t.amount.toLocaleString('de-DE')}€</div>
                   </div>
                 ))}
               </div>
            ) : (
               <div className="text-center py-10 opacity-20 flex flex-col items-center">
                 <Wallet size={40} strokeWidth={1} />
                 <span className="text-xs font-bold uppercase mt-3 tracking-widest text-[9px]">Keine Einträge</span>
               </div>
            )}
          </DashboardCard>

          <DashboardCard title="Prompts" icon={MessageSquare} to="/prompts" color="#FF9500">
            {prompts.length > 0 ? (
               <div className="flex flex-col -mx-6">
                {prompts.map(prompt => (
                  <div key={prompt.id} className="refined-list-item flex items-center justify-between gap-3 px-6 py-4 relative group border-l-[3px] rounded-none" style={{ borderLeftColor: prompt.color || '#FF9500' }}>
                    <div className="flex items-center gap-3 overflow-hidden ml-1">
                      {prompt.isPinned && <Pin size={10} className="shrink-0" style={{ color: prompt.color || '#FF9500', fill: prompt.color || '#FF9500' }} />}
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-brand truncate tracking-tight">{prompt.title || 'Ohne Titel'}</h4>
                        <p className="text-[10px] font-medium text-brand-muted line-clamp-1 mt-0.5">{prompt.content}</p>
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
                 <span className="text-xs font-bold uppercase mt-3 tracking-widest text-[9px]">Keine</span>
               </div>
            )}
          </DashboardCard>

          <DashboardCard title="Links" icon={LinkIcon} to="/links" color="#5856D6">
            {links.length > 0 ? (
               <div className="flex flex-col -mx-6">
                {links.map(link => {
                  const domain = link.url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
                  return (
                  <div key={link.id} className="relative group overflow-hidden border-l-[3px] rounded-none" style={{ borderLeftColor: link.color || '#5856D6' }}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="refined-list-item flex items-center gap-3 px-6 py-4 pr-10 ml-1">
                      <div className="w-10 h-10 flex items-center justify-center shrink-0 overflow-hidden relative">
                        <img src={`https://www.google.com/s2/favicons?sz=64&domain=${domain}`} alt="" className="w-6 h-6 object-contain" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%2386868B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>'; }} />
                        {link.isPinned && <div className="absolute top-0 right-0 p-0.5 bg-brand rounded-bl-lg"><Pin size={6} className="text-white fill-white" /></div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-brand block truncate tracking-tight">{link.title}</span>
                        <span className="text-[10px] text-brand-muted block truncate font-medium uppercase tracking-tighter opacity-70">{domain}</span>
                      </div>
                    </a>
                  </div>
                )})}
               </div>
            ) : (
               <div className="text-center py-10 opacity-20 flex flex-col items-center">
                 <LinkIcon size={40} strokeWidth={1} />
                 <span className="text-xs font-bold uppercase mt-3 tracking-widest text-[9px]">Keine</span>
               </div>
            )}
          </DashboardCard>

          <DashboardCard title="Kontakte" icon={Users} to="/contacts" color="#FF2D55">
            {contacts.length > 0 ? (
              <div className="flex flex-col -mx-6 h-[200px] overflow-y-auto custom-scrollbar">
                {contacts.map(contact => (
                  <Link 
                    key={contact.id} 
                    to={`/contacts?id=${contact.id}`} 
                    className="refined-list-item flex items-center gap-3 px-6 py-4 cursor-pointer border-l-[3px] rounded-none"
                    style={{ borderLeftColor: contact.color || '#FF2D55' }}
                  >
                    <div className="w-8 h-8 flex items-center justify-center font-black text-base shrink-0 ml-1 lowercase" style={{ color: contact.color || '#FF2D55' }}>
                      {contact.name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-brand block truncate tracking-tight">{contact.name}</span>
                      {contact.phone && <span className="text-[10px] text-brand-muted block truncate font-medium uppercase tracking-tighter opacity-70">{contact.phone}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 opacity-20 flex flex-col items-center">
                <Users size={40} strokeWidth={1} />
                <span className="text-xs font-bold uppercase mt-3 tracking-widest text-[9px]">Keine Kontakte</span>
              </div>
            )}
          </DashboardCard>

        </div>
      )}

      {editItem && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-xl animate-in fade-in duration-300">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/10 backdrop-blur-md">
          <div className="glass-card w-full max-w-[480px] rounded-[2.5rem] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.12)]">
            <h3 className="text-2xl font-black text-red-500 mb-2 tracking-tight">Löschen?</h3>
            <p className="text-sm text-[#86868B] mb-8">Dieser Eintrag wird unwiderruflich entfernt.</p>
            <div className="flex flex-col gap-3">
              <button type="button" onClick={handleDelete} className="w-full h-12 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all">Löschen</button>
              <button type="button" onClick={() => setDeleteModal(null)} className="w-full h-12 bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-bold rounded-2xl hover:bg-[#E8E8ED] dark:hover:bg-[#3A3A3C] transition-all">Behalten</button>
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
  const [dueDate, setDueDate] = useState(todo.dueDate ? todo.dueDate.substring(0, 16) : '');
  const [categoryId, setCategoryId] = useState(todo.categoryId || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'todos', todo.id), {
        task: task.trim(),
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
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
    <div className="p-10">
      <h3 className="text-2xl font-black text-brand mb-2 tracking-tight">Aufgabe bearbeiten</h3>
      <p className="text-sm text-brand-muted mb-8">Passe die Details deiner Aufgabe an.</p>
      
      <div className="space-y-4 mb-8">
        <div className="space-y-1.5 flex flex-col">
          <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Aufgabe</label>
          <input type="text" value={task} onChange={(e) => setTask(e.target.value)} className="glass-input h-12" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5 flex flex-col">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Priorität</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="glass-input h-12 appearance-none bg-white dark:bg-[#050505]">
              <option value="high">Hoch</option>
              <option value="medium">Mittel</option>
              <option value="low">Niedrig</option>
            </select>
          </div>
          <div className="space-y-1.5 flex flex-col">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Kategorie</label>
            <CategorySelect type="task" value={categoryId} onChange={setCategoryId} className="h-12 border-none px-0" />
          </div>
        </div>
        <div className="space-y-1.5 flex flex-col">
          <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Fälligkeitsdatum</label>
          <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="glass-input h-12" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button type="button" onClick={handleSave} disabled={isSaving} className="w-full h-12 bg-[#007AFF] text-white font-bold rounded-2xl hover:bg-[#0071E3] transition-all shadow-lg shadow-blue-500/20">
          {isSaving ? "Speichert..." : "Speichern"}
        </button>
        <button type="button" onClick={onBack} className="w-full h-12 bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-bold rounded-2xl hover:bg-[#E8E8ED] dark:hover:bg-[#3A3A3C] transition-all">
          Abbrechen
        </button>
      </div>
    </div>
  );
}

function AppointmentEditForm({ appointment, onBack }: { appointment: any, onBack: () => void }) {
  const [task, setTask] = useState(appointment.task);
  const [dueDate, setDueDate] = useState(appointment.dueDate ? appointment.dueDate.substring(0, 16) : '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'appointments', appointment.id), {
        task: task.trim(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : appointment.dueDate,
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
    <div className="p-10">
      <h3 className="text-2xl font-black text-brand mb-2 tracking-tight">Termin bearbeiten</h3>
      <p className="text-sm text-brand-muted mb-8">Passe Datum und Titel deines Termins an.</p>
      
      <div className="space-y-4 mb-8">
        <div className="space-y-1.5 flex flex-col">
          <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Titel</label>
          <input type="text" value={task} onChange={(e) => setTask(e.target.value)} className="glass-input h-12" required />
        </div>
        <div className="space-y-1.5 flex flex-col">
          <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Datum & Uhrzeit (optional)</label>
          <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="glass-input h-12" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button type="button" onClick={handleSave} disabled={isSaving || !task.trim()} className="w-full h-12 bg-[#007AFF] text-white font-bold rounded-2xl hover:bg-[#0071E3] transition-all shadow-lg shadow-blue-500/20">
          {isSaving ? "Speichert..." : "Speichern"}
        </button>
        <button type="button" onClick={onBack} className="w-full h-12 bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-bold rounded-2xl hover:bg-[#E8E8ED] dark:hover:bg-[#3A3A3C] transition-all">
          Abbrechen
        </button>
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
    { name: 'Blau', value: '#007AFF' },
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
    <div className="p-10">
      <h3 className="text-2xl font-black text-brand mb-2 tracking-tight">Link bearbeiten</h3>
      <p className="text-sm text-brand-muted mb-8">Passe Titel, URL oder Kategorie deines Links an.</p>
      
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
          <CategorySelect type="link" value={categoryId} onChange={setCategoryId} className="h-12 border-none px-0" />
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
                    color === c.value ? "border-brand scale-110" : "border-transparent",
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
        <button type="button" onClick={handleSave} disabled={isSaving} className="w-full h-12 bg-[#007AFF] text-white font-bold rounded-2xl hover:bg-[#0071E3] transition-all shadow-lg shadow-blue-500/20">
          {isSaving ? "Speichert..." : "Speichern"}
        </button>
        <button type="button" onClick={onBack} className="w-full h-12 bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-bold rounded-2xl hover:bg-[#E8E8ED] dark:hover:bg-[#3A3A3C] transition-all">
          Abbrechen
        </button>
      </div>
    </div>
  );
}
