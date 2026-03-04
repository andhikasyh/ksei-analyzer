CREATE TABLE IF NOT EXISTS public.stock_news (
  id SERIAL PRIMARY KEY,
  stock_code TEXT NOT NULL,
  headline TEXT NOT NULL,
  source TEXT,
  url TEXT,
  published_at DATE,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(stock_code, headline)
);

CREATE INDEX IF NOT EXISTS idx_stock_news_code
  ON public.stock_news (stock_code, scraped_at DESC);

ALTER TABLE public.stock_news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read" ON public.stock_news;
CREATE POLICY "Allow public read"
  ON public.stock_news
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow insert" ON public.stock_news;
CREATE POLICY "Allow insert"
  ON public.stock_news
  FOR INSERT
  TO anon
  WITH CHECK (true);
