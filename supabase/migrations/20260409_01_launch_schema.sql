-- Petra Launch Schema (Day 1)
-- Copy and paste this directly into the Supabase SQL Editor.

-- Cleanup (Warning: Drops existing tables to enforce strict launch schema)
DROP TABLE IF EXISTS user_card_reviews CASCADE;
DROP TABLE IF EXISTS user_library_enrollments CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS library_units CASCADE;
DROP TABLE IF EXISTS libraries CASCADE;
DROP TABLE IF EXISTS daily_activity CASCADE;
DROP TABLE IF EXISTS user_card_data CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 1. Profiles (Tied to Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  daily_streak INT DEFAULT 0,
  daily_goal_progress INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Content Hierarchy
CREATE TABLE libraries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  category TEXT NOT NULL
);

CREATE TABLE library_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  library_id UUID REFERENCES libraries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sequence_order INT NOT NULL
);

CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES library_units(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  answer TEXT NOT NULL
);

-- 3. User State
CREATE TABLE user_library_enrollments (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  library_id UUID REFERENCES libraries(id) ON DELETE CASCADE,
  current_unit_id UUID REFERENCES library_units(id),
  PRIMARY KEY (user_id, library_id)
);

CREATE TABLE user_card_reviews (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  consecutive_correct INT DEFAULT 0,
  doubt_score FLOAT DEFAULT 0.0,
  next_review_at TIMESTAMPTZ DEFAULT NOW(),
  last_reviewed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, card_id)
);

-- Indexes
CREATE INDEX idx_user_reviews_next ON user_card_reviews(user_id, next_review_at);
CREATE INDEX idx_cards_unit ON cards(unit_id);
