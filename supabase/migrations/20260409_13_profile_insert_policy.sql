-- Ensure users can create their own profile row (fix FK errors on user_card_reviews)
-- Safe to run multiple times.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can insert own profile' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Users can insert own profile" ON profiles
      FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END$$;
