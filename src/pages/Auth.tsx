import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Zap } from 'lucide-react';

export default function Auth() {
  const { loginWithGoogle, loading, error } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-transparent text-brand-muted font-medium">Lade...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative p-6 font-sans">
      <div className="absolute inset-0 z-0 bg-slate-50 dark:bg-[#000000] transition-colors duration-500 ease-out">
        {/* Decorative background elements */}
        <div className="absolute top-1/4 left-1/4 w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-[120px] opacity-50 dark:opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[40%] h-[40%] bg-green-500/10 dark:bg-green-600/10 rounded-full blur-[120px] opacity-50 dark:opacity-20 animate-pulse delay-1000"></div>
      </div>
      
      <div className="w-full max-w-sm glass-card p-8 rounded-3xl text-center relative z-10">
        <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Zap size={36} className="text-black fill-black" />
        </div>
        <h1 className="text-4xl font-black mb-2 tracking-tight text-brand">RoPro</h1>
        <p className="text-sm font-medium text-brand-muted mb-8 leading-relaxed">Melde dich an, um deine Aufgaben, Notizen, Kalender und Links an einem Ort zu organisieren.</p>
        
        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 font-medium">
            {error}
          </div>
        )}

        <button
          onClick={loginWithGoogle}
          className="w-full py-3.5 px-4 glass-button-secondary mb-6 hover:-translate-y-0.5 transition-transform"
        >
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Mit Google fortfahren
        </button>

        <p className="text-[11px] text-brand-muted font-medium">
          Probleme beim Login? <br />
          <a href="/" target="_blank" className="text-blue-500 hover:underline">App in neuem Tab öffnen</a>
        </p>
      </div>
    </div>
  );
}
