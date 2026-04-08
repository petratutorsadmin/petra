'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/core';
import { supabase } from '@/lib/supabase';
import { calculateNextState, SRepState, INITIAL_STATE } from '@/lib/srep_engine';
import { transformCard, getRecommendedType, OutputPrompt, chooseDirection, CardContent, StimulusType } from '@/lib/output_engine';
import { useSound } from '@/lib/useSound';
import { Check, X, Sparkles, Loader2, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface CardWithState extends CardContent {
  id: string;
  reason: 'weak' | 'review' | 'new';
  state: SRepState;
}

export default function Session({ onComplete, libraryIds }: { onComplete: () => void; libraryIds?: string[] }) {
  const { lang } = useLanguage();
  const [cards, setCards] = useState<CardWithState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | 'mastered' | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPrompt, setCurrentPrompt] = useState<OutputPrompt | null>(null);
  const [failedCards, setFailedCards] = useState<CardWithState[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [primed, setPrimed] = useState<Record<string, boolean>>({});
  const { playCorrect, playIncorrect, playMastered, playSessionComplete } = useSound();
  const [shuffleQueue, setShuffleQueue] = useState(true);

  useEffect(() => { fetchSessionCards(); }, []);

  const ensureProfileExists = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .limit(1)
      .maybeSingle();
    if (!data) {
      await supabase.from('profiles').upsert({ id: userId });
    } else if (error) {
      console.warn('profile check failed', error.message);
    }
  };

  const interleaveQueue = (queue: CardWithState[]) => {
    // Mix topics and similar-sounding items to avoid interference
    const priority = { weak: 0, review: 1, new: 2 } as const;
    const sorted = [...queue].sort((a, b) => priority[a.reason] - priority[b.reason]);
    const result: CardWithState[] = [];
    let lastTopic: string | null = null;
    let lastSound: string | null = null;

    while (sorted.length) {
      const idx = sorted.findIndex((c) => {
        const topic = c.topic ?? '';
        const sound = c.prompt.slice(0, 2).toLowerCase();
        return topic !== lastTopic && sound !== lastSound;
      });

      const pickIndex = idx >= 0 ? idx : 0;
      const [chosen] = sorted.splice(pickIndex, 1);
      result.push(chosen);
      lastTopic = chosen.topic ?? lastTopic;
      lastSound = chosen.prompt.slice(0, 2).toLowerCase();
    }
    return result;
  };

  const buildPrompt = (card: CardWithState, indexSeed: number): OutputPrompt => {
    // Choose a direction from card preferences then adjust based on mastery progression
    const direction = chooseDirection(card, indexSeed);
    const masteryType = getRecommendedType(card.state.consecutiveCorrect);

    // Promote production modes when mastery is high
    const productionTypes: StimulusType[] = ['speaking', 'writing', 'scramble'];
    const resolved: StimulusType = productionTypes.includes(masteryType)
      ? masteryType
      : direction === 'ja_to_en' && !card.translation_ja
        ? 'definition_to_term'
        : direction === 'cloze' && !card.example_sentence
          ? 'term_to_definition'
          : direction === 'usage' && !card.collocation
            ? 'term_to_definition'
            : direction;

    return transformCard(card, resolved);
  };

  const fetchSessionCards = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    await ensureProfileExists(user.id);

    const { data: cardsData, error } = await supabase.rpc('get_daily_queue', { 
      p_user_id: user.id,
      p_library_ids: libraryIds
    });

    if (error || !cardsData?.length) { setLoading(false); return; }

    const cardsWithState: CardWithState[] = cardsData.map((c: any) => ({
      ...c,
      reason: c.reason as CardWithState['reason'],
      state: INITIAL_STATE,
    }));

    const queue = shuffleQueue ? interleaveQueue(cardsWithState) : cardsWithState;
    setCards(queue);
    setCurrentPrompt(buildPrompt(queue[0], 0));
    setLoading(false);
  };

  useEffect(() => {
    if (!sessionComplete && cards.length > 0) {
      const card = cards[currentIndex];
      const isLearning = card?.reason === 'new' && card && !primed[card.id];
      if (!isLearning && !isRevealed) setStartTime(Date.now());
    }
  }, [currentIndex, isRevealed, sessionComplete, cards.length, primed]);

  const handleReveal = () => setIsRevealed(true);

  const handleResult = async (isCorrect: boolean) => {
    const recallMs = Date.now() - startTime;
    const currentCard = cards[currentIndex];
    const nextState = calculateNextState(currentCard.state, { isCorrect, recallMs });
    const isNowMastered = isCorrect && currentCard.state.consecutiveCorrect === 0;

    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      if (isNowMastered) playMastered(); else playCorrect();
    } else {
      playIncorrect();
      setFailedCards(prev => [...prev, currentCard]);
    }

    setFeedback(isNowMastered ? 'mastered' : isCorrect ? 'correct' : 'incorrect');

    // Persist locally for prompt selection variance
    setCards(prev => prev.map((c, i) => i === currentIndex ? { ...c, state: nextState } : c));

    // PERSIST TO SUPABASE
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await ensureProfileExists(user.id);
      const { error } = await supabase.rpc('upsert_review', {
        p_user_id: user.id,
        p_card_id: currentCard.id,
        p_is_correct: isCorrect,
        p_recall_ms: recallMs
      });
      if (error) {
        // Fallback upsert to keep dashboard stats fresh even if RPC is missing
        const nextReviewAt = new Date();
        nextReviewAt.setDate(nextReviewAt.getDate() + Math.max(1, nextState.interval || 1));
        await supabase.from('user_card_reviews').upsert({
          user_id: user.id,
          card_id: currentCard.id,
          consecutive_correct: nextState.consecutiveCorrect,
          doubt_score: isCorrect
            ? Math.max(0, (currentCard.state as any).doubt_score ?? 0 - 0.2)
            : ((currentCard.state as any).doubt_score ?? 0) + 1,
          last_reviewed_at: new Date().toISOString(),
          next_review_at: nextReviewAt.toISOString()
        });
        console.warn('RPC upsert_review failed, used client fallback', error.message);
      }
    }

    const delay = isNowMastered ? 700 : 150;

    setTimeout(async () => {
      setFeedback(null);
      setIsRevealed(false);

      if (currentIndex < cards.length - 1) {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        const nextCard = cards[nextIndex];
        setCurrentPrompt(buildPrompt(nextCard, nextIndex));
      } else {
        if (!isReviewMode) await syncSessionResults();
        playSessionComplete();
        setSessionComplete(true);
      }
    }, delay);
  };

  const startErrorReview = () => {
    if (!failedCards.length) return;
    setCards(failedCards);
    setCurrentIndex(0);
    setFailedCards([]);
    setCorrectCount(0);
    setIsReviewMode(true);
    setSessionComplete(false);
    setCurrentPrompt(buildPrompt(failedCards[0], 0));
  };

  const syncSessionResults = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.rpc('update_daily_streak', { p_user_id: user.id });
    if (error) console.error('Error updating streak', error);
  };

  // ─── LOADING ───
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <Loader2 className="h-6 w-6 text-text-primary animate-spin mb-4" />
        <p className="text-[10px] font-mono text-text-muted uppercase tracking-[0.4em]">
          {lang === 'EN' ? 'Loading session...' : '読み込み中...'}
        </p>
      </div>
    );
  }

  // ─── COMPLETION ───
  if (sessionComplete) {
    const total = correctCount + failedCards.length;
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6 animate-in fade-in duration-400 max-w-md mx-auto">
        <p className="text-[10px] font-mono text-brand-gold tracking-[0.4em] uppercase mb-4">
          {isReviewMode ? (lang === 'EN' ? 'REVIEW DONE' : 'レビュー完了') : (lang === 'EN' ? 'SESSION DONE' : 'セッション完了')}
        </p>
        <h2 className="text-3xl font-black text-text-primary mb-10">
          {lang === 'EN' ? `You completed ${total}` : `${total}問完了`}
        </h2>

        {/* Breakdown bars */}
        <div className="w-full space-y-3 mb-10 text-left">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-text-muted/10">
              <div className="h-full bg-success transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-success font-bold font-mono text-sm w-20 text-right flex-shrink-0">
              {correctCount} {lang === 'EN' ? 'correct' : '正解'}
            </span>
          </div>
          {failedCards.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-text-muted/10">
                <div className="h-full bg-warning transition-all duration-700" style={{ width: `${100 - pct}%` }} />
              </div>
              <span className="text-warning font-bold font-mono text-sm w-20 text-right flex-shrink-0">
                {failedCards.length} {lang === 'EN' ? 'missed' : '不正解'}
              </span>
            </div>
          )}
        </div>

        {/* Next steps */}
        <div className="w-full space-y-3">
          {failedCards.length > 0 && (
            <>
              <Button
                variant="danger"
                size="lg"
                className="w-full font-bold"
                onClick={startErrorReview}
              >
                {lang === 'EN' ? `RETRY ${failedCards.length} MISTAKES` : `${failedCards.length}問を再挑戦`}
              </Button>
              <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest">
                {lang === 'EN' ? 'Missed words will also appear in your next session' : '間違えた単語は次回も出題されます'}
              </p>
            </>
          )}
          <Button
            variant={failedCards.length > 0 ? 'ghost' : 'primary'}
            size="lg"
            className="w-full font-bold"
            onClick={onComplete}
          >
            {failedCards.length > 0
              ? (lang === 'EN' ? 'Done for today' : '今日はここまで')
              : (lang === 'EN' ? 'BACK TO DASHBOARD' : 'ホームへ戻る')}
          </Button>
        </div>
      </div>
    );
  }

  const card = cards[currentIndex];
  const isLearning = card?.reason === 'new' && card && !primed[card.id];
  if (!card && !sessionComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-8">
        <p className="text-sm font-bold text-text-primary mb-4">
          {lang === 'EN' ? 'No cards due for this session.' : '出題予定の単語はありません。'}
        </p>
        <Button onClick={onComplete}>{lang === 'EN' ? 'GO BACK' : '戻る'}</Button>
      </div>
    );
  }

  const done = currentIndex;
  const left = cards.length - currentIndex;

  return (
    <div className="max-w-lg mx-auto px-4 min-h-[80vh] flex flex-col justify-between py-8 relative">

      {/* Top progress bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-surface z-50">
        <div
          className="h-full bg-brand-gold transition-all duration-300"
          style={{ width: `${(done / cards.length) * 100}%` }}
        />
      </div>

      {/* Shuffle toggle */}
      <div className="flex justify-end items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-text-muted mt-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={shuffleQueue}
            onChange={(e) => {
              setShuffleQueue(e.target.checked);
              // Rebuild queue order when toggled
              setCards(prev => {
                const reordered = e.target.checked ? interleaveQueue(prev) : prev;
                setCurrentIndex(0);
                setCurrentPrompt(reordered.length ? buildPrompt(reordered[0], 0) : null);
                return reordered;
              });
            }}
            className="h-4 w-4"
          />
          {lang === 'EN' ? 'Shuffle / interleave' : 'シャッフル'}
        </label>
      </div>

      {/* Ambient feedback overlays */}
      {feedback === 'incorrect' && (
        <div className="fixed inset-0 pointer-events-none z-40 animate-in fade-in" style={{ backgroundColor: 'var(--warning)', opacity: 0.07 }} />
      )}
      {feedback === 'correct' && (
        <div className="fixed inset-0 pointer-events-none z-40 animate-in fade-in" style={{ backgroundColor: 'var(--success)', opacity: 0.07 }} />
      )}

      {/* Counter */}
      <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-text-muted mt-4">
        <span>{done} {lang === 'EN' ? 'done' : '完了'}</span>
        <span className="text-text-primary font-bold">{left} {lang === 'EN' ? 'left' : '残り'}</span>
      </div>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center relative">

        {/* Feedback icons */}
        {feedback === 'correct' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none animate-in zoom-in duration-150">
            <Check className="w-40 h-40 text-success drop-shadow-2xl" strokeWidth={3} />
          </div>
        )}
        {feedback === 'incorrect' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none animate-in zoom-in duration-150">
            <X className="w-40 h-40 text-warning drop-shadow-2xl" strokeWidth={3} />
          </div>
        )}
        {feedback === 'mastered' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none animate-in zoom-in duration-300">
            <Sparkles className="w-40 h-40 text-brand-gold drop-shadow-2xl" strokeWidth={2} />
          </div>
        )}

        {/* Card */}
        <div className="w-full bg-surface border border-text-muted/10 shadow-xl aspect-[4/3] flex flex-col items-center justify-center p-8 text-center relative hover:-translate-y-1 transition-all duration-200">
          {isLearning ? (
            <div className="animate-in fade-in duration-200 w-full flex flex-col gap-3 items-center text-left">
              <div className="text-[9px] font-mono uppercase tracking-[0.35em] text-brand-gold mb-1 text-center">
                New · Preview before recall
              </div>
              <h1 className="text-3xl font-black text-text-primary leading-tight text-center">{card.prompt}</h1>
              <div className="space-y-2 text-sm text-text-muted max-w-lg">
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-primary border border-text-muted/20 text-text-primary text-[11px] uppercase tracking-widest">Answer</span>
                  <span className="text-text-primary font-semibold">{card.answer}</span>
                  {card.translation_ja && (
                    <span className="px-2 py-1 border border-text-muted/20 text-[11px] uppercase tracking-widest">JP: {card.translation_ja}</span>
                  )}
                </div>
                {card.example_sentence && (
                  <p className="italic text-text-muted">“{card.example_sentence}”</p>
                )}
                {card.collocation && (
                  <p className="text-[12px] text-text-primary">Usage: <span className="text-text-muted">{card.collocation}</span></p>
                )}
                {card.cue && (
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-brand-gold">Cue: {card.cue}</p>
                )}
              </div>
              <Button
                variant="primary"
                className="mt-4 px-6"
                onClick={() => {
                  setPrimed(prev => ({ ...prev, [card.id]: true }));
                  setIsRevealed(false);
                  setStartTime(Date.now());
                }}
              >
                {lang === 'EN' ? 'Start recall' : '出題を始める'}
              </Button>
            </div>
          ) : !isRevealed ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col items-center">
              <div className="text-[9px] font-mono uppercase tracking-[0.35em] text-text-muted mb-3 flex items-center gap-2">
                <span className="px-2 py-0.5 border border-text-muted/20">
                  {card.reason}
                </span>
                {card.topic && <span className="px-2 py-0.5 border border-text-muted/20">{card.topic}</span>}
              </div>
              <h1 className="text-4xl font-black text-text-primary tracking-tight leading-tight mb-6">
                {currentPrompt?.primary}
              </h1>
              {currentPrompt?.secondary && (
                <p className="text-sm text-text-muted max-w-md leading-relaxed">{currentPrompt.secondary}</p>
              )}
              {currentPrompt?.hint && (
                <p className="text-[10px] font-mono uppercase tracking-widest text-brand-gold mt-3">
                  {currentPrompt.hint}
                </p>
              )}
              {currentPrompt?.type === 'scramble' && (
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {currentPrompt.options?.map((w, i) => (
                    <span key={i} className="px-2 py-1 border border-text-muted/20 text-text-muted text-xs font-mono">{w}</span>
                  ))}
                </div>
              )}
              <p className="text-[9px] font-mono text-text-muted uppercase tracking-[0.4em] mt-4">
                {lang === 'EN' ? '— tap to reveal —' : '— タップして表示 —'}
              </p>
            </div>
          ) : (
            <div className="animate-in zoom-in-95 duration-100 w-full">
              <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest mb-4">
                {lang === 'EN' ? 'Answer' : '答え'}
              </p>
              <h2 className="text-3xl font-medium text-text-primary leading-relaxed mb-10">
                {card.answer}
              </h2>
              <div className="space-y-3 text-left text-sm text-text-muted max-w-xl mx-auto">
                <div className="flex flex-wrap gap-2 items-center">
                  {card.translation_ja && (
                    <span className="px-2 py-1 border border-text-muted/30 text-[11px] uppercase tracking-widest">JP: {card.translation_ja}</span>
                  )}
                  {card.topic && (
                    <span className="px-2 py-1 bg-primary/60 border border-text-muted/20 text-[11px] uppercase tracking-widest">{card.topic}</span>
                  )}
                  {card.difficulty && (
                    <span className="px-2 py-1 border border-text-muted/20 text-[11px] uppercase tracking-widest">{card.difficulty}</span>
                  )}
                </div>
                {card.example_sentence && (
                  <p className="italic text-text-muted">“{card.example_sentence}”</p>
                )}
                {card.collocation && (
                  <p className="text-[12px] text-text-primary">Usage: <span className="text-text-muted">{card.collocation}</span></p>
                )}
                {card.related_words && card.related_words.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[11px] uppercase tracking-widest text-text-primary">Related:</span>
                    {card.related_words.map((w) => (
                      <span
                        key={w}
                        className="px-2 py-1 text-[11px] border border-text-muted/30 rounded-sm bg-surface/60"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                )}
                {card.cue && (
                  <p className="text-[11px] uppercase tracking-[0.2em] text-brand-gold">Cue: {card.cue}</p>
                )}
              </div>
              {/* Feedback buttons anchored at bottom of card */}
              <div className="absolute bottom-6 left-6 right-6 flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1 h-12 font-bold text-xs"
                  onClick={() => handleResult(false)}
                >
                  {lang === 'EN' ? '✗ Forgot' : '✗ 忘れた'}
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 h-12 font-bold text-xs"
                  onClick={() => handleResult(true)}
                >
                  {lang === 'EN' ? '✓ Got It' : '✓ 覚えた'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reveal button */}
      {!isLearning && !isRevealed && !feedback && (
        <div className="pb-4">
          <Button
            variant="primary"
            size="lg"
            className="w-full font-black text-lg"
            onClick={handleReveal}
          >
            {lang === 'EN' ? 'REVEAL' : '答えを表示'}
          </Button>
          <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest text-center mt-3">
            {lang === 'EN' ? "Think of the answer first, then reveal" : 'まず答えを考えてからタップ'}
          </p>
        </div>
      )}
    </div>
  );
}
