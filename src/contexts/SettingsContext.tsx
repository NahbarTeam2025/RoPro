import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  LayoutDashboard, CheckSquare, Calendar as CalendarIcon, FileText, 
  Link as LinkIcon, MessageSquare, Wallet, Users, Shield, Settings as SettingsIcon
} from 'lucide-react';

export interface ModuleConfig {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
}

export const DEFAULT_MODULES: ModuleConfig[] = [
  { id: 'dashboard', name: 'Dashboard', enabled: true, order: 0 },
  { id: 'calendar', name: 'Kalender', enabled: true, order: 1 },
  { id: 'tasks', name: 'Aufgaben', enabled: true, order: 2 },
  { id: 'notes', name: 'Notizen', enabled: true, order: 3 },
  { id: 'household', name: 'Haushaltsbuch', enabled: true, order: 4 },
  { id: 'prompts', name: 'Prompts', enabled: true, order: 5 },
  { id: 'links', name: 'Links', enabled: true, order: 6 },
  { id: 'contacts', name: 'Kontakte', enabled: true, order: 7 },
  { id: 'passwords', name: 'Safe', enabled: true, order: 8 },
];

export const MODULE_ICONS: Record<string, any> = {
  dashboard: LayoutDashboard,
  calendar: CalendarIcon,
  tasks: CheckSquare,
  notes: FileText,
  household: Wallet,
  prompts: MessageSquare,
  links: LinkIcon,
  contacts: Users,
  passwords: Shield,
  settings: SettingsIcon
};

export const MODULE_PATHS: Record<string, string> = {
  dashboard: '/',
  calendar: '/calendar',
  tasks: '/tasks',
  notes: '/notes',
  household: '/household',
  prompts: '/prompts',
  links: '/links',
  contacts: '/contacts',
  passwords: '/passwords',
};

interface SettingsContextType {
  modules: ModuleConfig[];
  updateModules: (newModules: ModuleConfig[]) => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [modules, setModules] = useState<ModuleConfig[]>(DEFAULT_MODULES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setModules(DEFAULT_MODULES);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, 'userSettings', user.uid), (docSnap) => {
      if (docSnap.exists() && docSnap.data().modules) {
        // Merge with defaults in case of missing new modules
        const savedModules = docSnap.data().modules as ModuleConfig[];
        let merged = DEFAULT_MODULES.map(def => {
          const saved = savedModules.find(m => m.id === def.id);
          if (saved) return { ...def, enabled: saved.enabled, order: saved.order ?? def.order };
          return def;
        });
        merged.sort((a, b) => a.order - b.order);
        setModules(merged);
      } else {
        setModules(DEFAULT_MODULES);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const updateModules = async (newModules: ModuleConfig[]) => {
    if (!user) return;
    // Optimistic update
    setModules(newModules);
    await setDoc(doc(db, 'userSettings', user.uid), {
      modules: newModules
    }, { merge: true });
  };

  return (
    <SettingsContext.Provider value={{ modules, updateModules, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
