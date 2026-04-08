-- RPC to upsert a card review and handle SRep logic
CREATE OR REPLACE FUNCTION upsert_review(
  p_user_id UUID,
  p_card_id UUID,
  p_is_correct BOOLEAN,
  p_recall_ms INT
) RETURNS VOID AS $$
DECLARE
  v_consecutive_correct INT;
  v_doubt_score FLOAT;
  v_next_interval INT;
BEGIN
  -- 1. Get current state or set defaults
  SELECT consecutive_correct, doubt_score INTO v_consecutive_correct, v_doubt_score
  FROM user_card_reviews
  WHERE user_id = p_user_id AND card_id = p_card_id;

  IF NOT FOUND THEN
    v_consecutive_correct := 0;
    v_doubt_score := 0.0;
  END IF;

  -- 2. Update logic
  IF p_is_correct THEN
    v_consecutive_correct := v_consecutive_correct + 1;
    -- Reduce doubt on correct answer (minimum 0)
    v_doubt_score := GREATEST(0, v_doubt_score - 0.2);
  ELSE
    v_consecutive_correct := 0;
    -- Increase doubt significantly on error
    v_doubt_score := v_doubt_score + 1.0;
  END IF;

  -- 3. Simple Spaced Repetition (Days)
  -- 0 -> 1 day, 1 -> 2 days, 2 -> 4 days, 3 -> 8 days, 4+ -> 16+ days
  v_next_interval := POWER(2, LEAST(v_consecutive_correct, 4));

  -- 4. Upsert
  INSERT INTO user_card_reviews (user_id, card_id, consecutive_correct, doubt_score, last_reviewed_at, next_review_at)
  VALUES (p_user_id, p_card_id, v_consecutive_correct, v_doubt_score, NOW(), NOW() + (v_next_interval || ' days')::INTERVAL)
  ON CONFLICT (user_id, card_id) DO UPDATE SET
    consecutive_correct = EXCLUDED.consecutive_correct,
    doubt_score = EXCLUDED.doubt_score,
    last_reviewed_at = EXCLUDED.last_reviewed_at,
    next_review_at = EXCLUDED.next_review_at;

  -- 5. Log activity for streak tracking (if first session today)
  INSERT INTO daily_activity (user_id, activity_date, sessions_completed)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, activity_date) DO UPDATE SET sessions_completed = daily_activity.sessions_completed + 1;

END;
$$ LANGUAGE plpgsql;
