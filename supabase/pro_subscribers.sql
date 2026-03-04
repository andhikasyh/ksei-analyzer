-- Pro subscribers table for Mayar.id payment integration
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.pro_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  plan text NOT NULL DEFAULT 'monthly',
  mayar_order_id text,
  mayar_payment_link_id text,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pro_subscribers_user_id ON public.pro_subscribers(user_id);
CREATE INDEX IF NOT EXISTS idx_pro_subscribers_email ON public.pro_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_pro_subscribers_status ON public.pro_subscribers(status);

-- Enable RLS
ALTER TABLE public.pro_subscribers ENABLE ROW LEVEL SECURITY;

-- Users can only read their own subscription
DROP POLICY IF EXISTS "Users read own subscription" ON public.pro_subscribers;
CREATE POLICY "Users read own subscription"
  ON public.pro_subscribers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only service role can insert/update (webhook from Mayar)
-- service_role bypasses RLS

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_pro_subscribers_updated_at ON public.pro_subscribers;
CREATE TRIGGER update_pro_subscribers_updated_at
  BEFORE UPDATE ON public.pro_subscribers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
