import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSettings, MODULE_ICONS, MODULE_PATHS } from '../../contexts/SettingsContext';
import * as Icons from 'lucide-react';
import { 
  LayoutDashboard, CheckSquare, Calendar as CalendarIcon, FileText, 
  Link as LinkIcon, Menu, X, Sun, Zap, MessageSquare, 
  Cloud, Image as ImageIcon, BarChart2, Search, Activity, 
  Gauge, Mail, Brain, Cpu, ChevronDown, ChevronUp, Wallet,
  Code, BookOpen, Sparkles, FastForward, Layers, Compass,
  Music, Volume2, Mic, Linkedin, Share2, Users, Dices, LogOut, Shield,
  Facebook, Instagram,
  Command, CloudSun, CloudRain, CloudSnow, CloudFog, CloudDrizzle, CloudLightning,
  Settings as SettingsIcon
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import GlobalSearch from '../GlobalSearch';
import WeatherModal from '../WeatherModal';
import { fetchWeather, WeatherData, getWeatherInfo, fetchCityName } from '../../services/weatherService';

interface NavItem {
  id?: string;
  name: string;
  icon: any;
  path?: string;
  url?: string;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { modules, menuCategories } = useSettings();
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
    ai: false,
    tools: false,
    social: false
  });
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);
  const mobileSearchContainerRef = React.useRef<HTMLDivElement>(null);
  const mobileSearchToggleRef = React.useRef<HTMLButtonElement>(null);

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
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobileSearchExpanded &&
        mobileSearchContainerRef.current &&
        !mobileSearchContainerRef.current.contains(event.target as Node) &&
        mobileSearchToggleRef.current &&
        !mobileSearchToggleRef.current.contains(event.target as Node)
      ) {
        setIsMobileSearchExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileSearchExpanded]);

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

  const navItems: NavItem[] = modules.filter(m => m.enabled).map(m => ({
    id: m.id,
    name: m.name,
    icon: MODULE_ICONS[m.id] || LayoutDashboard,
    path: MODULE_PATHS[m.id] || '/'
  }));

  const mappedCategories = menuCategories.filter(c => c.enabled).map(category => {
    const CatIcon = (Icons as any)[category.iconName] || Cloud;
    return {
      id: category.id,
      name: category.name,
      icon: CatIcon,
      links: category.links.filter(l => l.enabled).map(link => {
        const ResolvedLinkIcon = (Icons as any)[link.iconName] || LinkIcon;
        return {
          name: link.name,
          icon: ResolvedLinkIcon,
          url: link.url,
          path: link.path,
          action: link.action === 'handleRandomize' ? handleRandomize : undefined,
        };
      }),
    };
  });

  const categories = mappedCategories;

  const toggleCategory = (id: string) => {
    setOpenCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const mainRef = React.useRef<HTMLElement>(null);

  return (
    <div className="flex min-h-screen font-sans relative bg-transparent overflow-hidden">
      {/* Background Image */}
      <div className="fixed inset-0 z-0 bg-[#0a0a0a]">
        <img
          src="https://meine-assets.pages.dev/b1.webp"
          alt="Background"
          className="w-full h-full object-cover opacity-90"
        />
        {/* Overlay to ensure readability and glass effect works well */}
        <div className="absolute inset-0 bg-white/5 dark:bg-black/40 backdrop-blur-[2px]" />
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
        <div className={cn("h-16 px-4 lg:h-auto lg:p-4 flex items-center shrink-0 border-b border-transparent dark:border-[#424245]/30", isSidebarCollapsed ? "justify-center" : "")}>
          <button 
            className={cn("flex items-center gap-3 w-full p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors text-left group", isSidebarCollapsed ? "justify-center" : "")}
            onClick={logout}
            title="Abmelden"
          >
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || 'Avatar'} 
                className="w-10 h-10 rounded-full border border-black/5 dark:border-white/10 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0 group-hover:bg-red-500/20 transition-colors">
                <LogOut size={18} />
              </div>
            )}
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <span className="text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">{user?.displayName || 'Benutzer'}</span>
                <span className="text-[10px] text-brand-muted truncate group-hover:text-red-500 transition-colors uppercase tracking-wider font-bold">Abmelden</span>
              </div>
            )}
            {isSidebarCollapsed && (
               <div className="absolute top-1/2 -right-8 -translate-y-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                   Abmelden
               </div>
            )}
          </button>
          
          <button 
            type="button"
            className="lg:hidden text-brand-muted ml-2 hover:text-[#1D1D1F] transition-colors focus-visible:ring-2 rounded-lg flex items-center justify-center w-10 h-10 shrink-0" 
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Sidebar schließen"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 pt-4 pb-2 overflow-y-auto flex flex-col gap-6">
          <div className="space-y-1">
            {!isSidebarCollapsed && <h3 className="px-4 text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Hauptmenü</h3>}
            {navItems.map((item) => {
              const Icon = item.icon;
              const content = (
                <>
                  <Icon size={20} className="shrink-0" />
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
                      isSidebarCollapsed && "justify-center px-0 text-brand-muted"
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

          <div className={cn("shrink-0", isSidebarCollapsed ? "px-2" : "px-4")}>
            <div className="h-[1px] bg-black/5 dark:bg-white/5" />
          </div>

          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => !isSidebarCollapsed && toggleCategory(cat.id)}
                  className={cn(
                    "w-full flex items-center text-xs font-bold text-brand-muted uppercase tracking-wider hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors focus:outline-none",
                    isSidebarCollapsed ? "justify-center px-0" : "justify-between px-4 py-3"
                  )}
                  title={isSidebarCollapsed ? cat.name : undefined}
                >
                  <div className="flex items-center gap-3">
                    <cat.icon size={18} className="shrink-0" />
                    {!isSidebarCollapsed && cat.name}
                  </div>
                  {!isSidebarCollapsed && (openCategories[cat.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
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
                      {cat.links.map((link) => {
                        const content = (
                          <>
                            <link.icon size={18} className={cn("shrink-0", (link.name === 'Zufallsgenerator' && isRolling) ? "animate-spin" : "opacity-70")} />
                            <span className="truncate">{link.name}</span>
                            {link.name === 'Zufallsgenerator' && randomResult && !isRolling && (
                              <span className="font-black tracking-wider text-brand text-xs ml-auto">
                                {randomResult === 'Ja' ? 'JA' : 'NEIN'}
                              </span>
                            )}
                          </>
                        );
                        
                        const className = "flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-[15px] font-medium transition-all duration-200 text-[#424245] dark:text-[#A1A1A6] hover:bg-[#FBFBFD] dark:hover:bg-[#1C1C1E] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]";

                        if (link.action) {
                          return (
                            <button
                              key={link.name}
                              onClick={link.action}
                              disabled={link.name === 'Zufallsgenerator' && isRolling}
                              className={cn(className, link.name === 'Zufallsgenerator' && isRolling && "opacity-50")}
                            >
                              {content}
                            </button>
                          );
                        }

                        if (link.path) {
                          return (
                            <NavLink
                              key={link.name}
                              to={link.path}
                              onClick={() => setIsSidebarOpen(false)}
                              className={({ isActive }) => cn(className, isActive && "text-[#1D1D1F] dark:text-white bg-[#FBFBFD] dark:bg-[#1C1C1E]")}
                            >
                              {content}
                            </NavLink>
                          );
                        }

                        return (
                          <a
                            key={link.name}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={className}
                          >
                            {content}
                          </a>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </nav>

        <div className={cn("p-4 border-t border-[#D2D2D7]/30 dark:border-[#424245]/30 shrink-0 flex gap-2", isSidebarCollapsed ? "flex-col" : "flex-row")}>
           <NavLink
              to="/settings"
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) => cn(
                "flex-1 h-10 flex items-center justify-center rounded-xl transition-colors text-brand-muted hover:text-[#1D1D1F] dark:hover:text-white",
                isActive ? "text-brand bg-brand/10 dark:text-brand dark:bg-brand/20" : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
              )}
              title="Einstellungen"
            >
              <SettingsIcon size={20} />
            </NavLink>

           <button 
             type="button"
             onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
             className="hidden lg:flex w-10 h-10 shrink-0 items-center justify-center rounded-xl bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-all text-brand-muted hover:text-[#1D1D1F] dark:hover:text-white focus:outline-none"
             aria-label={isSidebarCollapsed ? "Menü ausklappen" : "Menü einklappen"}
           >
             {isSidebarCollapsed ? <span className="text-xs font-bold">»</span> : <span className="text-xs font-bold">«</span>}
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen relative z-10 transition-colors duration-500 overflow-hidden">
        <header className="absolute top-0 inset-x-0 h-16 flex items-center justify-between px-4 lg:hidden shrink-0 bg-white/40 dark:bg-black/40 backdrop-blur-xl z-[60] border-none overflow-hidden">
          {/* Hamburger Menu */}
          <div className="flex items-center shrink-0 z-20 bg-transparent">
            <button 
              className="w-10 h-10 flex items-center justify-center -ml-2 text-brand-muted hover:text-[#1D1D1F] rounded-lg transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={28} />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-end h-full relative mx-2" ref={mobileSearchContainerRef}>
            <AnimatePresence>
              {!isMobileSearchExpanded && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-y-0 left-0 flex items-center pointer-events-none"
                >
                  <div className="flex items-center gap-2 text-blue-500">
                    <Zap size={22} fill="currentColor" />
                    <span className="font-brand font-bold text-lg tracking-tighter text-[#1D1D1F] dark:text-[#F5F5F7] uppercase">ROPRO</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {isMobileSearchExpanded && (
                <motion.div 
                  initial={{ maxWidth: 0, opacity: 0 }}
                  animate={{ maxWidth: '100%', opacity: 1 }}
                  exit={{ maxWidth: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="w-full h-full flex items-center justify-end overflow-hidden origin-right"
                >
                  <button 
                    onClick={() => setIsSearchOpen(true)}
                    className="w-full flex items-center gap-2 h-10 px-4 bg-white/20 dark:bg-[#1C1C1E]/40 backdrop-blur-md border border-black/5 dark:border-white/5 rounded-xl text-[#1D1D1F] dark:text-white hover:bg-white/30 dark:hover:bg-[#1C1C1E]/60 transition-colors shrink-0 shadow-sm"
                  >
                    <Search size={16} className="shrink-0 text-[#1D1D1F]/70 dark:text-white/70" />
                    <span className="text-sm font-medium text-[#1D1D1F]/90 dark:text-white/90">Suchen...</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right side icons */}
          <div className="flex items-center gap-2 shrink-0 z-20 bg-transparent">
            <button 
              ref={mobileSearchToggleRef}
              onClick={() => setIsMobileSearchExpanded(!isMobileSearchExpanded)}
              className={cn("w-10 h-10 flex items-center justify-center rounded-lg transition-colors", isMobileSearchExpanded ? "text-[#1D1D1F] dark:text-white bg-white/20 dark:bg-[#1C1C1E]/40 backdrop-blur-md border border-black/5 dark:border-white/5 shadow-sm" : "text-brand-muted hover:bg-black/5 dark:hover:bg-white/10")}
            >
               {isMobileSearchExpanded ? <X size={20} /> : <Search size={22} />}
            </button>
            <div className="flex items-center justify-center shrink-0">
               <WeatherSummaryIcon iconSize={24} textSize="text-sm" />
            </div>
          </div>
        </header>

        {/* Desktop Top Right Icons */}
        <div className="hidden lg:flex absolute top-8 right-12 z-50 items-center justify-end pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-3 h-12 rounded-2xl bg-white/40 dark:bg-[#1C1C1E]/40 backdrop-blur-xl border border-white/50 dark:border-white/10 text-brand-muted hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-all shadow-[0_8px_32px_rgba(0,0,0,0.08)] group"
            >
              <Search size={18} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold tracking-tight">Suchen...</span>
              <kbd className="ml-2 px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[10px] font-black uppercase tracking-wider">⌘K</kbd>
            </button>
            <div className="flex items-center justify-center px-4 h-12 rounded-2xl bg-white/40 dark:bg-[#1C1C1E]/40 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all hover:scale-105">
              <WeatherSummaryIcon iconSize={20} textSize="text-sm" />
            </div>
          </div>
        </div>

        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 pt-24 sm:p-10 sm:pt-28 lg:p-12 lg:pt-28 outline-none" style={{ overflowAnchor: 'none' }}>
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
