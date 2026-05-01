import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function Auth() {
  const { user, loginWithGoogle, loading, error } = useAuth();
  const navigate = useNavigate();

  const currentDomain = window.location.hostname;

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-transparent text-brand-muted font-medium">Lade...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative p-6 font-sans">
      <div className="fixed inset-0 z-0 bg-[#0a0a0a]">
        <img
          src="https://meine-assets.pages.dev/b1.webp"
          alt="Background"
          className="w-full h-full object-cover opacity-100"
        />
        {/* Overlay to ensure readability and glass effect works well */}
        <div className="absolute inset-0 bg-white/5 dark:bg-black/40 backdrop-blur-[2px]" />
      </div>
      
      <div className="w-full max-w-sm glass-card p-10 rounded-[2.5rem] text-center relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 flex items-center justify-center mx-auto mb-6 text-slate-900 dark:text-white dark:text-white">
          <Zap size={56} fill="currentColor" />
        </div>
        <h1 className="text-5xl font-black mb-3 tracking-tighter text-slate-900 dark:text-white">RoPro</h1>
        <p className="text-sm font-bold text-brand-muted mb-10 leading-relaxed uppercase tracking-widest px-4">The High-End Productivity OS</p>
        
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-500 font-bold leading-relaxed text-left">
            <div className="flex items-center gap-2 mb-2 font-black uppercase tracking-widest text-xs">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Status: Fehler
            </div>
            {error}
            <div className="mt-4 pt-4 border-t border-red-500/10 space-y-2 opacity-80">
              <p>Stellen Sie sicher, dass diese Domain in der Firebase Console unter <span className="font-mono text-xs bg-red-500/20 px-1 py-0.5 rounded">Authentication &gt; Settings &gt; Authorized Domains</span> hinzugefügt wurde:</p>
              <div className="font-mono text-xs bg-red-500/20 p-2 rounded break-all select-all">
                {currentDomain}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={loginWithGoogle}
          className="w-full py-4 px-6 glass-button-primary mb-8 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 font-bold"
        >
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="white"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="white" opacity="0.8"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="white" opacity="0.8"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="white" opacity="0.8"/>
          </svg>
          Google Login
        </button>

        <div className="pt-6 border-t border-slate-200/50 dark:border-white/10">
          <p className="text-xs text-brand-muted font-bold uppercase tracking-widest leading-loose">
            Probleme beim Login?<br />
            <a href="/" target="_blank" className="text-brand dark:text-white hover:underline decoration-2 underline-offset-4">App in neuem Tab öffnen</a>
          </p>
        </div>
      </div>
    </div>
  );
}
