CREATE TABLE IF NOT EXISTS idx_ba_daily_summary (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  broker_code text NOT NULL,
  symbol text NOT NULL,
  period text NOT NULL,
  investor_type text NOT NULL,
  market_board text NOT NULL,
  date date NOT NULL,
  net_value  numeric DEFAULT 0,
  b_val      numeric DEFAULT 0,
  s_val      numeric DEFAULT 0,
  net_volume numeric DEFAULT 0,
  b_lot      numeric DEFAULT 0,
  s_lot      numeric DEFAULT 0,
  data_points integer DEFAULT 0,
  peak_time text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(broker_code, symbol, period, investor_type, market_board, date)
);

CREATE INDEX IF NOT EXISTS idx_bads_symbol   ON idx_ba_daily_summary(symbol, date);
CREATE INDEX IF NOT EXISTS idx_bads_broker   ON idx_ba_daily_summary(broker_code, date);
CREATE INDEX IF NOT EXISTS idx_bads_period   ON idx_ba_daily_summary(period, date);
CREATE INDEX IF NOT EXISTS idx_bads_investor ON idx_ba_daily_summary(investor_type, date);

CREATE TABLE IF NOT EXISTS idx_ba_stock_ranking (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  symbol text NOT NULL,
  period text NOT NULL,
  investor_type text NOT NULL,
  market_board text NOT NULL,
  date date NOT NULL,
  broker_code text NOT NULL,
  net_value  numeric DEFAULT 0,
  b_val      numeric DEFAULT 0,
  s_val      numeric DEFAULT 0,
  net_volume numeric DEFAULT 0,
  b_lot      numeric DEFAULT 0,
  s_lot      numeric DEFAULT 0,
  value_share numeric DEFAULT 0,
  rank integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(symbol, period, investor_type, market_board, date, broker_code)
);

CREATE INDEX IF NOT EXISTS idx_basr_symbol ON idx_ba_stock_ranking(symbol, period, date);
CREATE INDEX IF NOT EXISTS idx_basr_rank   ON idx_ba_stock_ranking(symbol, date, rank);

CREATE TABLE IF NOT EXISTS idx_ba_broker_ranking (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  broker_code text NOT NULL,
  period text NOT NULL,
  investor_type text NOT NULL,
  market_board text NOT NULL,
  date date NOT NULL,
  symbol text NOT NULL,
  net_value  numeric DEFAULT 0,
  b_val      numeric DEFAULT 0,
  s_val      numeric DEFAULT 0,
  net_volume numeric DEFAULT 0,
  b_lot      numeric DEFAULT 0,
  s_lot      numeric DEFAULT 0,
  value_share numeric DEFAULT 0,
  rank integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(broker_code, period, investor_type, market_board, date, symbol)
);

CREATE INDEX IF NOT EXISTS idx_babr_broker ON idx_ba_broker_ranking(broker_code, period, date);
CREATE INDEX IF NOT EXISTS idx_babr_rank   ON idx_ba_broker_ranking(broker_code, date, rank);

