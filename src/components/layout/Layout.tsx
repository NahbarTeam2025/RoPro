import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  LayoutDashboard, CheckSquare, Calendar as CalendarIcon, FileText, 
  Link as LinkIcon, Menu, X, Sun, Zap, MessageSquare, 
  Cloud, Image as ImageIcon, BarChart2, Search, Activity, 
  Gauge, Mail, Brain, Cpu, ChevronDown, ChevronUp, Wallet,
  Code, BookOpen, Sparkles, FastForward, Layers, Compass,
  Music, Volume2, Mic, Linkedin, Share2, Users, Dices, LogOut, Shield,
  Facebook, Instagram,
  Command, CloudSun, CloudRain, CloudSnow, CloudFog, CloudDrizzle, CloudLightning
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import GlobalSearch from '../GlobalSearch';
import WeatherModal from '../WeatherModal';
import { fetchWeather, WeatherData, getWeatherInfo, fetchCityName } from '../../services/weatherService';

interface NavItem {
  name: string;
  icon: any;
  path?: string;
  url?: string;
}

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isWeatherOpen, setIsWeatherOpen] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [locationName, setLocationName] = useState('Standort wird ermittelt...');
  const [randomResult, setRandomResult] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    google: false,
    performance: false,
    ai: false,
    social: false
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const loadWeather = async () => {
      try {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              const [data, city] = await Promise.all([
                fetchWeather(latitude, longitude),
                fetchCityName(latitude, longitude)
              ]);
              setWeatherData(data);
              setLocationName(city);
            },
            async (error) => {
              console.error('Geolocation error:', error);
              // Default to Berlin if user denies permission or error occurs
              const data = await fetchWeather(52.52, 13.40);
              setWeatherData(data);
              setLocationName('Berlin');
            },
            { timeout: 10000 }
          );
        } else {
          // Fallback if Geolocation is not supported
          const data = await fetchWeather(52.52, 13.40);
          setWeatherData(data);
          setLocationName('Berlin');
        }
      } catch (error) {
        console.error('Failed to fetch weather:', error);
      }
    };
    loadWeather();

    // Refresh weather every 30 minutes
    const interval = setInterval(loadWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const WeatherSummaryIcon = ({ className = "", iconSize = 14, textSize = "text-[10px]" }: { className?: string, iconSize?: number, textSize?: string }) => {
    if (!weatherData) return null;
    const iconName = getWeatherInfo(weatherData.current.weatherCode).icon;
    const IconComponent = {
      Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning
    }[iconName] || Cloud;

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsWeatherOpen(true);
        }}
        className={cn(
          "flex items-center gap-1.5 transition-all group",
          className
        )}
        title="Wetterdetails zeigen"
      >
        <IconComponent size={iconSize} className="text-orange-400 group-hover:scale-110 transition-transform" />
        <span className={cn("font-black", textSize)}>{Math.round(weatherData.current.temp)}°</span>
      </button>
    );
  };

  const handleRandomize = () => {
    setIsRolling(true);
    setRandomResult(null);
    setTimeout(() => {
      setRandomResult(Math.random() > 0.5 ? 'Ja' : 'Nein');
      setIsRolling(false);
    }, 400);
  };

  const navItems: NavItem[] = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Kalender', icon: CalendarIcon, path: '/calendar' },
    { name: 'Aufgaben', icon: CheckSquare, path: '/tasks' },
    { name: 'Notizen', icon: FileText, path: '/notes' },
    { name: 'Haushaltsbuch', icon: Wallet, path: '/household' },
    { name: 'Prompts', icon: MessageSquare, path: '/prompts' },
    { name: 'Links', icon: LinkIcon, path: '/links' },
    { name: 'Kontakte', icon: Users, path: '/contacts' },
    { name: 'Safe', icon: Shield, path: '/passwords' },
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
        { name: 'Google Ads', icon: BarChart2, url: 'https://ads.google.com' },
      ]
    },
    {
      id: 'performance',
      name: 'Performance',
      icon: Gauge,
      links: [
        { name: 'Yellow Labs', icon: Activity, url: 'https://yellowlab.tools' },
        { name: 'PageSpeed Insights', icon: Gauge, url: 'https://pagespeed.web.dev' },
        { name: 'Seobility', icon: Shield, url: 'https://www.seobility.net' },
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
        { name: 'Facebook', icon: Facebook, url: 'https://www.facebook.com' },
        { name: 'Instagram', icon: Instagram, url: 'https://www.instagram.com' },
      ]
    }
  ];

  const toggleCategory = (id: string) => {
    setOpenCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const mainRef = React.useRef<HTMLElement>(null);

  return (
    <div className="flex min-h-screen font-sans relative bg-transparent overflow-hidden">
      {/* Background Image */}
      <div className="fixed inset-0 z-0 bg-black">
        <img
          src="https://meine-assets.pages.dev/b1.webp"
          alt="Background"
          className="w-full h-full object-cover opacity-25"
        />
        {/* Overlay to ensure readability and glass effect works well */}
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white/40 dark:bg-black/40 backdrop-blur-xl border-none transform transition-all duration-500 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 flex flex-col shadow-2xl lg:shadow-none",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          isSidebarCollapsed ? "lg:w-20" : "lg:w-64 w-64"
        )}
      >
        <div className={cn("h-16 px-6 lg:h-auto lg:p-8 flex items-center shrink-0", isSidebarCollapsed ? "flex-col gap-4 px-0" : "gap-3")}>
          <div className="w-8 h-8 flex items-center justify-center text-blue-500 shrink-0">
            <Zap size={24} fill="currentColor" />
          </div>
          {!isSidebarCollapsed ? (
            <div className="flex-1 flex items-center justify-between overflow-hidden">
              <span className="font-brand font-bold text-sm tracking-tighter text-[#1D1D1F] dark:text-[#F5F5F7] truncate uppercase">ROPRO</span>
              <WeatherSummaryIcon className="ml-2 hidden lg:flex" />
            </div>
          ) : (
            <WeatherSummaryIcon className="hidden lg:flex" />
          )}
          <button 
            type="button"
            className="lg:hidden text-[#86868B] ml-auto hover:text-[#1D1D1F] transition-colors focus-visible:ring-2 rounded-lg flex items-center justify-center w-10 h-10 -mr-2" 
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Sidebar schließen"
          >
            <X size={28} />
          </button>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto flex flex-col gap-6">
          <div className="space-y-1">
            {!isSidebarCollapsed && <h3 className="px-4 text-[11px] font-bold text-[#86868B] uppercase tracking-wider mb-2">Hauptmenü</h3>}
            {navItems.map((item) => {
              const Icon = item.icon;
              const content = (
                <>
                  <Icon size={18} className="shrink-0" />
                  {!isSidebarCollapsed && <span>{item.name}</span>}
                </>
              );

              if ('url' in item) {
                return (
                  <a
                    key={item.name}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "sidebar-item",
                      isSidebarCollapsed && "justify-center px-0 text-slate-400"
                    )}
                    title={isSidebarCollapsed ? item.name : undefined}
                  >
                    {content}
                  </a>
                );
              }

              return (
                <NavLink
                  key={item.name}
                  to={item.path!}
                  className={({ isActive }) => cn(
                    "sidebar-item",
                    isActive && "sidebar-item-active",
                    isSidebarCollapsed && "justify-center px-0"
                  )}
                  onClick={() => setIsSidebarOpen(false)}
                  title={isSidebarCollapsed ? item.name : undefined}
                >
                  {content}
                </NavLink>
              );
            })}
          </div>

          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => !isSidebarCollapsed && toggleCategory(cat.id)}
                  className={cn(
                    "w-full flex items-center text-[11px] font-bold text-[#86868B] uppercase tracking-wider hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors focus:outline-none",
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

        <div className="py-3 border-t border-[#D2D2D7]/30 dark:border-[#424245]/30 space-y-1.5 shrink-0">
           <button 
             type="button"
             onClick={handleRandomize}
             disabled={isRolling}
             className={cn(
               "sidebar-item focus:outline-none w-full",
               isSidebarCollapsed && "justify-center px-0 text-slate-400"
             )}
             title={isSidebarCollapsed ? "Zufall" : undefined}
           >
             <Dices size={18} className={cn("shrink-0", isRolling && "animate-spin")} />
             {!isSidebarCollapsed && (
               <>
                 <span className="flex-1 text-left">Zufallsgenerator</span>
                 {randomResult && (
                   <motion.span 
                     initial={{ scale: 0.5, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     className="bg-brand text-white px-2 py-0.5 rounded-lg font-black text-[9px] uppercase tracking-wider"
                   >
                     {randomResult}
                   </motion.span>
                 )}
               </>
             )}
             {isSidebarCollapsed && randomResult && !isRolling && (
               <div className="absolute top-0.5 right-0.5 bg-brand text-white text-[8px] w-3.5 h-3.5 flex items-center justify-center rounded-full font-black shadow-sm ring-2 ring-[#F2F2F7] dark:ring-[#000000]">
                 {randomResult === 'Ja' ? 'J' : 'N'}
               </div>
             )}
           </button>

           <div className="w-full mt-1">
             <button 
               type="button"
               className={cn(
                 "sidebar-item w-full focus:outline-none hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 dark:text-red-500",
                 isSidebarCollapsed && "justify-center px-0 text-red-500"
               )}
               onClick={logout}
               title={isSidebarCollapsed ? "Abmelden" : undefined}
             >
               {user?.photoURL ? (
                 <img 
                   src={user.photoURL} 
                   alt={user.displayName || 'Avatar'} 
                   className="w-[18px] h-[18px] rounded-full border border-black/5 dark:border-white/10 shrink-0"
                   referrerPolicy="no-referrer"
                 />
               ) : (
                 <LogOut size={18} className="shrink-0" />
               )}
               {!isSidebarCollapsed && (
                 <span>Abmelden</span>
               )}
             </button>
           </div>

           <button 
             type="button"
             onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
             className="hidden lg:flex w-full items-center justify-center h-7 rounded-xl bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-all text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white focus:outline-none"
             aria-label={isSidebarCollapsed ? "Menü ausklappen" : "Menü einklappen"}
           >
             {isSidebarCollapsed ? <p className="text-[10px] font-bold">»</p> : <p className="text-[10px] font-bold">«</p>}
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen relative z-10 transition-colors duration-500 overflow-hidden">
        <header className="absolute top-0 inset-x-0 h-16 flex items-center justify-between px-6 lg:hidden shrink-0 bg-white/40 dark:bg-black/40 backdrop-blur-xl z-[60] border-none">
          <div className="flex items-center gap-3 flex-1 mr-4">
            <button 
              className="w-10 h-10 flex items-center justify-center -ml-2 text-[#86868B] hover:text-[#1D1D1F] rounded-lg transition-colors shrink-0"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={28} />
            </button>
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="flex-1 flex items-center gap-2 h-11 px-4 bg-black/10 dark:bg-black/50 rounded-xl text-[#86868B] hover:bg-black/15 dark:hover:bg-white/10 transition-colors"
            >
              <Search size={18} className="shrink-0" />
              <span className="text-sm font-medium">Suchen...</span>
            </button>
          </div>
          <div className="flex items-center justify-center shrink-0">
            <WeatherSummaryIcon iconSize={24} textSize="text-sm" />
          </div>
        </header>

        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 pt-24 sm:p-10 sm:pt-28 lg:p-12 outline-none" style={{ overflowAnchor: 'none' }}>
          <Outlet />
        </main>
      </div>

      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <WeatherModal 
        isOpen={isWeatherOpen} 
        onClose={() => setIsWeatherOpen(false)} 
        data={weatherData}
        locationName={locationName}
      />
    </div>
  );
}
