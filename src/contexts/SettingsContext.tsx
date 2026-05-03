import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  LayoutDashboard, CheckSquare, Calendar as CalendarIcon, FileText, 
  Link as LinkIcon, MessageSquare, Wallet, Users, Shield, Settings as SettingsIcon,
  ShoppingCart, Rss
} from 'lucide-react';

export interface ModuleConfig {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
}

export interface MenuLinkConfig {
  id: string;
  name: string;
  iconName: string;
  url?: string;
  path?: string;
  action?: string;
  enabled: boolean;
  order: number;
  isCustom?: boolean;
}

export interface MenuCategoryConfig {
  id: string;
  name: string;
  iconName: string;
  enabled: boolean;
  order: number;
  links: MenuLinkConfig[];
}

export const DEFAULT_MODULES: ModuleConfig[] = [
  { id: 'dashboard', name: 'Dashboard', enabled: true, order: 0 },
  { id: 'calendar', name: 'Kalender', enabled: true, order: 1 },
  { id: 'tasks', name: 'Aufgaben', enabled: true, order: 2 },
  { id: 'notes', name: 'Notizen', enabled: true, order: 3 },
  { id: 'shoppinglist', name: 'Einkaufsliste', enabled: true, order: 4 },
  { id: 'household', name: 'Haushaltsbuch', enabled: true, order: 5 },
  { id: 'prompts', name: 'Prompts', enabled: true, order: 6 },
  { id: 'links', name: 'Links', enabled: true, order: 7 },
  { id: 'news', name: 'Nachrichten', enabled: true, order: 8 },
  { id: 'contacts', name: 'Kontakte', enabled: true, order: 9 },
  { id: 'passwords', name: 'Safe', enabled: true, order: 10 },
];

export const DEFAULT_MENU_CATEGORIES: MenuCategoryConfig[] = [
  {
    id: 'google',
    name: 'Google Dienste',
    iconName: 'Cloud',
    enabled: true,
    order: 0,
    links: [
      { id: 'gmail', name: 'Gmail', iconName: 'Mail', url: 'https://mail.google.com', enabled: true, order: 0 },
      { id: 'gdrive', name: 'Google Drive', iconName: 'Cloud', url: 'https://drive.google.com', enabled: true, order: 1 },
      { id: 'gdocs', name: 'Google Docs', iconName: 'FileText', url: 'https://docs.google.com', enabled: true, order: 2 },
      { id: 'gphotos', name: 'Google Fotos', iconName: 'ImageIcon', url: 'https://photos.google.com', enabled: true, order: 3 },
      { id: 'ganalytics', name: 'Google Analytics', iconName: 'BarChart2', url: 'https://analytics.google.com', enabled: true, order: 4 },
      { id: 'searchconsole', name: 'Search Console', iconName: 'Search', url: 'https://search.google.com/search-console', enabled: true, order: 5 },
      { id: 'gads', name: 'Google Ads', iconName: 'BarChart2', url: 'https://ads.google.com', enabled: true, order: 6 },
    ]
  },
  {
    id: 'ai',
    name: 'KI Tools',
    iconName: 'Brain',
    enabled: true,
    order: 2,
    links: [
      { id: 'gemini', name: 'Gemini', iconName: 'Zap', url: 'https://gemini.google.com', enabled: true, order: 0 },
      { id: 'chatgpt', name: 'ChatGPT', iconName: 'MessageSquare', url: 'https://chat.openai.com', enabled: true, order: 1 },
      { id: 'claude', name: 'Claude', iconName: 'Cpu', url: 'https://claude.ai', enabled: true, order: 2 },
      { id: 'perplexity', name: 'Perplexity', iconName: 'Search', url: 'https://www.perplexity.ai', enabled: true, order: 3 },
      { id: 'aistudio', name: 'Google AI Studio', iconName: 'Code', url: 'https://aistudio.google.com', enabled: true, order: 4 },
      { id: 'notebooklm', name: 'Notebook LM', iconName: 'BookOpen', url: 'https://notebooklm.google.com', enabled: true, order: 5 },
      { id: 'groq', name: 'Groq', iconName: 'FastForward', url: 'https://groq.com', enabled: true, order: 6 },
      { id: 'deepseek', name: 'DeepSeek', iconName: 'Compass', url: 'https://www.deepseek.com', enabled: true, order: 7 },
      { id: 'manus', name: 'Manus AI', iconName: 'Sparkles', url: 'https://manus.ai', enabled: true, order: 8 },
      { id: 'kimi', name: 'Kimi AI', iconName: 'MessageSquare', url: 'https://kimi.moonshot.cn', enabled: true, order: 9 },
      { id: 'napkin', name: 'Napkin AI', iconName: 'Layers', url: 'https://www.napkin.ai', enabled: true, order: 10 },
      { id: 'suno', name: 'Suno', iconName: 'Music', url: 'https://suno.com', enabled: true, order: 11 },
      { id: 'elevenlabs', name: 'ElevenLabs', iconName: 'Volume2', url: 'https://elevenlabs.io', enabled: true, order: 12 },
      { id: 'arena', name: 'Arena.ai', iconName: 'Activity', url: 'https://chat.lmsys.org', enabled: true, order: 13 },
      { id: 'copilot', name: 'Copilot', iconName: 'MessageSquare', url: 'https://copilot.microsoft.com', enabled: true, order: 14 },
      { id: 'meta', name: 'Meta AI', iconName: 'Sparkles', url: 'https://www.meta.ai', enabled: true, order: 15 },
      { id: 'qwen', name: 'Qwen', iconName: 'Brain', url: 'https://chat.qwen.ai', enabled: true, order: 16 },
    ]
  },
  {
    id: 'tools',
    name: 'Tools',
    iconName: 'SettingsIcon',
    enabled: true,
    order: 3,
    links: [
      { id: 'random', name: 'Zufallsgenerator', iconName: 'Dices', action: 'handleRandomize', enabled: true, order: 0 },
      { id: 'calc', name: 'Taschenrechner', iconName: 'Activity', path: '/calculator', enabled: true, order: 1 },
      { id: 'converter', name: 'Umrechner', iconName: 'Layers', path: '/umrechner', enabled: true, order: 2 },
    ]
  },
  {
    id: 'social',
    name: 'Social Media',
    iconName: 'Share2',
    enabled: true,
    order: 4,
    links: [
      { id: 'linkedin', name: 'LinkedIn', iconName: 'Linkedin', url: 'https://www.linkedin.com/in/robert-erbach-a173b2371/', enabled: true, order: 0 },
      { id: 'facebook', name: 'Facebook', iconName: 'Facebook', url: 'https://www.facebook.com', enabled: true, order: 1 },
      { id: 'instagram', name: 'Instagram', iconName: 'Instagram', url: 'https://www.instagram.com', enabled: true, order: 2 },
    ]
  }
];

