import React, { useState, useEffect } from 'react';
import { useSettings, ModuleConfig, MODULE_ICONS } from '../contexts/SettingsContext';
import { Settings as SettingsIcon, GripVertical, Eye, EyeOff } from 'lucide-react';
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

export function SortableItem(props: { module: ModuleConfig; toggleModule: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: props.module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = MODULE_ICONS[props.module.id];
  const isDashboard = props.module.id === 'dashboard';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between p-4 mb-2 rounded-2xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-md",
        isDragging && "opacity-50 z-50 shadow-xl",
        !props.module.enabled && "opacity-60"
      )}
    >
      <div className="flex items-center gap-4 flex-1">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-brand-muted hover:text-brand">
          <GripVertical size={20} />
        </div>
        <div className="flex items-center gap-3">
          {Icon && <Icon size={20} className="text-brand dark:text-brand-muted" />}
          <span className="font-bold text-sm tracking-wide text-brand dark:text-white uppercase">{props.module.name}</span>
        </div>
      </div>
      <div>
        <button
          onClick={() => props.toggleModule(props.module.id)}
          disabled={isDashboard}
          className={cn(
            "p-2 rounded-xl transition-colors",
            isDashboard ? "opacity-50 cursor-not-allowed text-brand-muted" : 
            props.module.enabled ? "text-accent bg-accent/10 hover:bg-accent/20" : "text-brand-muted hover:bg-black/10 dark:hover:bg-white/10"
          )}
        >
          {props.module.enabled ? <Eye size={20} /> : <EyeOff size={20} />}
        </button>
      </div>
    </div>
  );
}

export default function Settings() {
  const { modules, updateModules, loading } = useSettings();
  const [items, setItems] = useState<ModuleConfig[]>([]);

  useEffect(() => {
    setItems(modules);
  }, [modules]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      
      const newItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
        ...item,
        order: index
      }));
      
      setItems(newItems);
      updateModules(newItems);
    }
  };

  const toggleModule = (id: string) => {
    if (id === 'dashboard') return; // Cannot disable dashboard
    const newItems = items.map(item => 
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
    setItems(newItems);
    updateModules(newItems);
  };

  if (loading) {
    return <div className="p-8">Laden...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 flex items-center justify-center bg-accent/10 text-accent rounded-2xl">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-brand capitalize">Einstellungen</h1>
        </div>
      </div>

      <div className="space-y-6">
        <div className="glass-card p-6 sm:p-8 rounded-[2.5rem]">
          <h2 className="text-lg font-black tracking-tight text-brand capitalize mb-6">Menüpunkte & Sichtbarkeit</h2>
          <p className="text-brand-muted text-sm mb-6">Ordne die Punkte per Drag & Drop an und aktiviere/deaktiviere sie.</p>
          
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={items}
              strategy={verticalListSortingStrategy}
            >
              {items.map(module => (
                <SortableItem key={module.id} module={module} toggleModule={toggleModule} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
