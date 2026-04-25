import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
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
      
      // Use setDoc with merge to create or update
      await setDoc(doc(db, 'savings', user.uid), {
        userId: user.uid,
        amount: newAmount,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setSavingsInput('');
    } catch (error) {
      console.error("Error updating savings:", error);
    } finally {
      setIsUpdatingSavings(false);
    }
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
        await updateDoc(doc(db, 'transactions', editingId), transactionData);
      } else {
        await addDoc(collection(db, 'transactions'), {
          ...transactionData,
          createdAt: serverTimestamp()
        });
      }
      
      resetForm();
      setShowAdd(false);
    } catch (error) {
      console.error("Error saving transaction:", error);
      alert('Fehler beim Speichern. Bitte versuche es erneut.');
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
    try {
      await deleteDoc(doc(db, 'transactions', deleteModal.id));
      setDeleteModal(null);
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert('Fehler beim Löschen der Transaktion');
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

  const trendData = daysInMonth.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayTransactions = filteredTransactions.filter(t => {
      const d = t.date?.toDate ? t.date.toDate() : new Date();
      return format(d, 'yyyy-MM-dd') === dayStr;
    });

    const dIncome = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const dExpenses = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    return {
      name: format(day, 'd.'),
      Einnahmen: dIncome,
      Ausgaben: dExpenses,
      Bilanz: dIncome - dExpenses
    };
  });

  return (
    <div className="max-w-5xl mx-auto flex flex-col relative z-10 w-full pb-10">
      <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-brand uppercase">Haushaltsbuch</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <select 
            value={filterMonth} 
            onChange={(e) => setFilterMonth(e.target.value)}
            className="glass-input h-12 w-full sm:w-48 appearance-none bg-white dark:bg-[#050505] font-bold text-sm tracking-tight px-4"
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
            className="glass-button-primary flex items-center gap-2 h-12 px-6 shrink-0 w-full sm:w-auto"
          >
            <Plus size={20} />
            <span>{editingId ? 'Abbrechen' : 'Eintrag'}</span>
          </button>
        </div>
      </header>

      {showAdd && (
        <form onSubmit={handleSave} className="glass-card p-6 sm:p-8 rounded-[2.5rem] mb-10 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-[10px] font-black text-brand uppercase tracking-[0.2em] px-1">Typ</label>
              <div className="flex gap-2 p-1.5 bg-brand/[0.03] dark:bg-white/[0.03] rounded-2xl h-12">
                <button 
                  type="button"
                  onClick={() => setType('expense')}
                  className={cn(
                    "flex-1 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all",
                    type === 'expense' ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "text-brand-muted hover:text-brand"
                  )}
                >
                  Ausgabe
                </button>
                <button 
                  type="button"
                  onClick={() => setType('income')}
                  className={cn(
                    "flex-1 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all",
                    type === 'income' ? "bg-green-500 text-white shadow-lg shadow-green-500/20" : "text-brand-muted hover:text-brand"
                  )}
                >
                  Einnahme
                </button>
              </div>
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-[10px] font-black text-brand uppercase tracking-[0.2em] px-1">Betrag (€)</label>
              <input 
                type="number" step="0.01" 
                value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="glass-input h-12 font-black text-lg bg-brand/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-brand" required
              />
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-[10px] font-black text-brand uppercase tracking-[0.2em] px-1">Beschreibung</label>
              <input 
                type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="z.B. Miete"
                className="glass-input h-12 bg-brand/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-brand font-bold" required
              />
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-[10px] font-black text-brand uppercase tracking-[0.2em] px-1">Kategorie</label>
              <div className="h-12 flex items-center bg-brand/[0.03] dark:bg-white/[0.03] rounded-2xl px-4">
                <CategorySelect type="household" value={categoryId} onChange={setCategoryId} className="w-full border-none bg-transparent" />
              </div>
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-[10px] font-black text-brand uppercase tracking-[0.2em] px-1">Datum</label>
              <input 
                type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="glass-input h-12 bg-brand/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-brand font-bold" required
              />
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-[10px] font-black text-brand uppercase tracking-[0.2em] px-1 mb-1">Wiederholen</label>
              <div className="flex gap-2 h-12">
                <button
                  type="button"
                  onClick={() => setIsRecurring(!isRecurring)}
                  className={cn(
                    "flex-1 h-12 rounded-2xl border flex items-center justify-center gap-2 transition-all font-black text-[9px] uppercase tracking-widest",
                    isRecurring ? "bg-blue-500/20 border-blue-500/50 text-blue-400" : "bg-brand/[0.03] dark:bg-white/[0.03] border-transparent text-brand-muted"
                  )}
                >
                  {isRecurring ? <Check size={14} strokeWidth={3} /> : null}
                  <span>Ja</span>
                </button>
                {isRecurring && (
                  <select
                    value={interval}
                    onChange={(e) => setInterval(e.target.value as any)}
                    className="flex-1 h-12 bg-blue-500/10 border-none rounded-2xl px-2 text-[9px] font-black uppercase tracking-widest text-blue-400"
                  >
                    <option value="monthly" className="bg-[#1C1C1E]">Monatlich</option>
                    <option value="yearly" className="bg-[#1C1C1E]">Jährlich</option>
                  </select>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8 pt-6 border-t border-slate-200/50 dark:border-white/10">
            <button type="submit" className="px-10 h-14 bg-brand text-white rounded-[1.25rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-brand/20 active:scale-95 transition-all group">
              {editingId ? 'Aktualisieren' : 'Eintrag speichern'}
            </button>
            <button type="button" onClick={() => { setShowAdd(false); resetForm(); }} className="px-8 h-14 glass-button-secondary font-black uppercase tracking-[0.2em] text-xs active:scale-95 transition-all">
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <div 
          onClick={() => setDetailModal({ open: true, type: 'income' })}
          className="glass-card p-4 rounded-2xl border border-white/[0.06] flex items-center gap-3 cursor-pointer hover:bg-green-500/5 transition-colors"
        >
          <div className="p-2 bg-green-500/10 text-green-500 rounded-lg shrink-0">
            <TrendingUp size={18} />
          </div>
          <div>
            <div className="text-[9px] font-bold text-brand-muted uppercase tracking-widest mb-0.5">Einnahmen</div>
            <div className="text-lg font-black text-brand tracking-tight">
              {income.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </div>
          </div>
        </div>

        <div 
          onClick={() => setDetailModal({ open: true, type: 'expense' })}
          className="glass-card p-4 rounded-2xl border border-white/[0.06] flex items-center gap-3 cursor-pointer hover:bg-red-500/5 transition-colors"
        >
          <div className="p-2 bg-red-500/10 text-red-500 rounded-lg shrink-0">
            <TrendingDown size={18} />
          </div>
          <div>
            <div className="text-[9px] font-bold text-brand-muted uppercase tracking-widest mb-0.5">Ausgaben</div>
            <div className="text-lg font-black text-brand tracking-tight">
              {expenses.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </div>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-white/[0.06] flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg transition-colors shrink-0",
            balance >= 0 ? "bg-blue-500/10 text-blue-500" : "bg-red-500/10 text-red-500"
          )}>
            <PiggyBank size={18} />
          </div>
          <div>
            <div className="text-[9px] font-bold text-brand-muted uppercase tracking-widest mb-0.5">Bilanz</div>
            <div className={cn(
              "text-lg font-black tracking-tight",
              balance >= 0 ? "text-brand" : "text-red-500"
              )}>
              {balance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </div>
          </div>
        </div>

        {/* Savings Tile */}
        <div className="glass-card p-4 rounded-2xl border border-white/[0.06] flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg shrink-0">
              <PiggyBank size={18} />
            </div>
            <div className="flex-1">
              <div className="text-[9px] font-bold text-brand-muted uppercase tracking-widest mb-0.5">Gespartes Geld</div>
              <div className="text-lg font-black text-brand tracking-tight">
                {savings?.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) || '0,00 €'}
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
              className="glass-input h-8 text-[10px] w-full px-2"
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
        <div className="glass-card p-6 rounded-[2rem] lg:col-span-2 border border-white/[0.06] overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-brand uppercase tracking-widest flex items-center gap-2">
              <BarChart3 size={14} /> Trend {format(currentMonthDate, 'MMMM', { locale: de })}
            </h3>
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[8px] font-bold text-brand-muted uppercase">Bilanz</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500/40" />
                  <span className="text-[8px] font-bold text-brand-muted uppercase">Ausgaben</span>
               </div>
            </div>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
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
                    backgroundColor: 'rgba(5,5,5,0.9)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    fontSize: '10px'
                  }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="Bilanz" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorBalance)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="Ausgaben" 
                  stroke="#EF4444" 
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  fill="transparent"
                  fillOpacity={0} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution Chart */}
        <div className="glass-card p-6 rounded-[2rem] border border-white/[0.06] flex flex-col">
          <h3 className="text-[10px] font-black text-brand uppercase tracking-widest flex items-center gap-2 mb-4">
            <PieChartIcon size={14} /> Kategorien
          </h3>
          <div className="flex-1 flex flex-col sm:flex-row lg:flex-col items-center gap-6">
            <div className="h-[140px] w-full max-w-[140px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={5}
                    dataKey="Betrag"
                  >
                    {expenseByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(5,5,5,0.9)', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      fontSize: '10px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-[8px] font-bold text-brand-muted uppercase">Total</span>
                 <span className="text-xs font-black text-brand tracking-tighter">
                   {expenses.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                 </span>
              </div>
            </div>
            
            <div className="flex-1 w-full space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-2">
              {expenseByCategory.map((cat, index) => (
                <div key={cat.name} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-[10px] font-bold text-brand-muted truncate max-w-[80px]">{cat.name}</span>
                  </div>
                  <span className="text-[10px] font-black text-brand">{Math.round((cat.Betrag / expenses) * 100)}%</span>
                </div>
              ))}
              {expenseByCategory.length === 0 && (
                <p className="text-[10px] text-center text-brand-muted font-bold py-6">Keine Ausgaben vorhanden.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction List / Abos View */}
      <div className="glass-card rounded-[2.5rem] overflow-hidden flex flex-col flex-1 min-h-[500px]">
        <div className="p-8 border-b border-slate-200/50 dark:border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#FBFBFD]/50 dark:bg-[#1C1C1E]/50 gap-4">
          <div className="flex bg-slate-500/10 p-1 rounded-2xl w-full sm:w-auto">
            <button
              onClick={() => setActiveView('transactions')}
              className={cn(
                "flex-1 sm:px-6 py-2 rounded-xl text-xs font-bold transition-all",
                activeView === 'transactions' ? "bg-white dark:bg-brand text-brand dark:text-white shadow-sm" : "text-brand-muted hover:text-brand"
              )}
            >
              Transaktionen
            </button>
            <button
              onClick={() => setActiveView('abos')}
              className={cn(
                "flex-1 sm:px-6 py-2 rounded-xl text-xs font-bold transition-all",
                activeView === 'abos' ? "bg-white dark:bg-brand text-brand dark:text-white shadow-sm" : "text-brand-muted hover:text-brand"
              )}
            >
              Abos
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowCatManager(true)}
              className="p-2.5 text-brand-muted hover:text-blue-500 hover:bg-blue-500/10 rounded-2xl transition-all"
              title="Kategorien verwalten"
            >
              <Filter size={20} />
            </button>
          </div>
        </div>

        {activeView === 'abos' ? (
          <div className="flex-1 flex flex-col">
            {/* Abo Summary Cards */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-200/50 dark:border-white/10 bg-slate-500/5">
              <div className="p-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-200/30 dark:border-white/5">
                <div className="text-[9px] font-bold text-brand-muted uppercase tracking-widest mb-1">Monatlich gesamt</div>
                <div className="text-xl font-black text-brand tracking-tight">
                  {monthlyRecurringSum.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-200/30 dark:border-white/5">
                <div className="text-[9px] font-bold text-brand-muted uppercase tracking-widest mb-1">Jährl. Abos</div>
                <div className="text-xl font-black text-brand tracking-tight">
                  {yearlyRecurringSum.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                <div className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-1">Pro Jahr total</div>
                <div className="text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                  {totalPerYearSum.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {activeAbos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-brand-muted space-y-4">
                  <div className="w-16 h-16 bg-blue-500/5 rounded-[2rem] flex items-center justify-center opacity-40">
                    <PieChartIcon size={40} strokeWidth={1} />
                  </div>
                  <p className="font-bold tracking-tight">Keine Abonnements gefunden.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200/50 dark:divide-white/5">
                  {activeAbos.map(abo => (
                    <div key={abo.id} className="p-4 sm:p-6 flex items-center gap-4 sm:gap-5 hover:bg-slate-500/5 transition-colors">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm bg-blue-500/10 text-blue-500">
                        <PieChartIcon size={20} className="sm:w-6 sm:h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                          <h4 className="font-bold text-brand">{abo.description}</h4>
                          <span className="text-[9px] font-black bg-blue-600/15 text-brand px-1.5 py-0.5 rounded-lg uppercase tracking-tighter shrink-0 border border-blue-500/10">
                            {abo.interval === 'yearly' ? 'Jährlich' : 'Monatlich'}
                          </span>
                        </div>
                        <div className="text-[9px] sm:text-[10px] font-bold text-brand-muted uppercase tracking-wider flex items-center gap-1">
                          {categories.find(c => c.id === abo.category)?.name && (
                            <span className="mr-1">{categories.find(c => c.id === abo.category)?.name}</span>
                          )}
                          {abo.date?.toDate && (
                            <span>Zuletzt: {format(abo.date.toDate(), 'dd.MM.yyyy', { locale: de })}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base sm:text-lg font-black tracking-tighter text-brand">
                          {abo.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </div>
                        <div className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">
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
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-brand-muted space-y-4">
                <div className="w-16 h-16 bg-blue-500/5 rounded-[2rem] flex items-center justify-center opacity-40">
                  <Wallet size={40} strokeWidth={1} />
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
                        "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                        t.type === 'income' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                      )}>
                        {t.type === 'income' ? <ArrowUpCircle size={20} className="sm:w-6 sm:h-6" /> : <ArrowDownCircle size={20} className="sm:w-6 sm:h-6" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                          <h4 className="font-bold text-brand">{t.description}</h4>
                          {t.isRecurring && (
                            <span className="text-[9px] font-black bg-blue-600/15 text-brand px-1.5 py-0.5 rounded-lg uppercase tracking-tighter shrink-0 border border-blue-500/10">
                              {t.interval === 'yearly' ? 'Jährlich' : 'Monatlich'}
                            </span>
                          )}
                          {categories.find(c => c.id === t.category)?.name && (
                            <span className="text-[9px] sm:text-[10px] font-black text-brand-muted uppercase tracking-widest bg-slate-200/50 dark:bg-black/20 px-2 py-0.5 rounded-lg border border-slate-200/30 dark:border-white/5 shrink-0">
                              {categories.find(c => c.id === t.category)?.name}
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] sm:text-[10px] font-bold text-brand-muted uppercase tracking-wider flex items-center gap-1">
                          <span className="shrink-0">{t.date?.toDate ? format(t.date.toDate(), 'dd.MM.yyyy', { locale: de }) : '--'}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 min-w-[100px] shrink-0">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => handleEdit(t)}
                            className="p-1 text-brand-muted hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
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
                        <div className={cn(
                          "text-base sm:text-lg font-black tracking-tighter whitespace-nowrap",
                          t.type === 'income' ? "text-green-500" : "text-brand"
                        )}>
                          {t.type === 'income' ? '+' : '-'} {t.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-md">
          <div className="glass-card w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-200/50 dark:border-white/10 flex justify-between items-center bg-[#FBFBFD]/50 dark:bg-[#1C1C1E]/50">
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
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
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
                      <div key={t.id} className="p-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-200/30 dark:border-white/5 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                            t.type === 'income' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                          )}>
                            {t.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-brand text-sm">{t.description}</span>
                              {t.isRecurring && (
                                <span className="text-[8px] font-black bg-blue-600/15 text-brand px-1.5 py-0.5 rounded uppercase tracking-tighter border border-blue-500/10">
                                  {t.interval === 'yearly' ? 'Jährlich' : 'Monatlich'}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-bold text-brand-muted uppercase tracking-tight">
                              {categories.find(c => c.id === t.category)?.name ? `${categories.find(c => c.id === t.category)?.name} • ` : ''}
                              {t.date?.toDate ? format(t.date.toDate(), 'dd.MM.yyyy') : ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 min-w-[80px] shrink-0">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => handleEdit(t)}
                              className="p-1 text-brand-muted hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
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
                          <span className={cn(
                            "font-black text-sm whitespace-nowrap",
                            t.type === 'income' ? "text-green-500" : "text-brand"
                          )}>
                            {t.type === 'income' ? '+' : '-'} {t.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
            
            <div className="p-8 border-t border-slate-200/50 dark:border-white/10 bg-[#FBFBFD]/50 dark:bg-[#1C1C1E]/50">
               <div className="flex justify-between items-center font-black text-brand">
                 <span>Gesamt {detailModal.type === 'income' ? 'Einnahmen' : 'Ausgaben'}</span>
                 <span className={detailModal.type === 'income' ? "text-green-500" : ""}>
                   {detailModal.type === 'income' 
                     ? income.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
                     : expenses.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
                   }
                 </span>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && deleteModal.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/10 backdrop-blur-md">
          <div className="glass-card w-full max-w-sm rounded-[2.5rem] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.12)]">
            <h3 className="text-2xl font-black text-red-500 mb-2 tracking-tight">Löschen?</h3>
            <p className="text-sm text-[#86868B] mb-8">Dieser Eintrag wird unwiderruflich entfernt.</p>
            <div className="flex flex-col gap-3">
              <button 
                type="button"
                onClick={handleConfirmDelete}
                className="w-full h-12 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all"
              >
                Löschen
              </button>
              <button 
                type="button"
                onClick={() => setDeleteModal(null)}
                className="w-full h-12 bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-bold rounded-2xl hover:bg-[#E8E8ED] dark:hover:bg-[#3A3A3C] transition-all"
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
