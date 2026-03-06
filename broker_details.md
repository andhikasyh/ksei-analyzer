# Bandarmology Data Pipeline

Fetches broker transaction activity from Stockbit and aggregates it into analytics-ready tables in Supabase.

---

## Data Flow

```
Stockbit API
    |
    v
idx_broker_activity          (raw intraday time-series, ~200k rows/scrape)
    |
    v  refresh_ba_daily_summary()
idx_ba_daily_summary         (totals per broker+symbol+period+date)
    |
    v  refresh_ba_rankings()
idx_ba_stock_ranking         (top brokers per stock)
idx_ba_broker_ranking        (top stocks per broker)
    |
    v  views (no storage)
v_ba_foreign_flow            (foreign % per stock)
v_ba_leaderboard             (HHI concentration score per stock)
```

---

## Tables

### `idx_broker_activity` — Raw source

One row per time-series data point scraped from Stockbit. Not queried by the frontend directly.

| Column | Type | Example |
|---|---|---|
| `broker_code` | `text` | `YP` |
| `symbol` | `text` | `BBCA` |
| `period` | `text` | `1D` |
| `investor_type` | `text` | `ALL`, `FOREIGN`, `RETAIL`, `NON_RETAIL` |
| `market_board` | `text` | `REGULAR` |
| `chart_type` | `text` | `TYPE_CHART_VALUE`, `TYPE_CHART_VOLUME` |
| `date` | `date` | `2026-03-05` |
| `time` | `text` | `09:30` |
| `datetime_label` | `text` | `09:30 WIB` |
| `value_raw` | `numeric` | `15420000000` |
| `value_formatted` | `text` | `15.42B` |

---

### `idx_ba_daily_summary` — ETL aggregate

One row per `(broker, symbol, period, investor_type, board, date)`. Collapses all intraday time-series points into daily totals. Primary table for analytics queries.

| Column | Type | Example |
|---|---|---|
| `broker_code` | `text` | `YP` |
| `symbol` | `text` | `BBCA` |
| `period` | `text` | `1D` |
| `investor_type` | `text` | `ALL` |
| `market_board` | `text` | `REGULAR` |
| `date` | `date` | `2026-03-05` |
| `total_value` | `numeric` | `85200000000` (IDR) |
| `total_volume` | `numeric` | `12400000` (shares) |
| `data_points` | `integer` | `48` |
| `peak_time` | `text` | `14:00` (time of highest value bucket) |

Sample query — most active brokers in BBCA today:
```sql
SELECT broker_code, total_value, total_volume, peak_time
FROM idx_ba_daily_summary
WHERE symbol = 'BBCA' AND period = '1D' AND investor_type = 'ALL'
  AND date = CURRENT_DATE
ORDER BY total_value DESC
LIMIT 10;
```

---

### `idx_ba_stock_ranking` — Top brokers per stock

Rebuilt on every ETL run. Adds `value_share` (%) and `rank` derived from `idx_ba_daily_summary`.

| Column | Type | Example |
|---|---|---|
| `symbol` | `text` | `BBCA` |
| `period` | `text` | `1D` |
| `investor_type` | `text` | `ALL` |
| `market_board` | `text` | `REGULAR` |
| `date` | `date` | `2026-03-05` |
| `broker_code` | `text` | `YP` |
| `total_value` | `numeric` | `85200000000` |
| `total_volume` | `numeric` | `12400000` |
| `value_share` | `numeric` | `34.21` (% of total value for that stock) |
| `rank` | `integer` | `1` |

Sample query — bandarmology view for a single stock:
```sql
SELECT broker_code, total_value, value_share, rank
FROM idx_ba_stock_ranking
WHERE symbol = 'GOTO' AND period = '1D' AND investor_type = 'ALL'
  AND date = CURRENT_DATE
ORDER BY rank
LIMIT 20;
```

---

### `idx_ba_broker_ranking` — Top stocks per broker

Mirror of `idx_ba_stock_ranking` pivoted by broker. Rebuilt on every ETL run.

