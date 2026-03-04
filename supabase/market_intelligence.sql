-- market_intelligence: stores daily AI-generated market analysis reports
CREATE TABLE IF NOT EXISTS public.market_intelligence (
  id SERIAL PRIMARY KEY,
  report_date DATE NOT NULL UNIQUE,
  report JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_intelligence_date
  ON public.market_intelligence (report_date DESC);

ALTER TABLE public.market_intelligence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read" ON public.market_intelligence;
CREATE POLICY "Allow public read"
  ON public.market_intelligence
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow insert" ON public.market_intelligence;
CREATE POLICY "Allow insert"
  ON public.market_intelligence
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update" ON public.market_intelligence;
CREATE POLICY "Allow update"
  ON public.market_intelligence
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
