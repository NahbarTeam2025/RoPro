import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';
import { startOfDay, endOfDay, isBefore, format } from 'date-fns';

export interface DailyBriefingData {
  appointments: any[];
  tasks: any[];
  nextSubscription: any | null;
  monthlyStats: {
    income: number;
    expenses: number;
    balance: number;
  };
  loading: boolean;
}

export function useDailyBriefingData() {
  const { user } = useAuth();
  const [data, setData] = useState<DailyBriefingData>({
    appointments: [],
    tasks: [],
    nextSubscription: null,
    monthlyStats: { income: 0, expenses: 0, balance: 0 },
    loading: true,
  });

  useEffect(() => {
    if (!user) return;

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const currentMonth = format(new Date(), 'yyyy-MM');

    const appQ = query(collection(db, 'appointments'), where('userId', '==', user.uid));
    const tasksQ = query(collection(db, 'todos'), where('userId', '==', user.uid));
    const transQ = query(collection(db, 'transactions'), where('userId', '==', user.uid));

    const unsubscribers: any[] = [];

    // Appointments
    unsubscribers.push(onSnapshot(appQ, (snap) => {
      const apps = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(a => {
          if (!a.dueDate) return false;
          const d = new Date(a.dueDate);
          return d >= todayStart && d <= todayEnd;
        });
      setData(prev => ({ ...prev, appointments: apps }));
    }));

    // Tasks
    unsubscribers.push(onSnapshot(tasksQ, (snap) => {
      const tasks = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(t => {
          if (t.completed) return false;
          if (!t.dueDate) return false;
          const d = new Date(t.dueDate);
          return isBefore(d, todayEnd);
        });
      setData(prev => ({ ...prev, tasks }));
    }));

    // Transactions & subscriptions
    unsubscribers.push(onSnapshot(transQ, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      // Monthly stats
      const stats = all.reduce((acc, t) => {
        const d = t.date?.toDate?.() || new Date(t.date);
        if (format(d, 'yyyy-MM') === currentMonth) {
          if (t.type === 'income') acc.income += t.amount;
          else acc.expenses += t.amount;
        }
        return acc;
      }, { income: 0, expenses: 0 });

      // Next Subscription
      const recurring = all
        .filter(t => t.isRecurring && t.type === 'expense')
        .map(t => {
          const lastDate = t.date?.toDate?.() || new Date(t.date);
          let nextDate = new Date(lastDate);
          
          // Simple logic: if it's in the past, add intervals until it's in the future
          while (nextDate < todayStart) {
            if (t.interval === 'yearly') {
              nextDate.setFullYear(nextDate.getFullYear() + 1);
            } else {
              nextDate.setMonth(nextDate.getMonth() + 1);
            }
          }
          return { ...t, nextDueDate: nextDate };
        })
        .sort((a, b) => a.nextDueDate.getTime() - b.nextDueDate.getTime());

      setData(prev => ({ 
        ...prev, 
        monthlyStats: { ...stats, balance: stats.income - stats.expenses },
        nextSubscription: recurring[0] || null,
        loading: false
      }));
    }));

    return () => unsubscribers.forEach(u => u());
  }, [user]);

  return data;
}
