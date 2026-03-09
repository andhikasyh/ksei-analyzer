CREATE TABLE IF NOT EXISTS public.user_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stock_code text NOT NULL,
  shares numeric NOT NULL DEFAULT 0,
  avg_price numeric NOT NULL DEFAULT 0,
  notes text,
  entry_date date DEFAULT CURRENT_DATE,
  closed_at date,
  close_price numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, stock_code)
);

ALTER TABLE public.user_portfolios ADD COLUMN IF NOT EXISTS entry_date date DEFAULT CURRENT_DATE;
ALTER TABLE public.user_portfolios ADD COLUMN IF NOT EXISTS closed_at date;
ALTER TABLE public.user_portfolios ADD COLUMN IF NOT EXISTS close_price numeric;

CREATE INDEX IF NOT EXISTS idx_user_portfolios_user ON public.user_portfolios(user_id);

ALTER TABLE public.user_portfolios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own portfolios" ON public.user_portfolios;
CREATE POLICY "Users read own portfolios"
  ON public.user_portfolios FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own portfolios" ON public.user_portfolios;
CREATE POLICY "Users manage own portfolios"
  ON public.user_portfolios FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