| Column | Type | Example |
|---|---|---|
| `broker_code` | `text` | `YP` |
| `period` | `text` | `1D` |
| `investor_type` | `text` | `ALL` |
| `market_board` | `text` | `REGULAR` |
| `date` | `date` | `2026-03-05` |
| `symbol` | `text` | `BBCA` |
| `total_value` | `numeric` | `85200000000` |
| `total_volume` | `numeric` | `12400000` |
| `value_share` | `numeric` | `12.50` (% of that broker's total activity) |
| `rank` | `integer` | `1` |

Sample query — broker profile page (what did broker YP trade today?):
```sql
SELECT symbol, total_value, value_share, rank
FROM idx_ba_broker_ranking
WHERE broker_code = 'YP' AND period = '1D' AND investor_type = 'ALL'
  AND date = CURRENT_DATE
ORDER BY rank
LIMIT 20;
```

---

## Views

### `v_ba_foreign_flow`

Foreign vs. domestic transaction split per stock per day. Requires both `ALL` and `FOREIGN` investor types to have been scraped.

| Column | Type | Example |
|---|---|---|
| `symbol` | `text` | `BBCA` |
| `period` | `text` | `1D` |
| `market_board` | `text` | `REGULAR` |
| `date` | `date` | `2026-03-05` |
| `total_value_all` | `numeric` | `249000000000` |
| `total_value_foreign` | `numeric` | `87150000000` |
| `foreign_pct` | `numeric` | `35.00` |
| `total_volume_all` | `numeric` | `36200000` |
| `total_volume_foreign` | `numeric` | `12670000` |

Sample query — foreign flow chart data:
```sql
SELECT date, foreign_pct, total_value_foreign, total_value_all
FROM v_ba_foreign_flow
WHERE symbol = 'BBCA' AND period = '1M'
ORDER BY date;
```

---

### `v_ba_leaderboard`

HHI (Herfindahl-Hirschman Index) concentration score per stock. Higher score = fewer brokers dominating = stronger bandar signal. Max score is 10,000 (one broker controls 100%).

| Column | Type | Example |
|---|---|---|
| `symbol` | `text` | `GOTO` |
| `period` | `text` | `1D` |
| `investor_type` | `text` | `ALL` |
| `market_board` | `text` | `REGULAR` |
| `date` | `date` | `2026-03-05` |
| `active_brokers` | `bigint` | `8` |
| `total_value` | `numeric` | `120000000000` |
| `hhi_score` | `numeric` | `3240.50` |
| `top_broker_value` | `numeric` | `65000000000` |
| `top_rank` | `integer` | `1` |

Sample query — today's top 20 most bandar-concentrated stocks:
```sql
SELECT symbol, hhi_score, active_brokers, total_value
FROM v_ba_leaderboard
WHERE period = '1D' AND investor_type = 'ALL' AND date = CURRENT_DATE
LIMIT 20;
```

---

## ETL Functions

Both functions are called automatically by `scrape_stockbit_bandarmology.py` after each scrape. They can also be triggered manually.

```sql
-- Step 1: aggregate raw rows into daily totals
SELECT refresh_ba_daily_summary('1D', CURRENT_DATE);

-- Step 2: compute rankings and value shares
SELECT refresh_ba_rankings('1D', CURRENT_DATE);
```

---

## Running the Scraper

```bash
# Default: all brokers, 1D period, ALL investors, REGULAR board
cd python && uv run scrape_stockbit_bandarmology.py

# Specific period
uv run scrape_stockbit_bandarmology.py --period 1M

# Specific brokers only
uv run scrape_stockbit_bandarmology.py --brokers YP ZP RX

# Foreign investors only
uv run scrape_stockbit_bandarmology.py --investor-type FOREIGN

# Via the full daily pipeline
uv run run_daily.py --only bandarmology
uv run run_daily.py --bandarmology-period 1M
```

Available values:

| Argument | Options |
|---|---|
| `--period` | `1D` `5D` `1M` `3M` `6M` `1Y` |
| `--investor-type` | `ALL` `FOREIGN` `NON_RETAIL` `RETAIL` |
| `--board` | `REGULAR` `NEGOTIATION` `CASH` |

---

## Setup

1. Add your Stockbit JWT to `python/.env`:
   ```
   STOCKBIT_TOKEN=eyJ...
   ```
2. Run the migration once in the [Supabase SQL Editor](https://supabase.com/dashboard/project/uwpexyqgeydelhcgando/sql/new):
   ```
   python/migrate_bandarmology_etl.sql
   ```
3. Run the scraper.

The JWT has a long expiration. Update `STOCKBIT_TOKEN` in `.env` when requests start returning 401.
