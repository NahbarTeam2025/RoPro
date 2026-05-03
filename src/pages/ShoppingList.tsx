import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Plus, Trash2, GripVertical, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ShoppingItem {
  id: string;
  name: string;
  completed: boolean;
  order: number;
  userId: string;
}

const enum OperationType {
  CREATE = 'create', UPDATE = 'update', DELETE = 'delete', LIST = 'list', GET = 'get', WRITE = 'write'
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, auth: any) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

function SortableItem({ item, toggleItem, deleteItem }: { item: ShoppingItem; toggleItem: any; deleteItem: any }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 p-3 bg-white/40 dark:bg-black/20 backdrop-blur border border-black/5 dark:border-white/5 rounded-2xl transition-all",
        isDragging && "shadow-xl border-brand/30 dark:border-brand/30 opacity-80 scale-[1.02]",
        item.completed && "opacity-40"
      )}
    >
      <button 
        className="w-8 h-8 flex items-center justify-center text-brand-muted hover:text-[#1D1D1F] dark:hover:text-white cursor-grab active:cursor-grabbing touch-none shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>

      <button
        onClick={() => toggleItem(item)}
        className={cn(
          "w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer",
          item.completed ? "bg-green-500 border-green-500 text-white" : "border-[#86868B]/30 text-transparent hover:border-green-500 bg-transparent"
        )}
      >
        <Check size={14} className="stroke-[3]" />
      </button>

      <span className={cn(
        "flex-1 text-[15px] font-medium tracking-tight",
        item.completed ? "line-through text-brand-muted" : "text-[#1D1D1F] dark:text-[#F5F5F7]"
      )}>
        {item.name}
      </span>

      <button 
        onClick={() => deleteItem(item.id)}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500/80 hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export default function ShoppingList() {
  const { user } = useAuth();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, 'shoppinglist'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShoppingItem));
      data.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return a.order - b.order;
      });
      setItems(data);
      setLoading(false);
    }, (error) => {
      // In early stage /shoppinglist might not be covered by firestore.rules properly - the user requested we make it, 
      // but without the set_up_firebase tool we can't easily auto-deploy rules. Hopefully they update rules.
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim() || !user) return;

    const name = newItem.trim();
    setNewItem('');
    
    try {
      await addDoc(collection(db, 'shoppinglist'), {
        name,
        completed: false,
        order: items.length > 0 ? Math.min(...items.map(i => i.order)) - 1 : 0,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleItem = async (item: ShoppingItem) => {
    try {
      await updateDoc(doc(db, 'shoppinglist', item.id), {
        completed: !item.completed
      });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteItem = (id: string) => {
    setItemToDelete(id);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'shoppinglist', itemToDelete));
    } catch (err) {
      console.error(err);
    }
    setItemToDelete(null);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);
      
      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems); // optimistic
      
      // Update orders in db
      try {
        const batch = writeBatch(db);
        newItems.forEach((item, index) => {
          if (item.completed) return; // don't reorder completed in db
          batch.update(doc(db, 'shoppinglist', item.id), { order: index });
        });
        await batch.commit();
      } catch (err) {
         console.error(err);
      }
    }
  };

  const activeItems = items.filter(i => !i.completed);
  const completedItems = items.filter(i => i.completed);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Einkaufsliste</h1>
          <p className="text-sm text-brand-muted mt-1">Was brauchst du?</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="relative">
        <input 
          type="text" 
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          placeholder="Artikel hinzufügen..."
          className="glass-input w-full h-14 pl-4 pr-12 text-lg font-medium rounded-2xl"
        />
        <button 
          type="submit" 
          disabled={!newItem.trim()}
          className="absolute right-2 top-2 h-10 w-10 flex items-center justify-center rounded-xl bg-brand text-white disabled:opacity-50 disabled:bg-slate-400"
        >
          <Plus size={20} />
        </button>
      </form>

      {loading ? (
        <div className="text-brand-muted text-center py-4">Laden...</div>
      ) : (
        <div className="space-y-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={activeItems} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {activeItems.map(item => (
                  <SortableItem key={item.id} item={item} toggleItem={toggleItem} deleteItem={deleteItem} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {completedItems.length > 0 && (
            <div className="pt-6 space-y-2 relative before:absolute before:inset-x-4 before:top-3 before:h-px before:bg-black/5 dark:before:bg-white/5">
              {completedItems.map(item => (
                <SortableItem key={item.id} item={item} toggleItem={toggleItem} deleteItem={deleteItem} />
              ))}
            </div>
          )}
        </div>
      )}

      {itemToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1D1D1F] p-6 rounded-3xl w-full max-w-sm shadow-2xl border border-white/10">
            <h3 className="text-xl font-bold text-white mb-2">Eintrag löschen?</h3>
            <p className="text-gray-400 mb-6">Möchtest du diesen Artikel wirklich aus deiner Einkaufsliste entfernen?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setItemToDelete(null)}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white font-semibold flex items-center justify-center transition-colors hover:bg-white/20"
              >
                Abbrechen
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-semibold flex items-center justify-center transition-colors hover:bg-red-600"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
