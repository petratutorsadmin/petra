-- Petra Launch Seed Data
-- Run this AFTER executing the schema SQL.

-- Seed Libraries
INSERT INTO libraries (id, title, category) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'IELTS Core Vocab', 'IELTS Mastery'),
  ('22222222-2222-2222-2222-222222222222', 'Eiken Pre-2 Basics', 'Eiken Prep'),
  ('33333333-3333-3333-3333-333333333333', 'Fluent Dialogue', 'Daily English');

-- Seed Units 
INSERT INTO library_units (id, library_id, title, sequence_order) VALUES
  ('11111111-2222-3333-4444-555555555555', '11111111-1111-1111-1111-111111111111', 'Unit 1: Academic Foundations', 1),
  ('22222222-3333-4444-5555-666666666666', '22222222-2222-2222-2222-222222222222', 'Unit 1: Essential Verbs', 1),
  ('33333333-4444-5555-6666-777777777777', '33333333-3333-3333-3333-333333333333', 'Unit 1: Small Talk', 1);

-- Seed Cards
INSERT INTO cards (id, unit_id, prompt, answer) VALUES
  -- IELTS
  (uuid_generate_v4(), '11111111-2222-3333-4444-555555555555', 'Pragmatic', 'Acting practically rather than theoretically'),
  (uuid_generate_v4(), '11111111-2222-3333-4444-555555555555', 'Ubiquitous', 'Found everywhere'),
  (uuid_generate_v4(), '11111111-2222-3333-4444-555555555555', 'Mitigate', 'Make less severe or painful'),
  (uuid_generate_v4(), '11111111-2222-3333-4444-555555555555', 'Anomaly', 'Something that deviates from what is standard, normal, or expected'),
  (uuid_generate_v4(), '11111111-2222-3333-4444-555555555555', 'Equivocal', 'Open to more than one interpretation; ambiguous'),
  -- Eiken
  (uuid_generate_v4(), '22222222-3333-4444-5555-666666666666', 'Require', '必要とする (Hitsuyou to suru)'),
  (uuid_generate_v4(), '22222222-3333-4444-5555-666666666666', 'Provide', '提供する (Teikyou suru)'),
  (uuid_generate_v4(), '22222222-3333-4444-5555-666666666666', 'Improve', '改善する (Kaizen suru)'),
  (uuid_generate_v4(), '22222222-3333-4444-5555-666666666666', 'Consider', '考慮する (Kouryo suru)'),
  (uuid_generate_v4(), '22222222-3333-4444-5555-666666666666', 'Suggest', '提案する (Teian suru)'),
  -- General
  (uuid_generate_v4(), '33333333-4444-5555-6666-777777777777', 'How have you been?', '最近どうしてた？'),
  (uuid_generate_v4(), '33333333-4444-5555-6666-777777777777', 'I appreciate it.', '本当に感謝しています'),
  (uuid_generate_v4(), '33333333-4444-5555-6666-777777777777', 'Take your time.', 'ゆっくりでいいですよ'),
  (uuid_generate_v4(), '33333333-4444-5555-6666-777777777777', 'Sounds good.', 'いいね / それでいこう'),
  (uuid_generate_v4(), '33333333-4444-5555-6666-777777777777', 'I''m on my way.', '今向かっています');
