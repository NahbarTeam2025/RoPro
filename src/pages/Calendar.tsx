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
import { ChevronLeft, ChevronRight, Check, Calendar as CalendarIcon, X, Plus, Trash2, Search, Edit2, Cake } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import Holidays from 'date-holidays';

interface Appointment {
  id: string;
  task: string;
  dueDate: string | null;
  priority: 'high' | 'medium' | 'low';
  color?: string;
  completed: boolean;
  userId: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'appointment' | 'birthday';
  completed?: boolean;
}

const hd = new Holidays('DE', 'BB');

export default function Calendar() {
  const { user } = useAuth();
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, id: string } | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
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
    const appointmentsQ = query(
      collection(db, 'appointments'),
      where('userId', '==', user.uid)
    );
    
    const contactsQ = query(
      collection(db, 'contacts'),
      where('userId', '==', user.uid)
    );

    const unsubAppointments = onSnapshot(appointmentsQ, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      const withDates = docs.filter(d => d.dueDate !== null);
      setAppointments(withDates);
    });

    const unsubContacts = onSnapshot(contactsQ, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setContacts(docs);
    });

    return () => {
      unsubAppointments();
      unsubContacts();
    };
  }, [user]);

  const handleDayClick = (day: Date, holidayName: string | null) => {
    setSelectedDay({ date: day, holiday: holidayName });
    setNewTaskText('');
    setNewTaskTime('');
    setEditingAppointment(null);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingAppointment || !newTaskText.trim()) return;

    try {
      let date = selectedDay!.date;
      if (newTaskTime) {
        const [hours, minutes] = newTaskTime.split(':').map(Number);
        date = setHours(setMinutes(date, minutes), hours);
      } else {
        // If no time is provided, we might want to keep it at 12:00 or current time
        // The original code was using setMinutes/setHours with required time.
        // If time was already set on the existing appointment, maybe keep it?
        // Let's stick to the selected day's date (at 00:00 or current) if no time.
      }
      
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
        color: '#0055D4', // Default accent color
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
    <div className="max-w-5xl mx-auto space-y-6 relative z-10 w-full px-0 sm:px-0 pb-10 lg:pb-6">
      <div className="glass-card rounded-[2rem] p-3 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="hidden sm:block shrink-0">
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="btn-briefing-glow h-10 px-5 text-sm flex items-center justify-center shrink-0"
            >
              Heute
            </button>
          </div>

          <div className="flex-1 px-1 sm:px-4 flex justify-center">
            <h1 className="text-lg sm:text-2xl font-black tracking-tighter text-brand capitalize leading-none text-center flex flex-row items-baseline gap-2">
              <span className="block">{format(currentDate, "MMMM", { locale: de })}</span>
              <span className="text-[10px] sm:text-sm opacity-40 tracking-widest block">{format(currentDate, "yyyy")}</span>
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={prevMonth}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5 text-brand shadow-sm hover:bg-slate-50 dark:hover:bg-white/[0.08] transition-all active:scale-90"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={nextMonth}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5 text-brand shadow-sm hover:bg-slate-50 dark:hover:bg-white/[0.08] transition-all active:scale-90"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-black/5 dark:border-white/5">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-slate-200/50 dark:border-white/10 bg-white/30 dark:bg-black/20">
          {weekDayNames.map((day, idx) => (
            <div key={day} className={cn(
              "py-4 text-center pro-heading",
              idx === 6 ? "text-red-500" : "text-brand-muted opacity-60"
            )}>
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-fr bg-[#F2F2F7] dark:bg-white/[0.02] gap-[1px]">
          {days.map((day) => {
            const dayAppointments = appointments.filter(a => a.dueDate && isSameDay(new Date(a.dueDate), day));
            const dayBirthdays = contacts.filter(c => {
              if (!c.birthday) return false;
              const bDay = parseISO(c.birthday);
              return bDay.getMonth() === day.getMonth() && bDay.getDate() === day.getDate();
            });

            // Combine into temporary events for display
            const dayEvents: CalendarEvent[] = [
              ...dayAppointments.map(a => ({
                id: a.id,
                title: a.task,
                date: new Date(a.dueDate!),
                type: 'appointment' as const,
                completed: a.completed
              })),
              ...dayBirthdays.map(c => ({
                id: `bday-${c.id}`,
                title: `🎂 ${c.name}`,
                date: day, // Use the current day for sorting if no time is involved
                type: 'birthday' as const
              }))
            ];

            // Sort dayEvents by time
            dayEvents.sort((a,b) => a.date.getTime() - b.date.getTime());
            
            const holidayArr = hd.isHoliday(day);
            const isHoliday = holidayArr && holidayArr.length > 0;
            const holidayName = isHoliday ? holidayArr[0].name : null;
            const sunday = isSunday(day);
            
              return (
                <div 
                  key={day.toString()} 
                  onClick={() => handleDayClick(day, holidayName)}
                  className={cn(
                    "min-h-[64px] sm:min-h-[80px] bg-transparent p-1 sm:p-2 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.05] group relative flex flex-col items-center justify-center",
                    !isSameMonth(day, monthStart) && "opacity-20 pointer-events-none"
                  )}
                >
                  <div className="relative flex items-center justify-center">
                    <span className={cn(
                      "w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm font-black transition-all relative z-10",
                      isToday(day) ? "bg-accent text-white rounded-full shadow-lg shadow-accent/20" : 
                      sunday ? "text-red-500" : "text-slate-900 dark:text-white"
                    )}>
                      {format(day, 'd')}
                    </span>
                    
                    {/* Ring indicator for events */}
                    {dayEvents.length > 0 && !isToday(day) && (
                      <div className="absolute inset-[-4px] rounded-full border-2 border-green-500/30 dark:border-green-400/20" />
                    )}
                  </div>

                  {isHoliday && (
                    <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.4)]" title={holidayName || 'Feiertag'} />
                  )}
                  
                  {!isToday(day) && !isHoliday && (
                    <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-brand-muted">
                      <Plus size={12} />
                    </div>
                  )}
                </div>
              );
          })}
        </div>
      </div>

      <div className="flex justify-center mt-8 px-4">
        <button 
          onClick={() => handleDayClick(new Date(), null)}
          className="btn-blue-glow w-full sm:w-auto px-12 h-16 rounded-[2rem] flex items-center justify-center gap-4 font-black text-sm uppercase tracking-[0.15em] transition-all active:scale-95"
        >
          <Plus size={20} strokeWidth={4} />
          <span>Hinzufügen</span>
        </button>
      </div>

      {/* Modal / Dialog for day actions */}
      {selectedDay && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/80 backdrop-blur-xl p-4 sm:p-6 pt-16 sm:pt-20 pb-6 overflow-hidden">
          <div className="glass-card shadow-2xl w-full max-w-[480px] rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col relative h-full max-h-[calc(100vh-theme(spacing.32))]">
            {/* Google Search Quick Access in Calendar Modal too? No, just keep the close button. */}
            <div className="p-6 border-b border-slate-200/50 dark:border-white/10 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{format(selectedDay.date, 'EEEE, d. MMMM', { locale: de })}</h3>
                {selectedDay.holiday && (
                  <p className="text-sm font-bold text-brand dark:text-white mt-1 uppercase tracking-widest">{selectedDay.holiday}</p>
                )}
              </div>
              <button 
                onClick={() => setSelectedDay(null)}
                className="p-2 hover:bg-slate-500/10 rounded-xl transition-colors cursor-pointer text-brand-muted"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden flex flex-col">
              {/* List area */}
              <div className="p-4 bg-transparent min-h-[100px] shrink-0">
              {(() => {
                const dayAppointments = appointments.filter(a => a.dueDate && isSameDay(new Date(a.dueDate), selectedDay.date));
                const dayBirthdays = contacts.filter(c => {
                  if (!c.birthday) return false;
                  const bDay = parseISO(c.birthday);
                  return bDay.getMonth() === selectedDay.date.getMonth() && bDay.getDate() === selectedDay.date.getDate();
                });

                if (dayAppointments.length === 0 && dayBirthdays.length === 0) {
                  return <div className="text-center py-10 text-sm text-brand-muted font-medium opacity-40">Keine Termine an diesem Tag.</div>;
                }

                return (
                  <ul className="space-y-3 pb-4">
                    {dayBirthdays.map(c => (
                      <li key={`modal-bday-${c.id}`} className="flex items-center gap-3 p-3 border border-amber-500/20 rounded-xl">
                        <div className="w-5 h-5 flex items-center justify-center shrink-0 text-amber-500">
                          <Cake size={12} />
                        </div>
                        <div className="flex-1 text-sm font-bold text-amber-600 dark:text-amber-400">
                          Geburtstag: {c.name}
                        </div>
                      </li>
                    ))}
                    {dayAppointments
                      .sort((a,b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
                      .map(app => (
                        <li key={app.id} className="flex flex-col gap-1 p-3 border border-slate-200/50 dark:border-white/10 rounded-xl">
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
                                 className="p-1.5 text-slate-400 hover:text-accent hover:bg-accent/10 rounded-lg cursor-pointer transition-colors"
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
                );
              })()}
            </div>

            <div className="p-6 border-t border-slate-200/50 dark:border-white/10 bg-white/50 dark:bg-black/40  mt-auto">
              <form onSubmit={editingAppointment ? handleUpdateTask : handleAddTask} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-brand-muted uppercase tracking-widest">
                    {editingAppointment ? 'Bearbeiten' : 'Hinzufügen'}
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
                    Titel
                  </label>
                  <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="Titel eingeben..."
                    className="glass-input text-base sm:text-lg mb-3"
                  />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 space-y-1">
                      <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider">Datum</label>
                      <input
                        type="date"
                        value={format(selectedDay.date, 'yyyy-MM-dd')}
                        onChange={(e) => {
                          const newDate = new Date(e.target.value);
                          if (!isNaN(newDate.getTime())) {
                            setSelectedDay({ ...selectedDay, date: newDate });
                          }
                        }}
                        className="glass-input !h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider">Uhrzeit</label>
                      <input
                        type="time"
                        value={newTaskTime}
                        onChange={(e) => setNewTaskTime(e.target.value)}
                        className="glass-input !h-10 text-sm"
                      />
                    </div>
                  </div>
                </div>
                <div className="pt-2 flex flex-col gap-3">
                  <button 
                    type="submit" 
                    disabled={!newTaskText.trim() || isAddingTask}
                    className="btn-green-glow w-full !h-14 disabled:opacity-50"
                  >
                    {isAddingTask ? 'Speichert...' : (editingAppointment ? 'Speichern' : 'Hinzufügen')}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setSelectedDay(null)}
                    className="btn-red-glow w-full !h-14"
                  >
                    Schließen
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    )}
      {/* Custom Delete Modal */}
      {deleteModal && deleteModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="glass-card w-full max-w-[480px] rounded-[2.5rem] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.12)]">
            <h3 className="text-2xl font-black text-red-500 mb-2 tracking-tight">Löschen?</h3>
            <p className="text-sm text-[#86868B] mb-8">Dieser Termin wird unwiderruflich entfernt.</p>
            <div className="flex flex-col gap-3">
              <button 
                type="button"
                onClick={confirmDelete}
                className="btn-cancel w-full"
              >
                Löschen
              </button>
              <button 
                type="button"
                onClick={() => setDeleteModal(null)}
                className="glass-button-secondary w-full"
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