-- ---------------------------------------------------------------------------
-- Step 4: ETL functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION refresh_ba_daily_summary(p_period text, p_date date)
RETURNS void
LANGUAGE plpgsql
SET statement_timeout = '300s'
AS $$
BEGIN
  DELETE FROM idx_ba_daily_summary
  WHERE period = p_period AND date = p_date;

  -- For 1D the API returns minute-by-minute CUMULATIVE running totals.
  -- The final tick (latest time) holds the true end-of-day net value.
  -- For all other periods (1M/3M/6M/1Y/RANGE) each row is already a
  -- complete daily net, so we just take the single value per (broker,symbol,date).
  INSERT INTO idx_ba_daily_summary (
    broker_code, symbol, period, investor_type, market_board, date,
    net_value, b_val, s_val,
    net_volume, b_lot, s_lot,
    data_points, peak_time
  )
  WITH last_tick AS (
    SELECT DISTINCT ON (broker_code, symbol, period, investor_type, market_board, date, chart_type)
      broker_code, symbol, period, investor_type, market_board, date, chart_type,
      value_raw AS final_value
    FROM idx_broker_activity
    WHERE period = p_period AND date = p_date
    ORDER BY broker_code, symbol, period, investor_type, market_board, date, chart_type,
             time DESC NULLS LAST
  ),
  peak AS (
    SELECT DISTINCT ON (broker_code, symbol, period, investor_type, market_board, date)
      broker_code, symbol, period, investor_type, market_board, date,
      time AS peak_time
    FROM idx_broker_activity
    WHERE period = p_period AND date = p_date AND chart_type = 'TYPE_CHART_VALUE'
    ORDER BY broker_code, symbol, period, investor_type, market_board, date,
             ABS(value_raw) DESC NULLS LAST
  ),
  aggregated AS (
    SELECT
      ba.broker_code, ba.symbol, ba.period, ba.investor_type, ba.market_board, ba.date,
      CASE WHEN p_period = '1D'
        THEN COALESCE(MAX(CASE WHEN ba.chart_type = 'TYPE_CHART_VALUE'  THEN lt.final_value END), 0)
        ELSE COALESCE(SUM(CASE WHEN ba.chart_type = 'TYPE_CHART_VALUE'  THEN ba.value_raw ELSE 0 END), 0)
      END AS net_value,
      CASE WHEN p_period = '1D'
        THEN COALESCE(MAX(CASE WHEN ba.chart_type = 'TYPE_CHART_VOLUME' THEN lt.final_value END), 0)
        ELSE COALESCE(SUM(CASE WHEN ba.chart_type = 'TYPE_CHART_VOLUME' THEN ba.value_raw ELSE 0 END), 0)
      END AS net_volume,
      COUNT(*) AS data_points
    FROM idx_broker_activity ba
    LEFT JOIN last_tick lt USING (broker_code, symbol, period, investor_type, market_board, date, chart_type)
    WHERE ba.period = p_period AND ba.date = p_date
    GROUP BY ba.broker_code, ba.symbol, ba.period, ba.investor_type, ba.market_board, ba.date
  )
  SELECT
    a.broker_code,
    a.symbol,
    a.period,
    a.investor_type,
    a.market_board,
    a.date,
    a.net_value,
    GREATEST(a.net_value, 0)        AS b_val,
    ABS(LEAST(a.net_value, 0))      AS s_val,
    a.net_volume,
    GREATEST(a.net_volume, 0)       AS b_lot,
    ABS(LEAST(a.net_volume, 0))     AS s_lot,
    a.data_points,
    p.peak_time
  FROM aggregated a
  LEFT JOIN peak p USING (broker_code, symbol, period, investor_type, market_board, date)
  ON CONFLICT (broker_code, symbol, period, investor_type, market_board, date)
  DO UPDATE SET
    net_value   = EXCLUDED.net_value,
    b_val       = EXCLUDED.b_val,
    s_val       = EXCLUDED.s_val,
    net_volume  = EXCLUDED.net_volume,
    b_lot       = EXCLUDED.b_lot,
    s_lot       = EXCLUDED.s_lot,
    data_points = EXCLUDED.data_points,
    peak_time   = EXCLUDED.peak_time,
    updated_at  = now();
END;
$$;

