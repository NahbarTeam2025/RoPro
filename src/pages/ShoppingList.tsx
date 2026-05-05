import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch, orderBy } from 'firebase/firestore';
import { Plus, Trash2, GripVertical, Check, ChevronDown, Edit2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { migrateShoppingLists } from '../services/migration';
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

interface ShoppingListMeta {
  id: string;
  name: string;
  userId: string;
}

interface ShoppingItem {
  id: string;
  name: string;
  completed: boolean;
  order: number;
}

function SortableItem({ item, toggleItem, deleteItem, listId }: { item: ShoppingItem; toggleItem: any; deleteItem: any; listId: string }) {
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
        className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500/80 hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export default function ShoppingList() {
  const { user } = useAuth();
  const [lists, setLists] = useState<ShoppingListMeta[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  
  const [newItem, setNewItem] = useState('');
  const [newListMode, setNewListMode] = useState(false);
  const [newListName, setNewListName] = useState('');
  
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editListName, setEditListName] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [listToDelete, setListToDelete] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!user) return;
    
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;
    
    // Attempt migration first
    migrateShoppingLists(user.uid).then(() => {
      if (!isMounted) return;
      const q = query(collection(db, 'shoppinglists'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShoppingListMeta));
        setLists(data);
        
        if (data.length > 0 && !activeListId) {
          setActiveListId(data[0].id);
        } else if (data.length === 0) {
          addDoc(collection(db, 'shoppinglists'), {
            name: 'Einkaufsliste',
            userId: user.uid,
            createdAt: serverTimestamp()
          });
        }
        setLoading(false);
      });
    });
    
    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [user, activeListId]);

  useEffect(() => {
    if (!activeListId) {
      setItems([]);
      return;
    }
    
    const itemsQ = query(collection(db, `shoppinglists/${activeListId}/items`), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(itemsQ, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ShoppingItem));
      data.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return a.order - b.order;
      });
      setItems(data);
    });

    return () => unsubscribe();
  }, [activeListId]);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim() || !user) return;
    try {
      const docRef = await addDoc(collection(db, 'shoppinglists'), {
        name: newListName.trim(),
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setNewListName('');
      setNewListMode(false);
      setActiveListId(docRef.id);
      setIsDropdownOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const saveListName = async () => {
    if (!editingListId || !editListName.trim()) return;
    try {
      await updateDoc(doc(db, 'shoppinglists', editingListId), {
        name: editListName.trim()
      });
      setEditingListId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDeleteList = async () => {
    if (!listToDelete) return;
    try {
      await deleteDoc(doc(db, 'shoppinglists', listToDelete));
      // Optionally delete subcollection items using a cloud function, but doing locally here requires loop
      const itemsQ = query(collection(db, `shoppinglists/${listToDelete}/items`), where('userId', '==', user?.uid || ''));
      getDocs(itemsQ).then(snap => {
        snap.docs.forEach(d => deleteDoc(d.ref));
      });
      if (activeListId === listToDelete) {
        const remaining = lists.filter(l => l.id !== listToDelete);
        setActiveListId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error(err);
    }
    setListToDelete(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim() || !user || !activeListId) return;

    const name = newItem.trim();
    setNewItem('');
    
    try {
      await addDoc(collection(db, `shoppinglists/${activeListId}/items`), {
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
    if (!activeListId) return;
    try {
      await updateDoc(doc(db, `shoppinglists/${activeListId}/items`, item.id), {
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
    if (!itemToDelete || !activeListId) return;
    try {
      await deleteDoc(doc(db, `shoppinglists/${activeListId}/items`, itemToDelete));
    } catch (err) {
      console.error(err);
    }
    setItemToDelete(null);
  };

  const handleDragEnd = async (event: any) => {
    if (!activeListId) return;
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);
      
      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems); // optimistic
      
      try {
        const batch = writeBatch(db);
        newItems.forEach((item, index) => {
          if (item.completed) return; 
          batch.update(doc(db, `shoppinglists/${activeListId}/items`, item.id), { order: index });
        });
        await batch.commit();
      } catch (err) {
         console.error(err);
      }
    }
  };

  const activeItems = items.filter(i => !i.completed);
  const completedItems = items.filter(i => i.completed);
  
  const activeList = lists.find(l => l.id === activeListId);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      
      {/* Header & List Selection Dropdown */}
      <div className="flex flex-col gap-2 w-full sm:max-w-sm mb-6">
        {editingListId ? (
           <div className="flex items-center gap-2 w-full">
             <input 
               type="text" 
               value={editListName} 
               onChange={e => setEditListName(e.target.value)}
               className="glass-input h-12 w-full px-4 rounded-xl font-bold"
               autoFocus
               onKeyDown={e => e.key === 'Enter' && saveListName()}
             />
             <button onClick={saveListName} className="h-12 px-4 bg-brand text-white rounded-xl font-bold">Speichern</button>
             <button onClick={() => setEditingListId(null)} className="h-12 px-4 bg-black/10 dark:bg-white/10 rounded-xl"><X size={20}/></button>
           </div>
        ) : newListMode ? (
          <form onSubmit={handleAddList} className="flex items-center gap-2 w-full">
            <input 
              type="text" 
              value={newListName} 
              onChange={e => setNewListName(e.target.value)}
              placeholder="Listenname..." 
              className="glass-input h-12 w-full px-4 rounded-xl font-bold text-lg"
              autoFocus
            />
            <button type="submit" className="h-12 px-4 bg-brand text-white rounded-xl font-bold shrink-0">Erstellen</button>
            <button type="button" onClick={() => setNewListMode(false)} className="h-12 px-4 bg-black/10 dark:bg-white/10 rounded-xl shrink-0"><X size={20}/></button>
          </form>
        ) : (
          <div className="grid grid-cols-[1fr_3rem] gap-2 w-full">
            <div className="relative w-full" ref={dropdownRef}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between text-left h-12 pl-4 pr-3 glass-card rounded-xl group transition-all duration-300"
              >
                <div className="flex flex-col min-w-0 mr-2">
                  <span className="text-[9px] uppercase font-bold text-brand-muted tracking-wider leading-none mb-0.5">Liste</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none truncate block">
                    {activeList?.name || 'Laden...'}
                  </span>
                </div>
                <ChevronDown size={18} className={cn("text-brand-muted transition-transform shrink-0", isDropdownOpen && "rotate-180")} />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute top-14 left-0 right-0 glass-card rounded-xl shadow-xl z-50 p-2 py-2 border border-black/10 dark:border-white/10 flex flex-col gap-1 max-h-64 overflow-y-auto">
                  {lists.map(list => (
                    <button
                      key={list.id}
                      onClick={() => { setActiveListId(list.id); setIsDropdownOpen(false); }}
                      className={cn("w-full text-left px-3 py-2.5 rounded-lg font-bold transition-colors text-sm hover:bg-black/5 dark:hover:bg-white/5", activeListId === list.id ? "bg-brand/10 text-brand" : "text-slate-900 dark:text-white")}
                    >
                      {list.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setNewListMode(true)}
              className="h-12 w-12 flex items-center justify-center rounded-xl glass-card hover:bg-brand/10 text-brand transition-colors border border-black/5 dark:border-white/5 bg-white/40 dark:bg-black/20"
              title="Neue Liste erstellen"
            >
              <Plus size={20} />
            </button>

            {activeList && (
              <>
                <button 
                  onClick={() => { setEditListName(activeList.name); setEditingListId(activeList.id); }}
                  className="w-full h-12 px-4 flex items-center justify-center gap-2 rounded-xl bg-white/40 dark:bg-black/20 text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-white dark:hover:bg-black font-semibold transition-colors border border-black/5 dark:border-white/5"
                >
                  <Edit2 size={16} />
                  <span className="text-sm">Umbenennen</span>
                </button>
                {lists.length > 1 ? (
                  <button 
                    onClick={() => setListToDelete(activeList.id)}
                    className="h-12 w-12 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-semibold transition-colors border border-red-500/20"
                  >
                    <Trash2 size={16} />
                  </button>
                ) : (
                  <div className="w-12 h-12"></div>
                )}
              </>
            )}
          </div>
        )}
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
          disabled={!newItem.trim() || !activeListId}
          className="absolute right-2 top-2 h-10 w-10 flex items-center justify-center rounded-xl bg-brand text-white disabled:opacity-50 disabled:bg-slate-400 cursor-pointer"
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
                  <SortableItem key={item.id} item={item} toggleItem={toggleItem} deleteItem={deleteItem} listId={activeListId as string} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {completedItems.length > 0 && (
            <div className="pt-6 space-y-2 relative before:absolute before:inset-x-4 before:top-3 before:h-px before:bg-black/5 dark:before:bg-white/5">
              {completedItems.map(item => (
                <SortableItem key={item.id} item={item} toggleItem={toggleItem} deleteItem={deleteItem} listId={activeListId as string} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Item Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#1D1D1F] p-6 rounded-3xl w-full max-w-sm shadow-2xl border border-white/10 transform transition-all">
            <h3 className="text-xl font-bold text-white mb-2">Eintrag löschen?</h3>
            <p className="text-gray-400 mb-6">Möchtest du diesen Artikel entfernen?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setItemToDelete(null)}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors"
                autoFocus
              >
                Abbrechen
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete List Modal */}
      {listToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-[#1D1D1F] p-6 rounded-[2.5rem] w-full max-w-sm shadow-2xl border border-white/10 transform transition-all">
             <h3 className="text-xl font-black text-white mb-2">Liste löschen?</h3>
             <p className="text-sm text-gray-400 font-medium mb-8">Diese Liste und alle darin enthaltenen Artikel werden unwiderruflich gelöscht.</p>
             <div className="flex flex-col gap-3">
               <button 
                 onClick={confirmDeleteList}
                 className="flex-1 px-4 py-3.5 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors"
               >
                 Unwiderruflich löschen
               </button>
               <button 
                 onClick={() => setListToDelete(null)}
                 className="flex-1 px-4 py-3.5 rounded-2xl bg-white/10 text-white font-bold hover:bg-white/20 transition-colors"
               >
                 Abbrechen
               </button>
             </div>
           </div>
        </div>
      )}

    </div>
  );
}
