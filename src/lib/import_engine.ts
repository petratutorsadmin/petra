/**
 * Petra Import Engine
 * Handles scalable content input from various formats.
 */

export interface ParsedCard {
  prompt: string;
  answer: string;
  translation_ja?: string;
  example_sentence?: string;
  collocation?: string;
  related_words?: string[];
  topic?: string;
  difficulty?: string;
  recall_directions?: string[];
  cue?: string;
}

/**
 * Parsers a string of delimited text (CSV/TSV/etc.) into card objects.
 */
export function parseDelimitedText(text: string): ParsedCard[] {
  const lines = text.trim().split(/\r?\n/);
  const cards: ParsedCard[] = [];

  if (!lines.length) return cards;

  // Detect header
  const headerParts = lines[0].split(/\t|,|\|/).map(h => h.trim().toLowerCase());
  const hasHeader = headerParts.includes('term') || headerParts.includes('prompt') || headerParts.includes('definition');

  const rows = hasHeader ? lines.slice(1) : lines;
  const header = hasHeader ? headerParts : [];

  for (const raw of rows) {
    if (!raw.trim()) continue;
    const parts = raw.split(/\t|,|\|/).map(p => p.trim());
    const get = (key: string) => {
      if (!hasHeader) return undefined;
      const idx = header.indexOf(key);
      return idx >= 0 ? parts[idx] : undefined;
    };

    const prompt = hasHeader ? (get('term') || get('prompt') || parts[0]) : parts[0];
    const answer = hasHeader ? (get('definition') || parts[1]) : parts[1];
    if (!prompt || !answer) continue;

    const related = (get('related_words') ?? '').split(/[,;]\s*/).filter(Boolean);
    const directions = (get('recall_directions') ?? '').split(/[,;]\s*/).filter(Boolean);

    cards.push({
      prompt,
      answer,
      translation_ja: get('translation_ja'),
      example_sentence: get('example_sentence'),
      collocation: get('collocation'),
      related_words: related.length ? related : undefined,
      topic: get('topic'),
      difficulty: get('difficulty') || 'medium',
      recall_directions: directions.length ? directions : undefined,
      cue: get('cue'),
    });
  }

  return cards;
}

/**
 * Sanitizes input for database insertion.
 */
export function sanitizeCardData(cards: ParsedCard[]): ParsedCard[] {
  return cards
    .filter(c => c.prompt.length > 0 && c.answer.length > 0)
    .map(c => ({
      ...c,
      difficulty: c.difficulty || 'medium',
      recall_directions: c.recall_directions && c.recall_directions.length
        ? c.recall_directions
        : ['term_to_definition', 'definition_to_term', 'ja_to_en', 'en_to_ja', 'cloze', 'usage'],
    }));
}
