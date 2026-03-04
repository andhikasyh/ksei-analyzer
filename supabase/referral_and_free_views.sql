-- Referral codes table
-- Each code has a quota (max total uses) and tracks who used it

CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  quota integer NOT NULL DEFAULT 10,
  used_count integer NOT NULL DEFAULT 0,
  free_months integer NOT NULL DEFAULT 1,
  created_by text,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);

-- Tracks which users redeemed which codes (prevents double-redeem)
CREATE TABLE IF NOT EXISTS public.referral_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.referral_codes(id),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, code_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_redemptions_user ON public.referral_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_redemptions_code ON public.referral_redemptions(code_id);

-- Tracks how many free insight views a logged-in free user has consumed
CREATE TABLE IF NOT EXISTS public.free_insight_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_free_insight_views_user ON public.free_insight_views(user_id);

-- RLS policies

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can read active codes" ON public.referral_codes;
CREATE POLICY "Anon can read active codes"
  ON public.referral_codes FOR SELECT TO anon, authenticated
  USING (active = true);

ALTER TABLE public.referral_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own redemptions" ON public.referral_redemptions;
CREATE POLICY "Users read own redemptions"
  ON public.referral_redemptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE public.free_insight_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own view count" ON public.free_insight_views;
CREATE POLICY "Users read own view count"
  ON public.free_insight_views FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
-- service_role handles inserts/updates via API routes
