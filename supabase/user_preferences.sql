-- User preferences (e.g. locale) for authenticated users
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  locale text NOT NULL DEFAULT 'id' CHECK (locale IN ('id', 'en')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON public.user_preferences(user_id);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own preferences" ON public.user_preferences;
CREATE POLICY "Users read own preferences"
  ON public.user_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own preferences" ON public.user_preferences;
CREATE POLICY "Users update own preferences"
  ON public.user_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own preferences" ON public.user_preferences;
CREATE POLICY "Users insert own preferences"
  ON public.user_preferences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
