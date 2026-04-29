
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Sun, Cloud, CloudSun, CloudRain, CloudSnow, 
  CloudFog, CloudDrizzle, CloudLightning, Wind, 
  Droplets, Thermometer, Calendar, TrendingUp
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { WeatherData, getWeatherInfo } from '../services/weatherService';
import { cn } from '../lib/utils';

interface WeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: WeatherData | null;
  locationName?: string;
}

const WeatherIcon = ({ code, size = 24, className = "" }: { code: number; size?: number; className?: string }) => {
  const info = getWeatherInfo(code);
  const iconName = info.icon;
  
  // High contrast colors for icons
  switch (iconName) {
    case 'Sun': return <Sun size={size} className={cn("text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.4)]", className)} />;
    case 'CloudSun': return <CloudSun size={size} className={cn("text-yellow-400", className)} />;
    case 'Cloud': return <Cloud size={size} className={cn("text-gray-400", className)} />;
    case 'CloudFog': return <CloudFog size={size} className={cn("text-gray-300", className)} />;
    case 'CloudDrizzle': return <CloudDrizzle size={size} className={cn("text-blue-300", className)} />;
    case 'CloudRain': return <CloudRain size={size} className={cn("text-blue-500", className)} />;
    case 'CloudSnow': return <CloudSnow size={size} className={cn("text-sky-100", className)} />;
    case 'CloudLightning': return <CloudLightning size={size} className={cn("text-purple-400", className)} />;
    default: return <Cloud size={size} className={cn("text-gray-400", className)} />;
  }
};

export default function WeatherModal({ isOpen, onClose, data, locationName }: WeatherModalProps) {
  if (!data) return null;

  const trendData = data.trend.time.map((time, i) => ({
    time: format(new Date(time), 'dd.MM.'),
    max: data.trend.tempMax[i],
    min: data.trend.tempMin[i],
  }));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#000000] opacity-90 backdrop-blur-xl"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-[480px] md:max-w-2xl bg-[#1c1c1e]/40 backdrop-blur-lg rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-8 pb-4 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <CloudSun className="text-brand dark:text-white" />
                  Wetter
                </h2>
                <p className="text-sm font-bold text-brand-muted uppercase tracking-widest mt-1">
                  {locationName || 'Dein Standort'}
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-3 bg-accent/5 hover:bg-accent/10 text-brand-muted hover:text-accent rounded-2xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
              {/* Current Weather Card */}
              <div className="p-4 mb-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 flex items-center justify-center p-2">
                      <WeatherIcon code={data.current.weatherCode} size={80} />
                    </div>
                    <div>
                      <div className="text-6xl font-black text-brand tracking-tighter">
                        {Math.round(data.current.temp)}°
                      </div>
                      <div className="text-lg font-bold text-brand-muted">
                        {getWeatherInfo(data.current.weatherCode).label}
                      </div>
                      <div className="text-sm font-medium text-brand-muted/70 mt-1">
                        Gefühlt wie {Math.round(data.current.apparentTemp)}°
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                    <div className="flex items-center gap-3 p-3">
                      <Wind size={24} className="text-brand dark:text-white" />
                      <div>
                        <div className="text-[10px] font-black uppercase text-brand-muted tracking-wider">Wind</div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{data.current.windSpeed} km/h</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3">
                      <Droplets size={24} className="text-brand dark:text-white" />
                      <div>
                        <div className="text-[10px] font-black uppercase text-brand-muted tracking-wider">Feuchte</div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{data.current.humidity}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 8-Day Forecast */}
              <div className="mb-8">
                <h3 className="text-[11px] font-black text-brand uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Calendar size={14} /> 8-Tage Vorhersage
                </h3>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {data.daily.time.map((time, i) => (
                    <div key={time} className="p-3 flex flex-col items-center gap-1.5 text-center transition-all">
                      <span className="text-[9px] font-black uppercase text-brand-muted truncate w-full">
                        {i === 0 ? 'Heute' : format(new Date(time), 'EEE', { locale: de })}
                      </span>
                      <WeatherIcon code={data.daily.weatherCode[i]} size={20} className="my-1" />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-black text-brand leading-none">{Math.round(data.daily.tempMax[i])}°</span>
                        <span className="text-[9px] font-bold text-brand-muted leading-none">{Math.round(data.daily.tempMin[i])}°</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2-Week Trend */}
              <div>
                <h3 className="text-[11px] font-black text-brand uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <TrendingUp size={14} /> 2-Wochen Trend
                </h3>
                <div className="h-64 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorMax" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="time" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }}
                        minTickGap={10}
                      />
                      <YAxis 
                        hide 
                        domain={['dataMin - 2', 'dataMax + 2']}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(5,5,5,0.9)', 
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          fontSize: '10px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="max" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorMax)" 
                        name="Max Temp"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="min" 
                        stroke="#9333EA" 
                        strokeWidth={1}
                        fill="transparent"
                        name="Min Temp"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