export const MODULE_ICONS: Record<string, any> = {
  dashboard: LayoutDashboard,
  calendar: CalendarIcon,
  tasks: CheckSquare,
  notes: FileText,
  shoppinglist: ShoppingCart,
  household: Wallet,
  prompts: MessageSquare,
  links: LinkIcon,
  news: Rss,
  contacts: Users,
  passwords: Shield,
  settings: SettingsIcon
};

export const MODULE_PATHS: Record<string, string> = {
  dashboard: '/',
  calendar: '/calendar',
  tasks: '/tasks',
  notes: '/notes',
  shoppinglist: '/shoppinglist',
  household: '/household',
  prompts: '/prompts',
  links: '/links',
  news: '/news',
  contacts: '/contacts',
  passwords: '/passwords',
};

interface SettingsContextType {
  modules: ModuleConfig[];
  updateModules: (newModules: ModuleConfig[]) => Promise<void>;
  menuCategories: MenuCategoryConfig[];
  updateMenuCategories: (newCategories: MenuCategoryConfig[]) => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [modules, setModules] = useState<ModuleConfig[]>(DEFAULT_MODULES);
  const [menuCategories, setMenuCategories] = useState<MenuCategoryConfig[]>(DEFAULT_MENU_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setModules(DEFAULT_MODULES);
      setMenuCategories(DEFAULT_MENU_CATEGORIES);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, 'userSettings', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.modules) {
          const savedModules = data.modules as ModuleConfig[];
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

        if (data.menuCategories) {
          const savedCats = data.menuCategories as MenuCategoryConfig[];
          // Keep defaults if custom not present, but merge properties.
          // Note for custom links, we just take what's in savedCats
          let mergedCats = DEFAULT_MENU_CATEGORIES.map(def => {
            const saved = savedCats.find(c => c.id === def.id);
            if (saved) {
              const mergedLinks = [...saved.links];
              def.links.forEach((defLink) => {
                if (!mergedLinks.find(l => l.id === defLink.id)) {
                   // A new fixed link got added in default after user saved
                   mergedLinks.push(defLink);
                }
              });
              mergedLinks.sort((a, b) => a.order - b.order);
              return { ...def, enabled: saved.enabled, order: saved.order ?? def.order, links: mergedLinks };
            }
            return def;
          });
          
          savedCats.forEach(saved => {
             if (saved.id === 'performance') return;
             if (!mergedCats.find(m => m.id === saved.id)) {
               mergedCats.push(saved);
             }
          });

          mergedCats.sort((a, b) => a.order - b.order);
          setMenuCategories(mergedCats);
        } else {
          setMenuCategories(DEFAULT_MENU_CATEGORIES);
        }
      } else {
        setModules(DEFAULT_MODULES);
        setMenuCategories(DEFAULT_MENU_CATEGORIES);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const updateModules = async (newModules: ModuleConfig[]) => {
    if (!user) return;
    setModules(newModules);
    await setDoc(doc(db, 'userSettings', user.uid), {
      modules: newModules
    }, { merge: true });
  };

  const updateMenuCategories = async (newCategories: MenuCategoryConfig[]) => {
    if (!user) return;
    setMenuCategories(newCategories);
    await setDoc(doc(db, 'userSettings', user.uid), {
      menuCategories: newCategories
    }, { merge: true });
  };

  return (
    <SettingsContext.Provider value={{ modules, updateModules, menuCategories, updateMenuCategories, loading }}>
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
