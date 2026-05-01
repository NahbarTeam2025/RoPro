import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Check, Clock, Plus, Trash2, AlertCircle, Edit2, Settings2, X, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { CategorySelect } from '../components/CategorySelect';
import { CategoryManager } from '../components/CategoryManager';
import { useCategories } from '../lib/categories';

interface Todo {
  id: string;
  task: string;
  dueDate: string | null;
  categoryId: string;
  priority: 'high' | 'medium' | 'low';
  color?: string;
  completed: boolean;
  userId: string;
  isRecurring?: boolean;
  recurrenceInterval?: 'daily' | 'weekly' | 'monthly' | null;
  createdAt?: any;
  updatedAt?: any;
}

export default function Tasks() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [categoryId, setCategoryId] = useState('');
  const { categories } = useCategories('task');

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [showCatManager, setShowCatManager] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(false);

  const [deleteModal, setDeleteModal] = useState<{ open: boolean, id: string } | null>(null);
  const [editTask, setEditTask] = useState<Todo | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'todos'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Todo));
      docs.sort((a, b) => {
        const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
        const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
        return timeB - timeA;
      });
      setTodos(docs);
    });

    return () => unsubscribe();
  }, [user]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim() || !user) return;

    try {
      let finalDueDate = null;
      if (date) {
        finalDueDate = new Date(`${date}T${time || '00:00'}:00`).toISOString();
      }

      await addDoc(collection(db, 'todos'), {
        task: newTask.trim(),
        priority,
        categoryId,
        color: '#0055D4', // Default accent color
        dueDate: finalDueDate,
        completed: false,
        isRecurring: isRecurring,
        recurrenceInterval: isRecurring ? recurrenceInterval : null,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setNewTask('');
      setDate('');
      setTime('');
      setPriority('medium');
      setCategoryId('');
      setIsRecurring(false);
      setIsFormExpanded(false);
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const toggleTodo = async (todo: Todo) => {
    // Confirmation removed
    try {
      if (!todo.completed && todo.isRecurring && todo.dueDate) {
        // If completing a recurring task, schedule the next one
        const currentDueDate = new Date(todo.dueDate);
        const nextDueDate = new Date(currentDueDate);
        
        if (todo.recurrenceInterval === 'daily') nextDueDate.setDate(nextDueDate.getDate() + 1);
        else if (todo.recurrenceInterval === 'weekly') nextDueDate.setDate(nextDueDate.getDate() + 7);
        else if (todo.recurrenceInterval === 'monthly') nextDueDate.setMonth(nextDueDate.getMonth() + 1);

        // Update current to completed
        await updateDoc(doc(db, 'todos', todo.id), {
          completed: true,
          updatedAt: serverTimestamp()
        });

        // Add next task
        await addDoc(collection(db, 'todos'), {
          ...todo,
          id: undefined,
          dueDate: nextDueDate.toISOString(),
          completed: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        await updateDoc(doc(db, 'todos', todo.id), {
          completed: !todo.completed,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error toggling task:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal || !user) return;
    try {
      await deleteDoc(doc(db, 'todos', deleteModal.id));
      setDeleteModal(null);
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleUpdateTask = async (updatedTodo: Todo) => {
    try {
      const { id, ...data } = updatedTodo;
      await updateDoc(doc(db, 'todos', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      setEditTask(null);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  // Generate unique months from due dates and creation dates for filter
  const availableMonths = Array.from(new Set(todos.map(t => {
    if (t.dueDate) return format(new Date(t.dueDate), 'yyyy-MM');
    if (t.createdAt?.toDate) return format(t.createdAt.toDate(), 'yyyy-MM');
    return null;
  }).filter(Boolean) as string[])).sort().reverse();

  const filteredTodos = todos.filter(t => {
    if (filterCategory !== 'all' && t.categoryId !== filterCategory) return false;
    if (filterMonth !== 'all') {
       const monthStr = t.dueDate ? format(new Date(t.dueDate), 'yyyy-MM') : 
                        (t.createdAt?.toDate ? format(t.createdAt.toDate(), 'yyyy-MM') : null);
       if (monthStr !== filterMonth) return false;
    }
    return true;
  });

  const activeTodos = filteredTodos
    .filter(t => !t.completed)
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  const completedTodos = filteredTodos.filter(t => t.completed);

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 relative z-10 w-full pb-6">
      {/* Sidebar / List Container */}
      <div className={cn(
        "w-full md:w-80 flex-col gap-6 flex-shrink-0 transition-all",
        editTask || isFormExpanded ? "hidden md:flex" : "flex h-full"
      )}>
        {/* Active Tasks Card */}
        <div className="flex-1 min-h-0 flex flex-col glass-card rounded-3xl overflow-hidden">
          <div className="p-4 border-b border-slate-200/50 dark:border-white/10 space-y-4 shrink-0">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-bold text-slate-900 dark:text-white text-sm uppercase">Aufgaben</h2>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setShowCatManager(true)} 
                  className="p-2 text-brand-muted hover:text-accent hover:bg-accent/10 rounded-xl transition-all cursor-pointer"
                  title="Kategorien verwalten"
                >
                  <Settings2 size={18} />
                </button>
                <button 
                  onClick={() => { setIsFormExpanded(true); setEditTask(null); }} 
                  className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl transition-all cursor-pointer font-bold flex items-center justify-center"
                >
                   <Plus size={18} />
                </button>
              </div>
            </div>
            <div className="flex gap-2">
               <select 
                  value={filterCategory} 
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="glass-input h-10 flex-1 appearance-none text-xs font-bold uppercase tracking-wider px-2"
               >
                 <option value="all">Kategorie</option>
                 {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
               <select 
                  value={filterMonth} 
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="glass-input h-10 flex-1 appearance-none text-xs font-bold uppercase tracking-wider px-2"
               >
                 <option value="all">Zeitraum</option>
                 {availableMonths.map(m => (
                   <option key={m} value={m}>{format(new Date(`${m}-01`), 'MMM yy', { locale: de })}</option>
                 ))}
               </select>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="space-y-1">
              <div className="px-4 py-2 flex items-center justify-between sticky top-0 z-10 bg-white/10 dark:bg-black/20 backdrop-blur-md">
                <span className="text-xs font-black text-brand-muted uppercase tracking-widest">Aktiv</span>
                <span className="text-xs font-black text-brand-muted px-2 py-0.5 rounded-full bg-slate-500/10">
                  {activeTodos.length}
                </span>
              </div>
              {activeTodos.length === 0 ? (
                <div className="p-8 text-center text-xs uppercase font-bold text-brand-muted tracking-widest">Keine Aufgaben</div>
              ) : (
                <div className="flex flex-col">
                  {activeTodos.map(todo => (
                    <TaskItem 
                      key={todo.id} 
                      todo={todo} 
                      isActive={editTask?.id === todo.id}
                      onToggle={() => toggleTodo(todo)} 
                      onDelete={() => setDeleteModal({ open: true, id: todo.id })} 
                      onEdit={() => { setEditTask(todo); setIsFormExpanded(false); }}
                      categories={categories} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Completed Tasks Card */}
        {completedTodos.length > 0 && (
          <div className="max-h-[33%] min-h-[150px] flex flex-col glass-card rounded-3xl overflow-hidden flex-shrink-0">
            <div className="px-4 py-3 border-b border-slate-200/50 dark:border-white/10 flex items-center justify-between sticky top-0 z-10 bg-white/50 dark:bg-black/20 backdrop-blur-md">
              <span className="text-xs font-black text-brand uppercase tracking-widest">Erledigt</span>
              <span className="text-xs font-black text-brand-muted px-2 py-0.5 rounded-full bg-slate-500/10">
                {completedTodos.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col opacity-60 hover:opacity-100 transition-opacity">
                {completedTodos.map(todo => (
                  <TaskItem 
                    key={todo.id} 
                    todo={todo} 
                    isActive={editTask?.id === todo.id}
                    onToggle={() => toggleTodo(todo)} 
                    onDelete={() => setDeleteModal({ open: true, id: todo.id })} 
                    onEdit={() => { setEditTask(todo); setIsFormExpanded(false); }}
                    categories={categories} 
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 glass-card rounded-3xl overflow-hidden flex-col min-w-0 transition-all h-full",
        !editTask && !isFormExpanded ? "hidden md:flex" : "flex"
      )}>
        {editTask ? (
          <div className="flex-1 flex flex-col h-full bg-transparent p-6 sm:p-10 overflow-y-auto custom-scrollbar">
             <div className="flex items-center justify-between mb-10">
                <h3 className="text-2xl font-black text-brand tracking-tight">Bearbeiten</h3>
                <button onClick={() => setEditTask(null)} className="p-2 text-brand-muted hover:text-brand transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                  <X size={24} />
                </button>
              </div>
              
              <div className="max-w-xl mx-auto w-full space-y-6">
                <div className="space-y-2 flex flex-col">
                  <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Aufgabe</label>
                  <input
                    type="text"
                    defaultValue={editTask.task}
                    id="edit-task-input"
                    className="glass-input h-12 focus:ring-2 focus:ring-accent/50 font-bold w-full transition-all"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Priorität</label>
                      <div className="relative">
                        <select
                          id="edit-priority-select"
                          defaultValue={editTask.priority}
                          className="glass-input h-12 focus:ring-2 focus:ring-accent/50 font-bold uppercase appearance-none w-full"
                        >
                          <option value="high" className="bg-[#1c1c1e] text-white">🔴 Hoch</option>
                          <option value="medium" className="bg-[#1c1c1e] text-white">🟡 Mittel</option>
                          <option value="low" className="bg-[#1c1c1e] text-white">🟢 Niedrig</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Kategorie</label>
                      <CategorySelect 
                        type="task" 
                        defaultValue={editTask.categoryId}
                        id="edit-category-select"
                        className="glass-input h-12 focus-within:ring-2 focus-within:ring-accent/50 font-bold uppercase w-full"
                        readOnly
                        hideIcon
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Datum</label>
                      <div className="relative">
                        <input
                          type="date"
                          id="edit-date-input"
                          defaultValue={editTask.dueDate ? format(new Date(editTask.dueDate), 'yyyy-MM-dd') : ''}
                          className="glass-input h-12 focus:ring-2 focus:ring-accent/50 font-bold w-full"
                        />
                        <CalendarIcon 
                          size={18} 
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted cursor-pointer hover:text-brand" 
                          onClick={() => {
                            const input = document.getElementById('edit-date-input') as any;
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
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Uhrzeit</label>
                      <div className="relative">
                        <input
                          type="time"
                          id="edit-time-input"
                          defaultValue={editTask.dueDate ? format(new Date(editTask.dueDate), 'HH:mm') : ''}
                          className="glass-input h-12 focus:ring-2 focus:ring-accent/50 font-bold w-full"
                        />
                        <Clock 
                          size={18} 
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted cursor-pointer hover:text-brand"
                          onClick={() => {
                            const input = document.getElementById('edit-time-input') as any;
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

                <div className="flex flex-col gap-3 pt-8">
                  <button 
                    type="button"
                    onClick={() => {
                      const taskInput = document.getElementById('edit-task-input') as HTMLInputElement;
                      const prioritySelect = document.getElementById('edit-priority-select') as HTMLSelectElement;
                      const dateInput = document.getElementById('edit-date-input') as HTMLInputElement;
                      const timeInput = document.getElementById('edit-time-input') as HTMLInputElement;
                      
                      let finalDueDate = null;
                      if (dateInput.value) {
                         finalDueDate = new Date(`${dateInput.value}T${timeInput.value || '00:00'}:00`).toISOString();
                      }

                      handleUpdateTask({
                        ...editTask,
                        task: taskInput.value,
                        priority: prioritySelect.value as any,
                        dueDate: finalDueDate,
                        categoryId: (document.getElementById('edit-category-select') as HTMLSelectElement)?.value || ''
                      });
                    }}
                    className="btn-green-glow w-full h-14 font-black uppercase tracking-widest"
                  >
                    Speichern
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditTask(null)}
                    className="btn-red-glow w-full h-14 font-black uppercase tracking-widest"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
          </div>
        ) : isFormExpanded ? (
          <div className="flex-1 flex flex-col h-full bg-transparent p-6 sm:p-10 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-2xl font-black text-brand tracking-tight">Hinzufügen</h3>
              <button onClick={() => setIsFormExpanded(false)} className="p-2 text-brand-muted hover:text-brand transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={addTask} className="max-w-xl mx-auto w-full space-y-8">
              <div className="space-y-6 flex flex-col">
                <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Was steht an?</label>
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Aufgabe beschreiben..."
                  className="glass-input h-12 focus:ring-2 focus:ring-accent/50 font-bold w-full transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Priorität</label>
                    <div className="relative">
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as any)}
                        className="glass-input h-12 focus:ring-2 focus:ring-accent/50 font-bold uppercase appearance-none w-full"
                      >
                        <option value="high" className="bg-[#1c1c1e] text-white">🔴 Hoch</option>
                        <option value="medium" className="bg-[#1c1c1e] text-white">🟡 Mittel</option>
                        <option value="low" className="bg-[#1c1c1e] text-white">🟢 Niedrig</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Kategorie</label>
                    <CategorySelect 
                      type="task" 
                      value={categoryId} 
                      onChange={setCategoryId}
                      className="glass-input h-12 focus-within:ring-2 focus-within:ring-accent/50 font-bold uppercase w-full"
                      readOnly
                      hideIcon
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Datum</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        id="add-task-date"
                        className="glass-input h-12 focus:ring-2 focus:ring-accent/50 font-bold w-full"
                      />
                      <CalendarIcon 
                        size={18} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted cursor-pointer hover:text-brand"
                        onClick={() => {
                          const input = document.getElementById('add-task-date') as any;
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
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Uhrzeit</label>
                    <div className="relative">
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        id="add-task-time"
                        className="glass-input h-12 focus:ring-2 focus:ring-accent/50 font-bold w-full"
                      />
                      <Clock 
                        size={18} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted cursor-pointer hover:text-brand"
                        onClick={() => {
                          const input = document.getElementById('add-task-time') as any;
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

              <div className="space-y-4">
                <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Wiederholung</label>
                <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRecurring(!isRecurring)}
                      className={cn(
                        "flex-1 h-12 rounded-2xl border flex items-center justify-center gap-2 transition-all font-black text-xs uppercase tracking-wider",
                        isRecurring ? "bg-accent/20 text-accent border-accent/30" : "bg-accent/[0.03] dark:bg-white/[0.03] border-none text-brand-muted"
                      )}
                    >
                      {isRecurring ? <Check size={14} strokeWidth={3} /> : null}
                      <span>{isRecurring ? 'An' : 'Aus'}</span>
                    </button>
                    {isRecurring && (
                      <select
                        value={recurrenceInterval}
                        onChange={(e) => setRecurrenceInterval(e.target.value as any)}
                        className="flex-1 h-12 bg-[#1c1c1e] text-white border-white/10 focus:ring-accent/30 font-bold uppercase appearance-none px-4 text-xs tracking-wider"
                      >
                        <option value="daily" className="bg-[#1c1c1e] text-white">Täglich</option>
                        <option value="weekly" className="bg-[#1c1c1e] text-white">Wöchentlich</option>
                        <option value="monthly" className="bg-[#1c1c1e] text-white">Monatlich</option>
                      </select>
                    )}
                </div>
              </div>

              <div className="pt-8">
                  <button
                    type="submit"
                    className="btn-green-glow w-full h-14 font-black uppercase tracking-[0.2em]"
                  >
                    Hinzufügen
                  </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-brand-muted">
            <div className="w-16 h-16 flex items-center justify-center mb-4 text-brand dark:text-white">
               <Check size={48} />
            </div>
            <p className="font-medium">Wähle eine Aufgabe aus oder erstelle eine neue</p>
          </div>
        )}
      </div>

      {/* Custom Delete Modal */}
      {deleteModal && deleteModal.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="glass-card w-full max-w-[480px] rounded-[2.5rem] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.12)]">
            <h3 className="text-2xl font-black text-red-500 mb-2 tracking-tight">Löschen?</h3>
            <p className="text-sm text-[#86868B] mb-8">Diese Aufgabe wird unwiderruflich entfernt.</p>
            <div className="flex flex-col gap-3">
              <button 
                type="button"
                onClick={handleDelete}
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

      {showCatManager && <CategoryManager type="task" onClose={() => setShowCatManager(false)} />}
    </div>
  );
}

function TaskItem({ todo, isActive, onToggle, onDelete, onEdit, categories }: { todo: Todo, isActive?: boolean, onToggle: () => void, onDelete: () => void, onEdit: () => void, categories: any[] }) {
  const isOverdue = todo.dueDate && !todo.completed && new Date(todo.dueDate) < new Date();
  const catName = categories.find(c => c.id === todo.categoryId)?.name || todo.categoryId || '';
  
  return (
    <div className={cn(
      "w-full text-left p-4 refined-list-item transition-all focus:outline-none cursor-pointer group relative border-l-[3px] rounded-none",
      isActive ? "bg-black/[0.03] dark:bg-white/[0.05]" : "bg-transparent",
      todo.completed && "opacity-60"
    )}
    style={{ borderLeftColor: todo.completed ? 'transparent' : (
      todo.priority === 'high' ? '#FF3B30' : 
      todo.priority === 'medium' ? '#FF9500' : 
      '#34C759'
    ) }}
    onClick={onEdit}
    >
      <div className="flex items-start gap-3 overflow-hidden">
        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={cn(
            "flex-shrink-0 w-4 h-4 rounded border mt-0.5 flex items-center justify-center transition-all cursor-pointer",
            todo.completed ? "bg-accent border-accent text-white" : "border-slate-300 dark:border-white/10 text-transparent hover:border-accent bg-transparent"
          )}
        >
          <Check size={10} className="stroke-[4]" />
        </button>
        <div className="min-w-0 flex-1">
          <h3 className={cn(
            "text-sm font-bold truncate tracking-tight",
            todo.completed ? "text-brand-muted line-through" : "text-slate-900 dark:text-white"
          )}>
            {todo.task}
          </h3>
          <div className="flex items-center justify-between mt-1">
             <span className="pro-heading !text-[8px]">
               {catName || 'Aufgabe'}
             </span>
             {todo.dueDate && (
               <span className={cn(
                 "text-[8px] font-black uppercase tracking-tighter",
                 isOverdue && !todo.completed ? "text-red-500" : "text-brand-muted/50"
               )}>
                 {format(new Date(todo.dueDate), 'd. MMM • HH:mm')}
               </span>
             )}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 text-brand-muted hover:text-red-500 md:opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
