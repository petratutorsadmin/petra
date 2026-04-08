-- Add streak_days to profiles
ALTER TABLE profiles ADD COLUMN streak_days INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN last_streak_update TIMESTAMP WITH TIME ZONE;

-- Add a sessions_log to track daily participation more accurately
CREATE TABLE daily_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  activity_date DATE DEFAULT CURRENT_DATE,
  sessions_completed INTEGER DEFAULT 0,
  UNIQUE(user_id, activity_date)
);