CREATE OR REPLACE FUNCTION refresh_ba_rankings(p_period text, p_date date)
RETURNS void
LANGUAGE plpgsql
SET statement_timeout = '300s'
AS $$
BEGIN
  DELETE FROM idx_ba_stock_ranking
  WHERE period = p_period AND date = p_date;

  INSERT INTO idx_ba_stock_ranking (
    symbol, period, investor_type, market_board, date,
    broker_code, net_value, b_val, s_val, net_volume, b_lot, s_lot,
    value_share, rank
  )
  SELECT
    symbol, period, investor_type, market_board, date,
    broker_code, net_value, b_val, s_val, net_volume, b_lot, s_lot,
    value_share, rank
  FROM (
    SELECT
      symbol, period, investor_type, market_board, date,
      broker_code, net_value, b_val, s_val, net_volume, b_lot, s_lot,
      CASE
        WHEN SUM(ABS(net_value)) OVER (PARTITION BY symbol, period, investor_type, market_board, date) > 0
        THEN ROUND(
          ABS(net_value) / NULLIF(SUM(ABS(net_value)) OVER (PARTITION BY symbol, period, investor_type, market_board, date), 0) * 100,
          2
        )
        ELSE 0
      END AS value_share,
      RANK() OVER (
        PARTITION BY symbol, period, investor_type, market_board, date
        ORDER BY ABS(net_value) DESC
      ) AS rank
    FROM idx_ba_daily_summary
    WHERE period = p_period AND date = p_date
  ) ranked
  WHERE rank <= 10;

  DELETE FROM idx_ba_broker_ranking
  WHERE period = p_period AND date = p_date;

  INSERT INTO idx_ba_broker_ranking (
    broker_code, period, investor_type, market_board, date,
    symbol, net_value, b_val, s_val, net_volume, b_lot, s_lot,
    value_share, rank
  )
  SELECT
    broker_code, period, investor_type, market_board, date,
    symbol, net_value, b_val, s_val, net_volume, b_lot, s_lot,
    value_share, rank
  FROM (
    SELECT
      broker_code, period, investor_type, market_board, date,
      symbol, net_value, b_val, s_val, net_volume, b_lot, s_lot,
      CASE
        WHEN SUM(ABS(net_value)) OVER (PARTITION BY broker_code, period, investor_type, market_board, date) > 0
        THEN ROUND(
          ABS(net_value) / NULLIF(SUM(ABS(net_value)) OVER (PARTITION BY broker_code, period, investor_type, market_board, date), 0) * 100,
          2
        )
        ELSE 0
      END AS value_share,
      RANK() OVER (
        PARTITION BY broker_code, period, investor_type, market_board, date
        ORDER BY ABS(net_value) DESC
      ) AS rank
    FROM idx_ba_daily_summary
    WHERE period = p_period AND date = p_date
  ) ranked
  WHERE rank <= 10;
END;
$$;

-- ---------------------------------------------------------------------------
-- Step 5: Views
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_ba_foreign_flow AS
SELECT
  all_flow.symbol,
  all_flow.period,
  all_flow.market_board,
  all_flow.date,
  all_flow.abs_value                              AS total_value_all,
  COALESCE(fgn_flow.abs_value, 0)                AS total_value_foreign,
  CASE
    WHEN all_flow.abs_value > 0
    THEN ROUND(COALESCE(fgn_flow.abs_value, 0) / all_flow.abs_value * 100, 2)
    ELSE 0
  END                                             AS foreign_pct,
  all_flow.abs_volume                             AS total_volume_all,
  COALESCE(fgn_flow.abs_volume, 0)               AS total_volume_foreign
FROM (
  SELECT symbol, period, market_board, date,
         SUM(ABS(net_value))  AS abs_value,
         SUM(ABS(net_volume)) AS abs_volume
  FROM idx_ba_daily_summary
  WHERE investor_type = 'ALL'
  GROUP BY symbol, period, market_board, date
) all_flow
LEFT JOIN (
  SELECT symbol, period, market_board, date,
         SUM(ABS(net_value))  AS abs_value,
         SUM(ABS(net_volume)) AS abs_volume
  FROM idx_ba_daily_summary
  WHERE investor_type = 'FOREIGN'
  GROUP BY symbol, period, market_board, date
) fgn_flow
  ON  fgn_flow.symbol       = all_flow.symbol
  AND fgn_flow.period       = all_flow.period
  AND fgn_flow.market_board = all_flow.market_board
  AND fgn_flow.date         = all_flow.date;

