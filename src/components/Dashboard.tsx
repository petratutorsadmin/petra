'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/core';
import { supabase } from '@/lib/supabase';
import { 
  Plus, 
  Library, 
  ChevronRight, 
  ShieldAlert, 
  Settings, 
  Maximize2,
  Loader2
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useLanguage } from '@/context/LanguageContext';

interface DashboardProps {
  onStartSession: () => void;
  onOpenLibrary: () => void;
  onOpenCreator?: () => void;
  onOpenGraph?: () => void;
  selectedLibraryIds?: string[];
  onClearLibraries?: () => void;
}

interface Mistake {
  id: string;
  prompt: string;
  answer: string;
  doubt_score: number;
}

interface ProgressStats {
  total: number;
  mastered: number;
  reviewing: number;
  weak: number;
  dueToday: number;
  mistakes: number;
  dailyStreak: number;
}

export default function Dashboard({ onStartSession, onOpenLibrary, onOpenCreator, onOpenGraph, selectedLibraryIds = [], onClearLibraries }: DashboardProps) {
  const { lang, toggleLang } = useLanguage();
  const [stats, setStats] = useState<ProgressStats>({
    total: 0,
    mastered: 0,
    reviewing: 0,
    weak: 0,
    dueToday: 15,
    mistakes: 0,
    dailyStreak: 0,
  });
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [activeCourseCount, setActiveCourseCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchMistakes();
    setActiveCourseCount(selectedLibraryIds.length);
  }, [selectedLibraryIds]);

  const fetchMistakes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.rpc('get_top_mistakes', { p_user_id: user.id });
    if (data) setMistakes(data);
  };

  const fetchStats = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Total cards
    const { count: total } = await supabase.from('cards').select('id', { count: 'exact', head: true });

    if (!user) {
      setStats(s => ({ ...s, total: total ?? 0, dueToday: Math.min(total ?? 0, 15) }));
      setLoading(false);
      return;
    }

    // Ensure user has access before counting reviews
    const { data: reviews, error } = await supabase
      .from('user_card_reviews')
      .select('consecutive_correct, doubt_score, next_review_at')
      .eq('user_id', user.id);

    if (error) {
      console.warn('Could not load user reviews', error.message);
      setStats(s => ({ ...s, total: total ?? 0, dueToday: Math.min(total ?? 0, 15) }));
      setLoading(false);
      return;
    }

    const mastered = reviews?.filter(r => r.consecutive_correct >= 4).length ?? 0;
    const weak = reviews?.filter(r => r.doubt_score > 1.5).length ?? 0;
    const reviewing = (reviews?.length ?? 0) - mastered - weak;

    // Due today: cards where next_review_at <= now
    const now = new Date().toISOString();
    const due = reviews?.filter(r => r.next_review_at && r.next_review_at <= now).length ?? 0;

    // Profile streak
    const { data: profile } = await supabase
      .from('profiles')
      .select('daily_streak')
      .eq('id', user.id)
      .single();

    setStats({
      total: total ?? 0,
      mastered,
      reviewing,
      weak,
      dueToday: Math.max(due, Math.min((total ?? 0), 15)),
      mistakes: 0,
      dailyStreak: profile?.daily_streak ?? 0,
    });
    setLoading(false);
  };

  const hasSession = stats.dueToday > 0;

  return (
    <div className="min-h-[80vh] flex flex-col justify-between p-4 md:p-8 max-w-2xl mx-auto">

      {/* Top utility bar */}
      <div className="flex items-center justify-between py-4 border-b border-text-muted/10">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 text-brand-gold animate-spin mb-4" />
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest animate-pulse">Synchronizing Data...</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <button onClick={toggleLang} className="text-[10px] font-bold text-text-primary px-3 py-1.5 border border-text-muted/20 hover:border-brand-gold transition-colors uppercase tracking-widest bg-surface">
                {lang === 'EN' ? <>EN <span className="opacity-40 font-normal">| JP</span></> : <><span className="opacity-40 font-normal">EN |</span> JP</>}
              </button>
              <button onClick={onOpenCreator} className="text-[10px] font-bold text-text-muted hover:text-text-primary bg-surface transition-colors flex items-center gap-1.5 px-3 py-1.5 border border-text-muted/10 hover:border-text-muted/30 uppercase tracking-widest">
                <Plus className="w-3 h-3" /> {lang === 'EN' ? 'Create' : '作成'}
              </button>
              <button onClick={onOpenLibrary} className="text-[10px] font-bold text-text-muted hover:text-text-primary bg-surface transition-colors flex items-center gap-1.5 px-3 py-1.5 border border-text-muted/10 hover:border-text-muted/30 uppercase tracking-widest">
                <Library className="w-3 h-3" /> {lang === 'EN' ? 'Courses' : 'コース'}
              </button>
              <button onClick={onOpenGraph} className="text-[10px] font-bold text-text-muted hover:text-brand-gold bg-surface transition-colors flex items-center gap-1.5 px-3 py-1.5 border border-text-muted/10 hover:border-brand-gold uppercase tracking-widest">
                <Maximize2 className="w-3 h-3 text-brand-gold" /> {lang === 'EN' ? 'Tree' : 'ツリー'}
              </button>
            </div>
            <ThemeToggle />
          </>
        )}
      </div>

      {/* Main content */}
      {!loading && (
        <section className="flex flex-col items-center flex-1 py-12">
          <>
            {/* ─── PROGRESS BLOCK (Magoosh-style labeled bars) ─── */}
            {stats.total > 0 && (
              <div className="w-full mb-10 space-y-3">
                <div className="flex justify-between text-[9px] font-mono uppercase tracking-widest text-text-muted mb-1">
                  <span>{lang === 'EN' ? 'YOUR PROGRESS' : '学習の進捗'}</span>
                  <span>{stats.mastered} / {stats.total} {lang === 'EN' ? 'mastered' : '習得済み'}</span>
                </div>

                {[
                  {
                    label: lang === 'EN' ? 'Mastered' : '習得済み',
                    count: stats.mastered,
                    cls: 'bg-success',
                    textCls: 'text-success',
                  },
                  {
                    label: lang === 'EN' ? 'Reviewing' : '復習中',
                    count: stats.reviewing,
                    cls: 'bg-brand-gold',
                    textCls: 'text-brand-gold',
                  },
                  {
                    label: lang === 'EN' ? 'Still learning' : '学習中',
                    count: stats.weak,
                    cls: 'bg-warning',
                    textCls: 'text-warning',
                  },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-3">
                    <div className="w-full h-1.5 bg-text-muted/10 flex-1">
                      <div
                        className={`h-full ${row.cls} transition-all duration-700`}
                        style={{ width: stats.total > 0 ? `${(row.count / stats.total) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className={`text-[10px] font-mono font-bold ${row.textCls} w-16 text-right flex-shrink-0`}>
                      {row.count} {row.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ─── ACTIVE COURSES INDICATION ─── */}
            {activeCourseCount > 0 && (
              <div className="w-full mb-4 px-4 py-2 border border-brand-gold/30 bg-brand-gold/5 flex justify-between items-center animate-in slide-in-from-top-2">
                <span className="text-[10px] font-mono font-bold text-brand-gold uppercase tracking-widest flex items-center gap-2">
                  <Library className="w-3 h-3" /> 
                  {lang === 'EN' 
                    ? `${activeCourseCount} Courses Selected` 
                    : `${activeCourseCount}つのコースを選択中`}
                </span>
                <button onClick={onClearLibraries} className="text-[10px] font-mono text-text-muted hover:text-text-primary uppercase tracking-widest">
                  [ {lang === 'EN' ? 'Clear' : '解除'} ]
                </button>
              </div>
            )}

            {mistakes.length > 0 && (
              <div className="w-full mb-10 space-y-4 animate-in fade-in slide-in-from-top-4">
                <div className="p-4 border border-warning/30 bg-warning/5">
                  <div className="flex items-center gap-2 text-warning mb-4">
                    <ShieldAlert className="w-4 h-4" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                      {lang === 'EN' ? 'CRITICAL MISTAKES' : '要復習の単語'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {mistakes.map(m => (
                      <div key={m.id} className="flex justify-between items-center bg-surface p-2 border border-text-muted/5 group hover:border-warning/30 transition-colors">
                        <div>
                          <p className="text-sm font-bold text-text-primary">{m.prompt}</p>
                          <p className="text-[10px] text-text-muted font-mono">{m.answer}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-mono text-warning font-black">{m.doubt_score.toFixed(1)}</span>
                          <p className="text-[8px] text-text-muted font-mono uppercase tracking-[0.2em]">DOUBT</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── MAIN CTA ─── */}
            {hasSession ? (
              <>
                <p className="text-[10px] font-mono text-brand-gold tracking-[0.4em] mb-4 uppercase">
                  {lang === 'EN' ? "TODAY'S MISSION" : '今日のミッション'}
                </p>
                <Button
                  size="lg"
                  variant="primary"
                  className="w-full text-xl font-black relative group transition-all duration-200 shadow-xl hover:-translate-y-0.5 flex-col py-8"
                  onClick={onStartSession}
                >
                  <span>{lang === 'EN' ? `START TODAY'S ${stats.dueToday}` : `今日の${stats.dueToday}問を始める`}</span>
                  <span className="text-[10px] font-normal tracking-widest opacity-60 mt-1">
                    {lang === 'EN' ? `${stats.dueToday} words ready` : `${stats.dueToday}単語スタンバイ`}
                  </span>
                  <ChevronRight className="absolute right-6 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
                <p className="text-[10px] font-mono text-text-muted mt-4 text-center">
                  {lang === 'EN' ? 'Words you miss will come back tomorrow' : '間違えた単語は翌日に再出題されます'}
                </p>
              </>
            ) : stats.total === 0 ? (
              <>
                <p className="text-[10px] font-mono text-text-muted tracking-widest uppercase mb-6">
                  {lang === 'EN' ? 'No course selected' : 'コース未選択'}
                </p>
                <Button size="lg" variant="secondary" className="w-full text-lg font-bold flex-col py-8" onClick={onOpenLibrary}>
                  <span>{lang === 'EN' ? 'CHOOSE COURSE' : 'コースを選ぶ'}</span>
                  <ChevronRight className="ml-4 h-5 w-5" />
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 border border-brand-gold bg-brand-gold/5 flex items-center justify-center mb-6">
                  <Settings className="w-8 h-8 text-brand-gold" />
                </div>
                <p className="text-xl font-bold text-text-primary tracking-widest uppercase mb-2">
                  {lang === 'EN' ? "TODAY'S GOAL MET" : '今日の目標達成'}
                </p>
                <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest">
                  {lang === 'EN' ? 'See you tomorrow' : 'また明日！'}
                </p>
              </div>
            )}
          </>
        </section>
      )}

      <div className="h-8" />
    </div>
  );
}
