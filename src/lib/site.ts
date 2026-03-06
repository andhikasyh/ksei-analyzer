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
  "Analyze KSEI beneficial ownership data for the Indonesian stock exchange (IDX). Screen stocks, track brokers, view investor holdings and market insights.";
export const SITE_KEYWORDS = [
  "BEI",
  "IDX",
  "Indonesian stock exchange",
  "KSEI",
  "beneficial ownership",
  "stock ownership",
  "shareholder data",
  "Indonesia equity",
  "stock screener",
  "broker activity",
  "market intelligence",
];
