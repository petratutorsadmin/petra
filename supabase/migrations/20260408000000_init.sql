-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles: User data and mastery state
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  mastery_score INTEGER DEFAULT 0,
  ability_tier TEXT DEFAULT 'Bronze I',
  petra_energy INTEGER DEFAULT 5,
  last_trained_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Decks: Collections of related learning material
CREATE TABLE decks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cards: The actual learning content (Stimulus/Response)
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deck_id UUID REFERENCES decks(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL, -- The "Question" or Stimulus
  answer TEXT NOT NULL, -- The Correct Response
  context TEXT,         -- Optional guidance or hints
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Card Data: Spaced Repetition State
CREATE TABLE user_card_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  interval FLOAT DEFAULT 0,       -- Days until next review
  ease_factor FLOAT DEFAULT 2.5,  -- S-Rep ease factor
  last_recall_ms INTEGER,         -- Speed of last correct recall
  consecutive_correct INTEGER DEFAULT 0,
  doubt_score FLOAT DEFAULT 0,    -- Higher = more failures/slow recalls
  next_review_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, card_id)
);

-- Sessions: Activity logs for progress tracking
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  cards_reviewed INTEGER NOT NULL,
  cards_correct INTEGER NOT NULL,
  average_recall_ms FLOAT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
