-- Petra Launch Streak RPC
-- Copy and paste this directly into the Supabase SQL Editor.

CREATE OR REPLACE FUNCTION update_daily_streak(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- For MVP Day 1-3, we simply increment.
  -- In a full implementation, this checks last_login_date to properly reset or maintain the streak.
  UPDATE profiles
  SET daily_streak = COALESCE(daily_streak, 0) + 1
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;
