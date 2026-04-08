-- RPC to get the top 5 words with the highest doubt score for a user
CREATE OR REPLACE FUNCTION get_top_mistakes(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  prompt TEXT,
  answer TEXT,
  doubt_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.prompt, c.answer, ucr.doubt_score
  FROM cards c
  JOIN user_card_reviews ucr ON c.id = ucr.card_id
  WHERE ucr.user_id = p_user_id
    AND ucr.doubt_score > 0
  ORDER BY ucr.doubt_score DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;
