CREATE TABLE IF NOT EXISTS public.user_dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My Dashboard',
  layout jsonb NOT NULL DEFAULT '[]'::jsonb,
  link_groups jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_user_dashboards_user ON public.user_dashboards(user_id);

ALTER TABLE public.user_dashboards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own dashboards" ON public.user_dashboards;
CREATE POLICY "Users read own dashboards"
  ON public.user_dashboards FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own dashboards" ON public.user_dashboards;
CREATE POLICY "Users manage own dashboards"
  ON public.user_dashboards FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
