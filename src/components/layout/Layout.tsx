import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  LayoutDashboard, CheckSquare, Calendar as CalendarIcon, FileText, 
  Link as LinkIcon, Menu, X, Sun, Moon, Zap, MessageSquare, 
  Cloud, Image as ImageIcon, BarChart2, Search, Activity, 
  Gauge, Mail, Brain, Cpu, ChevronDown, ChevronUp, Wallet 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ExternalLink {
  name: string;
  icon: any;
  url: string;
}

interface Category {
  id: string;
  name: string;
  icon: any;
  links: ExternalLink[];
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    google: true,
    performance: false,
    ai: false
  });

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Kalender', icon: CalendarIcon, path: '/calendar' },
    { name: 'Aufgaben', icon: CheckSquare, path: '/tasks' },
    { name: 'Notizen', icon: FileText, path: '/notes' },
    { name: 'Links', icon: LinkIcon, path: '/links' },
    { name: 'Prompts', icon: MessageSquare, path: '/prompts' },
    { name: 'Haushaltsbuch', icon: Wallet, path: '/household' },
  ];

  const categories: Category[] = [
    {
      id: 'google',
      name: 'Google Dienste',
      icon: Cloud,
      links: [
        { name: 'Gmail', icon: Mail, url: 'https://mail.google.com' },
        { name: 'Google Drive', icon: Cloud, url: 'https://drive.google.com' },
        { name: 'Google Docs', icon: FileText, url: 'https://docs.google.com' },
        { name: 'Google Fotos', icon: ImageIcon, url: 'https://photos.google.com' },
        { name: 'Google Analytics', icon: BarChart2, url: 'https://analytics.google.com' },
        { name: 'Search Console', icon: Search, url: 'https://search.google.com/search-console' },
      ]
    },
    {
      id: 'performance',
      name: 'Performance',
      icon: Gauge,
      links: [
        { name: 'Yellow Labs', icon: Activity, url: 'https://yellowlab.tools' },
        { name: 'PageSpeed Insights', icon: Gauge, url: 'https://pagespeed.web.dev' },
      ]
    },
    {
      id: 'ai',
      name: 'KI Tools',
      icon: Brain,
      links: [
        { name: 'Gemini', icon: Zap, url: 'https://gemini.google.com' },
        { name: 'ChatGPT', icon: MessageSquare, url: 'https://chat.openai.com' },
        { name: 'Claude', icon: Cpu, url: 'https://claude.ai' },
      ]
    }
  ];

  const toggleCategory = (id: string) => {
    setOpenCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex h-screen overflow-hidden font-sans relative">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-[#F2F2F7] dark:bg-[#000000] border-r border-[#D2D2D7]/30 dark:border-[#424245]/30 transform transition-transform duration-500 ease-out lg:relative lg:translate-x-0 flex flex-col shadow-2xl lg:shadow-none",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-8 flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center text-[#007AFF]">
            <Zap size={24} fill="currentColor" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">RoPro</span>
          <button 
            className="lg:hidden text-[#86868B] ml-auto hover:text-[#1D1D1F] transition-colors focus-visible:ring-2 rounded" 
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Sidebar schließen"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-2 overflow-y-auto flex flex-col gap-6 custom-scrollbar">
          <div className="space-y-1">
            <h3 className="px-4 text-[11px] font-bold text-[#86868B] uppercase tracking-wider mb-2">Hauptmenü</h3>
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) => cn(
                  "sidebar-item",
                  isActive && "sidebar-item-active"
                )}
                onClick={() => setIsSidebarOpen(false)}
              >
                <item.icon size={18} className={cn(({ isActive }: any) => isActive ? "text-[#007AFF]" : "text-[#86868B]")} />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>

          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat.id} className="space-y-1">
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center justify-between px-4 py-2 text-[11px] font-bold text-[#86868B] uppercase tracking-wider hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <cat.icon size={14} />
                    {cat.name}
                  </div>
                  {openCategories[cat.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                
                <AnimatePresence initial={false}>
                  {openCategories[cat.id] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden space-y-1"
                    >
                      {cat.links.map((link) => (
                        <a
                          key={link.name}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 text-[#424245] dark:text-[#A1A1A6] hover:bg-[#FBFBFD] dark:hover:bg-[#1C1C1E] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]"
                        >
                          <link.icon size={16} className="shrink-0 opacity-70" />
                          <span className="truncate">{link.name}</span>
                        </a>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </nav>

        <div className="p-6 border-t border-[#D2D2D7]/30 dark:border-[#424245]/30 space-y-6">
           <button 
             onClick={toggleTheme}
             className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-[#424245] dark:text-[#A1A1A6] hover:bg-[#FBFBFD] dark:hover:bg-[#1C1C1E] transition-all"
           >
             {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
             <span>{theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}</span>
           </button>

           <div className="flex items-center gap-3 px-2">
             <div className="w-10 h-10 rounded-full bg-[#E8E8ED] dark:bg-[#1C1C1E] flex items-center justify-center text-[#1D1D1F] dark:text-[#F5F5F7] font-bold border border-[#D2D2D7]/30 dark:border-[#424245]/30">
               {user?.displayName?.[0] || 'B'}
             </div>
             <div className="flex-1 overflow-hidden">
               <div className="text-sm font-semibold truncate text-[#1D1D1F] dark:text-[#F5F5F7]">{user?.displayName || 'Benutzer'}</div>
               <button className="text-[11px] font-bold text-red-500 uppercase tracking-wider hover:opacity-70 transition-opacity" onClick={logout}>Abmelden</button>
             </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#FBFBFD] dark:bg-black relative z-10 transition-colors duration-500">
        <header className="h-16 border-b border-[#D2D2D7]/30 dark:border-[#424245]/30 flex items-center px-6 lg:hidden">
          <button 
            className="p-2 -ml-2 text-[#86868B] hover:text-[#1D1D1F] rounded-lg transition-colors"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2 ml-2">
            <Zap size={18} className="text-[#007AFF]" fill="currentColor" />
            <span className="font-bold text-xl tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">RoPro</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 sm:p-10 lg:p-12 outline-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
