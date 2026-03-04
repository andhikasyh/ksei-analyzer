import type { Metadata } from "next";
import { getBaseUrl, SITE_NAME } from "@/lib/site";

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  title: "Market Intelligence – Simple, Detailed Daily Insights",
  description:
    "Full insight into the Indonesian stock market, in plain language. Daily reports with sector analysis, top movers, foreign flow, and clear outlook—simple to read, detailed enough to act on.",
  keywords: [
    "Indonesian stock market analysis",
    "IDX daily report",
    "market intelligence Indonesia",
    "stock market insight",
    "sector analysis IDX",
    "foreign flow Indonesia",
    "daily market summary",
    "analisis pasar saham Indonesia",
    "laporan harian IDX",
    "intelijen pasar BEI",
    "ringkasan pasar saham",
    "investor Indonesia",
  ],
  openGraph: {
    title: `Market Intelligence – Simple, Detailed Daily Insights | ${SITE_NAME}`,
    description:
      "Full insight into the Indonesian stock market in plain language. Daily reports: sector analysis, top movers, foreign flow, clear outlook.",
    url: `${baseUrl}/intelligent`,
    type: "website",
    locale: "en_US",
    alternateLocale: "id_ID",
  },
  alternates: {
    canonical: `${baseUrl}/intelligent`,
  },
  twitter: {
    card: "summary_large_image",
    title: `Market Intelligence – Simple, Detailed Daily Insights | ${SITE_NAME}`,
    description:
      "Full insight into the Indonesian stock market in plain language. Daily reports, simple to read, detailed enough to act on.",
  },
};

export default function IntelligentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
