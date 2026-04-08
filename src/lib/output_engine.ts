/**
 * Petra Output Engine
 * Transforms standard cards into multi-direction training prompts with context.
 */

export type StimulusType =
  | 'term_to_definition'
  | 'definition_to_term'
  | 'ja_to_en'
  | 'en_to_ja'
  | 'cloze'
  | 'usage'
  | 'scramble'
  | 'writing'
  | 'speaking';

export interface OutputPrompt {
  type: StimulusType;
  primary: string;
  secondary?: string;
  options?: string[]; // For scrambled blocks
  hint?: string;
}

export type CardContent = {
  prompt: string;
  answer: string;
  translation_ja?: string | null;
  example_sentence?: string | null;
  collocation?: string | null;
  related_words?: string[] | null;
  topic?: string | null;
  difficulty?: string | null;
  recall_directions?: string[] | null;
  cue?: string | null;
};

const DEFAULT_DIRECTIONS: StimulusType[] = [
  'term_to_definition',
  'definition_to_term',
  'ja_to_en',
  'en_to_ja',
  'cloze',
  'usage',
  'scramble',
];

/**
 * Transforms a card into a specific stimulus type.
 */
export function transformCard(
  card: CardContent,
  targetType: StimulusType = 'term_to_definition'
): OutputPrompt {
  const { prompt, answer } = card;

  switch (targetType) {
    case 'definition_to_term':
      return {
        type: 'definition_to_term',
        primary: answer,
        secondary: 'What is the precise term?',
        hint: card.topic ?? undefined,
      };

    case 'ja_to_en':
      return {
        type: 'ja_to_en',
        primary: card.translation_ja ?? answer,
        secondary: 'Recall the English term.',
        hint: card.topic ?? undefined,
      };

    case 'en_to_ja':
      return {
        type: 'en_to_ja',
        primary: prompt,
        secondary: 'Produce the Japanese meaning.',
        hint: card.translation_ja ?? undefined,
      };

    case 'cloze': {
      const sentence = card.example_sentence ?? '';
      const cloze = sentence && sentence.toLowerCase().includes(prompt.toLowerCase())
        ? sentence.replace(new RegExp(prompt, 'i'), '_____')
        : sentence && sentence.toLowerCase().includes(answer.toLowerCase())
          ? sentence.replace(new RegExp(answer, 'i'), '_____')
          : `_____ ... ${card.translation_ja ?? card.cue ?? 'fill the gap'}`;
      return {
        type: 'cloze',
        primary: cloze,
        secondary: 'Complete the sentence.',
        hint: card.cue ?? card.collocation ?? undefined,
      };
    }

    case 'usage':
      return {
        type: 'usage',
        primary: card.collocation ?? `Use "${prompt}" naturally.`,
        secondary: card.example_sentence ?? 'Write or say a sentence.',
        hint: card.cue ?? undefined,
      };

    case 'scramble': {
      const words = answer.split(/\s+/).filter(w => w.length > 0);
      const shuffled = [...words].sort(() => Math.random() - 0.5);
      return {
        type: 'scramble',
        primary: prompt,
        secondary: 'Reconstruct the phrase.',
        options: shuffled,
      };
    }

    case 'writing':
      return {
        type: 'writing',
        primary: prompt,
        secondary: `Use this word in context.`,
        hint: card.example_sentence ?? card.collocation ?? undefined,
      };

    case 'speaking':
      return {
        type: 'speaking',
        primary: prompt,
        secondary: 'Say it aloud with meaning + example.',
      };

    case 'term_to_definition':
    default:
      return {
        type: 'term_to_definition',
        primary: prompt,
        secondary: card.cue ?? card.translation_ja ?? undefined,
      };
  }
}

/**
 * Helper to determine what type of transformation to apply based on mastery.
 * If user keeps getting standard recall right, move to production (Speaking/Writing).
 */
export function getRecommendedType(consecutiveCorrect: number): StimulusType {
  if (consecutiveCorrect >= 5) return 'speaking';
  if (consecutiveCorrect >= 3) return 'writing';
  if (consecutiveCorrect >= 1) return 'scramble';
  return 'term_to_definition';
}

/**
 * Select next recall direction from card preferences with fallback.
 */
export function chooseDirection(card: CardContent, seed: number): StimulusType {
  const directions = card.recall_directions?.filter(Boolean) as StimulusType[] | null;
  const usable = (directions?.length ? directions : DEFAULT_DIRECTIONS).filter(Boolean);
  return usable[seed % usable.length];
}