CREATE OR REPLACE VIEW v_ba_leaderboard AS
SELECT
  symbol,
  period,
  investor_type,
  market_board,
  date,
  COUNT(DISTINCT broker_code)                       AS active_brokers,
  SUM(ABS(net_value))                               AS total_abs_value,
  SUM(b_val)                                        AS total_b_val,
  SUM(s_val)                                        AS total_s_val,
  ROUND(SUM(value_share * value_share)::numeric, 2) AS hhi_score,
  MAX(ABS(net_value))                               AS top_broker_abs_value,
  MIN(rank)                                         AS top_rank
FROM idx_ba_stock_ranking
GROUP BY symbol, period, investor_type, market_board, date
ORDER BY hhi_score DESC;

-- ---------------------------------------------------------------------------
-- Per-stock accumulation/distribution metrics for bandarmology analysis.
-- Computes buyer vs seller concentration, accumulation ratio, and signals.
-- Reads directly from idx_ba_daily_summary (all brokers, not capped at top N).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_ba_accumulation AS
WITH base AS (
  SELECT
    symbol, period, investor_type, market_board, date,
    broker_code, net_value,
    b_val, s_val,
    ROW_NUMBER() OVER (
      PARTITION BY symbol, period, investor_type, market_board, date
      ORDER BY net_value DESC
    ) AS buy_rank,
    ROW_NUMBER() OVER (
      PARTITION BY symbol, period, investor_type, market_board, date
      ORDER BY net_value ASC
    ) AS sell_rank
  FROM idx_ba_daily_summary
),
stock_agg AS (
  SELECT
    symbol, period, investor_type, market_board, date,

    COUNT(*)                                          AS total_brokers,
    COUNT(*) FILTER (WHERE net_value > 0)             AS total_buyers,
    COUNT(*) FILTER (WHERE net_value < 0)             AS total_sellers,

    COALESCE(SUM(b_val), 0)                           AS total_buy_value,
    COALESCE(SUM(s_val), 0)                           AS total_sell_value,

    COALESCE(SUM(CASE WHEN buy_rank <= 3 AND net_value > 0 THEN net_value END), 0)
      AS sum_top3_buy,
    COALESCE(SUM(CASE WHEN sell_rank <= 3 AND net_value < 0 THEN ABS(net_value) END), 0)
      AS sum_top3_sell,

    COALESCE(SUM(CASE WHEN buy_rank <= 5 AND net_value > 0 THEN net_value END), 0)
      AS sum_top5_buy,

    MAX(CASE WHEN buy_rank = 1 AND net_value > 0 THEN broker_code END)
      AS top_buyer_code,
    MAX(CASE WHEN buy_rank = 1 AND net_value > 0 THEN net_value END)
      AS top_buyer_value,

    MAX(CASE WHEN sell_rank = 1 AND net_value < 0 THEN broker_code END)
      AS top_seller_code,
    MAX(CASE WHEN sell_rank = 1 AND net_value < 0 THEN ABS(net_value) END)
      AS top_seller_value,

    COALESCE(
      SUM(
        CASE WHEN net_value > 0 THEN
          POWER(net_value::double precision / NULLIF(SUM(b_val) OVER (PARTITION BY symbol, period, investor_type, market_board, date), 0) * 100, 2)
        END
      ), 0
    ) AS buy_hhi,

    COALESCE(
      SUM(
        CASE WHEN net_value < 0 THEN
          POWER(ABS(net_value)::double precision / NULLIF(SUM(s_val) OVER (PARTITION BY symbol, period, investor_type, market_board, date), 0) * 100, 2)
        END
      ), 0
    ) AS sell_hhi

  FROM base
  GROUP BY symbol, period, investor_type, market_board, date
)
SELECT
  symbol, period, investor_type, market_board, date,
  total_brokers,
  total_buyers,
  total_sellers,
  total_buy_value,
  total_sell_value,
  sum_top3_buy,
  sum_top3_sell,

  CASE
    WHEN sum_top3_sell > 0
    THEN ROUND((sum_top3_buy / sum_top3_sell)::numeric, 2)
    ELSE 99.99
  END AS accum_ratio,

  top_buyer_code,
  top_buyer_value,
  CASE
    WHEN total_buy_value > 0
    THEN ROUND((top_buyer_value / total_buy_value * 100)::numeric, 2)
    ELSE 0
  END AS top_buyer_share,

  top_seller_code,
  top_seller_value,

  ROUND(buy_hhi::numeric, 2)  AS buy_concentration,
  ROUND(sell_hhi::numeric, 2) AS sell_concentration,

  CASE
    WHEN total_buy_value > 0
    THEN ROUND((sum_top5_buy / total_buy_value * 100)::numeric, 2)
    ELSE 0
  END AS buyer_participation,

  total_buy_value - total_sell_value AS net_flow

