import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Check, Clock, Plus, Trash2, AlertCircle, Edit2, Settings2 } from 'lucide-react';
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
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [categoryId, setCategoryId] = useState('');
  const { categories } = useCategories('task');

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [showCatManager, setShowCatManager] = useState(false);

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
      await addDoc(collection(db, 'todos'), {
        task: newTask.trim(),
        priority,
        categoryId,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        completed: false,
        isRecurring: isRecurring,
        recurrenceInterval: isRecurring ? recurrenceInterval : null,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setNewTask('');
      setDueDate('');
      setPriority('medium');
      setCategoryId('');
      setIsRecurring(false);
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const toggleTodo = async (todo: Todo) => {
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

  const activeTodos = filteredTodos.filter(t => !t.completed);
  const completedTodos = filteredTodos.filter(t => t.completed);

  return (
    <div className="max-w-4xl mx-auto flex flex-col relative z-10 pb-6">
      <header className="mb-6 sm:mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 px-4 sm:px-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-brand uppercase">Aufgaben</h1>
        </div>
        <div className="flex w-full overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 items-center gap-2 custom-scrollbar">
           <button 
             onClick={() => setShowCatManager(true)}
             className="glass-button-secondary h-10 w-10 p-0 flex items-center justify-center shrink-0"
             title="Kategorien verwalten"
           >
             <Settings2 size={20} />
           </button>
           <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
              className="glass-input h-10 w-32 sm:w-36 appearance-none bg-white dark:bg-[#050505] text-[10px] font-bold uppercase tracking-wider shrink-0"
           >
             <option value="all">Kategorie</option>
             {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
           </select>
           <select 
              value={filterMonth} 
              onChange={(e) => setFilterMonth(e.target.value)}
              className="glass-input h-10 w-32 sm:w-36 appearance-none bg-white dark:bg-[#050505] text-[10px] font-bold uppercase tracking-wider shrink-0"
           >
             <option value="all">Zeitraum</option>
             {availableMonths.map(m => (
               <option key={m} value={m}>{format(new Date(`${m}-01`), 'MMMM yyyy', { locale: de })}</option>
             ))}
           </select>
        </div>
      </header>

      <div className="flex-1 flex flex-col gap-6 px-4 sm:px-0">
        <form onSubmit={addTask} className="glass-card p-6 sm:p-8 rounded-[2.5rem] flex flex-col gap-8">
          <div className="space-y-2.5 flex flex-col">
            <label className="text-[10px] font-black text-brand uppercase tracking-[0.2em] px-1">Was steht an?</label>
            <div className="relative group">
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Neue Aufgabe tippen..."
                className="glass-input h-14 sm:h-16 text-lg sm:text-xl font-black w-full border-none bg-brand/[0.03] focus:bg-brand/[0.06] transition-all"
                required
              />
              <div className="absolute left-0 bottom-0 w-0 h-1 bg-brand transition-all duration-300 group-focus-within:w-full" />
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-8 gap-y-6">
            <div className="min-w-[140px] flex-1 space-y-2 flex flex-col border-l border-white/5 pl-4">
              <label className="text-[9px] font-black text-brand-muted uppercase tracking-widest">Fälligkeit</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="glass-input h-9 text-[10px] bg-transparent border-none p-0 focus:ring-0"
              />
            </div>
            <div className="w-full sm:w-32 space-y-2 flex flex-col border-l border-white/5 pl-4">
              <label className="text-[9px] font-black text-brand-muted uppercase tracking-widest">Priorität</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="glass-input h-9 text-[10px] font-black uppercase appearance-none bg-transparent border-none p-0 focus:ring-0"
              >
                <option value="high" className="bg-[#1C1C1E]">🔴 Hoch</option>
                <option value="medium" className="bg-[#1C1C1E]">🟡 Mittel</option>
                <option value="low" className="bg-[#1C1C1E]">🟢 Niedrig</option>
              </select>
            </div>
            <div className="w-full sm:w-40 space-y-2 flex flex-col border-l border-white/5 pl-4">
              <label className="text-[9px] font-black text-brand-muted uppercase tracking-widest">Kategorie</label>
              <CategorySelect 
                type="task" 
                value={categoryId} 
                onChange={setCategoryId}
                className="h-9 border-none bg-transparent p-0"
              />
            </div>
            <div className="w-full sm:w-auto space-y-2 flex flex-col border-l border-white/5 pl-4">
               <label className="text-[9px] font-black text-brand-muted uppercase tracking-widest">Wiederholen</label>
               <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRecurring(!isRecurring)}
                    className={cn(
                      "h-9 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all font-black text-[9px] uppercase tracking-wider",
                      isRecurring ? "bg-blue-500/20 border-blue-500/50 text-blue-400" : "bg-white/5 border-white/5 text-brand-muted hover:text-brand"
                    )}
                  >
                    {isRecurring ? <Check size={12} strokeWidth={3} /> : null}
                    <span>{isRecurring ? 'An' : 'Aus'}</span>
                  </button>
                  {isRecurring && (
                    <select
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(e.target.value as any)}
                      className="h-9 bg-white/5 border-none rounded-xl px-2 text-[9px] font-black uppercase tracking-wider text-blue-400"
                    >
                      <option value="daily" className="bg-[#1C1C1E]">Täglich</option>
                      <option value="weekly" className="bg-[#1C1C1E]">Wöchentlich</option>
                      <option value="monthly" className="bg-[#1C1C1E]">Monatlich</option>
                    </select>
                  )}
               </div>
            </div>
          </div>

          <div className="flex justify-center border-t border-white/5 pt-8">
            <button
              type="submit"
              className="glass-button-primary h-14 px-12 rounded-[1.25rem] shadow-xl shadow-brand/20 hover:shadow-brand/30 active:scale-95 transition-all flex items-center justify-center gap-3 group"
            >
              <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
              <span className="font-black uppercase tracking-[0.2em] text-xs">Aufgabe Hinzufügen</span>
            </button>
          </div>
        </form>

        <div className="flex-1 space-y-8">
          {/* Active Tasks */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="pro-heading !text-brand">Aktive Aufgaben</h2>
              <span className="text-[10px] font-black text-brand-muted bg-brand/10 px-2.5 py-1 rounded-full uppercase tracking-widest">{activeTodos.length}</span>
            </div>
            
            <div className="flex-1 bg-white/30 dark:bg-white/[0.04] border border-slate-200/50 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-inner">
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                {activeTodos.map(todo => (
                  <TaskItem 
                    key={todo.id} 
                    todo={todo} 
                    onToggle={() => toggleTodo(todo)} 
                    onDelete={() => setDeleteModal({ open: true, id: todo.id })} 
                    onEdit={() => setEditTask(todo)}
                    categories={categories} 
                  />
                ))}
                {activeTodos.length === 0 && (
                  <div className="text-center">
                     <div className="w-12 h-12 text-brand flex items-center justify-center mx-auto mb-4">
                      <Check size={32} />
                    </div>
                    <h3 className="pro-heading !text-brand">Alles geschafft</h3>
                    <p className="mt-1 text-sm font-medium text-brand-muted">Du hast keine anstehenden Aufgaben.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Completed Tasks */}
          {completedTodos.length > 0 && (
            <div className="pt-4">
              <div className="flex items-center justify-between mb-4 border-b border-slate-200/50 dark:border-white/10 pb-2">
                <h3 className="pro-heading">Abgeschlossen</h3>
                <span className="text-[10px] font-black text-brand-muted">{completedTodos.length}</span>
              </div>
              <div className="bg-white/30 dark:bg-white/[0.04] border border-slate-200/50 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-inner">
                <div className="max-h-[250px] overflow-y-auto custom-scrollbar opacity-60 hover:opacity-100 transition-opacity duration-300">
                  {completedTodos.map(todo => (
                    <TaskItem 
                      key={todo.id} 
                      todo={todo} 
                      onToggle={() => toggleTodo(todo)} 
                      onDelete={() => setDeleteModal({ open: true, id: todo.id })} 
                      onEdit={() => setEditTask(todo)}
                      categories={categories} 
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom Delete Modal */}
      {deleteModal && deleteModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/10 backdrop-blur-md">
          <div className="glass-card w-full max-w-sm rounded-[2.5rem] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.12)]">
            <h3 className="text-2xl font-black text-red-500 mb-2 tracking-tight">Löschen?</h3>
            <p className="text-sm text-[#86868B] mb-8">Diese Aufgabe wird unwiderruflich entfernt.</p>
            <div className="flex flex-col gap-3">
              <button 
                type="button"
                onClick={handleDelete}
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

      {/* Edit Modal */}
      {editTask && (
        <EditTaskModal 
          todo={editTask} 
          categories={categories} 
          onClose={() => setEditTask(null)} 
          onSave={handleUpdateTask} 
        />
      )}
      
      {/* Category Manager Modal */}
      {showCatManager && <CategoryManager type="task" onClose={() => setShowCatManager(false)} />}
    </div>
  );
}

function EditTaskModal({ todo, categories, onClose, onSave }: { todo: Todo, categories: any[], onClose: () => void, onSave: (todo: Todo) => void }) {
  const [task, setTask] = useState(todo.task);
  const [priority, setPriority] = useState(todo.priority);
  const [dueDate, setDueDate] = useState(todo.dueDate ? todo.dueDate.substring(0, 16) : '');
  const [categoryId, setCategoryId] = useState(todo.categoryId);
  const [isRecurring, setIsRecurring] = useState(!!todo.isRecurring);
  const [recurrenceInterval, setRecurrenceInterval] = useState<'daily' | 'weekly' | 'monthly'>(todo.recurrenceInterval || 'weekly');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/10 backdrop-blur-md">
      <div className="glass-card w-full max-w-md rounded-[2.5rem] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.12)]">
        <h3 className="text-2xl font-black text-brand mb-2 tracking-tight">Bearbeiten</h3>
        <p className="text-sm text-brand-muted mb-8">Aufgabe anpassen</p>
        
        <div className="space-y-4 mb-8">
          <div className="space-y-1.5 flex flex-col">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Aufgabe</label>
            <input
              type="text"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="glass-input h-10"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 flex flex-col">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Priorität</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="glass-input h-10 appearance-none bg-white dark:bg-[#050505]"
              >
                <option value="high">Hoch</option>
                <option value="medium">Mittel</option>
                <option value="low">Niedrig</option>
              </select>
            </div>
            <div className="space-y-1.5 flex flex-col">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Kategorie</label>
              <CategorySelect 
                type="task" 
                value={categoryId} 
                onChange={setCategoryId}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 flex flex-col">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Fälligkeitsdatum</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="glass-input h-10"
              />
            </div>
            <div className="space-y-1.5 flex flex-col">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Wiederholen</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecurring(!isRecurring)}
                  className={cn(
                    "flex-1 h-10 rounded-xl border flex items-center justify-center gap-2 transition-all font-bold text-[10px] uppercase",
                    isRecurring ? "bg-blue-500/10 border-blue-500 text-blue-500" : "bg-slate-500/10 border-transparent text-brand-muted"
                  )}
                >
                  {isRecurring ? <Check size={12} /> : null}
                  <span>An</span>
                </button>
                {isRecurring && (
                  <select
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(e.target.value as any)}
                    className="flex-1 h-10 glass-input px-2 text-[10px] font-bold uppercase"
                  >
                    <option value="daily">Täglich</option>
                    <option value="weekly">Wöchentlich</option>
                    <option value="monthly">Monatlich</option>
                  </select>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            type="button"
            onClick={() => onSave({ 
              ...todo, 
              task, 
              priority, 
              dueDate: dueDate ? new Date(dueDate).toISOString() : null, 
              categoryId,
              isRecurring,
              recurrenceInterval: isRecurring ? recurrenceInterval : null
            })}
            className="w-full h-12 bg-[#007AFF] text-white font-bold rounded-2xl hover:bg-[#0071E3] transition-all"
          >
            Speichern
          </button>
          <button 
            type="button"
            onClick={onClose}
            className="w-full h-12 bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-bold rounded-2xl hover:bg-[#E8E8ED] dark:hover:bg-[#3A3A3C] transition-all"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskItem({ todo, onToggle, onDelete, onEdit, categories }: { todo: Todo, onToggle: () => void, onDelete: () => void, onEdit: () => void, categories: any[] }) {
  const isOverdue = todo.dueDate && !todo.completed && new Date(todo.dueDate) < new Date();
  const catName = categories.find(c => c.id === todo.categoryId)?.name || todo.categoryId || '';
  
  return (
    <div className={cn(
      "group flex items-center justify-between p-4 refined-list-item border-l-2 rounded-none",
      todo.completed && "opacity-60",
      isOverdue && !todo.completed && "bg-red-500/[0.03]"
    )}
    style={{ borderLeftColor: todo.completed ? 'transparent' : (isOverdue ? 'rgba(239, 68, 68, 0.6)' : 'rgba(37, 99, 235, 0.6)') }}
    >
      <div className="flex items-start gap-4 overflow-hidden">
        <button 
          type="button"
          onClick={onToggle}
          className={cn(
            "flex-shrink-0 w-5 h-5 rounded border mt-0.5 flex items-center justify-center transition-all cursor-pointer",
            todo.completed ? "bg-brand border-brand text-white" : "border-slate-300 dark:border-white/10 text-transparent hover:border-brand bg-transparent"
          )}
        >
          <Check size={12} className="stroke-[4]" />
        </button>
        <div className="min-w-0 flex flex-col justify-center cursor-pointer" onClick={onEdit}>
          <p className={cn(
            "text-sm font-bold truncate transition-all mb-1 tracking-tight",
            todo.completed ? "text-brand-muted line-through" : "text-brand"
          )}>
            {todo.task}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className={cn(
              "pro-heading !text-[9px]",
              todo.priority === 'high' ? "!text-red-500" :
              todo.priority === 'medium' ? "!text-amber-500" :
              "!text-brand"
            )}>
              {todo.priority === 'high' ? 'Prio: Hoch' : todo.priority === 'medium' ? 'Prio: Mittel' : 'Prio: Niedrig'}
            </span>
            {catName && (
              <span className="pro-heading !text-[9px] !text-brand-muted/70">
                {catName}
              </span>
            )}
            {todo.isRecurring && (
              <span className="pro-heading !text-[9px] !text-blue-500 flex items-center gap-0.5">
                <Clock size={8} /> Wiederkehrend ({todo.recurrenceInterval === 'daily' ? 'Täglich' : todo.recurrenceInterval === 'weekly' ? 'Wöchentlich' : 'Monatlich'})
              </span>
            )}
            {todo.dueDate && (
              <span className={cn(
                "inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.1em]",
                isOverdue && !todo.completed ? "text-red-500" : "text-brand-muted/60"
              )}>
                {isOverdue && !todo.completed ? <AlertCircle size={10} className="stroke-[3]" /> : <Clock size={10} className="stroke-[3]" />}
                {format(new Date(todo.dueDate), 'd. MMM, HH:mm')}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button 
          onClick={onEdit}
          className="p-2 text-brand-muted hover:text-brand hover:bg-brand/10 rounded-lg lg:opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
          aria-label="Aufgabe bearbeiten"
        >
          <Edit2 size={14} />
        </button>
        <button 
          onClick={onDelete}
          className="p-2 text-brand-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg lg:opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
          aria-label="Aufgabe löschen"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
