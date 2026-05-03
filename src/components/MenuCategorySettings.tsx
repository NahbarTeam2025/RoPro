import React, { useState, useEffect } from 'react';
import { useSettings, MenuCategoryConfig, MenuLinkConfig } from '../contexts/SettingsContext';
import { GripVertical, Eye, EyeOff, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../lib/utils';
import * as Icons from 'lucide-react';

function SortableCategoryItem({ category, toggleCategory, onEdit, onDelete }: { category: MenuCategoryConfig, toggleCategory: (id: string) => void, onEdit: (cat: MenuCategoryConfig) => void, onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const Icon = (Icons as any)[category.iconName] || Icons.Cloud;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between p-4 mb-2 rounded-2xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-md",
        isDragging && "opacity-50 z-50 shadow-xl",
        !category.enabled && "opacity-60"
      )}
    >
      <div className="flex items-center gap-4 flex-1">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-brand-muted hover:text-brand">
          <GripVertical size={20} />
        </div>
        <div className="flex items-center gap-3">
          <Icon size={20} className="text-brand dark:text-brand-muted" />
          <span className="font-bold text-sm tracking-wide text-brand dark:text-white">{category.name}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onDelete(category.id)}
          className="p-2 rounded-xl transition-colors text-red-500/80 hover:bg-red-500/10"
        >
          <Trash2 size={16} />
        </button>
        <button
          onClick={() => onEdit(category)}
          className="p-2 rounded-xl transition-colors text-brand-muted hover:bg-black/10 dark:hover:bg-white/10"
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={() => toggleCategory(category.id)}
          className={cn(
            "p-2 rounded-xl transition-colors",
            category.enabled ? "text-accent bg-accent/10 hover:bg-accent/20" : "text-brand-muted hover:bg-black/10 dark:hover:bg-white/10"
          )}
        >
          {category.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>
    </div>
  );
}

function SortableLinkItem({ link, toggleLink, onDelete }: { link: MenuLinkConfig, toggleLink: (id: string) => void, onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const Icon = (Icons as any)[link.iconName] || Icons.Link;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between p-3 mb-2 rounded-xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-[#1C1C1E]",
        isDragging && "opacity-50 z-50 shadow-xl",
        !link.enabled && "opacity-60"
      )}
    >
      <div className="flex items-center gap-3 flex-1 overflow-hidden">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-brand-muted hover:text-brand">
          <GripVertical size={16} />
        </div>
        <Icon size={16} className="text-brand dark:text-brand-muted shrink-0" />
        <div className="flex flex-col overflow-hidden">
          <span className="font-bold text-sm tracking-wide text-brand dark:text-white truncate">{link.name}</span>
          {link.url && <span className="text-xs text-brand-muted truncate">{link.url}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onDelete(link.id)}
          className="p-1.5 rounded-lg transition-colors text-red-500/80 hover:bg-red-500/10"
          title="Verknüpfung löschen"
        >
          <Trash2 size={16} />
        </button>
        <button
          onClick={() => toggleLink(link.id)}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            link.enabled ? "text-accent" : "text-brand-muted"
          )}
        >
          {link.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>
    </div>
  );
}

