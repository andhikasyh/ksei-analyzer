-- ============================================================
-- RLS Policies: Public Read-Only for All Tables
-- Run this in the Supabase SQL Editor or via CLI.
--
-- Effect:
--   - anon role can SELECT (read) all rows
--   - No INSERT, UPDATE, or DELETE allowed via anon key
--   - service_role bypasses RLS entirely (Supabase default)
-- ============================================================

BEGIN;

-- main_db
ALTER TABLE public.main_db ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.main_db;
CREATE POLICY "Allow public read"
  ON public.main_db
  FOR SELECT
  TO anon
  USING (true);

-- idx_companies
ALTER TABLE public.idx_companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.idx_companies;
CREATE POLICY "Allow public read"
  ON public.idx_companies
  FOR SELECT
  TO anon
  USING (true);

-- idx_financial_ratios
ALTER TABLE public.idx_financial_ratios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.idx_financial_ratios;
CREATE POLICY "Allow public read"
  ON public.idx_financial_ratios
  FOR SELECT
  TO anon
  USING (true);

-- idx_stock_summary
ALTER TABLE public.idx_stock_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.idx_stock_summary;
CREATE POLICY "Allow public read"
  ON public.idx_stock_summary
  FOR SELECT
  TO anon
  USING (true);

-- idx_dividends
ALTER TABLE public.idx_dividends ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.idx_dividends;
CREATE POLICY "Allow public read"
  ON public.idx_dividends
  FOR SELECT
  TO anon
  USING (true);

-- idx_shareholders
ALTER TABLE public.idx_shareholders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.idx_shareholders;
CREATE POLICY "Allow public read"
  ON public.idx_shareholders
  FOR SELECT
  TO anon
  USING (true);

-- idx_company_directors
ALTER TABLE public.idx_company_directors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.idx_company_directors;
CREATE POLICY "Allow public read"
  ON public.idx_company_directors
  FOR SELECT
  TO anon
  USING (true);

-- idx_company_commissioners
ALTER TABLE public.idx_company_commissioners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.idx_company_commissioners;
CREATE POLICY "Allow public read"
  ON public.idx_company_commissioners
  FOR SELECT
  TO anon
  USING (true);

-- idx_company_secretaries
ALTER TABLE public.idx_company_secretaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.idx_company_secretaries;
CREATE POLICY "Allow public read"
  ON public.idx_company_secretaries
  FOR SELECT
  TO anon
  USING (true);

-- idx_subsidiaries
ALTER TABLE public.idx_subsidiaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.idx_subsidiaries;
CREATE POLICY "Allow public read"
  ON public.idx_subsidiaries
  FOR SELECT
  TO anon
  USING (true);

-- idx_audit_committee
ALTER TABLE public.idx_audit_committee ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.idx_audit_committee;
CREATE POLICY "Allow public read"
  ON public.idx_audit_committee
  FOR SELECT
  TO anon
  USING (true);

-- idx_bonds
ALTER TABLE public.idx_bonds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.idx_bonds;
CREATE POLICY "Allow public read"
  ON public.idx_bonds
  FOR SELECT
  TO anon
  USING (true);

-- idx_stock_splits
ALTER TABLE public.idx_stock_splits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.idx_stock_splits;
CREATE POLICY "Allow public read"
  ON public.idx_stock_splits
  FOR SELECT
  TO anon
  USING (true);

-- idx_corporate_actions
ALTER TABLE public.idx_corporate_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.idx_corporate_actions;
CREATE POLICY "Allow public read"
  ON public.idx_corporate_actions
  FOR SELECT
  TO anon
  USING (true);

-- idx_broker_summary
ALTER TABLE public.idx_broker_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.idx_broker_summary;
CREATE POLICY "Allow public read"
  ON public.idx_broker_summary
  FOR SELECT
  TO anon
  USING (true);

-- idx_brokers
ALTER TABLE public.idx_brokers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.idx_brokers;
CREATE POLICY "Allow public read"
  ON public.idx_brokers
  FOR SELECT
  TO anon
  USING (true);

-- idx_delistings
ALTER TABLE public.idx_delistings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.idx_delistings;
CREATE POLICY "Allow public read"
  ON public.idx_delistings
  FOR SELECT
  TO anon
  USING (true);

-- idx_index_summary
ALTER TABLE public.idx_index_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.idx_index_summary;
CREATE POLICY "Allow public read"
  ON public.idx_index_summary
  FOR SELECT
  TO anon
  USING (true);

-- idx_calendar_events
ALTER TABLE public.idx_calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.idx_calendar_events;
CREATE POLICY "Allow public read"
  ON public.idx_calendar_events
  FOR SELECT
  TO anon
  USING (true);

COMMIT;
