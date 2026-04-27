import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, CheckSquare, Wallet, ArrowRight, Zap, AlertCircle, Sun, Cloud, CloudSun, CloudRain, CloudSnow, CloudFog, CloudDrizzle, CloudLightning, X } from 'lucide-react';
import { useDailyBriefingData } from '../hooks/useDailyBriefingData';
import { useAuth } from '../hooks/useAuth';
import { format, isBefore, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { WeatherData, getWeatherInfo } from '../services/weatherService';

interface DailyBriefingProps {
  isOpen: boolean;
  onClose: () => void;
  weatherData?: WeatherData | null;
  locationName?: string;
}

export default function DailyBriefing({ isOpen, onClose, weatherData, locationName }: DailyBriefingProps) {
  const { user } = useAuth();
  const data = useDailyBriefingData();
  const now = new Date();
  const hour = now.getHours();

  let greeting = "Guten Tag";
  if (hour < 12) greeting = "Guten Morgen";
  else if (hour >= 18) greeting = "Guten Abend";

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-[480px] max-h-[90vh] bg-[#1c1c1e]/40 backdrop-blur-xl rounded-[2rem] sm:rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col"
          style={{ transform: 'translateZ(0)', willChange: 'transform, backdrop-filter' }}
        >
          {/* Header */}
          <div className="p-6 sm:p-8 pb-4 shrink-0 flex items-center justify-between relative">
            <h2 className="text-lg sm:text-xl font-black text-[#e5e5e5] tracking-tight uppercase tracking-[0.1em]">
              Überblick
            </h2>
            
            {weatherData && (
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-xl font-black text-white">{Math.round(weatherData.current.temp)}°</div>
                    <div className="text-[9px] font-black uppercase text-brand-muted tracking-wider truncate max-w-[100px]">
                      {locationName}
                    </div>
                  </div>
                  <div className="flex items-center justify-center p-1">
                    {(() => {
                      const iconName = getWeatherInfo(weatherData.current.weatherCode).icon;
                      const IconComponent = {
                        Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning
                      }[iconName] || Cloud;
                      return <IconComponent size={28} className="text-orange-400" />;
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 sm:px-8 py-4 space-y-6 sm:space-y-8">
            {/* Termine */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                <Calendar size={12} /> Heutige Termine
              </h3>
              {data.appointments.length > 0 ? (
                <div className="space-y-3">
                  {data.appointments.map(app => (
                    <div key={app.id} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                      <div className="flex-1">
                        <span className="text-white text-sm font-bold">{app.task}</span>
                        <span className="text-white/40 text-[10px] ml-2 font-medium">{format(new Date(app.dueDate), 'HH:mm')} Uhr</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/30 text-xs font-medium">Heute keine Termine.</p>
              )}
            </section>

            <div className="h-px bg-white/5" />

            {/* Aufgaben */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                <CheckSquare size={12} /> Fällige Aufgaben
              </h3>
              {data.tasks.length > 0 ? (
                <div className="space-y-3">
                  {data.tasks.map(task => {
                    const isOverdue = isBefore(new Date(task.dueDate), new Date()) && !isToday(new Date(task.dueDate));
                    return (
                      <div key={task.id} className="flex items-center gap-3">
                        <div className={cn("w-1.5 h-1.5 rounded-full", isOverdue ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-accent")} />
                        <span className={cn("text-xs font-bold truncate flex-1", isOverdue ? "text-red-500" : "text-[#e5e5e5]")}>{task.task}</span>
                        {isOverdue && <AlertCircle size={12} className="text-red-500" />}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-white/30 text-xs font-medium">Keine offenen Aufgaben für heute.</p>
              )}
            </section>

            <div className="h-px bg-white/5" />

            {/* Nächstes Abo */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                <ArrowRight size={12} /> Nächstes Abo
              </h3>
              {data.nextSubscription ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-[#e5e5e5]">{data.nextSubscription.description}</div>
                    <div className="text-[10px] font-bold text-white/40 uppercase mt-1 tracking-wider">Fällig am {format(data.nextSubscription.nextDueDate, 'dd.MM.')}</div>
                  </div>
                  <div className="text-white font-black text-lg">-{data.nextSubscription.amount?.toLocaleString('de-DE') || '0'}€</div>
                </div>
              ) : (
                <p className="text-white/30 text-xs font-medium">Keine Abonnements gefunden.</p>
              )}
            </section>

            <div className="h-px bg-white/5" />

            {/* Monats-Bilanz */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                <Wallet size={12} /> Monats-Bilanz ({format(now, 'MMMM', { locale: de })})
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Einnahmen</div>
                  <div className="text-white font-black text-sm">+{data.monthlyStats.income?.toLocaleString('de-DE') || '0'}€</div>
                </div>
                <div className="text-center">
                  <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Ausgaben</div>
                  <div className="text-red-500 font-black text-sm">-{data.monthlyStats.expenses?.toLocaleString('de-DE') || '0'}€</div>
                </div>
                <div className="text-center">
                  <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Bilanz</div>
                  <div className={cn("font-black text-sm", data.monthlyStats.balance >= 0 ? "text-white" : "text-red-500")}>
                    {data.monthlyStats.balance?.toLocaleString('de-DE') || '0'}€
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="p-6 sm:p-8 pt-4 shrink-0">
            <button
              onClick={onClose}
              className="btn-briefing-glow w-full flex items-center justify-center gap-2 group"
            >
              Los geht's
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
