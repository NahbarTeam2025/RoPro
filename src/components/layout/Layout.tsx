import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  LayoutDashboard, CheckSquare, Calendar as CalendarIcon, FileText, 
  Link as LinkIcon, Menu, X, Sun, Moon, Zap, MessageSquare, 
  Cloud, Image as ImageIcon, BarChart2, Search, Activity, 
  Gauge, Mail, Brain, Cpu, ChevronDown, ChevronUp, Wallet,
  Code, BookOpen, Sparkles, FastForward, Layers, Compass,
  Music, Volume2, Mic, Linkedin, Share2, Users, Dices
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [randomResult, setRandomResult] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    google: true,
    performance: false,
    ai: false,
    social: true
  });

  const handleRandomize = () => {
    setIsRolling(true);
    setRandomResult(null);
    setTimeout(() => {
      setRandomResult(Math.random() > 0.5 ? 'Ja' : 'Nein');
      setIsRolling(false);
    }, 400);
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Kalender', icon: CalendarIcon, path: '/calendar' },
    { name: 'Aufgaben', icon: CheckSquare, path: '/tasks' },
    { name: 'Notizen', icon: FileText, path: '/notes' },
    { name: 'Links', icon: LinkIcon, path: '/links' },
    { name: 'Prompts', icon: MessageSquare, path: '/prompts' },
    { name: 'Haushaltsbuch', icon: Wallet, path: '/household' },
    { name: 'Kontakte', icon: Users, path: '/contacts' },
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
        { name: 'Perplexity', icon: Search, url: 'https://www.perplexity.ai' },
        { name: 'Google AI Studio', icon: Code, url: 'https://aistudio.google.com' },
        { name: 'Notebook LM', icon: BookOpen, url: 'https://notebooklm.google.com' },
        { name: 'Groq', icon: FastForward, url: 'https://groq.com' },
        { name: 'DeepSeek', icon: Compass, url: 'https://www.deepseek.com' },
        { name: 'Manus AI', icon: Sparkles, url: 'https://manus.ai' },
        { name: 'Kimi AI', icon: MessageSquare, url: 'https://kimi.moonshot.cn' },
        { name: 'Napkin AI', icon: Layers, url: 'https://www.napkin.ai' },
        { name: 'Suno', icon: Music, url: 'https://suno.com' },
        { name: 'ElevenLabs', icon: Volume2, url: 'https://elevenlabs.io' },
        { name: 'Arena.ai', icon: Activity, url: 'https://chat.lmsys.org' },
        { name: 'Copilot', icon: MessageSquare, url: 'https://copilot.microsoft.com' },
        { name: 'Meta AI', icon: Sparkles, url: 'https://www.meta.ai' },
        { name: 'Qwen', icon: Brain, url: 'https://chat.qwen.ai' },
      ]
    },
    {
      id: 'social',
      name: 'Social Media',
      icon: Share2,
      links: [
        { name: 'LinkedIn', icon: Linkedin, url: 'https://www.linkedin.com/in/robert-erbach-a173b2371/' },
      ]
    }
  ];

  const toggleCategory = (id: string) => {
    setOpenCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const { pathname } = useLocation();
  const mainRef = React.useRef<HTMLElement>(null);

  return (
    <div className="flex min-h-screen font-sans relative bg-[#FBFBFD] dark:bg-black transition-colors duration-500">
      {/* Decorative Background Blurs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/[0.08] dark:bg-blue-600/[0.12] blur-[120px]" />
        <div className="absolute bottom-[5%] left-[5%] w-[45%] h-[45%] rounded-full bg-purple-600/[0.06] dark:bg-purple-600/[0.1] blur-[120px]" />
        <div className="absolute bottom-[-80px] right-[-60px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,_rgba(99,37,235,0.18)_0%,_transparent_65%)] blur-[80px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] rounded-full bg-blue-400/[0.03] dark:bg-blue-400/[0.05] blur-[100px]" />
      </div>

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
          "fixed inset-y-0 left-0 z-50 bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border-r border-[#D2D2D7]/30 dark:border-white/[0.06] transform transition-all duration-500 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 flex flex-col shadow-2xl lg:shadow-none",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          isSidebarCollapsed ? "lg:w-20" : "lg:w-64 w-64"
        )}
      >
        <div className={cn("p-8 flex items-center shrink-0", isSidebarCollapsed ? "justify-center px-0" : "gap-3")}>
          <div className="w-8 h-8 flex items-center justify-center text-[#007AFF] shrink-0">
            <Zap size={24} fill="currentColor" />
          </div>
          {!isSidebarCollapsed && <span className="font-bold text-2xl tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] truncate">RoPro</span>}
          <button 
            className="lg:hidden text-[#86868B] ml-auto hover:text-[#1D1D1F] transition-colors focus-visible:ring-2 rounded" 
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Sidebar schließen"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto flex flex-col gap-6">
          <div className="space-y-1">
            {!isSidebarCollapsed && <h3 className="px-4 text-[11px] font-bold text-[#86868B] uppercase tracking-wider mb-2">Hauptmenü</h3>}
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) => cn(
                  "sidebar-item",
                  isActive && "sidebar-item-active",
                  isSidebarCollapsed && "justify-center px-0"
                )}
                onClick={() => setIsSidebarOpen(false)}
                title={isSidebarCollapsed ? item.name : undefined}
              >
                <item.icon size={18} className="shrink-0" />
                {!isSidebarCollapsed && <span>{item.name}</span>}
              </NavLink>
            ))}
          </div>

          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat.id} className="space-y-1">
                <button
                  onClick={() => !isSidebarCollapsed && toggleCategory(cat.id)}
                  className={cn(
                    "w-full flex items-center text-[11px] font-bold text-[#86868B] uppercase tracking-wider hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors",
                    isSidebarCollapsed ? "justify-center px-0" : "justify-between px-4 py-2"
                  )}
                  title={isSidebarCollapsed ? cat.name : undefined}
                >
                  <div className="flex items-center gap-2">
                    <cat.icon size={14} className="shrink-0" />
                    {!isSidebarCollapsed && cat.name}
                  </div>
                  {!isSidebarCollapsed && (openCategories[cat.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </button>
                
                <AnimatePresence initial={false}>
                  {openCategories[cat.id] && !isSidebarCollapsed && (
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

        <div className="p-3 border-t border-[#D2D2D7]/30 dark:border-[#424245]/30 space-y-1.5 shrink-0">
           <button 
             onClick={handleRandomize}
             disabled={isRolling}
             className={cn(
               "w-full flex items-center gap-3 px-3 py-1.5 rounded-xl text-sm font-medium text-[#424245] dark:text-[#A1A1A6] hover:bg-brand/10 hover:text-brand transition-all relative group",
               isSidebarCollapsed && "justify-center px-0"
             )}
             title={isSidebarCollapsed ? "Zufall" : undefined}
           >
             <Dices size={16} className={cn("shrink-0", isRolling && "animate-spin")} />
             {!isSidebarCollapsed && (
               <div className="flex items-center justify-between w-full">
                 <span>Zufallsgenerator</span>
                 {randomResult && (
                   <motion.span 
                     initial={{ scale: 0.5, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     className="bg-brand text-white px-2 py-0.5 rounded-lg font-black text-[9px] uppercase tracking-wider"
                   >
                     {randomResult}
                   </motion.span>
                 )}
               </div>
             )}
             {isSidebarCollapsed && randomResult && !isRolling && (
               <div className="absolute top-0.5 right-0.5 bg-brand text-white text-[8px] w-3.5 h-3.5 flex items-center justify-center rounded-full font-black shadow-sm ring-2 ring-[#F2F2F7] dark:ring-[#000000]">
                 {randomResult === 'Ja' ? 'J' : 'N'}
               </div>
             )}
           </button>

           <button 
             onClick={toggleTheme}
             className={cn(
               "w-full flex items-center gap-3 px-3 py-1.5 rounded-xl text-sm font-medium text-[#424245] dark:text-[#A1A1A6] hover:bg-[#FBFBFD] dark:hover:bg-[#1C1C1E] transition-all",
               isSidebarCollapsed && "justify-center px-0"
             )}
             title={isSidebarCollapsed ? (theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus') : undefined}
           >
             {theme === 'dark' ? <Sun size={16} className="shrink-0" /> : <Moon size={16} className="shrink-0" />}
             {!isSidebarCollapsed && <span>{theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}</span>}
           </button>

           <div className={cn("flex items-center gap-3 px-2 py-1", isSidebarCollapsed && "justify-center px-0")}>
             <div className="w-7 h-7 rounded-full bg-[#E8E8ED] dark:bg-[#1C1C1E] flex items-center justify-center text-[#1D1D1F] dark:text-[#F5F5F7] font-bold border border-[#D2D2D7]/30 dark:border-[#424245]/30 shadow-sm shrink-0 text-xs">
               {user?.displayName?.[0] || 'B'}
             </div>
             {!isSidebarCollapsed && (
               <div className="flex-1 overflow-hidden">
                 <div className="text-[10px] font-semibold truncate text-[#1D1D1F] dark:text-[#F5F5F7] leading-none mb-0.5">{user?.displayName || 'Benutzer'}</div>
                 <button className="text-[9px] font-black text-red-500 uppercase tracking-wider hover:opacity-70 transition-opacity leading-none" onClick={logout}>Abmelden</button>
               </div>
             )}
           </div>

           <button 
             onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
             className="hidden lg:flex w-full items-center justify-center h-7 rounded-xl bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-all text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white"
             aria-label={isSidebarCollapsed ? "Menü ausklappen" : "Menü einklappen"}
           >
             {isSidebarCollapsed ? <p className="text-[10px] font-bold">»</p> : <p className="text-[10px] font-bold">«</p>}
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen relative z-10 transition-colors duration-500 overflow-hidden">
        <header className="h-16 border-b border-[#D2D2D7]/30 dark:border-[#424245]/30 flex items-center px-6 lg:hidden shrink-0 bg-[#FBFBFD]/80 dark:bg-black/80 backdrop-blur-md z-30">
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

        <main ref={mainRef} className="flex-1 overflow-y-auto p-8 sm:p-10 lg:p-12 outline-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
