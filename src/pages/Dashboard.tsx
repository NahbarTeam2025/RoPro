import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { format, startOfDay, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { CheckSquare, Calendar as CalendarIcon, FileText, MessageSquare, Link as LinkIcon, Plus, ChevronRight, Check, Edit2, Trash2, Search, X, Save, Wallet, ArrowUpCircle, ArrowDownCircle, Zap, Pin } from 'lucide-react';
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
    e.preventDefault();
    try {
      const todoRef = doc(db, 'todos', todo.id);
      await updateDoc(todoRef, { 
        completed: !todo.completed, 
        updatedAt: serverTimestamp() 
      });
    } catch (e: any) { 
      console.error('Toggle todo error:', e);
      alert('Fehler beim Aktualisieren: ' + (e.message || 'Unbekannter Fehler'));
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

  const DashboardCard = ({ title, icon: Icon, to, children }: any) => (
    <div className="glass-card flex flex-col rounded-[2rem] overflow-hidden h-full border border-[#D2D2D7]/30 dark:border-[#424245]/30">
      <div className="p-6 border-b border-[#D2D2D7]/20 dark:border-[#424245]/20 flex justify-between items-center bg-[#FBFBFD]/50 dark:bg-[#1C1C1E]/50">
        <Link to={to} className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
             <Icon size={20} />
           </div>
           <h2 className="font-bold text-lg tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">{title}</h2>
        </Link>
      </div>
      <div className="p-6 flex-1 flex flex-col gap-4">
        {children}
      </div>
    </div>
  );

  return (
    <div className="max-w-[1500px] mx-auto flex flex-col relative z-10 w-full px-6 sm:px-8 pb-10">
      <header className="mb-12 mt-4 flex flex-row items-start justify-between relative w-full">
        <Clock />
        <div className="flex flex-col gap-3">
          <a href="https://www.google.com" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white/50 dark:bg-white/10 hover:bg-[#007AFF] hover:text-white rounded-2xl transition-all shadow-sm group overflow-hidden flex items-center justify-center w-11 h-11" title="Google Suche">
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
                  icon.className = "text-[#1D1D1F] dark:text-[#F5F5F7] group-hover:text-white";
                  parent.appendChild(icon);
                }
              }}
            />
          </a>
          <a href="https://roberterbach.de/" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white/50 dark:bg-white/10 hover:bg-[#007AFF] hover:text-white rounded-2xl transition-all shadow-sm group overflow-hidden flex items-center justify-center w-11 h-11" title="Robert Erbach Webseite">
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
                   icon.className = "text-[#1D1D1F] dark:text-[#F5F5F7] group-hover:text-white";
                   parent.appendChild(icon);
                 }
               }}
             />
          </a>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {[1,2,3,4,5,6].map(i => <div key={i} className="h-80 bg-white dark:bg-[#1C1C1E] rounded-[2.5rem] border border-black/5 dark:border-white/5" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 flex-1">
          <DashboardCard title="Termine" icon={CalendarIcon} to="/calendar">
            {appointments.length > 0 ? (
               <div className="flex flex-col gap-3">
                {appointments.map(app => (
                  <div key={app.id} className="flex items-center gap-4 p-4 rounded-3xl bg-[#F5F5F7] dark:bg-[#2C2C2E] relative group transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#3A3A3C] shadow-sm flex flex-col items-center justify-center shrink-0">
                       <span className="text-sm font-black text-[#1D1D1F] dark:text-[#F5F5F7] leading-none">{format(new Date(app.dueDate), 'dd')}</span>
                       <span className="text-[10px] font-bold text-[#007AFF] uppercase tracking-tighter">{format(new Date(app.dueDate), 'MMM', { locale: de })}</span>
                    </div>
                    <div className="flex-1 min-w-0 pr-12">
                      <span className="text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7] block truncate">{app.task}</span>
                      <span className="text-[11px] font-medium text-[#86868B]">{format(new Date(app.dueDate), 'HH:mm')} Uhr</span>
                    </div>
                    <div className="absolute right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditItem({ type: 'appointments', data: app }); }} className="p-2 text-[#86868B] hover:text-[#007AFF] transition-colors"><Edit2 size={14} /></button>
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteModal({ open: true, coll: 'appointments', id: app.id }); }} className="p-2 text-[#86868B] hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
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
              <div className="mt-auto pt-6 border-t border-black/5 dark:border-white/5 flex justify-between items-center bg-blue-500/5 -mx-6 -mb-6 p-6">
                 <span className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider">Feiertag</span>
                 <div className="text-right">
                    <div className="text-sm font-bold text-[#007AFF]">{nextHoliday.name}</div>
                    <div className="text-[11px] font-medium text-[#86868B]">{format(nextHoliday.date, 'dd.MM')}</div>
                 </div>
              </div>
            )}
          </DashboardCard>

          <DashboardCard title="Aufgaben" icon={CheckSquare} to="/tasks">
            {todos.length > 0 ? (
               <div className="flex flex-col gap-3">
                {todos.map(todo => (
                  <div key={todo.id} className="flex items-center gap-4 p-4 rounded-3xl bg-[#F5F5F7] dark:bg-[#2C2C2E] relative group transition-colors">
                    <button type="button" onClick={(e) => handleToggleTodo(e, todo)} className={cn("w-6 h-6 rounded-lg border transition-all flex items-center justify-center shrink-0 shadow-sm", todo.completed ? "bg-[#007AFF] border-[#007AFF] text-white" : "bg-white dark:bg-[#3A3A3C] border-[#D2D2D7] dark:border-[#424245]")}>
                      {todo.completed && <Check size={14} strokeWidth={3} />}
                    </button>
                    <div className="flex-1 min-w-0 pr-12">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-bold block truncate", todo.completed ? "text-[#86868B] line-through opacity-60" : "text-[#1D1D1F] dark:text-[#F5F5F7]")}>{todo.task}</span>
                        {!todo.completed && (
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", todo.priority === 'high' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : todo.priority === 'medium' ? "bg-orange-500" : "bg-blue-500")} title={todo.priority} />
                        )}
                      </div>
                      {todo.dueDate && <span className="text-[10px] font-medium text-[#86868B]">{format(new Date(todo.dueDate), 'dd.MM, HH:mm')} Uhr</span>}
                    </div>
                    <div className="absolute right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditItem({ type: 'todos', data: todo }); }} className="p-2 text-[#86868B] hover:text-[#007AFF] transition-colors"><Edit2 size={14} /></button>
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteModal({ open: true, coll: 'todos', id: todo.id }); }} className="p-2 text-[#86868B] hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
               </div>
            ) : (
               <div className="text-center py-10 opacity-20 flex flex-col items-center">
                 <CheckSquare size={40} strokeWidth={1} />
                 <span className="text-xs font-bold uppercase mt-3 tracking-widest text-[9px]">Gute Arbeit</span>
               </div>
            )}
          </DashboardCard>

          <DashboardCard title="Notizen" icon={FileText} to="/notes">
            {notes.length > 0 ? (
               <div className="flex flex-col gap-3">
                {notes.map(note => (
                  <div key={note.id} className="p-4 rounded-3xl bg-[#F5F5F7] dark:bg-[#1C1C1E] relative group transition-colors flex items-center justify-between border-2" style={{ borderColor: note.color || 'transparent' }}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      {note.isPinned && <Pin size={12} className="text-green-500 fill-green-500 shrink-0" />}
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">{note.title || 'Ohne Titel'}</h4>
                        <span className="text-[10px] font-medium text-[#86868B] block mt-0.5">{format(note.updatedAt?.toDate() || new Date(), 'dd. MMMM', { locale: de })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditItem({ type: 'notes', data: note }); }} className="p-2 text-[#86868B] hover:text-[#007AFF] transition-colors"><Edit2 size={14} /></button>
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteModal({ open: true, coll: 'notes', id: note.id }); }} className="p-2 text-[#86868B] hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
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

          <DashboardCard title="Prompts" icon={MessageSquare} to="/prompts">
            {prompts.length > 0 ? (
               <div className="flex flex-col gap-3">
                {prompts.map(prompt => (
                  <div key={prompt.id} className="p-4 rounded-3xl bg-[#F5F5F7] dark:bg-[#1C1C1E] relative group transition-colors flex items-center justify-between border-2" style={{ borderColor: prompt.color || 'transparent' }}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      {prompt.isPinned && <Pin size={12} className="text-green-500 fill-green-500 shrink-0" />}
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">{prompt.title || 'Ohne Titel'}</h4>
                        <p className="text-[10px] font-medium text-[#86868B] line-clamp-1 mt-0.5">{prompt.content}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditItem({ type: 'prompts', data: prompt }); }} className="p-2 text-[#86868B] hover:text-[#007AFF] transition-colors"><Edit2 size={14} /></button>
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteModal({ open: true, coll: 'prompts', id: prompt.id }); }} className="p-2 text-[#86868B] hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
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

          <DashboardCard title="Links" icon={LinkIcon} to="/links">
            {links.length > 0 ? (
               <div className="flex flex-col gap-3">
                {links.map(link => {
                  const domain = link.url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
                  return (
                  <div key={link.id} className="relative group">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-3xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border-2 hover:bg-[#E8E8ED] dark:hover:bg-[#3A3A3C] transition-colors pr-12" style={{ borderColor: link.color || 'transparent' }}>
                      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#3A3A3C] shadow-sm flex items-center justify-center shrink-0 overflow-hidden border border-black/5 dark:border-white/5 relative">
                        <img src={`https://www.google.com/s2/favicons?sz=64&domain=${domain}`} alt="" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%2386868B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>'; }} />
                        {link.isPinned && <div className="absolute top-0 right-0 p-0.5 bg-green-500 rounded-bl-lg"><Pin size={8} className="text-white fill-white" /></div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7] block truncate">{link.title}</span>
                        <span className="text-[10px] text-[#86868B] block truncate font-medium">{link.url}</span>
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

          <DashboardCard title="Haushaltsbuch" icon={Wallet} to="/household">
            <div className="grid grid-cols-3 gap-2 mb-2 bg-[#F5F5F7] dark:bg-[#2C2C2E] p-3 rounded-2xl border border-black/5 dark:border-white/5">
              <div className="text-center">
                <div className="text-[8px] font-bold text-[#86868B] uppercase tracking-wider mb-0.5">Plus</div>
                <div className="text-[11px] font-black text-green-500">+{stats.income.toLocaleString('de-DE')}€</div>
              </div>
              <div className="text-center border-x border-black/5 dark:border-white/5">
                <div className="text-[8px] font-bold text-[#86868B] uppercase tracking-wider mb-0.5">Minus</div>
                <div className="text-[11px] font-black text-red-500">-{stats.expenses.toLocaleString('de-DE')}€</div>
              </div>
              <div className="text-center">
                <div className="text-[8px] font-bold text-[#86868B] uppercase tracking-wider mb-0.5">Bilanz</div>
                <div className={cn("text-[11px] font-black", balance >= 0 ? "text-[#1D1D1F] dark:text-[#F5F5F7]" : "text-red-500")}>{balance.toLocaleString('de-DE')}€</div>
              </div>
            </div>
            {transactions.slice(0, 3).length > 0 ? (
               <div className="flex flex-col gap-2">
                 {transactions.slice(0, 3).map(t => (
                   <div key={t.id} className="flex items-center gap-3 p-3 rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E]">
                     <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", t.type === 'income' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                       {t.type === 'income' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                     </div>
                     <div className="flex-1 min-w-0">
                       <div className="text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">{t.description}</div>
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
        </div>
      )}

      {editItem && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="glass-card w-full max-w-4xl h-full max-h-[85vh] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl relative">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/10 backdrop-blur-md">
          <div className="glass-card w-full max-w-sm rounded-[2.5rem] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.12)]">
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
