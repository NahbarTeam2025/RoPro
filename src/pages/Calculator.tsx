import React, { useState } from 'react';
import { Delete } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Calculator() {
  const [currentValue, setCurrentValue] = useState('0');
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const [operation, setOperation] = useState<string | null>(null);

  const handleNum = (num: string) => {
    if (currentValue === '0' && num !== '.') {
      setCurrentValue(num);
    } else if (num === '.' && currentValue.includes('.')) {
      return;
    } else {
      setCurrentValue(currentValue + num);
    }
  };

  const handleOp = (op: string) => {
    if (operation && previousValue) {
      handleEqual();
    }
    setOperation(op);
    setPreviousValue(currentValue);
    setCurrentValue('0');
  };

  const handleEqual = () => {
    if (!operation || !previousValue) return;
    const prev = parseFloat(previousValue);
    const current = parseFloat(currentValue);
    let result = 0;
    switch (operation) {
      case '+': result = prev + current; break;
      case '-': result = prev - current; break;
      case '×': result = prev * current; break;
      case '÷': result = prev / current; break;
    }
    // limit decimal
    setCurrentValue(String(Math.round(result * 100000000) / 100000000));
    setOperation(null);
    setPreviousValue(null);
  };

  const clear = () => {
    setCurrentValue('0');
    setPreviousValue(null);
    setOperation(null);
  };

  const del = () => {
    if (currentValue.length > 1) {
      setCurrentValue(currentValue.slice(0, -1));
    } else {
      setCurrentValue('0');
    }
  };

  const toggleSign = () => {
    setCurrentValue(String(parseFloat(currentValue) * -1));
  };

  const percentage = () => {
    setCurrentValue(String(parseFloat(currentValue) / 100));
  };

  return (
    <div className="max-w-md mx-auto pt-4 sm:pt-10">
      <div className="glass-panel p-6 rounded-[32px] flex flex-col gap-6 shadow-2xl">
        <div className="h-24 flex flex-col items-end justify-end p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
          <div className="h-6 text-sm text-brand-muted flex items-center justify-end font-medium">
            {previousValue} {operation}
          </div>
          <motion.div 
            key={currentValue}
            initial={{ opacity: 0.5, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-light tracking-tight text-[#1D1D1F] dark:text-white truncate w-full text-right"
          >
            {currentValue}
          </motion.div>
        </div>

        <div className="grid grid-cols-4 gap-3 sm:gap-4">
          <Button onClick={clear} className="bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold">AC</Button>
          <Button onClick={toggleSign} className="bg-black/5 dark:bg-white/5 text-[#1D1D1F] dark:text-white hover:bg-black/10 dark:hover:bg-white/10 font-bold font-mono">+/-</Button>
          <Button onClick={percentage} className="bg-black/5 dark:bg-white/5 text-[#1D1D1F] dark:text-white hover:bg-black/10 dark:hover:bg-white/10 font-bold font-mono">%</Button>
          <Button onClick={() => handleOp('÷')} active={operation === '÷'} className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 font-bold text-xl">÷</Button>

          <Button onClick={() => handleNum('7')}>7</Button>
          <Button onClick={() => handleNum('8')}>8</Button>
          <Button onClick={() => handleNum('9')}>9</Button>
          <Button onClick={() => handleOp('×')} active={operation === '×'} className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 font-bold text-xl">×</Button>

          <Button onClick={() => handleNum('4')}>4</Button>
          <Button onClick={() => handleNum('5')}>5</Button>
          <Button onClick={() => handleNum('6')}>6</Button>
          <Button onClick={() => handleOp('-')} active={operation === '-'} className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 font-bold text-xl">-</Button>

          <Button onClick={() => handleNum('1')}>1</Button>
          <Button onClick={() => handleNum('2')}>2</Button>
          <Button onClick={() => handleNum('3')}>3</Button>
          <Button onClick={() => handleOp('+')} active={operation === '+'} className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 font-bold text-xl">+</Button>

          <Button onClick={() => handleNum('0')} className="col-span-2">0</Button>
          <Button onClick={() => handleNum('.')}>.</Button>
          <Button onClick={handleEqual} className="bg-blue-500 text-white hover:bg-blue-600 font-bold shadow-lg shadow-blue-500/20 text-xl">=</Button>
        </div>
      </div>
    </div>
  );
}

function Button({ children, onClick, className, active }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-14 sm:h-16 rounded-2xl flex items-center justify-center text-xl transition-all active:scale-95 group relative overflow-hidden",
        !className?.includes('bg-') && "bg-white/40 dark:bg-[#1C1C1E]/50 text-[#1D1D1F] dark:text-white hover:bg-white/60 dark:hover:bg-[#1C1C1E]/80 shadow-sm border border-black/5 dark:border-white/5 font-medium",
        active && "ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-black scale-95",
        className
      )}
    >
      {children}
    </button>
  );
}
