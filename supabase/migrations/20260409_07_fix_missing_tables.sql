-- Restoration of missing tables dropped by launch_schema sweep
CREATE TABLE IF NOT EXISTS daily_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  activity_date DATE DEFAULT CURRENT_DATE,
  sessions_completed INTEGER DEFAULT 0,
  UNIQUE(user_id, activity_date)
);

-- Ensure profiles has streak columns if they were dropped
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_streak_update TIMESTAMP WITH TIME ZONE;
