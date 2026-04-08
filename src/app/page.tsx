'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Session as AuthSession } from '@supabase/supabase-js';
import Dashboard from '@/components/Dashboard';
import Session from '@/components/Session';
import LibraryBrowser from '@/components/LibraryBrowser';
import CardCreator from '@/components/CardCreator';
import WordGraph from '@/components/WordGraph';
import { Button } from '@/components/ui/core';
import { Maximize2 } from 'lucide-react';

export default function Home() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [view, setView] = useState<'dashboard' | 'session' | 'library' | 'creator' | 'graph'>('dashboard');
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage('Initializing sequence...');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });
    
    if (error) setAuthMessage(error.message);
    else setAuthMessage('Verification link sent. Check email.');
  };

  const handleSignOut = () => {
    supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest animate-pulse">Initializing Petra...</p>
      </div>
    );
  }

  if (!authSession) {
    return (
      <main className="min-h-screen bg-primary text-text-primary font-sans flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 bg-text-primary flex items-center justify-center font-bold text-primary text-3xl mb-12 rounded">P</div>
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight">Access Petra</h1>
            <p className="text-sm text-text-muted font-mono uppercase tracking-widest">Cognitive Synchronization</p>
          </div>
          <input
            type="email"
            placeholder="ENTER EMAIL"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-14 bg-surface border border-text-muted/20 text-text-primary px-4 font-mono text-center focus:border-brand-gold focus:outline-none transition-colors rounded-none"
            required
          />
          <Button type="submit" className="w-full h-14 font-bold bg-text-primary text-primary hover:bg-brand-gold hover:text-white transition-colors">
            SECURE LOGIN
          </Button>
          {authMessage && (
            <p className="text-xs text-center font-mono text-warning uppercase tracking-widest">{authMessage}</p>
          )}
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-primary text-text-primary font-sans selection:bg-brand-gold selection:text-primary">
      {/* Navigation - Minimal and Functional */}
      <nav className="fixed top-0 left-0 w-full h-16 border-b border-text-muted/10 bg-primary/80 backdrop-blur-md z-40 px-4 md:px-8 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-text-primary rounded flex items-center justify-center font-bold text-primary text-xl pointer-events-auto cursor-pointer" onClick={() => setView('dashboard')}>P</div>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted hidden sm:inline-block">Petra v3.0</span>
        </div>
        <div className="pointer-events-auto">
           <button onClick={handleSignOut} className="font-mono text-[10px] uppercase tracking-widest text-text-muted hover:text-text-primary transition-colors">Sign Out</button>
        </div>
      </nav>


      <div className="pt-20 pb-12">
        {view === 'dashboard' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Dashboard 
              onStartSession={() => setView('session')} 
              onOpenLibrary={() => setView('library')} 
              onOpenCreator={() => setView('creator')}
              onOpenGraph={() => setView('graph')}
              selectedLibraryIds={selectedLibraryIds}
              onClearLibraries={() => setSelectedLibraryIds([])}
            />
          </div>
        ) : view === 'library' ? (
          <div className="animate-in fade-in slide-in-from-right-4 duration-700 max-w-4xl mx-auto px-4 md:px-8">
            <LibraryBrowser 
              selectedIds={selectedLibraryIds}
              onToggleLibrary={(id) => {
                setSelectedLibraryIds(prev => 
                  prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                );
              }}
              onStartStudy={() => setView('dashboard')}
            />
          </div>
        ) : view === 'creator' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto px-4 md:px-8">
            <CardCreator onBack={() => setView('dashboard')} />
          </div>
        ) : view === 'graph' ? (
          <WordGraph onBack={() => setView('dashboard')} />
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <Session 
              onComplete={() => setView('dashboard')} 
              libraryIds={selectedLibraryIds.length > 0 ? selectedLibraryIds : undefined}
            />
          </div>
        )}
      </div>
    </main>
  );
}
