'use client';

import { useCallback, useRef } from 'react';

// Synthesizes subtle, premium feedback sounds without needing audio files
export function useSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playTone = useCallback((freq: number, type: OscillatorType, duration: number, vol = 0.1) => {
    try {
      const ctx = initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      // Envelope
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch(e) {}
  }, []);

  const playCorrect = useCallback(() => {
    // Soft wooden click/tock (low sine, very fast envelope)
    playTone(400, 'sine', 0.1, 0.2);
    setTimeout(() => playTone(600, 'sine', 0.15, 0.1), 30);
  }, [playTone]);

  const playIncorrect = useCallback(() => {
    // Deep muted thump
    playTone(100, 'triangle', 0.3, 0.4);
  }, [playTone]);

  const playMastered = useCallback(() => {
    // Crystalline chime (Major 3rd interval)
    playTone(523.25, 'sine', 0.8, 0.15); // C5
    setTimeout(() => playTone(659.25, 'sine', 0.9, 0.1), 50); // E5
    setTimeout(() => playTone(783.99, 'sine', 1.0, 0.05), 100); // G5
  }, [playTone]);

  const playSessionComplete = useCallback(() => {
    // Satisfying resolve
    playTone(392.00, 'sine', 1.0, 0.1); // G4
    setTimeout(() => playTone(493.88, 'sine', 1.0, 0.1), 100); // B4
    setTimeout(() => playTone(587.33, 'sine', 1.0, 0.1), 200); // D5
    setTimeout(() => playTone(783.99, 'sine', 2.0, 0.2), 300); // G5 
  }, [playTone]);

  return { playCorrect, playIncorrect, playMastered, playSessionComplete };
}
