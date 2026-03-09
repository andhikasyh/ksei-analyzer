import type { Metadata } from "next";
import { getBaseUrl, SITE_NAME } from "@/lib/site";

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  title: "Market Intelligence – Laporan Harian Pasar Saham Indonesia",
  description:
    "Laporan dan analisis pasar saham Indonesia yang lengkap dan mudah dipahami. Insight harian: analisis sektor, saham top mover, foreign flow, dan outlook pasar BEI. Simple to read, detailed enough to act on.",
  keywords: [
    "analisis pasar saham Indonesia",
    "laporan harian BEI",
    "market intelligence Indonesia",
    "intelijen pasar saham",
    "analisis sektor IDX",
    "foreign flow Indonesia",
    "ringkasan pasar saham",
    "investor Indonesia",
    "top mover saham",
    "outlook pasar BEI",
    "IDX daily report",
    "stock market insight Indonesia",
    "daily market summary IDX",
  ],
  openGraph: {
    title: `Market Intelligence – Laporan Harian Pasar Saham | ${SITE_NAME}`,
    description:
      "Laporan dan analisis harian pasar saham Indonesia. Analisis sektor, top mover, foreign flow, dan outlook pasar BEI.",
    url: `${baseUrl}/intelligent`,
    type: "website",
    locale: "id_ID",
    alternateLocale: "en_US",
  },
  alternates: {
    canonical: `${baseUrl}/intelligent`,
  },
  twitter: {
    card: "summary_large_image",
    title: `Market Intelligence – Laporan Harian Pasar Saham | ${SITE_NAME}`,
    description:
      "Laporan pasar saham Indonesia yang lengkap dan mudah dipahami. Analisis harian untuk investor cerdas.",
  },
};

export default function IntelligentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
