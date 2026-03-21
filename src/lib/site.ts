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
  "Platform analisis saham Indonesia gratis: data kepemilikan KSEI, screener saham, aktivitas broker, foreign flow, dan market intelligence. Alternatif Stockbit, RTI, dan aplikasi saham lainnya untuk investor BEI/IDX.";

export const SITE_DESCRIPTION_EN =
  "Free Indonesian stock analysis platform: KSEI ownership data, stock screener, broker activity, foreign flow, and smart market intelligence. Alternative to Stockbit, RTI, and other IDX/BEI investing apps.";

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
  "alternatif stockbit",
  "stockbit alternative",
  "aplikasi saham gratis",
  "platform saham Indonesia",
  "tools saham gratis",
  "RTI business",
  "aplikasi investasi saham",
  "neo BDMN",
  "neobank saham",
  "aplikasi trading saham",
  "analisis teknikal saham",
  "analisis fundamental saham",
  "data KSEI terbaru",
  "cek pemegang saham",
  "kepemilikan saham KSEI",
  "data broker saham",
  "net buy net sell asing",
  "rekomendasi saham",
  "saham murah Indonesia",
  "saham dividen tinggi",
  "portofolio saham",
  "watchlist saham",
  "indopremier",
  "sekuritas online",
  "Ajaib",
  "Bibit saham",
  "IPOT",
  "Mandiri Sekuritas",
  "Mirae Asset",
];
