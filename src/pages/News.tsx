import React, { useState, useEffect, useRef } from 'react';
import { RefreshCcw, ExternalLink, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const FEEDS = [
  { id: 'tagesschau', name: 'Tagesschau', url: 'https://www.tagesschau.de/xml/rss2/' },
  { id: 'spiegel', name: 'Der Spiegel', url: 'https://www.spiegel.de/schlagzeilen/index.rss' },
  { id: 'heise', name: 'Heise Online', url: 'https://www.heise.de/rss/heise-atom.xml' },
  { id: 'faz', name: 'FAZ', url: 'https://www.faz.net/rss/aktuell/' },
  { id: 'zeit', name: 'Zeit Online', url: 'https://newsfeed.zeit.de/all' },
  { id: 'ntv', name: 'n-tv', url: 'https://www.n-tv.de/rss' },
  { id: 'golem', name: 'Golem IT-News', url: 'https://rss.golem.de/rss.php?feed=RSS2.0' },
  { id: 't3n', name: 't3n', url: 'https://t3n.de/news/feed/' },
  { id: 'kicker', name: 'Kicker Sportnachrichten', url: 'http://rss.kicker.de/news/aktuell' },
  { id: 'focus', name: 'Focus Online', url: 'https://rss.focus.de/fol/XML/rss_folnews.xml' },
  { id: 'welt', name: 'Die Welt', url: 'https://www.welt.de/feeds/latest.rss' }
];

interface FeedItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
}

export default function News() {
  const [activeFeed, setActiveFeed] = useState(FEEDS[0].id);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNews = async (feedId: string) => {
    setLoading(true);
    try {
      const feed = FEEDS.find(f => f.id === feedId)!;
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`);
      const data = await res.json();
      
      if (data.items) {
        setItems(data.items.map((item: any, i: number) => ({
          id: `${feedId}-${i}`,
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          description: stripHtml(item.description),
          source: feed.name
        })));
      }
    } catch (err) {
      console.error('Failed to fetch news', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNews(activeFeed);
    
    // Auto-refresh every 5 minutes (300000ms)
    const interval = setInterval(() => {
      fetchNews(activeFeed);
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [activeFeed]);

  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === 'left' ? -150 : 150, behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Nachrichten</h1>
          <p className="text-sm text-brand-muted mt-1">Aktuelle Schlagzeilen via RSS</p>
        </div>
        <button 
          onClick={() => fetchNews(activeFeed)}
          disabled={loading}
          className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white flex items-center justify-center transition-colors disabled:opacity-50"
        >
          <RefreshCcw size={18} className={cn(loading && "animate-spin")} />
        </button>
      </div>

      <div className="mb-6 relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full h-12 px-4 rounded-xl font-bold text-sm bg-[#1D1D1F] dark:bg-black text-white border-none cursor-pointer outline-none flex items-center justify-between"
        >
          {FEEDS.find(f => f.id === activeFeed)?.name}
          <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        
        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-14 left-0 w-full bg-[#1D1D1F] dark:bg-black rounded-xl border border-white/10 overflow-auto z-50 shadow-xl custom-scrollbar" 
              style={{ maxHeight: '240px' }}
            >
              {FEEDS.map(feed => (
                <button
                  key={feed.id}
                  onClick={() => {
                    setActiveFeed(feed.id);
                    setIsDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 text-sm font-bold text-white transition-colors block",
                    activeFeed === feed.id ? "bg-white/10" : "hover:bg-white/5"
                  )}
                >
                  {feed.name}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {loading ? (
             <motion.div 
               key="skeleton"
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="space-y-4"
             >
               {[1,2,3,4,5].map(i => (
                 <div key={i} className="glass-panel p-5 rounded-2xl animate-pulse">
                   <div className="flex gap-2 mb-3">
                     <div className="h-4 w-20 bg-black/10 dark:bg-white/10 rounded" />
                     <div className="h-4 w-24 bg-black/10 dark:bg-white/10 rounded" />
                   </div>
                   <div className="h-6 bg-black/10 dark:bg-white/10 rounded w-3/4 mb-2" />
                   <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-full mb-1" />
                   <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-2/3" />
                 </div>
               ))}
             </motion.div>
          ) : (
             <motion.div 
               key="content"
               initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
               className="space-y-4"
             >
               {items.map(item => (
                 <a 
                   href={item.link} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   key={item.id} 
                   className="block glass-panel p-5 rounded-2xl hover:bg-white/60 dark:hover:bg-white/10 transition-colors group relative overflow-hidden"
                 >
                   <div className="flex items-center gap-2 text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">
                     <span className="text-brand">{item.source}</span>
                     <span>•</span>
                     <span>{new Date(item.pubDate).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                   </div>
                   <h2 className="text-[17px] font-bold text-slate-900 dark:text-white leading-snug mb-2 pr-6">
                     {item.title}
                   </h2>
                   <p className="text-sm text-brand-muted line-clamp-2">
                     {item.description}
                   </p>
                   <div className="absolute top-5 right-5 text-brand opacity-0 group-hover:opacity-100 transition-opacity">
                     <ExternalLink size={18} />
                   </div>
                 </a>
               ))}
               {items.length === 0 && (
                 <div className="text-center py-10 text-brand-muted">Keine Nachrichten gefunden.</div>
               )}
             </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