FROM stock_agg;

-- ---------------------------------------------------------------------------
-- Step 6: Quantitative Intelligence Pipeline (Materialized Views)
-- ---------------------------------------------------------------------------

-- Pairwise Pearson correlation of broker net_value vectors across all symbols.
-- Measures how similarly two brokers trade across the market.
-- Brokers with high correlation likely represent the same entity.
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_broker_correlation AS
WITH latest_date AS (
  SELECT MAX(date) AS d
  FROM idx_ba_daily_summary
  WHERE period = '1M' AND investor_type = 'ALL' AND market_board = 'REGULAR'
),
broker_vectors AS (
  SELECT broker_code, symbol, net_value::double precision AS nv
  FROM idx_ba_daily_summary, latest_date
  WHERE period = '1M'
    AND investor_type = 'ALL'
    AND market_board = 'REGULAR'
    AND date = latest_date.d
    AND ABS(net_value) > 0
),
pair_stats AS (
  SELECT
    a.broker_code AS broker_a,
    b.broker_code AS broker_b,
    COUNT(*) AS n,
    SUM(a.nv * b.nv) AS sum_xy,
    SUM(a.nv) AS sum_x,
    SUM(b.nv) AS sum_y,
    SUM(a.nv * a.nv) AS sum_x2,
    SUM(b.nv * b.nv) AS sum_y2,
    SQRT(SUM(POWER(a.nv - b.nv, 2))) AS euc_dist
  FROM broker_vectors a
  JOIN broker_vectors b
    ON a.symbol = b.symbol
    AND a.broker_code < b.broker_code
  GROUP BY a.broker_code, b.broker_code
  HAVING COUNT(*) >= 10
)
SELECT
  broker_a,
  broker_b,
  n::integer AS shared_symbols,
  CASE
    WHEN (n * sum_x2 - sum_x * sum_x) > 0 AND (n * sum_y2 - sum_y * sum_y) > 0
    THEN ROUND((
      (n * sum_xy - sum_x * sum_y) /
      SQRT((n * sum_x2 - sum_x * sum_x) * (n * sum_y2 - sum_y * sum_y))
    )::numeric, 4)
    ELSE 0
  END AS correlation,
  ROUND(euc_dist::numeric, 2) AS euclidean_distance
FROM pair_stats
ORDER BY correlation DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_broker_corr_pair
  ON mv_broker_correlation (broker_a, broker_b);

