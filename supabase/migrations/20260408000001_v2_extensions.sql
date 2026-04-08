-- Content Libraries: Curated sources of learning material
CREATE TABLE libraries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'Eiken', 'IELTS', 'Business', etc.
  description TEXT,
  icon_url TEXT,
  is_official BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pathways: Structured sequences of units within a library
CREATE TABLE pathways (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  library_id UUID REFERENCES libraries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  requirements JSONB DEFAULT '[]', -- Pre-requisite pathway IDs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Pathways: Tracking progress in a guided sequence
CREATE TABLE user_pathways (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  pathway_id UUID REFERENCES pathways(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active', -- 'active', 'completed'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, pathway_id)
);

-- Shared Decks: Scalable user-created content
CREATE TABLE shared_decks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deck_id UUID REFERENCES decks(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES profiles(id),
  is_public BOOLEAN DEFAULT false,
  neural_rating FLOAT DEFAULT 0, -- Quality score based on usage
  usage_count INTEGER DEFAULT 0,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stimulus Types for Cards: Supporting Output Layer
ALTER TABLE cards ADD COLUMN stimulus_type TEXT DEFAULT 'recall'; -- 'recall', 'scramble', 'writing', 'speaking'
ALTER TABLE cards ADD COLUMN meta_data JSONB DEFAULT '{}'; -- For scramble blocks, context patterns, etc.
