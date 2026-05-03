import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, updateDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { 
  Plus, Trash2, ArrowUpCircle, ArrowDownCircle, Wallet, 
  Search, Filter, TrendingUp, TrendingDown, PiggyBank,
  Check, X, Edit2, ChevronRight, ChevronDown, PieChart as PieChartIcon,
  BarChart3
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isSameMonth, eachDayOfInterval, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';

const safeFormatDate = (dateObj: any, fmt: string, fallback = '--') => {
  if (!dateObj) return fallback;
  try {
    const d = typeof dateObj.toDate === 'function' ? dateObj.toDate() : new Date(dateObj);
    if (isNaN(d.getTime())) return fallback;
    return format(d, fmt, { locale: de });
  } catch (e) {
    return fallback;
  }
};
import { cn } from '../lib/utils';
import { CategorySelect } from '../components/CategorySelect';
import { CategoryManager } from '../components/CategoryManager';
import { useCategories } from '../lib/categories';
import { CustomSelect } from '../components/CustomSelect';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: any;
  userId: string;
  isRecurring?: boolean;
  interval?: 'monthly' | 'yearly';
  createdAt?: any;
}

export default function Household() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, id: string } | null>(null);
  const [detailModal, setDetailModal] = useState<{ open: boolean, type: 'income' | 'expense' } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'transactions' | 'abos'>('transactions');
  
  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isRecurring, setIsRecurring] = useState(false);
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');

  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [showCatManager, setShowCatManager] = useState(false);
  const { categories } = useCategories('household');
  const formRef = React.useRef<HTMLFormElement>(null);
  const automationsRunRef = React.useRef<string | null>(null);
  const addingInProgressRef = React.useRef<Set<string>>(new Set());

  const [savings, setSavings] = useState<{ amount: number, id: string } | null>(null);
  const [savingsInput, setSavingsInput] = useState('');
  const [isUpdatingSavings, setIsUpdatingSavings] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, 'savings', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setSavings({ id: snapshot.id, amount: snapshot.data().amount });
      } else {
        setSavings({ id: user.uid, amount: 0 });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `savings/${user.uid}`);
    });

    return () => unsubscribe();
  }, [user]);

  const handleUpdateSavings = async (type: 'add' | 'subtract') => {
    if (!user || !savingsInput) return;
    
    const normalizedInput = savingsInput.replace(',', '.');
    const value = parseFloat(normalizedInput);
    if (isNaN(value)) return;

    setIsUpdatingSavings(true);
    try {
      const currentAmount = savings?.amount || 0;
      const newAmount = type === 'add' ? currentAmount + value : currentAmount - value;
      
      const path = `savings/${user.uid}`;
      try {
        // Use setDoc with merge to create or update
        await setDoc(doc(db, 'savings', user.uid), {
          userId: user.uid,
          amount: newAmount,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }

      setSavingsInput('');
    } catch (error) {
      console.error("Error updating savings:", error);
      if (error instanceof Error) {
        try {
          const info = JSON.parse(error.message);
          alert(`Fehler beim Sparen: ${info.error}`);
        } catch {
          alert('Fehler beim Aktualisieren des Sparschweins.');
        }
      }
    } finally {
      setIsUpdatingSavings(false);
    }
  };

  const formatEuro = (amount: number) => {
    return amount.toLocaleString('de-DE', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).replace(',', '.');
  };

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      docs.sort((a, b) => {
        const timeA = a.date?.toDate?.()?.getTime() || 0;
        const timeB = b.date?.toDate?.()?.getTime() || 0;
        return timeB - timeA;
      });
      setTransactions(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => unsubscribe();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!description.trim()) {
      alert('Bitte gib eine Beschreibung ein.');
      return;
    }

    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Bitte gib einen gültigen Betrag ein.');
      return;
    }

    try {
      const transactionData = {
        description: description.trim(),
        amount: numAmount,
        type,
        category: categoryId,
        date: new Date(date),
        isRecurring,
        interval: isRecurring ? interval : null,
        userId: user.uid,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        const path = `transactions/${editingId}`;
        try {
          await updateDoc(doc(db, 'transactions', editingId), transactionData);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, path);
        }
      } else {
        const path = 'transactions';
        try {
          await addDoc(collection(db, 'transactions'), {
            ...transactionData,
            createdAt: serverTimestamp()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, path);
        }
      }
      
      resetForm();
      setShowAdd(false);
    } catch (error) {
      console.error("Error saving transaction:", error);
      if (error instanceof Error) {
        try {
          const info = JSON.parse(error.message);
          alert(`Fehler beim Speichern: ${info.error}`);
        } catch {
          alert('Fehler beim Speichern. Bitte versuche es erneut.');
        }
      }
    }
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setCategoryId('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setIsRecurring(false);
    setInterval('monthly');
    setEditingId(null);
  };

  const handleEdit = (t: Transaction) => {
    setEditingId(t.id);
    setDescription(t.description);
    setAmount(t.amount.toString());
    setType(t.type);
    setCategoryId(t.category);
    const tDate = t.date?.toDate ? t.date.toDate() : new Date();
    setDate(format(tDate, 'yyyy-MM-dd'));
    setIsRecurring(!!t.isRecurring);
    setInterval(t.interval || 'monthly');
    setShowAdd(true);
    setDetailModal(null); // Close detail modal if open
    
    // Ensure form is rendered before scrolling
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal || !user) return;
    const path = `transactions/${deleteModal.id}`;
    try {
      try {
        await deleteDoc(doc(db, 'transactions', deleteModal.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
      setDeleteModal(null);
    } catch (error) {
      console.error("Error deleting transaction:", error);
      if (error instanceof Error) {
        try {
          const info = JSON.parse(error.message);
          alert(`Fehler beim Löschen: ${info.error}`);
        } catch {
          alert('Fehler beim Löschen der Transaktion');
        }
      }
    }
  };

  const handleDelete = (id: string) => {
    setDeleteModal({ open: true, id: id });
  };

  const filteredTransactions = transactions.filter(t => {
    try {
      const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      return format(tDate, 'yyyy-MM') === filterMonth;
    } catch(e) {
      return false;
    }
  });

  const income = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const expenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = income - expenses;

  // Ensure current month and selected month are always available
  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const monthNamesSet = new Set(transactions.map(t => {
    try {
      const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      return format(d, 'yyyy-MM');
    } catch(e) {
      return format(new Date(), 'yyyy-MM');
    }
  }));
  
  monthNamesSet.add(currentMonthStr);
  monthNamesSet.add(filterMonth);
  
  const availableMonths = Array.from(monthNamesSet).sort().reverse();

  const [trendData, setTrendData] = useState<any[]>([]);

  const currentMonthDate = new Date(`${filterMonth}-01`);

  // Groups recurring transactions to get unique "Abos" (Income and Expenses)
  const recurringItems = transactions.filter(t => t.isRecurring);
  
  // Group by description/amount to show unique subscriptions
  const sortedRecurring = [...recurringItems].sort((a, b) => (b.date?.toDate?.()?.getTime() || 0) - (a.date?.toDate?.()?.getTime() || 0));
  const activeAbos = Array.from(new Map(sortedRecurring.map(item => [`${item.description}-${item.amount}`, item])).values());
  
  const monthlyRecurringSum = activeAbos
    .filter(a => a.interval === 'monthly' || !a.interval)
    .reduce((sum, a) => sum + a.amount, 0);
    
  const yearlyRecurringSum = activeAbos
    .filter(a => a.interval === 'yearly')
    .reduce((sum, a) => sum + a.amount, 0);
    
  const totalPerYearSum = (monthlyRecurringSum * 12) + yearlyRecurringSum;

  const COLORS = ['#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A', '#111827'];

  useEffect(() => {
    if (!user || loading) return;

    const today = new Date();
    const currentMonthStr = format(today, 'yyyy-MM');
    
    // CRITICAL: Set ref immediately to prevent subsequent effects from running automations concurrently
    if (automationsRunRef.current === currentMonthStr + '-v4') return;
    automationsRunRef.current = currentMonthStr + '-v4';

    const runAutomations = async () => {
      // Small delay to let full state settle
      if (transactions.length === 0 && !loading) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      const currentTransactionsSnapshot = transactions;
      const today = new Date();
      const currentMonthStr = format(today, 'yyyy-MM');

      // 0. Auto-Cleanup duplicates & date corrections
      // Fix items that were incorrectly created on the 1st of the month.
      const currentMonthTrans = currentTransactionsSnapshot.filter(t => {
        try {
          return format(t.date?.toDate ? t.date.toDate() : new Date(t.date), 'yyyy-MM') === currentMonthStr;
        } catch(e) {
          return false;
        }
      });
      
      const seenTrans = new Set<string>();
      for (const t of currentMonthTrans) {
        const normalizedDesc = t.description.toLowerCase().trim();
        const isTargetForCleanup = t.isRecurring || normalizedDesc === 'übertrag aus vormonat' || normalizedDesc.includes('ps lose');
        
        if (isTargetForCleanup) {
          const key = `${normalizedDesc}-${t.amount}`;
          if (seenTrans.has(key)) {
            // Duplicate detected, clean it up!
            try {
              await deleteDoc(doc(db, 'transactions', t.id));
              console.log("Deleted duplicate transaction:", t.description);
            } catch(e) {
              console.error("Failed to delete duplicate:", e);
            }
          } else {
            seenTrans.add(key);
          }
        }
      }

      // 0.5 Run global date correction for ALL recurring items
      const allRecurringTrans = currentTransactionsSnapshot.filter(t => t.isRecurring);
      for (const t of allRecurringTrans) {
        const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
        if (tDate.getDate() === 1) { // Only check/fix if it's currently on the 1st
          const normalizedDesc = t.description.toLowerCase().trim();
          
          const historical = currentTransactionsSnapshot.filter(ht => 
            ht.isRecurring && 
            ht.description.toLowerCase().trim() === normalizedDesc && 
            Math.abs(ht.amount - t.amount) < 0.05
          ).sort((a, b) => {
             const timeA = a.createdAt?.toDate?.()?.getTime() || a.date?.toDate?.()?.getTime() || 0;
             const timeB = b.createdAt?.toDate?.()?.getTime() || b.date?.toDate?.()?.getTime() || 0;
             return timeA - timeB;
          });

          if (historical.length > 0) {
            let original = historical[0];
            for (const h of historical) {
              const hDate = h.date?.toDate ? h.date.toDate() : new Date(h.date);
              if (hDate.getDate() !== 1) {
                 original = h;
                 break;
              }
            }
            
            const originalDate = original.date?.toDate ? original.date.toDate() : new Date(original.date);
            const originalDay = originalDate.getDate();
            
            if (originalDay && originalDay !== 1) { // If the original was NOT on the 1st
              const maxDays = new Date(tDate.getFullYear(), tDate.getMonth() + 1, 0).getDate();
              const correctedDay = Math.min(originalDay, maxDays);
              const correctedDate = new Date(tDate.getFullYear(), tDate.getMonth(), correctedDay, 12, 0, 0);
              
              try {
                await updateDoc(doc(db, 'transactions', t.id), {
                  date: correctedDate,
                  updatedAt: serverTimestamp()
                });
                console.log("Global corrected date for", t.description, "to day", correctedDay);
              } catch(e) {
                console.error("Failed to global correct date:", e);
              }
            }
          }
        }
      }

      // Helper to find existing specifically in the current snapshot
      const findExisting = (desc: string, amount?: number) => {
        const normalized = desc.toLowerCase().trim();
        return currentTransactionsSnapshot.some(t => {
          try {
            const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
            const isSameDesc = t.description.toLowerCase().trim() === normalized;
            const isSameMonth = format(d, 'yyyy-MM') === currentMonthStr;
            
            if (amount !== undefined) {
               return isSameDesc && isSameMonth && Math.abs(t.amount - amount) < 0.05;
            }
            return isSameDesc && isSameMonth;
          } catch(e) {
            return false;
          }
        });
      };

      // 1. Check for Carry Over (Übertrag)
      const carryOverKey = 'automation-carryover-' + currentMonthStr;

      if (!findExisting('Übertrag aus Vormonat') && !addingInProgressRef.current.has(carryOverKey)) {
        // Carry over doesn't check amount, it just looks for string match in current month
        const prevMonth = subMonths(startOfMonth(today), 1);
        const prevMonthStr = format(prevMonth, 'yyyy-MM');
        
        const prevMonthTransactions = currentTransactionsSnapshot.filter(t => {
          try {
            const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
            return format(d, 'yyyy-MM') === prevMonthStr;
          } catch(e) {
            return false;
          }
        });

        if (prevMonthTransactions.length > 0) {
          const prevIncome = prevMonthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
          const prevExpenses = prevMonthTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
          const prevBalance = prevIncome - prevExpenses;

          if (prevBalance !== 0) {
            try {
              addingInProgressRef.current.add(carryOverKey);
              await addDoc(collection(db, 'transactions'), {
                description: 'Übertrag aus Vormonat',
                amount: Math.abs(prevBalance),
                type: prevBalance > 0 ? 'income' : 'expense',
                category: 'uebertrag',
                date: startOfMonth(today),
                userId: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
            } catch (error) {
              addingInProgressRef.current.delete(carryOverKey);
              console.error("Error creating carry over:", error);
            }
          }
        }
      }

      // 2. Check for Recurring Transactions (Abos)
      // Only look at the strictly previous month for monthly Abos, or last year this month for yearly.
      const prevMonth = subMonths(startOfMonth(today), 1);
      const prevMonthStr = format(prevMonth, 'yyyy-MM');
      
      const prevMonthAbos = currentTransactionsSnapshot.filter(t => {
        if (!t.isRecurring) return false;
        try {
          const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
          const monthStr = format(d, 'yyyy-MM');
          // For monthly, it must be from the exact previous month.
          // For yearly, it must be from exactly 12 months ago.
          if (t.interval === 'yearly') {
            const lastYear = subMonths(startOfMonth(today), 12);
            return monthStr === format(lastYear, 'yyyy-MM');
          }
          return monthStr === prevMonthStr;
        } catch(e) {
          return false;
        }
      });
      
      // Deduplicate in case there are identical abos (same description and amount) in the previous month
      const uniquePrevAbos = Array.from(new Map(prevMonthAbos.map(item => [`${item.description.toLowerCase().trim()}-${item.amount}`, item])).values());

      for (const template of uniquePrevAbos) {
        const normalizedDesc = template.description.toLowerCase().trim();
        const templateKey = `automation-abo-${normalizedDesc}-${template.amount}-${currentMonthStr}`;
        
        if (!findExisting(template.description, template.amount) && !addingInProgressRef.current.has(templateKey)) {
          
          // Find actual original target day
          const historical = currentTransactionsSnapshot.filter(ht => 
              ht.isRecurring && 
              ht.description.toLowerCase().trim() === normalizedDesc && 
              Math.abs(ht.amount - template.amount) < 0.05
          ).sort((a, b) => {
             const timeA = a.createdAt?.toDate?.()?.getTime() || a.date?.toDate?.()?.getTime() || 0;
             const timeB = b.createdAt?.toDate?.()?.getTime() || b.date?.toDate?.()?.getTime() || 0;
             return timeA - timeB; 
          });

          let originalDay = 1;
          if (historical.length > 0) {
            let original = historical[0];
            for (const h of historical) {
              const hDate = h.date?.toDate ? h.date.toDate() : new Date(h.date);
              if (hDate.getDate() !== 1) {
                 original = h;
                 break;
              }
            }
            const origDate = original.date?.toDate ? original.date.toDate() : new Date(original.date);
            originalDay = origDate.getDate() || 1;
          } else {
             try {
                const templateDate = template.date?.toDate ? template.date.toDate() : new Date(template.date);
                originalDay = templateDate.getDate() || 1;
             } catch(e) {
                originalDay = 1;
             }
          }
          
          const maxDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
          const targetDay = Math.min(originalDay, maxDays);
          const recurringDate = new Date(today.getFullYear(), today.getMonth(), targetDay, 12, 0, 0);

          try {
            addingInProgressRef.current.add(templateKey);
            await addDoc(collection(db, 'transactions'), {
              description: template.description,
              amount: template.amount,
              type: template.type,
              category: template.category,
              date: recurringDate,
              isRecurring: true,
              interval: template.interval || 'monthly',
              userId: user.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          } catch (error) {
            addingInProgressRef.current.delete(templateKey);
            console.error("Error creating recurring transaction:", error);
          }
        }
      }
    };

    runAutomations();
  }, [user, transactions.length, loading, filterMonth]); 


  // Trend Data calculation
  useEffect(() => {
    if (!loading) {
      const currentMonthInView = new Date(`${filterMonth}-01`);
      
      // Calculate starting balance from ALL history before this month
      const prevTrans = transactions.filter(t => {
        try {
          const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
          if (isNaN(d.getTime())) return false;
          return d < startOfMonth(currentMonthInView);
        } catch(e) {
          return false;
        }
      });
      
      const startBalance = prevTrans.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
      
      let runningBalance = startBalance;
      let runningExpenses = 0;
      let runningIncome = 0;

      const days = eachDayOfInterval({
        start: startOfMonth(currentMonthInView),
        end: endOfMonth(currentMonthInView)
      });

      const data = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        // Only consider transactions from the CURRENT filtered month for the daily chart lines
        const dayActions = transactions.filter(t => {
          try {
            const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
            return format(d, 'yyyy-MM-dd') === dayStr;
          } catch(e) {
            return false;
          }
        });

        const dInc = dayActions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const dExp = dayActions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

        runningBalance += (dInc - dExp);
        runningExpenses += dExp;
        runningIncome += dInc;

        return {
          name: format(day, 'd.'),
          Einnahmen: parseFloat(runningIncome.toFixed(2)),
          Ausgaben: parseFloat(runningExpenses.toFixed(2)),
          Bilanz: parseFloat(runningBalance.toFixed(2))
        };
      });

      // Simple safety check to ensure we have data
      if (data.length > 0) {
        setTrendData(data);
      }
    }
  }, [transactions, filterMonth, loading]);


  return (
    <div className="max-w-5xl mx-auto flex flex-col relative z-10 w-full px-0 sm:px-0 pb-10">
      <header className="mb-10 flex justify-center sm:justify-start">
        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => {
              if (showAdd && editingId) {
                resetForm();
              } else {
                setShowAdd(!showAdd);
                if (!showAdd) resetForm();
              }
            }}
            className={cn(
              "flex-1 sm:flex-none flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-bold text-sm transition-all whitespace-nowrap",
              editingId 
                ? "bg-red-500 text-white shadow-lg shadow-red-500/20" 
                : showAdd 
                  ? "bg-blue-500/20 text-blue-700 dark:bg-blue-500/30 dark:text-blue-300 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 dark:hover:bg-blue-500/20"
            )}
          >
            <Plus size={18} className={cn("transition-transform", showAdd && !editingId && "rotate-45")} />
            <span>{editingId ? 'Abbrechen' : 'Neuer Eintrag'}</span>
          </button>
          
          <div className="w-px h-6 bg-slate-200 dark:bg-white/10 self-center mx-1" />
          
          <div className="flex-1 sm:flex-none relative h-11 shrink-0">
            <CustomSelect 
              value={filterMonth} 
              onChange={setFilterMonth}
              options={availableMonths.map(m => ({ 
                value: m, 
                label: format(new Date(`${m}-01`), 'MMMM yyyy', { locale: de }) 
              }))}
              triggerClassName="!h-11 !bg-transparent !border-none !text-sm"
            />
          </div>
        </div>
      </header>

      {showAdd && (
        <form ref={formRef} onSubmit={handleSave} className="glass-card p-6 sm:p-8 rounded-[2.5rem] mb-10 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-xs font-black text-brand-muted uppercase tracking-[0.2em] px-1">Typ</label>
              <div className="flex gap-2 p-1.5 bg-accent/[0.03] dark:bg-white/[0.03] rounded-2xl h-12">
                <button 
                  type="button"
                  onClick={() => setType('expense')}
                  className={cn(
                    "flex-1 rounded-xl font-black text-xs uppercase tracking-wider transition-all",
                    type === 'expense' ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "text-brand-muted hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  Ausgabe
                </button>
                <button 
                  type="button"
                  onClick={() => setType('income')}
                  className={cn(
                    "flex-1 rounded-xl font-black text-xs uppercase tracking-wider transition-all",
                    type === 'income' ? "bg-green-500 text-white shadow-lg shadow-green-500/20" : "text-brand-muted hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  Einnahme
                </button>
              </div>
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] px-1">Betrag (€)</label>
              <input 
                type="number" step="0.01" 
                value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="glass-input h-12 font-black text-lg focus:ring-2 focus:ring-accent" required
              />
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Beschreibung</label>
              <input 
                type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="z.B. Miete"
                className="glass-input h-12 focus:ring-2 focus:ring-accent/50 font-bold" required
              />
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Datum</label>
              <input 
                type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="glass-input h-12 focus:ring-2 focus:ring-accent/50 font-bold" required
              />
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1 mb-1">Wiederholen</label>
              <div className="flex gap-2 h-12">
                <button
                  type="button"
                  onClick={() => setIsRecurring(!isRecurring)}
                  className={cn(
                    "flex-1 h-12 rounded-2xl border flex items-center justify-center gap-2 transition-all font-black text-xs uppercase tracking-widest",
                    isRecurring ? "bg-brand text-white shadow-lg shadow-accent/20" : "bg-brand/[0.03] dark:bg-white/[0.03] border-transparent text-brand-muted"
                  )}
                >
                  {isRecurring ? <Check size={14} strokeWidth={3} /> : null}
                  <span>Ja</span>
                </button>
                {isRecurring && (
                  <CustomSelect
                    value={interval}
                    onChange={(val) => setInterval(val as any)}
                    options={[
                      { value: 'monthly', label: 'Monatlich' },
                      { value: 'yearly', label: 'Jährlich' }
                    ]}
                    className="flex-1"
                  />
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8 pt-6 border-t border-slate-200/50 dark:border-white/10">
            <button type="submit" className="btn-green-glow h-14 px-10">
              {editingId ? 'Aktualisieren' : 'Eintrag speichern'}
            </button>
            <button type="button" onClick={() => { setShowAdd(false); resetForm(); }} className="btn-red-glow h-14 px-8">
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <div 
          onClick={() => setDetailModal({ open: true, type: 'income' })}
          className="flex items-center gap-3 cursor-pointer hover:bg-green-500/5 transition-colors p-2"
        >
          <div className="text-green-500 shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-brand-muted uppercase tracking-widest mb-0.5">Einnahmen</div>
            <div className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              {formatEuro(income)}
            </div>
          </div>
        </div>

        <div 
          onClick={() => setDetailModal({ open: true, type: 'expense' })}
          className="flex items-center gap-3 cursor-pointer hover:bg-red-500/5 transition-colors p-2"
        >
          <div className="text-red-500 shrink-0">
            <TrendingDown size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-brand-muted uppercase tracking-widest mb-0.5">Ausgaben</div>
            <div className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              {formatEuro(expenses)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2">
          <div className={cn(
            "transition-colors shrink-0",
            "text-blue-500"
          )}>
            <PiggyBank size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-brand-muted uppercase tracking-widest mb-0.5">Bilanz</div>
            <div className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              {formatEuro(balance)}
            </div>
          </div>
        </div>

        {/* Savings Tile */}
        <div className="flex flex-col gap-3 p-2">
          <div className="flex items-center gap-3">
            <div className="text-green-500 shrink-0">
              <PiggyBank size={24} />
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-brand-muted uppercase tracking-widest mb-0.5">Gespartes Geld</div>
            <div className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              {savings ? formatEuro(savings.amount) : formatEuro(0)}
            </div>
            </div>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              inputMode="decimal"
              value={savingsInput}
              onChange={(e) => setSavingsInput(e.target.value)}
              placeholder="Betrag"
              className="h-8 text-xs w-full px-2 bg-slate-900 dark:bg-black/40 text-white placeholder:text-white/40 rounded-lg border border-white/10"
            />
            <button 
              type="button"
              onClick={() => handleUpdateSavings('subtract')}
              disabled={isUpdatingSavings}
              className="h-8 w-8 shrink-0 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all flex items-center justify-center font-black"
              title="Abziehen"
            >
              -
            </button>
            <button 
              onClick={() => handleUpdateSavings('add')}
              className="h-8 w-8 shrink-0 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-all flex items-center justify-center font-black"
              title="Hinzufügen"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Visualizations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Trend Chart */}
        <div className="glass-card p-6 rounded-[2rem] lg:col-span-3 border border-white/[0.06] overflow-hidden select-none outline-none">
          <div className="flex items-center justify-between mb-6 outline-none">
            <h3 className="text-xs font-black text-brand uppercase tracking-widest flex items-center gap-2">
              <BarChart3 size={14} /> Trend {format(currentMonthDate, 'MMMM', { locale: de })}
            </h3>
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-1.5 outline-none" title="Der aktuelle Kontostand im Zeitverlauf">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[8px] font-bold text-brand-muted uppercase">Netto-Bilanz</span>
               </div>
               <div className="flex items-center gap-1.5 outline-none" title="Alle Einnahmen aufsummiert">
                  <div className="w-2 h-2 rounded-full bg-green-500/40" />
                  <span className="text-[8px] font-bold text-brand-muted uppercase">Einnahmen (kum.)</span>
               </div>
               <div className="flex items-center gap-1.5 outline-none" title="Alle Ausgaben aufsummiert">
                  <div className="w-2 h-2 rounded-full bg-red-500/40" />
                  <span className="text-[8px] font-bold text-brand-muted uppercase">Ausgaben (kum.)</span>
               </div>
            </div>
          </div>
          <div className="h-[200px] w-full relative outline-none" tabIndex={-1}>
            <div className="absolute inset-0">
              <ResponsiveContainer width="99%" height="100%" className="outline-none">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} 
                  interval="preserveStartEnd"
                />
                <YAxis hide />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    fontSize: '11px',
                    color: '#fff',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  itemStyle={{ fontWeight: 'bold' }}
                  labelFormatter={(name) => `${name} ${format(currentMonthDate, 'MMMM', { locale: de })}`}
                  formatter={(value: number) => [`${value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`, '']}
                />
                <Area 
                  type="monotone" 
                  dataKey="Einnahmen" 
                  stroke="#22C55E" 
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  fillOpacity={0.05} 
                  fill="#22C55E"
                />
                <Area 
                  type="monotone" 
                  dataKey="Ausgaben" 
                  stroke="#EF4444" 
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  fillOpacity={0.05}
                  fill="#EF4444"
                />
                <Area 
                  type="monotone" 
                  dataKey="Bilanz" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  fillOpacity={0.1} 
                  fill="url(#colorBalance)" 
                />
              </AreaChart>
            </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Removed Categories chart based on user request */}
      </div>

      {/* Transaction List / Abos View */}
      <div className="glass-card rounded-[2.5rem] overflow-hidden flex flex-col flex-1 min-h-[500px]">
        <div className="p-8 border-b border-slate-200/50 dark:border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex bg-slate-500/10 p-1 rounded-2xl w-full sm:w-auto">
            <button
              onClick={() => setActiveView('transactions')}
              className={cn(
                "flex-1 sm:px-6 py-2 rounded-xl text-xs font-bold transition-all",
                activeView === 'transactions' ? "bg-white dark:bg-accent/40 text-slate-900 dark:text-white shadow-sm" : "text-brand-muted hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Transaktionen
            </button>
            <button
              onClick={() => setActiveView('abos')}
              className={cn(
                "flex-1 sm:px-6 py-2 rounded-xl text-xs font-bold transition-all",
                activeView === 'abos' ? "bg-white dark:bg-accent/40 text-slate-900 dark:text-white shadow-sm" : "text-brand-muted hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Abos
            </button>
          </div>
          <div className="flex items-center gap-2">
            {/* Category Filter removed based on user request */}
          </div>
        </div>

        {activeView === 'abos' ? (
          <div className="flex-1 flex flex-col">
            {/* Abo Summary Cards */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 border-b border-slate-200/50 dark:border-white/10 shrink-0">
              <div className="p-2">
                <div className="text-xs font-bold text-brand-muted uppercase tracking-widest mb-1">Monatlich gesamt</div>
                <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {formatEuro(monthlyRecurringSum || 0)}
                </div>
              </div>
              <div className="p-2">
                <div className="text-xs font-bold text-brand-muted uppercase tracking-widest mb-1">Jährl. Abos</div>
                <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {formatEuro(yearlyRecurringSum || 0)}
                </div>
              </div>
              <div className="p-2">
                <div className="text-xs font-bold text-brand uppercase tracking-widest mb-1">Pro Jahr total</div>
                <div className="text-xl font-black text-brand dark:text-white tracking-tight">
                  {formatEuro(totalPerYearSum || 0)}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[420px]">
              {activeAbos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-brand-muted space-y-4">
                  <div className="w-16 h-16 flex items-center justify-center opacity-40">
                    <PieChartIcon size={48} strokeWidth={1} />
                  </div>
                  <p className="font-bold tracking-tight">Keine Abonnements gefunden.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200/50 dark:divide-white/5">
                  {activeAbos.map(abo => (
                    <div key={abo.id} className="p-4 sm:p-6 flex items-center gap-4 sm:gap-5 hover:bg-slate-500/5 transition-colors group">
                      <div className={cn(
                        "w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0",
                        abo.type === 'income' ? "text-green-500" : "text-red-500"
                      )}>
                        {abo.type === 'income' ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-1">
                          <h4 className="font-bold text-slate-900 dark:text-white truncate">{abo.description}</h4>
                          <span className="text-xs sm:text-xs font-bold text-brand-muted uppercase tracking-wider italic">
                            Letzte Buchung: {safeFormatDate(abo.date, 'dd.MM.yyyy')}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 min-w-[100px] shrink-0">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => handleEdit(abo)}
                            className="p-1 text-brand-muted hover:text-brand hover:bg-brand/10 rounded-lg transition-all"
                            title="Abonnement bearbeiten"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDelete(abo.id)}
                            className="p-1 text-brand-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Abonnement löschen"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="text-right">
                          <div className="text-base sm:text-lg font-black tracking-tighter text-slate-900 dark:text-white">
                            {formatEuro(abo.amount)}
                          </div>
                          <div className="text-xs font-bold text-blue-500 uppercase tracking-widest">
                            {abo.interval === 'yearly' ? 'pro Jahr' : 'pro Monat'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[420px]">
            {filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-brand-muted space-y-4">
                <div className="w-16 h-16 flex items-center justify-center opacity-40">
                  <Wallet size={48} strokeWidth={1} />
                </div>
                <p className="font-bold tracking-tight">Keine Transaktionen in diesem Monat.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200/50 dark:divide-white/5">
                {filteredTransactions.map(t => {
                  const catName = categories.find(c => c.id === t.category)?.name || t.category || '--';
                  return (
                    <div key={t.id} className="p-4 sm:p-6 flex items-center gap-4 sm:gap-5 hover:bg-slate-500/5 transition-colors group">
                      <div className={cn(
                        "w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0",
                        t.type === 'income' ? "text-green-500" : "text-red-500"
                      )}>
                        {t.type === 'income' ? <ArrowUpCircle size={24} className="sm:w-8 sm:h-8" /> : <ArrowDownCircle size={24} className="sm:w-8 sm:h-8" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-1">
                          <h4 className="font-bold text-slate-900 dark:text-white whitespace-nowrap truncate">{t.description}</h4>
                          <span className="text-xs font-black text-accent uppercase tracking-tighter w-fit">
                            {t.isRecurring ? (t.interval === 'yearly' ? 'Jährlich' : 'Monatlich') : 'Einmalig'}
                          </span>
                          <span className="text-xs sm:text-xs font-bold text-brand-muted uppercase tracking-wider flex items-center gap-1 italic">
                            {safeFormatDate(t.date, 'dd.MM.yyyy')}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 min-w-[100px] shrink-0">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => handleEdit(t)}
                            className="p-1 text-brand-muted hover:text-brand hover:bg-brand/10 rounded-lg transition-all"
                            title="Bearbeiten"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDelete(t.id)}
                            className="p-1 text-brand-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Löschen"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-black text-lg",
                            t.type === 'income' ? "text-green-500" : "text-red-500"
                          )}>
                            {t.type === 'income' ? '+' : '-'}
                          </span>
                          <div className="text-base sm:text-lg font-black tracking-tighter whitespace-nowrap text-slate-900 dark:text-white">
                            {formatEuro(t.amount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {showCatManager && <CategoryManager type="household" onClose={() => setShowCatManager(false)} />}

      {/* Detail Modal */}
      {detailModal && detailModal.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="glass-card w-full max-w-[480px] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-200/50 dark:border-white/10 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-brand tracking-tight">
                  {detailModal.type === 'income' ? 'Einnahmen Details' : 'Ausgaben Details'}
                </h3>
                <p className="text-sm text-brand-muted font-medium">
                  {format(new Date(`${filterMonth}-01`), 'MMMM yyyy', { locale: de })}
                </p>
              </div>
              <button 
                onClick={() => setDetailModal(null)}
                className="p-2 hover:bg-slate-500/10 rounded-xl transition-colors text-brand-muted"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar max-h-[280px]">
              <div className="space-y-3">
                {(() => {
                  const items = filteredTransactions
                    .filter(t => t.type === detailModal.type)
                    .sort((a, b) => {
                      if (a.isRecurring && !b.isRecurring) return -1;
                      if (!a.isRecurring && b.isRecurring) return 1;
                      const timeA = a.date?.toDate?.()?.getTime() || 0;
                      const timeB = b.date?.toDate?.()?.getTime() || 0;
                      return timeB - timeA;
                    });

                  if (items.length === 0) {
                    return <p className="text-center py-10 text-brand-muted font-medium">Keine Einträge gefunden.</p>;
                  }

                  return items.map(t => {
                    const catName = categories.find(c => c.id === t.category)?.name || t.category || '--';
                    return (
                      <div key={t.id} className="px-4 py-2 flex items-center justify-between group">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 flex items-center justify-center shrink-0 text-brand-muted/40">
                            {t.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                          </div>
                          <div className="flex flex-col items-start min-w-0">
                            <span className="font-bold text-brand text-sm whitespace-nowrap truncate w-full">{t.description}</span>
                            <div className="flex flex-col gap-0.5 mt-0.5">
                              {t.isRecurring && (
                                <span className="text-[8px] font-black text-accent uppercase tracking-tighter whitespace-nowrap">
                                  {t.interval === 'yearly' ? 'Jährlich' : 'Monatlich'}
                                </span>
                              )}
                              <div className="text-xs font-bold text-brand-muted uppercase tracking-tight whitespace-nowrap">
                                {categories.find(c => c.id === t.category)?.name ? `${categories.find(c => c.id === t.category)?.name} • ` : ''}
                                {safeFormatDate(t.date, 'dd.MM.yyyy', '')}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 min-w-[100px] shrink-0 text-right">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => handleEdit(t)}
                              className="p-1 text-brand-muted hover:text-brand hover:bg-brand/10 rounded-lg transition-all"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={(e) => {
                                showAdd && setShowAdd(false);
                                handleDelete(t.id);
                              }}
                              className="p-1 text-brand-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 justify-end w-full">
                            <span className={cn(
                              "font-black text-sm",
                              t.type === 'income' ? "text-green-500" : "text-red-500"
                            )}>
                              {t.type === 'income' ? '+' : '-'}
                            </span>
                            <span className="font-black text-sm whitespace-nowrap text-slate-900 dark:text-white">
                              {formatEuro(t.amount || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="p-8 pb-10 border-t border-slate-200/50 dark:border-white/10 shrink-0">
               <div className="flex justify-between items-center font-black text-brand">
                 <span>Gesamt</span>
                 <span className="text-right min-w-[100px] text-slate-900 dark:text-white">
                   {detailModal.type === 'income' 
                     ? formatEuro(income)
                     : formatEuro(expenses)
                   }
                 </span>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && deleteModal.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="glass-card w-full max-w-[480px] rounded-[2.5rem] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.12)]">
            <h3 className="text-2xl font-black text-red-500 mb-2 tracking-tight">Löschen?</h3>
            <p className="text-sm text-[#86868B] mb-8">Dieser Eintrag wird unwiderruflich entfernt.</p>
            <div className="flex flex-col gap-3">
              <button 
                type="button"
                onClick={handleConfirmDelete}
                className="btn-cancel w-full"
              >
                Löschen
              </button>
              <button 
                type="button"
                onClick={() => setDeleteModal(null)}
                className="glass-button-secondary w-full"
              >
                Behalten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
