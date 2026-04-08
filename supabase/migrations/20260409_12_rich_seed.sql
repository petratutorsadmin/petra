-- Rich seed cards showcasing contextual encoding and multi-direction recall
-- Assumes libraries/units from launch seed are present.

-- IELTS starter
INSERT INTO cards (id, unit_id, prompt, answer, translation_ja, example_sentence, collocation, related_words, topic, difficulty, recall_directions, cue)
VALUES
  ('10000000-0000-0000-0000-000000000001', '11111111-2222-3333-4444-555555555555', 'Consolidate', 'Strengthen or make more solid', '強化する・統合する', 'The team will consolidate the findings into one report.', 'consolidate gains', ARRAY['strengthen','unify'], 'Academic verbs', 'medium', ARRAY['term_to_definition','definition_to_term','en_to_ja','ja_to_en','cloze','usage'], 'pull into one'),
  ('10000000-0000-0000-0000-000000000002', '11111111-2222-3333-4444-555555555555', 'Imminent', 'About to happen', '差し迫った', 'The launch is imminent after months of preparation.', 'imminent deadline', ARRAY['upcoming','looming'], 'Academic adjectives', 'medium', ARRAY['term_to_definition','definition_to_term','en_to_ja','ja_to_en','cloze'], 'soon');

-- Eiken starter
INSERT INTO cards (id, unit_id, prompt, answer, translation_ja, example_sentence, collocation, related_words, topic, difficulty, recall_directions, cue)
VALUES
  ('20000000-0000-0000-0000-000000000001', '22222222-3333-4444-5555-666666666666', 'Assess', '評価する', '評価する', 'Teachers assess students with a short quiz.', 'assess risk', ARRAY['evaluate','measure'], 'Essential verbs', 'easy', ARRAY['term_to_definition','definition_to_term','ja_to_en','en_to_ja','usage'], 'judge value'),
  ('20000000-0000-0000-0000-000000000002', '22222222-3333-4444-5555-666666666666', 'Allocate', '割り当てる', '割り当てる', 'We allocate time for questions at the end.', 'allocate budget', ARRAY['assign','distribute'], 'Essential verbs', 'medium', ARRAY['term_to_definition','ja_to_en','en_to_ja','cloze'], 'give a portion');

-- JP -> EN starter (same dialogue unit)
INSERT INTO cards (id, unit_id, prompt, answer, translation_ja, example_sentence, collocation, related_words, topic, difficulty, recall_directions, cue)
VALUES
  ('30000000-0000-0000-0000-000000000001', '33333333-4444-5555-6666-777777777777', '差し支えなければ', 'If you don''t mind', 'If you don''t mind', '差し支えなければ、窓を開けてもいいですか。', 'if you don''t mind me asking', ARRAY['polite request'], 'Polite dialogue', 'easy', ARRAY['ja_to_en','term_to_definition','usage'], 'soft ask'),
  ('30000000-0000-0000-0000-000000000002', '33333333-4444-5555-6666-777777777777', 'お手数ですが', 'Sorry for the trouble, but...', 'Sorry for the trouble, but...', 'お手数ですが、こちらに署名してください。', 'sorry for the trouble', ARRAY['apology','request'], 'Polite dialogue', 'easy', ARRAY['ja_to_en','usage','cloze'], 'apology + request');

-- EN -> JP starter (dialogue unit)
INSERT INTO cards (id, unit_id, prompt, answer, translation_ja, example_sentence, collocation, related_words, topic, difficulty, recall_directions, cue)
VALUES
  ('40000000-0000-0000-0000-000000000001', '33333333-4444-5555-6666-777777777777', 'I''ll pass for now.', '今は遠慮しておきます', '今は遠慮しておきます', 'Thanks for the offer, but I''ll pass for now.', 'politely decline', ARRAY['decline','skip'], 'Refusal', 'easy', ARRAY['en_to_ja','term_to_definition','usage'], 'gentle no'),
  ('40000000-0000-0000-0000-000000000002', '33333333-4444-5555-6666-777777777777', 'Let''s circle back.', '後でまた話そう', '後でまた話そう', 'Let''s circle back after we gather feedback.', 'circle back later', ARRAY['return','follow-up'], 'Meetings', 'medium', ARRAY['term_to_definition','en_to_ja','cloze','usage'], 'come back to it');
