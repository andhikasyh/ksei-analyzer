/**
 * Canonical base URL for the site. Set NEXT_PUBLIC_SITE_URL in production (e.g. https://yoursite.com).
 * Used for sitemap, canonical URLs, and Open Graph.
 */
export function getBaseUrl(): string {
  if (typeof process.env.NEXT_PUBLIC_SITE_URL === "string" && process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (typeof process.env.VERCEL_URL === "string" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://bei-analyzer.vercel.app";
}

export const SITE_NAME = "Gunaa";

export const SITE_DESCRIPTION =
  "Platform analisis kepemilikan saham KSEI dan data pasar untuk Bursa Efek Indonesia (BEI/IDX). Screener saham, aktivitas broker, kepemilikan investor, foreign flow, dan laporan market intelligence harian.";

export const SITE_DESCRIPTION_EN =
  "KSEI beneficial ownership analytics and market data for the Indonesian stock exchange (IDX/BEI). Stock screener, broker activity, investor holdings, foreign flow tracking, and daily market intelligence reports.";

export const SITE_KEYWORDS = [
  "saham Indonesia",
  "KSEI",
  "kepemilikan saham",
  "BEI",
  "IDX",
  "Bursa Efek Indonesia",
  "screener saham",
  "data saham",
  "analisis saham",
  "broker saham",
  "aktivitas broker",
  "foreign flow",
  "arus dana asing",
  "market intelligence",
  "laporan pasar saham",
  "investor saham",
  "pemegang saham",
  "beneficial ownership",
  "stock screener Indonesia",
  "Indonesian stock exchange",
  "stock ownership data",
  "shareholder data",
  "Indonesia equity",
  "broker activity IDX",
  "dividen saham",
  "sektor saham",
  "IHSG",
  "LQ45",
  "IDX30",
];
