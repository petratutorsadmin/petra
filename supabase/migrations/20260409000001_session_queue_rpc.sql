-- Create the Daily Session Queue RPC
-- Strictly returns exactly 15 cards (or less if the entire system is empty)
-- Priority: 1. Weak (max 3), 2. Review (max 7), 3. New (fill remainder)

CREATE OR REPLACE FUNCTION get_daily_queue(p_user_id UUID, p_library_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  prompt TEXT,
  answer TEXT,
  reason TEXT -- 'weak', 'review', or 'new'
) AS $$
DECLARE
  weak_limit INT := 3;
  review_limit INT := 7;
  total_limit INT := 15;
  weak_count INT := 0;
  review_count INT := 0;
BEGIN
  -- 1. Fetch Weak Cards (Recently failed or high doubt)
  -- For this MVP, we consider cards with consecutive_correct = 0 and last_reviewed_at IS NOT NULL as weak
  RETURN QUERY
  SELECT c.id, c.prompt, c.answer, 'weak'::TEXT as reason
  FROM cards c
  JOIN user_card_reviews ucr ON c.id = ucr.card_id
  LEFT JOIN library_units lu ON c.unit_id = lu.id
  WHERE ucr.user_id = p_user_id
    AND ucr.consecutive_correct = 0
    AND ucr.last_reviewed_at IS NOT NULL
    AND (p_library_id IS NULL OR lu.library_id = p_library_id)
  ORDER BY ucr.doubt_score DESC
  LIMIT weak_limit;

  GET DIAGNOSTICS weak_count = ROW_COUNT;

  -- 2. Fetch Due Reviews (next_review_at <= NOW)
  RETURN QUERY
  SELECT c.id, c.prompt, c.answer, 'review'::TEXT as reason
  FROM cards c
  JOIN user_card_reviews ucr ON c.id = ucr.card_id
  LEFT JOIN library_units lu ON c.unit_id = lu.id
  WHERE ucr.user_id = p_user_id
    AND ucr.consecutive_correct > 0
    AND ucr.next_review_at <= NOW()
    AND (p_library_id IS NULL OR lu.library_id = p_library_id)
  ORDER BY ucr.next_review_at ASC
  LIMIT (review_limit + (weak_limit - weak_count)); -- Borrow unused weak slots

  GET DIAGNOSTICS review_count = ROW_COUNT;

  -- 3. Fetch New Cards (To fill the remainder up to 15 slots)
  -- We prioritize cards from the user's active pathway. If none, grab random unstudied cards.
  RETURN QUERY
  SELECT c.id, c.prompt, c.answer, 'new'::TEXT as reason
  FROM cards c
  LEFT JOIN user_card_reviews ucr ON c.id = ucr.card_id AND ucr.user_id = p_user_id
  LEFT JOIN library_units lu ON c.unit_id = lu.id
  WHERE ucr.card_id IS NULL -- Card has never been studied
    AND (p_library_id IS NULL OR lu.library_id = p_library_id)
  ORDER BY lu.sequence_order ASC, c.id ASC
  LIMIT (total_limit - weak_count - review_count);

END;
$$ LANGUAGE plpgsql;
