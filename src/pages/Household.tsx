import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { 
  Plus, Trash2, ArrowUpCircle, ArrowDownCircle, Wallet, 
  Search, Filter, TrendingUp, TrendingDown, PiggyBank,
  Check, X, Edit2, ChevronRight, PieChart as PieChartIcon
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { CategorySelect } from '../components/CategorySelect';
import { CategoryManager } from '../components/CategoryManager';
import { useCategories } from '../lib/categories';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: any;
  userId: string;
}

export default function Household() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [showCatManager, setShowCatManager] = useState(false);
  const { categories } = useCategories('household');

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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !description.trim() || !amount) return;

    try {
      await addDoc(collection(db, 'transactions'), {
        description: description.trim(),
        amount: parseFloat(amount),
        type,
        category: categoryId,
        date: new Date(date),
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setDescription('');
      setAmount('');
      setCategoryId('');
      setShowAdd(false);
    } catch (error) {
      console.error("Error adding transaction:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Diese Transaktion wirklich löschen?')) {
      try {
        await deleteDoc(doc(db, 'transactions', id));
      } catch (error) {
        console.error("Error deleting transaction:", error);
      }
    }
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

  const availableMonths = Array.from(new Set(transactions.map(t => {
    const d = t.date?.toDate ? t.date.toDate() : new Date();
    return format(d, 'yyyy-MM');
  }))).sort().reverse();

  if (availableMonths.length === 0) {
    availableMonths.push(format(new Date(), 'yyyy-MM'));
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-full relative z-10 w-full pb-20">
      <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-brand">Haushaltsbuch</h1>
          <p className="mt-1 font-medium text-brand-muted">Behalte den Überblick über deine Finanzen.</p>
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
            onClick={() => setShowAdd(!showAdd)}
            className="glass-button-primary flex items-center gap-2 h-12 px-6 shrink-0 w-full sm:w-auto"
          >
            <Plus size={20} />
            <span>Eintrag</span>
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="glass-card p-8 rounded-[2rem] border-l-4 border-green-500">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-500/10 text-green-500 rounded-2xl">
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="text-sm font-bold text-brand-muted uppercase tracking-wider mb-1">Einnahmen</div>
          <div className="text-3xl font-black text-brand tracking-tighter">
            {income.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </div>
        </div>

        <div className="glass-card p-8 rounded-[2rem] border-l-4 border-red-500">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl">
              <TrendingDown size={24} />
            </div>
          </div>
          <div className="text-sm font-bold text-brand-muted uppercase tracking-wider mb-1">Ausgaben</div>
          <div className="text-3xl font-black text-brand tracking-tighter">
            {expenses.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </div>
        </div>

        <div className="glass-card p-8 rounded-[2rem] border-l-4 border-blue-500">
          <div className="flex justify-between items-start mb-4">
            <div className={cn(
              "p-3 rounded-2xl transition-colors",
              balance >= 0 ? "bg-blue-500/10 text-blue-500" : "bg-red-500/10 text-red-500"
            )}>
              <PiggyBank size={24} />
            </div>
          </div>
          <div className="text-sm font-bold text-brand-muted uppercase tracking-wider mb-1">Bilanz</div>
          <div className={cn(
            "text-3xl font-black tracking-tighter",
            balance >= 0 ? "text-brand" : "text-red-500"
          )}>
            {balance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </div>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="glass-card p-8 rounded-[2.5rem] mb-10 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest px-1">Typ</label>
              <div className="flex gap-2 p-1 bg-slate-500/10 rounded-2xl h-12">
                <button 
                  type="button"
                  onClick={() => setType('expense')}
                  className={cn(
                    "flex-1 rounded-xl font-bold text-xs transition-all",
                    type === 'expense' ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "text-brand-muted hover:text-brand"
                  )}
                >
                  Ausgabe
                </button>
                <button 
                  type="button"
                  onClick={() => setType('income')}
                  className={cn(
                    "flex-1 rounded-xl font-bold text-xs transition-all",
                    type === 'income' ? "bg-green-500 text-white shadow-lg shadow-green-500/20" : "text-brand-muted hover:text-brand"
                  )}
                >
                  Einnahme
                </button>
              </div>
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest px-1">Betrag (€)</label>
              <input 
                type="number" step="0.01" 
                value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="glass-input h-12" required
              />
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest px-1">Beschreibung</label>
              <input 
                type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="z.B. Miete"
                className="glass-input h-12" required
              />
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest px-1">Kategorie</label>
              <CategorySelect type="household" value={categoryId} onChange={setCategoryId} className="h-12 border-none" />
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest px-1">Datum</label>
              <input 
                type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="glass-input h-12" required
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-200/50 dark:border-white/10">
            <button type="button" onClick={() => setShowAdd(false)} className="px-6 h-12 glass-button-secondary font-bold">
              Abbrechen
            </button>
            <button type="submit" className="px-10 h-12 glass-button-primary font-bold">
              Speichern
            </button>
          </div>
        </form>
      )}

      {/* Transaction List */}
      <div className="glass-card rounded-[2.5rem] overflow-hidden flex flex-col flex-1 min-h-[500px]">
        <div className="p-8 border-b border-slate-200/50 dark:border-white/10 flex justify-between items-center bg-[#FBFBFD]/50 dark:bg-[#1C1C1E]/50">
          <h2 className="font-extrabold text-brand text-xl tracking-tight">Transaktionen</h2>
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
                  <div key={t.id} className="p-6 flex items-center gap-5 hover:bg-slate-500/5 transition-colors group">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                      t.type === 'income' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {t.type === 'income' ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
                    </div>
                    
                    <div className="flex-1 min-w-0 pr-10">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-brand truncate">{t.description}</h4>
                        <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest bg-slate-200/50 dark:bg-black/20 px-2 py-0.5 rounded-lg border border-slate-200/30 dark:border-white/5">
                          {catName}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-brand-muted uppercase tracking-tighter">
                        {t.date?.toDate ? format(t.date.toDate(), 'd. MMMM yyyy', { locale: de }) : '--'}
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-4">
                      <div className={cn(
                        "text-lg font-black tracking-tighter",
                        t.type === 'income' ? "text-green-500" : "text-brand"
                      )}>
                        {t.type === 'income' ? '+' : '-'} {t.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </div>
                      <button 
                        onClick={() => handleDelete(t.id)}
                        className="p-2.5 text-brand-muted hover:text-red-500 hover:bg-red-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showCatManager && <CategoryManager type="household" onClose={() => setShowCatManager(false)} />}
    </div>
  );
}
