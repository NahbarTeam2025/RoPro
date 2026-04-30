import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, updateDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { 
  Plus, Trash2, ArrowUpCircle, ArrowDownCircle, Wallet, 
  Search, Filter, TrendingUp, TrendingDown, PiggyBank,
  Check, X, Edit2, ChevronRight, PieChart as PieChartIcon,
  BarChart3
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isSameMonth, eachDayOfInterval, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { CategorySelect } from '../components/CategorySelect';
import { CategoryManager } from '../components/CategoryManager';
import { useCategories } from '../lib/categories';
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    const tDate = t.date?.toDate ? t.date.toDate() : new Date();
    return format(tDate, 'yyyy-MM') === filterMonth;
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
    const d = t.date?.toDate ? t.date.toDate() : new Date();
    return format(d, 'yyyy-MM');
  }));
  
  monthNamesSet.add(currentMonthStr);
  monthNamesSet.add(filterMonth);
  
  const availableMonths = Array.from(monthNamesSet).sort().reverse();

  // Groups recurring transactions to get unique "Abos"
  const recurringItems = transactions.filter(t => t.isRecurring && t.type === 'expense');
  
  // Group by description/amount to show unique subscriptions
  // Important: We sort by date desc first so we get the most recent instance if there are multiple
  const sortedRecurring = [...recurringItems].sort((a, b) => (b.date?.toDate?.()?.getTime() || 0) - (a.date?.toDate?.()?.getTime() || 0));
  const activeAbos = Array.from(new Map(sortedRecurring.map(item => [`${item.description}-${item.amount}`, item])).values());
  
  const monthlyRecurringSum = activeAbos
    .filter(a => a.interval === 'monthly' || !a.interval)
    .reduce((sum, a) => sum + a.amount, 0);
    
  const yearlyRecurringSum = activeAbos
    .filter(a => a.interval === 'yearly')
    .reduce((sum, a) => sum + a.amount, 0);
    
  const totalPerYearSum = (monthlyRecurringSum * 12) + yearlyRecurringSum;

  // Chart Data: Expense Category Distribution
  const expenseByCategory = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc: any[], t) => {
      const catName = categories.find(c => c.id === t.category)?.name || 'Sonstiges';
      const existing = acc.find(item => item.name === catName);
      if (existing) {
        existing.Betrag += t.amount;
      } else {
        acc.push({ name: catName, Betrag: t.amount });
      }
      return acc;
    }, [])
    .sort((a, b) => b.Betrag - a.Betrag);

  const COLORS = ['#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A', '#111827'];

  // Chart Data: Trend (Daily for current month)
  const currentMonthDate = new Date(`${filterMonth}-01`);
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonthDate),
    end: endOfMonth(currentMonthDate)
  });

  let cumulativeBilanz = 0;
  let cumulativeExpenses = 0;
  let cumulativeIncome = 0;
  const trendData = daysInMonth.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayTransactions = filteredTransactions.filter(t => {
      const d = t.date?.toDate ? t.date.toDate() : new Date();
      return format(d, 'yyyy-MM-dd') === dayStr;
    });

    const dIncome = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const dExpenses = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    cumulativeBilanz += (dIncome - dExpenses);
    cumulativeExpenses += dExpenses;
    cumulativeIncome += dIncome;

    return {
      name: format(day, 'd.'),
      Einnahmen: cumulativeIncome,
      Ausgaben: cumulativeExpenses,
      Bilanz: cumulativeBilanz
    };
  });

  return (
    <div className="max-w-5xl mx-auto flex flex-col relative z-10 w-full px-0 sm:px-0 pb-10">
      <header className="mb-10 flex flex-col sm:flex-row justify-end items-start sm:items-end gap-6">
        <div className="flex flex-wrap items-center sm:justify-end gap-3 w-full sm:w-auto">
          <select 
            value={filterMonth} 
            onChange={(e) => setFilterMonth(e.target.value)}
            className="glass-input h-12 w-full sm:w-48 appearance-none bg-white dark:bg-[#050505] font-bold text-sm tracking-tight px-4 text-center"
          >
            {availableMonths.map(m => (
              <option key={m} value={m}>{format(new Date(`${m}-01`), 'MMMM yyyy', { locale: de })}</option>
            ))}
          </select>
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
              "flex items-center gap-2 h-12 px-6 shrink-0 w-full sm:w-auto",
              editingId ? "btn-cancel" : "btn-briefing-glow"
            )}
          >
            <Plus size={20} />
            <span>{editingId ? 'Abbrechen' : 'Eintrag'}</span>
          </button>
        </div>
      </header>

      {showAdd && (
        <form onSubmit={handleSave} className="glass-card p-6 sm:p-8 rounded-[2.5rem] mb-10 animate-in fade-in slide-in-from-top-4 duration-300">
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
                className="glass-input h-12 font-black text-lg bg-accent/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-accent" required
              />
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Beschreibung</label>
              <input 
                type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="z.B. Miete"
                className="glass-input h-12 bg-accent/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-accent/50 font-bold" required
              />
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-xs font-black text-brand uppercase tracking-[0.2em] px-1">Datum</label>
              <input 
                type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="glass-input h-12 bg-brand/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-accent/50 font-bold" required
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
                  <select
                    value={interval}
                    onChange={(e) => setInterval(e.target.value as any)}
                    className="flex-1 h-12 bg-brand/10 border-none rounded-2xl px-2 text-xs font-black uppercase tracking-widest text-brand dark:text-white"
                  >
                    <option value="monthly" className="bg-[#1C1C1E]">Monatlich</option>
                    <option value="yearly" className="bg-[#1C1C1E]">Jährlich</option>
                  </select>
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
                <AreaChart data={trendData} accessibilityLayer>
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
                    <div key={abo.id} className="p-4 sm:p-6 flex items-center gap-4 sm:gap-5 hover:bg-slate-500/5 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-1">
                          <h4 className="font-bold text-slate-900 dark:text-white truncate">{abo.description}</h4>
                          <span className="text-xs sm:text-xs font-bold text-brand-muted uppercase tracking-wider italic">
                            {abo.date?.toDate ? format(abo.date.toDate(), 'dd.MM.yyyy', { locale: de }) : '--'}
                          </span>
                        </div>
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
                            {t.date?.toDate ? format(t.date.toDate(), 'dd.MM.yyyy', { locale: de }) : '--'}
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
                                {t.date?.toDate ? format(t.date.toDate(), 'dd.MM.yyyy') : ''}
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
