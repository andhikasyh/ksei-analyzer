-- Migration: add image_url and title columns to market_intelligence
ALTER TABLE public.market_intelligence
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT;
