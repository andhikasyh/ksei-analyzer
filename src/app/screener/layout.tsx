import type { Metadata } from "next";
import { getBaseUrl, SITE_NAME } from "@/lib/site";

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  title: "Screener Saham – Filter Saham Indonesia by Fundamental & Sektor",
  description:
    "Screener saham Indonesia terlengkap. Filter saham BEI berdasarkan indeks (LQ45, IDX30, IHSG), fundamental, sektor, likuiditas, dan data kepemilikan KSEI. Temukan saham terbaik dengan mudah.",
  keywords: [
    "screener saham Indonesia",
    "filter saham BEI",
    "stock screener IDX",
    "saham LQ45",
    "saham IDX30",
    "fundamental saham",
    "screener saham KSEI",
    "saham murah Indonesia",
    "valuasi saham BEI",
    "alternatif stockbit screener",
    "stock screener gratis",
    "filter saham gratis",
    "screener saham seperti stockbit",
    "tools saham RTI",
  ],
  openGraph: {
    title: `Screener Saham Indonesia | ${SITE_NAME}`,
    description:
      "Filter saham BEI berdasarkan indeks, fundamental, sektor, dan data kepemilikan KSEI.",
    url: `${baseUrl}/screener`,
  },
  alternates: { canonical: `${baseUrl}/screener` },
};

export default function ScreenerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
