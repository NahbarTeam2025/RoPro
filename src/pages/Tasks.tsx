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
  createdAt?: any;
  updatedAt?: any;
}

export default function Tasks() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [dueDate, setDueDate] = useState('');
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
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setNewTask('');
      setDueDate('');
      setPriority('medium');
      setCategoryId('');
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const toggleTodo = async (todo: Todo) => {
    try {
      await updateDoc(doc(db, 'todos', todo.id), {
        completed: !todo.completed,
        updatedAt: serverTimestamp()
      });
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
    <div className="max-w-4xl mx-auto flex flex-col h-full relative z-10">
      <header className="mb-6 sm:mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 px-4 sm:px-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-brand uppercase italic">Aufgaben</h1>
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

      <div className="flex-1 flex flex-col gap-6">
        <form onSubmit={addTask} className="glass-card p-6 rounded-3xl flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full space-y-1.5 flex flex-col">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Neue Aufgabe</label>
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Was muss erledigt werden?"
              className="glass-input h-10"
              required
            />
          </div>
          <div className="w-full sm:w-40 space-y-1.5 flex flex-col">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Fälligkeitsdatum</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="glass-input h-10"
            />
          </div>
          <div className="w-full sm:w-32 space-y-1.5 flex flex-col">
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
          <div className="w-full sm:w-40 space-y-1.5 flex flex-col">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Kategorie</label>
            <CategorySelect 
              type="task" 
              value={categoryId} 
              onChange={setCategoryId}
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto glass-button-primary h-10"
          >
            Hinzufügen
          </button>
        </form>

        <div className="flex-1 space-y-8">
          {/* Active Tasks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-brand">Aktive Aufgaben</h2>
              <span className="text-xs font-bold text-brand-muted bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded-full">{activeTodos.length}</span>
            </div>
            
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
              <div className="p-12 text-center glass-card rounded-3xl">
                 <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Check size={24} />
                </div>
                <h3 className="text-sm font-bold text-brand">Keine aktiven Aufgaben</h3>
                <p className="mt-1 text-sm font-medium text-brand-muted">Du bist auf dem neuesten Stand!</p>
              </div>
            )}
          </div>

          {/* Completed Tasks */}
          {completedTodos.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3 border-b border-slate-200/50 dark:border-white/10 pb-2">
                <h3 className="text-xs font-bold text-brand-muted uppercase tracking-wider">Abgeschlossen</h3>
                <span className="text-xs font-bold text-brand-muted">{completedTodos.length}</span>
              </div>
              <div className="space-y-2 opacity-60 hover:opacity-100 transition-opacity duration-300">
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
          <div className="space-y-1.5 flex flex-col">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Fälligkeitsdatum</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="glass-input h-10"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            type="button"
            onClick={() => onSave({ ...todo, task, priority, dueDate: dueDate ? new Date(dueDate).toISOString() : null, categoryId })}
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
      "group flex items-center justify-between p-4 rounded-2xl shadow-sm transition-all",
      todo.completed ? "bg-slate-100/50 dark:bg-white/5 border border-transparent" : isOverdue ? "bg-red-500/10 border border-red-500/30" : "glass-card border-transparent dark:border-white/10"
    )}>
      <div className="flex items-start gap-4 overflow-hidden">
        <button 
          onClick={onToggle}
          className={cn(
            "flex-shrink-0 w-6 h-6 rounded border mt-0.5 flex items-center justify-center transition-colors cursor-pointer",
            todo.completed ? "bg-green-500 border-green-500 text-black" : "border-slate-300 dark:border-slate-600 text-transparent hover:border-green-500 bg-transparent"
          )}
        >
          <Check size={14} className="stroke-[3]" />
        </button>
        <div className="min-w-0 flex flex-col justify-center cursor-pointer" onClick={onEdit}>
          <p className={cn(
            "text-sm font-semibold truncate transition-all mb-1",
            todo.completed ? "text-brand-muted line-through" : "text-brand"
          )}>
            {todo.task}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(
              "inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded",
              todo.priority === 'high' ? "bg-red-500/20 text-red-500" :
              todo.priority === 'medium' ? "bg-amber-500/20 text-amber-500" :
              "bg-green-500/20 text-green-500"
            )}>
              {todo.priority === 'high' ? 'Hoch' : todo.priority === 'medium' ? 'Mittel' : 'Niedrig'}
            </span>
            {catName && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-500">
                {catName}
              </span>
            )}
            {todo.dueDate && (
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider",
                isOverdue ? "text-red-500" : "text-brand-muted"
              )}>
                {isOverdue ? <AlertCircle size={12} className="stroke-[3]" /> : <Clock size={12} className="stroke-[3]" />}
                {format(new Date(todo.dueDate), 'd. MMM, HH:mm')}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button 
          onClick={onEdit}
          className="p-2 text-brand-muted hover:text-[#007AFF] hover:bg-[#007AFF]/10 rounded-lg lg:opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
          aria-label="Aufgabe bearbeiten"
        >
          <Edit2 size={16} />
        </button>
        <button 
          onClick={onDelete}
          className="p-2 text-brand-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg lg:opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
          aria-label="Aufgabe löschen"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
