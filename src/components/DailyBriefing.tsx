import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, CheckSquare, Wallet, ArrowRight, Zap, AlertCircle } from 'lucide-react';
import { useDailyBriefingData } from '../hooks/useDailyBriefingData';
import { useAuth } from '../hooks/useAuth';
import { format, isBefore, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface DailyBriefingProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DailyBriefing({ isOpen, onClose }: DailyBriefingProps) {
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
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-[480px] max-h-[90vh] bg-white/10 dark:bg-black/40 backdrop-blur-[20px] rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 sm:p-8 pb-4 shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand/20 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 text-brand">
              <Zap fill="currentColor" size={24} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#e5e5e5] tracking-tight">
              {greeting}, {user?.displayName?.split(' ')[0] || 'Robert'}.
            </h2>
            <p className="text-brand-muted font-medium mt-1">Hier ist dein Überblick für heute.</p>
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
                        <span className="text-blue-400 text-sm font-bold">{app.task}</span>
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
                        <div className={cn("w-1.5 h-1.5 rounded-full", isOverdue ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-brand")} />
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
                <div className="bg-white/5 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-[#e5e5e5]">{data.nextSubscription.description}</div>
                    <div className="text-[10px] font-bold text-white/40 uppercase mt-1 tracking-wider">Fällig am {format(data.nextSubscription.nextDueDate, 'dd.MM.')}</div>
                  </div>
                  <div className="text-blue-400 font-black text-lg">-{data.nextSubscription.amount}€</div>
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
                <div className="bg-white/5 rounded-2xl p-3 text-center">
                  <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Einnahmen</div>
                  <div className="text-blue-400 font-black text-sm">+{data.monthlyStats.income}€</div>
                </div>
                <div className="bg-white/5 rounded-2xl p-3 text-center">
                  <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Ausgaben</div>
                  <div className="text-red-500 font-black text-sm">-{data.monthlyStats.expenses}€</div>
                </div>
                <div className="bg-white/5 rounded-2xl p-3 text-center">
                  <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Bilanz</div>
                  <div className={cn("font-black text-sm", data.monthlyStats.balance >= 0 ? "text-blue-400" : "text-red-500")}>
                    {data.monthlyStats.balance}€
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="p-6 sm:p-8 pt-4 shrink-0">
            <button
              onClick={onClose}
              className="w-full h-12 sm:h-14 bg-brand text-white font-bold rounded-2xl hover:bg-brand/90 transition-all shadow-lg shadow-brand/20 flex items-center justify-center gap-2 group"
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