-- Connected-component clustering of brokers via recursive CTE.
-- Brokers with correlation >= 0.7 are linked; connected components form clusters.
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_broker_clusters AS
WITH RECURSIVE edges AS (
  SELECT broker_a, broker_b
  FROM mv_broker_correlation
  WHERE correlation >= 0.7
),
all_brokers AS (
  SELECT DISTINCT broker FROM (
    SELECT broker_a AS broker FROM edges
    UNION
    SELECT broker_b AS broker FROM edges
  ) x
),
seed AS (
  SELECT broker, broker AS cluster_root
  FROM all_brokers
),
flood AS (
  SELECT broker, cluster_root FROM seed
  UNION
  SELECT
    CASE WHEN e.broker_a = f.broker THEN e.broker_b ELSE e.broker_a END,
    f.cluster_root
  FROM flood f
  JOIN edges e ON e.broker_a = f.broker OR e.broker_b = f.broker
  WHERE CASE WHEN e.broker_a = f.broker THEN e.broker_b ELSE e.broker_a END <> f.broker
),
min_root AS (
  SELECT broker, MIN(cluster_root) AS cluster_id
  FROM flood
  GROUP BY broker
),
clusters_numbered AS (
  SELECT cluster_id, broker, DENSE_RANK() OVER (ORDER BY cluster_id) AS cluster_num
  FROM min_root
),
cluster_meta AS (
  SELECT
    cn.cluster_num, cn.broker, cn.cluster_id,
    COUNT(*) OVER (PARTITION BY cn.cluster_num) AS cluster_size,
    COALESCE((
      SELECT ROUND(AVG(c.correlation)::numeric, 4)
      FROM mv_broker_correlation c
      WHERE c.correlation >= 0.7
        AND (
          (c.broker_a = cn.broker AND c.broker_b IN (SELECT broker FROM clusters_numbered WHERE cluster_num = cn.cluster_num))
          OR
          (c.broker_b = cn.broker AND c.broker_a IN (SELECT broker FROM clusters_numbered WHERE cluster_num = cn.cluster_num))
        )
    ), 0) AS avg_internal_correlation
  FROM clusters_numbered cn
)
SELECT
  cluster_num::integer AS cluster_id,
  'Cluster ' || CHR((64 + cluster_num)::integer) AS cluster_label,
  broker AS broker_code,
  cluster_size::integer,
  avg_internal_correlation
FROM cluster_meta
ORDER BY cluster_num, broker;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_broker_clusters_broker
  ON mv_broker_clusters (broker_code);
CREATE INDEX IF NOT EXISTS idx_mv_broker_clusters_id
  ON mv_broker_clusters (cluster_id);

