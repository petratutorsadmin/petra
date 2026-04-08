/**
 * Petra Spaced Repetition Engine
 * Based on a modified SM-2 algorithm that incorporates recall latency (ms).
 */

export interface SRepState {
  interval: number;      // Days
  easeFactor: number;    // Multiplier
  consecutiveCorrect: number;
}

export interface ReviewResult {
  recallMs: number;
  isCorrect: boolean;
}

export const INITIAL_STATE: SRepState = {
  interval: 0,
  easeFactor: 2.5,
  consecutiveCorrect: 0,
};

/**
 * Calculate the next interval and ease factor based on performance.
 */
export function calculateNextState(
  currentState: SRepState,
  result: ReviewResult
): SRepState {
  let { interval, easeFactor, consecutiveCorrect } = currentState;

  if (!result.isCorrect) {
    // Reset on failure
    return {
      interval: 1, // Review tomorrow
      easeFactor: Math.max(1.3, easeFactor - 0.2),
      consecutiveCorrect: 0,
    };
  }

  // Success logic: Incorporate recall speed
  consecutiveCorrect += 1;

  // Determine quality adjustment based on recall latency
  // 0: Fail (handled above)
  // 1: Correct, but very slow (> 5s)
  // 2: Correct, slow (3-5s)
  // 3: Correct, medium (1.5-3s)
  // 4: Correct, fast (0.5-1.5s)
  // 5: Correct, instant (< 0.5s)
  
  let quality = 3;
  if (result.recallMs < 500) quality = 5;
  else if (result.recallMs < 1500) quality = 4;
  else if (result.recallMs < 3000) quality = 3;
  else if (result.recallMs < 5000) quality = 2;
  else quality = 1;

  // SM-2 logic for easeFactor
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(1.3, easeFactor);

  // Interval calculation
  if (consecutiveCorrect === 1) {
    interval = 1;
  } else if (consecutiveCorrect === 2) {
    interval = 6;
  } else {
    interval = Math.round(interval * easeFactor);
  }

  return {
    interval,
    easeFactor,
    consecutiveCorrect,
  };
}

/**
 * Calculate the "Doubt Score" for prioritization.
 * Higher score = higher priority in sessions.
 */
export function calculateDoubtScore(
  totalFailures: number,
  avgRecallMs: number
): number {
  // Simple heuristic: failures weighted heavily, slow recalls moderately.
  return totalFailures * 10 + (avgRecallMs / 1000);
}
