'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/core';
import { supabase } from '@/lib/supabase';
import { Book, Loader2, ArrowLeft, CheckCircle2, CircleDot, Circle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface Library {
  id: string;
  title: string;
  category: string;
  total_cards: number;
  mastered: number;
  reviewing: number;
  weak: number;
}

interface CardRow {
  id: string;
  prompt: string;
  answer: string;
  consecutive_correct: number;
  doubt_score: number;
  next_review_at: string | null;
}

function statusOf(card: CardRow): 'Mastered' | 'Learning' | 'Weak' | 'New' {
  if (!card.next_review_at) return 'New';
  if (card.consecutive_correct >= 4) return 'Mastered';
  if (card.doubt_score > 1.5) return 'Weak';
  return 'Learning';
}

export default function LibraryBrowser({ 
  selectedIds = [], 
  onToggleLibrary, 
  onStartStudy 
}: { 
  selectedIds?: string[];
  onToggleLibrary?: (id: string) => void;
  onStartStudy?: () => void;
}) {
  const { lang } = useLanguage();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Library | null>(null);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [cardLoading, setCardLoading] = useState(false);

  useEffect(() => {
    fetchLibraries();
  }, []);

  const fetchLibraries = async () => {
    setLoading(true);
    const { data: libs } = await supabase.from('libraries').select('id, title, category').order('category');
    if (!libs) { setLoading(false); return; }

    const { data: { user } } = await supabase.auth.getUser();

    const enriched: Library[] = await Promise.all(libs.map(async (lib) => {
      // Get all cards inside this library via library_units
      const { data: unitRows } = await supabase
        .from('library_units')
        .select('id')
        .eq('library_id', lib.id);
      const unitIds = unitRows?.map(u => u.id) ?? [];
      
      if (!unitIds.length) return { ...lib, total_cards: 0, mastered: 0, reviewing: 0, weak: 0 };

      const { data: cardRows } = await supabase
        .from('cards')
        .select('id')
        .in('unit_id', unitIds);
      const cardIds = cardRows?.map(c => c.id) ?? [];

      if (!user || !cardIds.length) {
        return { ...lib, total_cards: cardIds.length, mastered: 0, reviewing: 0, weak: 0 };
      }

      const { data: reviews } = await supabase
        .from('user_card_reviews')
        .select('consecutive_correct, doubt_score')
        .eq('user_id', user.id)
        .in('card_id', cardIds);

      const mastered = reviews?.filter(r => r.consecutive_correct >= 4).length ?? 0;
      const weak = reviews?.filter(r => r.doubt_score > 1.5).length ?? 0;
      const reviewing = (reviews?.length ?? 0) - mastered - weak;

      return { ...lib, total_cards: cardIds.length, mastered, reviewing, weak };
    }));

    setLibraries(enriched);
    setLoading(false);
  };

  const openLibrary = async (lib: Library) => {
    setSelected(lib);
    setCardLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data: units } = await supabase
      .from('library_units')
      .select('id')
      .eq('library_id', lib.id);
    const unitIds = units?.map(u => u.id) ?? [];

    if (!unitIds.length) { setCards([]); setCardLoading(false); return; }

    const { data: rawCards } = await supabase
      .from('cards')
      .select('id, prompt, answer')
      .in('unit_id', unitIds)
      .limit(100);

    if (!rawCards?.length) { setCards([]); setCardLoading(false); return; }

    const cardIds = rawCards.map(c => c.id);
    const { data: reviews } = user
      ? await supabase.from('user_card_reviews').select('card_id, consecutive_correct, doubt_score, next_review_at').eq('user_id', user.id).in('card_id', cardIds)
      : { data: [] };

    const reviewMap = Object.fromEntries((reviews ?? []).map((r: any) => [r.card_id, r]));
    const merged: CardRow[] = rawCards.map(c => ({
      ...c,
      consecutive_correct: reviewMap[c.id]?.consecutive_correct ?? 0,
      doubt_score: reviewMap[c.id]?.doubt_score ?? 0,
      next_review_at: reviewMap[c.id]?.next_review_at ?? null,
    }));

    setCards(merged);
    setCardLoading(false);
  };

  // DRILLDOWN VIEW
  if (selected) {
    const mastered = cards.filter(c => statusOf(c) === 'Mastered').length;
    const weak = cards.filter(c => statusOf(c) === 'Weak').length;
    const learning = cards.filter(c => statusOf(c) === 'Learning').length;
    const newCards = cards.filter(c => statusOf(c) === 'New').length;

    return (
      <div className="space-y-6 py-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <button
          onClick={() => setSelected(null)}
          className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" /> {lang === 'EN' ? 'All Courses' : 'コース一覧'}
        </button>

        <header className="border-b border-text-muted/10 pb-6">
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-brand-gold mb-1 block">{selected.category}</span>
          <h2 className="text-2xl font-bold text-text-primary mb-4">{selected.title}</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: lang === 'EN' ? 'Total' : '合計', val: cards.length, cls: 'text-text-primary' },
              { label: lang === 'EN' ? 'Mastered' : '習得済み', val: mastered, cls: 'text-success' },
              { label: lang === 'EN' ? 'Learning' : '学習中', val: learning, cls: 'text-brand-gold' },
              { label: lang === 'EN' ? 'Weak' : '要復習', val: weak, cls: 'text-warning' },
              { label: lang === 'EN' ? 'New' : '未学習', val: newCards, cls: 'text-text-muted' },
            ].map(s => (
              <div key={s.label} className="bg-surface border border-text-muted/10 px-4 py-2 flex items-center gap-2">
                <span className={`text-lg font-black ${s.cls}`}>{s.val}</span>
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">{s.label}</span>
              </div>
            ))}
          </div>

          {onToggleLibrary && (
            <div className="mt-8">
              <Button 
                variant={selectedIds.includes(selected.id) ? 'secondary' : 'primary'} 
                className="w-full font-bold uppercase tracking-widest h-14"
                onClick={() => onToggleLibrary(selected.id)}
              >
                {selectedIds.includes(selected.id) 
                  ? (lang === 'EN' ? `Unselect ${selected.title}` : `${selected.title}を解除`)
                  : (lang === 'EN' ? `Select ${selected.title}` : `${selected.title}を選択`)
                }
              </Button>
            </div>
          )}
        </header>

        {cardLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
          </div>
        ) : cards.length === 0 ? (
          <p className="text-center text-text-muted font-mono text-sm py-16">
            {lang === 'EN' ? 'No cards found in this course yet.' : 'このコースにカードがまだありません。'}
          </p>
        ) : (
          <div className="bg-surface border border-text-muted/10 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-text-muted/10 bg-primary">
                  <th className="p-4 text-[10px] uppercase tracking-widest font-mono text-text-muted font-normal w-1/3">
                    {lang === 'EN' ? 'Term' : '単語'}
                  </th>
                  <th className="p-4 text-[10px] uppercase tracking-widest font-mono text-text-muted font-normal hidden md:table-cell">
                    {lang === 'EN' ? 'Definition' : '意味'}
                  </th>
                  <th className="p-4 text-[10px] uppercase tracking-widest font-mono text-text-muted font-normal text-right">
                    {lang === 'EN' ? 'Status' : '状態'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {cards.map(card => {
                  const s = statusOf(card);
                  const statusStyle =
                    s === 'Mastered' ? 'text-success border-success/30' :
                    s === 'Weak' ? 'text-warning border-warning/30' :
                    s === 'Learning' ? 'text-brand-gold border-brand-gold/30' :
                    'text-text-muted border-text-muted/20';
                  const Icon = s === 'Mastered' ? CheckCircle2 : s === 'Weak' ? CircleDot : Circle;
                  return (
                    <tr key={card.id} className="border-b border-text-muted/5 hover:bg-primary/10 transition-colors">
                      <td className="p-4 font-bold text-text-primary text-sm">{card.prompt}</td>
                      <td className="p-4 text-text-muted text-sm hidden md:table-cell">{card.answer}</td>
                      <td className="p-4 text-right">
                        <span className={`inline-flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest px-2 py-1 border ${statusStyle}`}>
                          <Icon className="w-3 h-3" />{s}
                        </span>
                        {card.doubt_score > 0 && (
                          <div className="text-[9px] text-warning opacity-60 font-mono mt-1">
                            {card.doubt_score.toFixed(1)} doubt
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // LIBRARY LIST VIEW
  return (
    <div className="space-y-8 py-8">
      <header className="text-center">
        <h2 className="text-2xl font-bold text-text-primary tracking-widest uppercase">
          {lang === 'EN' ? 'Choose Course' : 'コースを選ぶ'}
        </h2>
        <p className="text-[10px] font-mono text-text-muted mt-2 uppercase tracking-widest">
          {lang === 'EN' ? 'Click a course to see your word-by-word progress' : 'コースをクリックして単語別の進捗を確認'}
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
        </div>
      ) : libraries.length === 0 ? (
        <p className="text-center text-text-muted font-mono text-sm py-16">
          {lang === 'EN' ? 'No courses found. Add libraries in Supabase to get started.' : 'コースが見つかりません。'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          {libraries.map(lib => {
            const pct = lib.total_cards > 0 ? Math.round((lib.mastered / lib.total_cards) * 100) : 0;
            return (
              <button
                key={lib.id}
                onClick={() => openLibrary(lib)}
                className="group text-left bg-surface border border-text-muted/10 p-6 hover:border-brand-gold transition-all shadow-sm hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 flex items-center justify-center border border-text-muted/20 group-hover:border-brand-gold transition-colors flex-shrink-0">
                    <Book className="h-4 w-4 text-text-muted group-hover:text-brand-gold transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-text-muted mb-1 block">{lib.category}</span>
                    <h3 className="text-base font-bold text-text-primary group-hover:text-brand-gold transition-colors leading-tight mb-3">{lib.title}</h3>
                    <div className="w-full h-1 bg-text-muted/10 mb-2">
                      <div className="h-full bg-success transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-3 text-[9px] font-mono uppercase tracking-wide">
                      <span className="text-success">{lib.mastered} mastered</span>
                      {lib.reviewing > 0 && <span className="text-brand-gold">{lib.reviewing} reviewing</span>}
                      {lib.weak > 0 && <span className="text-warning">{lib.weak} weak</span>}
                      <span className="text-text-muted ml-auto">{lib.total_cards} total</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