-- Regime classification with liquidity gating + buyer/seller asymmetry.
-- Requires meaningful volume + trade value to avoid illiquid noise.
-- Uses buyer_seller_ratio (total_buyers/total_sellers) to confirm
-- structural asymmetry that defines real accumulation/distribution.
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_stock_regime AS
WITH price_raw AS (
  SELECT
    stock_code AS symbol, date,
    close::double precision AS close_price,
    volume::double precision AS volume,
    foreign_buy::double precision AS foreign_buy,
    foreign_sell::double precision AS foreign_sell,
    LN(NULLIF(close::double precision, 0) / NULLIF(LAG(close::double precision) OVER (PARTITION BY stock_code ORDER BY date), 0)) AS log_return
  FROM idx_stock_summary
  WHERE close > 0
),
price_series AS (
  SELECT
    symbol, date, close_price, volume, foreign_buy, foreign_sell, log_return,
    AVG(volume) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING) AS avg_volume_20d,
    STDDEV_SAMP(log_return) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 20 PRECEDING AND CURRENT ROW) AS volatility_20d
  FROM price_raw
),
latest_date AS (
  SELECT MAX(date) AS d FROM price_series
),
latest_prices AS (
  SELECT * FROM price_series, latest_date WHERE date = latest_date.d
),
accum_data AS (
  SELECT
    symbol,
    accum_ratio::double precision AS accum_ratio,
    total_buyers::double precision AS total_buyers,
    total_sellers::double precision AS total_sellers,
    total_buy_value::double precision AS total_buy_value,
    buyer_participation::double precision AS buyer_participation,
    top_buyer_share::double precision AS top_buyer_share
  FROM v_ba_accumulation
  WHERE period = '1M' AND investor_type = 'ALL' AND market_board = 'REGULAR'
    AND date = (SELECT MAX(date) FROM idx_ba_daily_summary WHERE period = '1M' AND investor_type = 'ALL')
    AND total_buy_value > 0
),
features AS (
  SELECT
    p.symbol, p.date, p.close_price,
    COALESCE(p.log_return, 0) AS log_return,
    CASE WHEN p.avg_volume_20d > 0 THEN p.volume / p.avg_volume_20d ELSE 1 END AS volume_ratio,
    COALESCE(p.volatility_20d, 0) AS volatility,
    CASE WHEN (p.foreign_buy + p.foreign_sell) > 0 THEN (p.foreign_buy - p.foreign_sell) / (p.foreign_buy + p.foreign_sell) ELSE 0 END AS foreign_flow_dir,
    COALESCE(a.accum_ratio, 1) AS accum_ratio,
    CASE WHEN COALESCE(a.total_sellers, 0) > 0 THEN COALESCE(a.total_buyers, 0) / a.total_sellers ELSE 1 END AS buyer_seller_ratio,
    COALESCE(a.total_buy_value, 0) AS total_buy_value,
    COALESCE(a.buyer_participation, 0) AS buyer_participation,
    COALESCE(a.top_buyer_share, 0) AS top_buyer_share,
    COALESCE(a.total_buyers, 0) AS total_buyers,
    COALESCE(a.total_sellers, 0) AS total_sellers,
    p.volume AS daily_volume
  FROM latest_prices p
  LEFT JOIN accum_data a ON a.symbol = p.symbol
),
classified AS (
  SELECT *,
    -- Liquidity gate: must have min daily volume AND min monthly buy value
    (daily_volume >= 100000 AND total_buy_value >= 1000000000) AS is_liquid,
    -- Structural asymmetry checks
    (buyer_seller_ratio < 0.8 AND total_sellers >= 5) AS has_accum_asymmetry,
    (buyer_seller_ratio > 1.3 AND total_buyers >= 5) AS has_dist_asymmetry,
    -- Concentration check: top buyer controls significant share or top 5 dominate
    (top_buyer_share >= 25 OR buyer_participation >= 70) AS has_concentrated_buying
  FROM features
)
SELECT
  symbol, date, close_price,
  ROUND(log_return::numeric, 6) AS log_return,
  ROUND(volume_ratio::numeric, 2) AS volume_ratio,
  ROUND(volatility::numeric, 6) AS volatility,
  ROUND(foreign_flow_dir::numeric, 4) AS foreign_flow_dir,
  ROUND(accum_ratio::numeric, 2) AS accum_ratio,
  ROUND(buyer_seller_ratio::numeric, 2) AS buyer_seller_ratio,
  CASE
    -- Strong accumulation: high ratio + structural asymmetry + concentrated buying + quiet price
    WHEN is_liquid AND accum_ratio >= 1.8 AND has_accum_asymmetry AND has_concentrated_buying
         AND volatility < 0.03 AND volume_ratio < 1.5
      THEN 'accumulation'
    -- Moderate accumulation: slightly lower bar but still requires asymmetry
    WHEN is_liquid AND accum_ratio >= 1.5 AND has_accum_asymmetry
         AND volatility < 0.04 AND volume_ratio < 1.8
      THEN 'accumulation'
    -- Markup: price rising on volume with prior accumulation signature
    WHEN is_liquid AND log_return > 0.005 AND volume_ratio >= 1.3 AND accum_ratio >= 1.3
         AND has_concentrated_buying
      THEN 'markup'
    -- Strong distribution: low ratio + many buyers few sellers + rising volatility
    WHEN is_liquid AND accum_ratio <= 0.6 AND has_dist_asymmetry
         AND volatility >= 0.02
      THEN 'distribution'
    -- Moderate distribution
    WHEN is_liquid AND accum_ratio <= 0.7 AND has_dist_asymmetry
         AND volume_ratio >= 1.2
      THEN 'distribution'
    -- Markdown: price falling on volume with distribution signature
    WHEN is_liquid AND log_return < -0.008 AND volume_ratio >= 1.3 AND accum_ratio <= 0.8
      THEN 'markdown'
    -- Price-only markdown (significant drop)
    WHEN is_liquid AND log_return < -0.02 AND volume_ratio >= 1.5
      THEN 'markdown'
    -- Price-only markup (significant rise)
    WHEN is_liquid AND log_return > 0.02 AND volume_ratio >= 1.5
      THEN 'markup'
    ELSE 'neutral'
  END AS regime,
  ROUND((
    CASE
      -- Accumulation confidence: weighted by ratio strength, asymmetry, concentration, quietness
      WHEN is_liquid AND accum_ratio >= 1.5 AND has_accum_asymmetry
        THEN LEAST(accum_ratio / 4.0, 1.0) * 0.3
           + LEAST(1.0 / NULLIF(buyer_seller_ratio, 0) / 3.0, 1.0) * 0.25
           + LEAST(top_buyer_share / 80.0, 1.0) * 0.2
           + (1.0 - LEAST(volatility / 0.05, 1.0)) * 0.15
           + (1.0 - LEAST(volume_ratio / 3.0, 1.0)) * 0.1
      -- Distribution confidence
      WHEN is_liquid AND accum_ratio <= 0.7 AND has_dist_asymmetry
        THEN (1.0 - LEAST(accum_ratio, 1.0)) * 0.35
           + LEAST(buyer_seller_ratio / 3.0, 1.0) * 0.25
           + LEAST(volatility / 0.05, 1.0) * 0.2
           + LEAST(volume_ratio / 3.0, 1.0) * 0.2
      -- Markup confidence
      WHEN is_liquid AND log_return > 0.005 AND accum_ratio >= 1.3
        THEN LEAST(ABS(log_return) / 0.05, 1.0) * 0.35
           + LEAST(volume_ratio / 3.0, 1.0) * 0.25
           + LEAST(accum_ratio / 3.0, 1.0) * 0.2
           + LEAST(top_buyer_share / 80.0, 1.0) * 0.2
      -- Markdown confidence
      WHEN is_liquid AND log_return < -0.008 AND accum_ratio <= 0.8
        THEN LEAST(ABS(log_return) / 0.05, 1.0) * 0.35
           + LEAST(volume_ratio / 3.0, 1.0) * 0.25
           + (1.0 - LEAST(accum_ratio, 1.0)) * 0.2
           + LEAST(volatility / 0.05, 1.0) * 0.2
      -- Price-only markup/markdown
      WHEN is_liquid AND ABS(log_return) > 0.02 AND volume_ratio >= 1.5
        THEN LEAST(ABS(log_return) / 0.05, 1.0) * 0.5 + LEAST(volume_ratio / 3.0, 1.0) * 0.5
      ELSE 0.2
    END
  )::numeric, 2) AS confidence_score
FROM classified
WHERE close_price > 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_stock_regime_symbol ON mv_stock_regime (symbol);
CREATE INDEX IF NOT EXISTS idx_mv_stock_regime_regime ON mv_stock_regime (regime);

-- Helper function for refreshing materialized views via API (used by quant-refresh cron).
-- SECURITY DEFINER so the anon/service key can trigger a refresh.
CREATE OR REPLACE FUNCTION refresh_materialized_view(view_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '120s'
AS $$
BEGIN
  IF view_name NOT IN ('mv_broker_correlation', 'mv_broker_clusters', 'mv_stock_regime') THEN
    RAISE EXCEPTION 'Invalid view name: %', view_name;
  END IF;
  EXECUTE 'REFRESH MATERIALIZED VIEW CONCURRENTLY ' || quote_ident(view_name);
END;
$$;