export default function MenuCategorySettings({ expandedSection, setExpandedSection }: {
  expandedSection: string | null;
  setExpandedSection: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const { menuCategories, updateMenuCategories } = useSettings();
  const [categories, setCategories] = useState<MenuCategoryConfig[]>([]);
  const [editingCategory, setEditingCategory] = useState<MenuCategoryConfig | null>(null);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'category' | 'link'; id: string; name: string } | null>(null);

  useEffect(() => {
    setCategories(menuCategories);
    if (editingCategory) {
      const updated = menuCategories.find(c => c.id === editingCategory.id);
      if (updated) setEditingCategory(updated);
    }
  }, [menuCategories]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEndCategories = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex(i => i.id === active.id);
      const newIndex = categories.findIndex(i => i.id === over.id);
      const newItems = arrayMove(categories, oldIndex, newIndex).map((item, index) => ({ ...item, order: index }));
      setCategories(newItems);
      updateMenuCategories(newItems);
    }
  };

  const toggleCategory = (id: string) => {
    const newItems = categories.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item);
    setCategories(newItems);
    updateMenuCategories(newItems);
  };

  const handleDragEndLinks = (event: DragEndEvent) => {
    if (!editingCategory) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const links = [...editingCategory.links];
      const oldIndex = links.findIndex(i => i.id === active.id);
      const newIndex = links.findIndex(i => i.id === over.id);
      const newLinks = arrayMove(links, oldIndex, newIndex).map((item, index) => ({ ...item, order: index }));
      
      const newCategories = categories.map(cat => cat.id === editingCategory.id ? { ...cat, links: newLinks } : cat);
      setCategories(newCategories);
      updateMenuCategories(newCategories);
    }
  };

  const toggleLink = (linkId: string) => {
    if (!editingCategory) return;
    const newLinks = editingCategory.links.map(l => l.id === linkId ? { ...l, enabled: !l.enabled } : l);
    const newCategories = categories.map(cat => cat.id === editingCategory.id ? { ...cat, links: newLinks } : cat);
    setCategories(newCategories);
    updateMenuCategories(newCategories);
  };

  const deleteLink = (linkId: string) => {
    const link = editingCategory?.links.find(l => l.id === linkId);
    if (link) {
      setDeleteConfirm({ type: 'link', id: link.id, name: link.name });
    }
  };

  const deleteCategory = (catId: string) => {
    const category = categories.find(c => c.id === catId);
    if (category) {
      setDeleteConfirm({ type: 'category', id: category.id, name: category.name });
    }
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'category') {
      const newItems = categories.filter(c => c.id !== deleteConfirm.id);
      setCategories(newItems);
      updateMenuCategories(newItems);
      if (editingCategory?.id === deleteConfirm.id) setEditingCategory(null);
    } else {
      if (!editingCategory) return;
      const newLinks = editingCategory.links.filter(l => l.id !== deleteConfirm.id);
      const newCategories = categories.map(cat => cat.id === editingCategory.id ? { ...cat, links: newLinks } : cat);
      setCategories(newCategories);
      updateMenuCategories(newCategories);
      setEditingCategory(prev => prev ? { ...prev, links: newLinks } : null);
    }
    setDeleteConfirm(null);
  };

  const addCustomLink = () => {
    if (!editingCategory || !newLinkName || !newLinkUrl) return;
    const newLink: MenuLinkConfig = {
      id: `custom-${Date.now()}`,
      name: newLinkName,
      url: newLinkUrl.startsWith('http') ? newLinkUrl : `https://${newLinkUrl}`,
      iconName: 'Link',
      enabled: true,
      order: editingCategory.links.length,
      isCustom: true
    };
    const newLinks = [...editingCategory.links, newLink];
    const newCategories = categories.map(cat => cat.id === editingCategory.id ? { ...cat, links: newLinks } : cat);
    setCategories(newCategories);
    updateMenuCategories(newCategories);
    setNewLinkName('');
    setNewLinkUrl('');
    setIsAddingLink(false);
  };

  return (
    <div className="glass-card rounded-[2.5rem] overflow-hidden transition-all duration-300">
      <button 
        onClick={() => {
          setExpandedSection(expandedSection === 'categories' ? null : 'categories');
          // Reset editing state when closing
          if (expandedSection === 'categories') {
            setEditingCategory(null);
            setIsAddingLink(false);
          }
        }}
        className="w-full flex items-center justify-between p-6 sm:p-8 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <div>
          <h2 className="text-lg font-black tracking-tight text-brand dark:text-white capitalize mb-1">Sidebar Kategorien & Links</h2>
          <p className="text-brand-muted text-sm">Ordne Kategorien und bearbeite Sidebar Links.</p>
        </div>
        {expandedSection === 'categories' ? <Icons.ChevronUp className="text-brand-muted shrink-0 ml-4" /> : <Icons.ChevronDown className="text-brand-muted shrink-0 ml-4" />}
      </button>

      {expandedSection === 'categories' && (
        <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-0 outline-none animate-in slide-in-from-top-2 duration-300">
          {editingCategory ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setEditingCategory(null)} className="p-2 -ml-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                   <Icons.ChevronLeft size={24} />
                </button>
                <h2 className="text-xl font-black tracking-tight text-brand dark:text-white capitalize truncate">{editingCategory.name} bearbeiten</h2>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndLinks}>
                <SortableContext items={editingCategory.links} strategy={verticalListSortingStrategy}>
                  {editingCategory.links.map(link => (
                    <SortableLinkItem key={link.id} link={link} toggleLink={toggleLink} onDelete={deleteLink} />
                  ))}
                </SortableContext>
              </DndContext>

              {isAddingLink ? (
                <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 space-y-3 mt-4">
                  <input
                    autoFocus
                    placeholder="Name (z.B. Twitter)"
                    value={newLinkName}
                    onChange={e => setNewLinkName(e.target.value)}
                    className="w-full glass-input h-10 px-3 rounded-lg text-sm"
                  />
                  <input
                    placeholder="URL (z.B. x.com)"
                    value={newLinkUrl}
                    onChange={e => setNewLinkUrl(e.target.value)}
                    className="w-full glass-input h-10 px-3 rounded-lg text-sm"
                  />
                  <div className="flex gap-2 justify-end mt-2">
                    <button onClick={() => setIsAddingLink(false)} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-brand-muted hover:bg-black/5 dark:hover:bg-white/5">Abbrechen</button>
                    <button onClick={addCustomLink} disabled={!newLinkName || !newLinkUrl} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-brand text-white hover:bg-brand/90 disabled:opacity-50">Hinzufügen</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingLink(true)}
                  className="mt-4 w-full py-3 rounded-xl border-2 border-dashed border-black/10 dark:border-white/10 text-brand-muted hover:text-brand hover:border-black/20 dark:hover:border-white/20 transition-colors flex items-center justify-center gap-2 font-semibold text-sm"
                >
                  <Plus size={16} /> Link hinzufügen
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndCategories}>
                <SortableContext items={categories} strategy={verticalListSortingStrategy}>
                  {categories.map(cat => (
                    <SortableCategoryItem key={cat.id} category={cat} toggleCategory={toggleCategory} onEdit={setEditingCategory} onDelete={deleteCategory} />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-[320px] bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-2xl border border-black/5 dark:border-white/10 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Löschen?</h3>
              <p className="text-sm text-brand-muted mb-6">
                Möchtest du <strong>{deleteConfirm.name}</strong> unwiderruflich aus der Sidebar entfernen?
              </p>
              <div className="flex flex-col gap-2 w-full">
                <button onClick={confirmDelete} className="w-full py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">
                  Ja, löschen
                </button>
                <button onClick={() => setDeleteConfirm(null)} className="w-full py-3 rounded-xl font-bold text-slate-900 dark:text-white bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors">
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
