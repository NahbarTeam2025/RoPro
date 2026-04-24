import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday,
  isSunday, parseISO, setHours, setMinutes
} from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Check, Calendar as CalendarIcon, X, Plus, Trash2, Search, Edit2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import Holidays from 'date-holidays';

interface Appointment {
  id: string;
  task: string;
  dueDate: string | null;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  userId: string;
}

const hd = new Holidays('DE', 'BB');

export default function Calendar() {
  const { user } = useAuth();
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, id: string } | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDay, setSelectedDay] = useState<{ date: Date, holiday: string | null } | null>(null);

  // Scroll lock when modal is open
  useEffect(() => {
    const mainContent = document.querySelector('main');
    if (selectedDay || deleteModal) {
      if (mainContent) mainContent.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      if (mainContent) mainContent.style.overflow = '';
      document.body.style.overflow = '';
    }
    return () => { 
      if (mainContent) mainContent.style.overflow = '';
      document.body.style.overflow = ''; 
    };
  }, [selectedDay, deleteModal]);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'appointments'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      const withDates = docs.filter(d => d.dueDate !== null);
      setAppointments(withDates);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDayClick = (day: Date, holidayName: string | null) => {
    setSelectedDay({ date: day, holiday: holidayName });
    setNewTaskText('');
    setNewTaskTime('');
    setEditingAppointment(null);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingAppointment || !newTaskText.trim() || !newTaskTime) return;

    try {
      const [hours, minutes] = newTaskTime.split(':');
      const date = setMinutes(setHours(selectedDay!.date, parseInt(hours)), parseInt(minutes));
      
      await updateDoc(doc(db, 'appointments', editingAppointment.id), {
        task: newTaskText.trim(),
        dueDate: date.toISOString(),
        updatedAt: serverTimestamp()
      });

      setEditingAppointment(null);
      setNewTaskText('');
      setNewTaskTime('');
    } catch (error) {
      console.error("Error updating appointment:", error);
    }
  };

  const handleDeleteTask = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteModal({ open: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    try {
      await deleteDoc(doc(db, 'appointments', deleteModal.id));
      setDeleteModal(null);
    } catch (error) {
      console.error("Error deleting appointment:", error);
    }
  };

  const handleToggleTask = async (appointment: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateDoc(doc(db, 'appointments', appointment.id), {
      completed: !appointment.completed,
      updatedAt: serverTimestamp()
    });
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTaskText.trim() || !selectedDay) return;
    
    setIsAddingTask(true);
    let finalDate = selectedDay.date;
    
    if (newTaskTime) {
      const [hours, minutes] = newTaskTime.split(':').map(Number);
      finalDate = setHours(setMinutes(finalDate, minutes), hours);
    }
    
    try {
      await addDoc(collection(db, 'appointments'), {
        task: newTaskText.trim(),
        priority: 'medium',
        completed: false,
        dueDate: finalDate.toISOString(),
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setNewTaskText('');
      setNewTaskTime('');
      setSelectedDay(null);
    } catch (error) {
      console.error("Error adding appointment:", error);
    } finally {
      setIsAddingTask(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const dateFormat = "MMMM yyyy";
  const days = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const weekDayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative z-10 w-full pb-20 lg:pb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between glass-card px-6 py-4 rounded-3xl gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-brand capitalize">{format(currentDate, dateFormat, { locale: de })}</h1>
          <p className="text-brand-muted font-medium text-sm mt-1">Zeitplan und anstehende Termine</p>
        </div>
        <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-2">
          <button onClick={prevMonth} className="p-2 border border-slate-200/50 dark:border-white/10 rounded-xl hover:bg-slate-500/10 transition-colors cursor-pointer text-brand">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-5 py-2.5 text-sm font-semibold border border-slate-200/50 dark:border-white/10 rounded-xl hover:bg-slate-500/10 transition-colors cursor-pointer text-brand">
            Heute
          </button>
          <button onClick={nextMonth} className="p-2 border border-slate-200/50 dark:border-white/10 rounded-xl hover:bg-slate-500/10 transition-colors cursor-pointer text-brand">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="glass-card rounded-3xl overflow-hidden flex flex-col">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-slate-200/50 dark:border-white/10 bg-slate-100/50 dark:bg-black/20">
          {weekDayNames.map((day, idx) => (
            <div key={day} className={cn(
              "py-3 sm:py-4 text-center text-[10px] sm:text-xs font-black uppercase tracking-widest",
              idx === 6 ? "text-red-500" : "text-brand-muted"
            )}>
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-fr bg-slate-200/50 dark:bg-white/10 gap-px">
          {days.map((day) => {
            const dayAppointments = appointments.filter(a => a.dueDate && isSameDay(new Date(a.dueDate), day));
            // Sort dayAppointments by time
            dayAppointments.sort((a,b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
            const holidayArr = hd.isHoliday(day);
            const isHoliday = holidayArr && holidayArr.length > 0;
            const holidayName = isHoliday ? holidayArr[0].name : null;
            const sunday = isSunday(day);
            
            return (
              <div 
                key={day.toString()} 
                onClick={() => handleDayClick(day, holidayName)}
                className={cn(
                  "min-h-[80px] sm:min-h-[120px] bg-slate-50 dark:bg-[#02050D] p-1 sm:p-2 transition-colors cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 group relative",
                  !isSameMonth(day, monthStart) && "bg-slate-100/50 dark:bg-black/40 text-brand-muted/50",
                  isToday(day) && "bg-green-500/5 dark:bg-green-500/10",
                  isHoliday && "bg-blue-500/5 dark:bg-blue-500/10"
                )}
              >
                <div className="flex justify-between items-start mb-1 sm:mb-2">
                  <span className={cn(
                    "w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl transition-colors",
                    isToday(day) ? "bg-green-500 text-black shadow-lg shadow-green-500/20" : 
                    sunday ? "text-red-500 font-black" : "text-brand group-hover:bg-slate-500/10"
                  )}>
                    {format(day, 'd')}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-muted hidden sm:block">
                    <Plus size={16} />
                  </div>
                </div>
                
                <div className="space-y-1 sm:space-y-1.5 overflow-y-auto max-h-[50px] sm:max-h-[80px] scrollbar-hide px-0.5 sm:px-1">
                  {isHoliday && (
                     <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500 mb-1 mx-auto sm:mx-0" title="Feiertag" />
                  )}
                  {dayAppointments.map(app => (
                    <div
                      key={app.id}
                      className={cn(
                        "block px-1 sm:px-2 py-1 sm:py-1.5 text-[8px] sm:text-[10px] font-bold tracking-wider leading-tight rounded-md sm:rounded-lg truncate border transition-colors",
                        app.completed 
                          ? "bg-slate-200/50 dark:bg-white/5 border-transparent text-brand-muted line-through"
                          : "bg-blue-500/10 border-blue-500/20 text-blue-500"
                      )}
                      title={app.task}
                    >
                      {app.completed && <Check size={8} className="inline mr-0.5 sm:mr-1" />}
                      <span className="font-mono text-[8px] sm:text-[9px] opacity-70 mr-1">{format(new Date(app.dueDate!), 'HH:mm')}</span>
                      <span>{app.task}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal / Dialog for day actions */}
      {selectedDay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card shadow-2xl w-full max-w-sm rounded-[2rem] overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col relative">
            {/* Google Search Quick Access in Calendar Modal too? No, just keep the close button. */}
            <div className="p-6 border-b border-slate-200/50 dark:border-white/10 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-brand">{format(selectedDay.date, 'EEEE, d. MMMM', { locale: de })}</h3>
                {selectedDay.holiday && (
                  <p className="text-sm font-bold text-blue-500 mt-1 uppercase tracking-widest">{selectedDay.holiday}</p>
                )}
              </div>
              <button 
                onClick={() => setSelectedDay(null)}
                className="p-2 hover:bg-slate-500/10 rounded-xl transition-colors cursor-pointer text-brand-muted"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* List of existing tasks for the day */}
            <div className="p-4 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-black/10">
              {appointments.filter(a => a.dueDate && isSameDay(new Date(a.dueDate), selectedDay.date)).length > 0 ? (
                <ul className="space-y-2">
                  {appointments.filter(a => a.dueDate && isSameDay(new Date(a.dueDate), selectedDay.date))
                  .sort((a,b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
                  .map(app => (
                    <li key={app.id} className="flex flex-col gap-1 p-3 bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={(e) => handleToggleTask(app, e)} 
                          className={cn(
                            "w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                            app.completed ? "bg-slate-300 border-slate-300 dark:bg-white/20 dark:border-transparent text-white" : "border-slate-400/30 text-transparent hover:border-green-500"
                          )}
                        >
                          <Check size={14} className={app.completed ? "opacity-100" : "opacity-0"} />
                        </button>
                        <div className={cn("flex-1 text-sm font-medium", app.completed ? "line-through text-brand-muted" : "text-brand")}>
                           <div className="font-mono text-xs opacity-60 mb-0.5">{format(new Date(app.dueDate!), 'HH:mm')}</div>
                           {app.task}
                        </div>
                        <div className="flex items-center gap-1">
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               setEditingAppointment(app);
                               setNewTaskText(app.task);
                               setNewTaskTime(format(new Date(app.dueDate!), 'HH:mm'));
                             }}
                             className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg cursor-pointer transition-colors"
                           >
                             <Edit2 size={14} />
                           </button>
                           <button 
                             onClick={(e) => handleDeleteTask(app.id, e)}
                             className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
                           >
                             <Trash2 size={16} />
                           </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                 <div className="text-center py-6 text-sm text-brand-muted font-medium">Keine Termine an diesem Tag.</div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200/50 dark:border-white/10 bg-slate-100/50 dark:bg-black/20 shrink-0">
              <form onSubmit={editingAppointment ? handleUpdateTask : handleAddTask} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-brand-muted uppercase tracking-widest">
                    {editingAppointment ? 'Termin bearbeiten' : 'Neuer Termin'}
                  </h4>
                  {editingAppointment && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingAppointment(null);
                        setNewTaskText('');
                        setNewTaskTime('');
                      }} 
                      className="text-[10px] font-bold text-red-500 uppercase hover:underline"
                    >
                      Abbrechen
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">
                    Neuer Termin
                  </label>
                  <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="Titel eingeben..."
                    className="glass-input text-base sm:text-lg mb-3"
                    autoFocus
                  />
                  <input
                    type="time"
                    value={newTaskTime}
                    onChange={(e) => setNewTaskTime(e.target.value)}
                    className="glass-input !h-10 text-sm"
                    required
                  />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => setSelectedDay(null)}
                    className="glass-button-secondary py-2 h-auto text-xs sm:text-sm"
                  >
                    Schließen
                  </button>
                  <button 
                    type="submit" 
                    disabled={!newTaskText.trim() || !newTaskTime || isAddingTask}
                    className="glass-button-primary disabled:opacity-50 py-2 h-auto text-xs sm:text-sm"
                  >
                    {isAddingTask ? 'Speichert...' : (editingAppointment ? 'Speichern' : 'Hinzufügen')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Custom Delete Modal */}
      {deleteModal && deleteModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/10 backdrop-blur-md">
          <div className="glass-card w-full max-w-sm rounded-[2.5rem] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.12)]">
            <h3 className="text-2xl font-black text-red-500 mb-2 tracking-tight">Löschen?</h3>
            <p className="text-sm text-[#86868B] mb-8">Dieser Termin wird unwiderruflich entfernt.</p>
            <div className="flex flex-col gap-3">
              <button 
                type="button"
                onClick={confirmDelete}
                className="w-full h-12 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all"
              >
                Löschen
              </button>
              <button 
                type="button"
                onClick={() => setDeleteModal(null)}
                className="w-full h-12 bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-bold rounded-2xl hover:bg-[#E8E8ED] dark:hover:bg-[#3A3A3C] transition-all"
              >
                Behalten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
