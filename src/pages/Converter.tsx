import React, { useState, useEffect, useRef } from 'react';
import { ArrowUpDown, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { CustomSelect } from '../components/CustomSelect';

const CATEGORIES = {
  length: { name: 'Länge', units: { km: 1000, m: 1, cm: 0.01, mm: 0.001, Meilen: 1609.34, Fuß: 0.3048, Zoll: 0.0254 } },
  weight: { name: 'Gewicht', units: { kg: 1000, g: 1, Pfund: 453.592, Unzen: 28.3495 } },
  temperature: { name: 'Temperatur', units: { Celsius: 'C', Fahrenheit: 'F', Kelvin: 'K' } },
  area: { name: 'Fläche', units: { 'm²': 1, 'km²': 1000000, Hektar: 10000, Acres: 4046.86 } },
  currency: { name: 'Währung', units: { EUR: 1, USD: 1.09, GBP: 0.85, CHF: 0.95, JPY: 161.4 } }
};

export default function Converter() {
  const [activeCategory, setActiveCategory] = useState<keyof typeof CATEGORIES>('length');
  const [fromUnit, setFromUnit] = useState('');
  const [toUnit, setToUnit] = useState('');
  const [fromValue, setFromValue] = useState('');
  const [toValue, setToValue] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const units = Object.keys(CATEGORIES[activeCategory].units);
    setFromUnit(units[0]);
    setToUnit(units[1]);
    setFromValue('');
    setToValue('');
  }, [activeCategory]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === 'left' ? -150 : 150, behavior: 'smooth' });
    }
  };

  const calculate = (val: string, from: string, to: string, isReverse = false) => {
    const cleanVal = val.replace(',', '.');
    if (!cleanVal || isNaN(Number(cleanVal))) return '';
    const num = parseFloat(cleanVal);
    
    if (activeCategory === 'temperature') {
      let c = 0;
      // to celsius first
      if (from === 'Celsius') c = num;
      else if (from === 'Fahrenheit') c = (num - 32) * 5/9;
      else if (from === 'Kelvin') c = num - 273.15;
      
      // then to target
      if (to === 'Celsius') return c.toFixed(2);
      if (to === 'Fahrenheit') return ((c * 9/5) + 32).toFixed(2);
      if (to === 'Kelvin') return (c + 273.15).toFixed(2);
    }
    
    const factorFrom = (CATEGORIES[activeCategory].units as any)[from];
    const factorTo = (CATEGORIES[activeCategory].units as any)[to];
    
    // Convert logic (base unit scale)
    // If it's currency, divide logic is reversed (Base EUR = 1, USD = 1.09 => 1 EUR = 1.09 USD)
    let res = 0;
    if (activeCategory === 'currency') {
      // Base EUR.
      // EUR -> USD : x * 1.09
      // USD -> EUR : x / 1.09
      const asEur = num / factorFrom;
      res = asEur * factorTo;
    } else {
      // Base unit logic e.g. length: m = 1, km = 1000
      // km -> m: x * 1000
      const asBase = num * factorFrom;
      res = asBase / factorTo;
    }
    
    return res === Math.floor(res) ? res.toString() : parseFloat(res.toFixed(6)).toString();
  };

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFromValue(e.target.value);
    setToValue(calculate(e.target.value, fromUnit, toUnit));
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToValue(e.target.value);
    setFromValue(calculate(e.target.value, toUnit, fromUnit, true));
  };

  const handleSwap = () => {
    setIsSwapping(true);
    setTimeout(() => setIsSwapping(false), 300);
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    setFromValue(toValue);
    setToValue(fromValue);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Umrechner</h1>
          <p className="text-sm text-brand-muted mt-1">Konvertiere Werte zwischen verschiedenen Einheiten.</p>
        </div>
      </div>

      <div className="mb-6 relative z-30">
        <CustomSelect
          value={activeCategory}
          onChange={(val) => setActiveCategory(val as any)}
          options={Object.entries(CATEGORIES).map(([key, cat]) => ({ value: key, label: cat.name }))}
        />
      </div>

      <div className="glass-panel p-6 rounded-[32px] sm:flex sm:items-center sm:gap-6 relative">
        <div className="flex-1 space-y-2">
          <label className="text-xs font-bold text-brand-muted uppercase tracking-wider ml-1">Von</label>
          <div className="flex gap-2">
            <input 
              type="text"
              inputMode="decimal"
              value={fromValue}
              onChange={handleFromChange}
              placeholder="0"
              className="glass-input flex-1 font-mono text-lg font-medium"
            />
            <div className="w-32 shrink-0 relative z-20">
              <CustomSelect 
                value={fromUnit}
                onChange={val => {
                  setFromUnit(val);
                  setToValue(calculate(fromValue, val, toUnit));
                }}
                options={Object.keys(CATEGORIES[activeCategory].units).map(u => ({ value: u, label: u }))}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-center my-6 sm:my-0 sm:-mx-2 z-10 shrink-0">
          <button 
            onClick={handleSwap}
            className="w-11 h-11 rounded-full bg-brand/10 text-brand hover:bg-brand/20 flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2"
            title="Tauschen"
          >
            <ArrowUpDown size={20} className={cn("transition-transform duration-300", isSwapping && "rotate-180")} />
          </button>
        </div>

        <div className="flex-1 space-y-2">
          <label className="text-xs font-bold text-brand-muted uppercase tracking-wider ml-1">Nach</label>
          <div className="flex gap-2">
            <input 
              type="text"
              inputMode="decimal"
              value={toValue}
              onChange={handleToChange}
              placeholder="0"
              className="glass-input flex-1 font-mono text-lg font-medium"
            />
            <div className="w-32 shrink-0 relative z-10">
              <CustomSelect 
                value={toUnit}
                onChange={val => {
                  setToUnit(val);
                  setToValue(calculate(fromValue, fromUnit, val));
                }}
                options={Object.keys(CATEGORIES[activeCategory].units).map(u => ({ value: u, label: u }))}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
