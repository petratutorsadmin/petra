-- Petra Security & Automation Migration
-- 1. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_card_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_library_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- 2. Define Policies

-- Profiles: Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- User Card Reviews: Restricted to owner
CREATE POLICY "Users can view own reviews" ON user_card_reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reviews" ON user_card_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON user_card_reviews FOR UPDATE USING (auth.uid() = user_id);

-- User Library Enrollments: Restricted to owner
CREATE POLICY "Users can view own enrollments" ON user_library_enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own enrollments" ON user_library_enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Daily Activity: Restricted to owner
CREATE POLICY "Users can view own activity" ON daily_activity FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert own activity" ON daily_activity FOR ALL USING (auth.uid() = user_id);

-- Content (Libraries, Units, Cards): Authenticated users can view all, but not modify
CREATE POLICY "Authenticated users can view content" ON libraries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view units" ON library_units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view cards" ON cards FOR SELECT TO authenticated USING (true);

-- 3. Automation: Create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
