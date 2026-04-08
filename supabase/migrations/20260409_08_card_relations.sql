-- Petra Card Relations Schema
CREATE TABLE IF NOT EXISTS card_relations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_a_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  card_b_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  relation_type TEXT DEFAULT 'semantic', -- e.g. 'synonym', 'antonym', 'semantic', 'etymological'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_relation UNIQUE(card_a_id, card_b_id)
);

-- Enable RLS
ALTER TABLE card_relations ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view relations
CREATE POLICY "Authenticated users can view relations" ON card_relations
FOR SELECT TO authenticated USING (true);

-- Indexes for performance
CREATE INDEX idx_relations_a ON card_relations(card_a_id);
CREATE INDEX idx_relations_b ON card_relations(card_b_id);

-- Example Seeds (Linking academic verbs)
DO $$
DECLARE
  card_req UUID;
  card_prov UUID;
  card_sugg UUID;
BEGIN
  SELECT id INTO card_req FROM cards WHERE prompt = 'Require' LIMIT 1;
  SELECT id INTO card_prov FROM cards WHERE prompt = 'Provide' LIMIT 1;
  SELECT id INTO card_sugg FROM cards WHERE prompt = 'Suggest' LIMIT 1;

  IF card_req IS NOT NULL AND card_prov IS NOT NULL THEN
    INSERT INTO card_relations (card_a_id, card_b_id, relation_type) 
    VALUES (card_req, card_prov, 'semantic')
    ON CONFLICT DO NOTHING;
  END IF;

  IF card_prov IS NOT NULL AND card_sugg IS NOT NULL THEN
    INSERT INTO card_relations (card_a_id, card_b_id, relation_type) 
    VALUES (card_prov, card_sugg, 'semantic')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
