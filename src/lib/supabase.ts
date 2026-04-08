import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  mastery_score: number;
  ability_tier: string;
  petra_energy: number;
};

export type Card = {
  id: string;
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

export type UserCardData = {
  id: string;
  user_id: string;
  card_id: string;
  interval: number;
  ease_factor: number;
  last_recall_ms: number;
  consecutive_correct: number;
  next_review_at: string;
};
