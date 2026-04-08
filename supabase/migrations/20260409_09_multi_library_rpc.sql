-- Updated Daily Session Queue RPC to support multiple Libraries (Shuffling)
CREATE OR REPLACE FUNCTION get_daily_queue(p_user_id UUID, p_library_ids UUID[] DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  prompt TEXT,
  answer TEXT,
  reason TEXT
) AS $$
DECLARE
  weak_limit INT := 3;
  review_limit INT := 7;
  total_limit INT := 15;
  weak_count INT := 0;
  review_count INT := 0;
BEGIN
  -- 1. Fetch Weak Cards
  RETURN QUERY
  SELECT c.id, c.prompt, c.answer, 'weak'::TEXT as reason
  FROM cards c
  JOIN user_card_reviews ucr ON c.id = ucr.card_id
  LEFT JOIN library_units lu ON c.unit_id = lu.id
  WHERE ucr.user_id = p_user_id
    AND ucr.consecutive_correct = 0
    AND ucr.last_reviewed_at IS NOT NULL
    AND (p_library_ids IS NULL OR lu.library_id = ANY(p_library_ids))
  ORDER BY ucr.doubt_score DESC
  LIMIT weak_limit;

  GET DIAGNOSTICS weak_count = ROW_COUNT;

  -- 2. Fetch Due Reviews
  RETURN QUERY
  SELECT c.id, c.prompt, c.answer, 'review'::TEXT as reason
  FROM cards c
  JOIN user_card_reviews ucr ON c.id = ucr.card_id
  LEFT JOIN library_units lu ON c.unit_id = lu.id
  WHERE ucr.user_id = p_user_id
    AND ucr.consecutive_correct > 0
    AND ucr.next_review_at <= NOW()
    AND (p_library_ids IS NULL OR lu.library_id = ANY(p_library_ids))
  ORDER BY ucr.next_review_at ASC
  LIMIT (review_limit + (weak_limit - weak_count));

  GET DIAGNOSTICS review_count = ROW_COUNT;

  -- 3. Fetch New Cards
  RETURN QUERY
  SELECT c.id, c.prompt, c.answer, 'new'::TEXT as reason
  FROM cards c
  LEFT JOIN user_card_reviews ucr ON c.id = ucr.card_id AND ucr.user_id = p_user_id
  LEFT JOIN library_units lu ON c.unit_id = lu.id
  WHERE ucr.card_id IS NULL 
    AND (p_library_ids IS NULL OR lu.library_id = ANY(p_library_ids))
  ORDER BY lu.sequence_order ASC, c.id ASC
  LIMIT (total_limit - weak_count - review_count);

END;
$$ LANGUAGE plpgsql;
