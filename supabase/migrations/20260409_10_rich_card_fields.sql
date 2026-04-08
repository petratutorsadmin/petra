-- Petra Rich Card Fields (Additive, backward compatible)
-- Extends cards with richer encoding data used across recall modes.

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS translation_ja TEXT,
  ADD COLUMN IF NOT EXISTS example_sentence TEXT,
  ADD COLUMN IF NOT EXISTS collocation TEXT,
  ADD COLUMN IF NOT EXISTS related_words TEXT[],
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS recall_directions TEXT[] DEFAULT ARRAY[
    'term_to_definition',
    'definition_to_term',
    'ja_to_en',
    'en_to_ja',
    'cloze',
    'usage'
  ],
  ADD COLUMN IF NOT EXISTS cue TEXT;

-- Minimal backfill so official libraries ship with richer cues
UPDATE cards SET
  translation_ja = '実用的な',
  example_sentence = 'We need a pragmatic solution that survives real-world constraints.',
  collocation = 'pragmatic approach',
  related_words = ARRAY['practical', 'realistic'],
  topic = 'Academic thinking',
  difficulty = 'hard',
  cue = 'practical over theoretical'
WHERE prompt = 'Pragmatic';

UPDATE cards SET
  translation_ja = '広く存在する',
  example_sentence = 'Smartphones are ubiquitous in modern society.',
  collocation = 'ubiquitous presence',
  related_words = ARRAY['common', 'omnipresent'],
  topic = 'Academic thinking'
WHERE prompt = 'Ubiquitous';

UPDATE cards SET
  translation_ja = '緩和する',
  example_sentence = 'New policies were introduced to mitigate climate risks.',
  collocation = 'mitigate risk',
  related_words = ARRAY['alleviate', 'reduce'],
  topic = 'Academic thinking'
WHERE prompt = 'Mitigate';

UPDATE cards SET
  translation_ja = '必要とする',
  example_sentence = 'This role will require weekend availability.',
  collocation = 'require approval',
  related_words = ARRAY['demand', 'need'],
  topic = 'Essential verbs',
  difficulty = 'easy',
  cue = 'requires resources'
WHERE prompt = 'Require';

UPDATE cards SET
  translation_ja = '提供する',
  example_sentence = 'We provide on-site support for new clients.',
  collocation = 'provide support',
  related_words = ARRAY['supply', 'offer'],
  topic = 'Essential verbs'
WHERE prompt = 'Provide';

UPDATE cards SET
  translation_ja = '改善する',
  example_sentence = 'Daily practice will improve your fluency.',
  collocation = 'improve skills',
  related_words = ARRAY['enhance', 'upgrade'],
  topic = 'Essential verbs'
WHERE prompt = 'Improve';

UPDATE cards SET
  translation_ja = '文脈でどう使う？',
  example_sentence = 'How have you been? I have been busy but good.',
  collocation = 'casual greeting',
  related_words = ARRAY['greeting', 'small talk'],
  topic = 'Dialogue',
  difficulty = 'easy'
WHERE prompt = 'How have you been?';

UPDATE cards SET
  translation_ja = '今向かっています',
  example_sentence = 'Text your friend: “I am on my way.”',
  collocation = 'on my way',
  related_words = ARRAY['arrival', 'travel'],
  topic = 'Dialogue'
WHERE prompt = 'I''m on my way.';
