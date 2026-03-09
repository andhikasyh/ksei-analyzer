import type { Metadata } from "next";
import { getBaseUrl, SITE_NAME } from "@/lib/site";

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  title: "Analisis Sektor – Performa Sektor Saham Indonesia",
  description:
    "Analisis performa sektor saham di Bursa Efek Indonesia (BEI). Bandingkan kinerja sektor, lihat rotasi sektor, dan temukan sektor unggulan berdasarkan data pasar terkini.",
  keywords: [
    "sektor saham Indonesia",
    "analisis sektor BEI",
    "rotasi sektor IDX",
    "performa sektor saham",
    "sektor unggulan",
    "sector analysis Indonesia",
    "IDX sector performance",
    "IHSG sektor",
  ],
  openGraph: {
    title: `Analisis Sektor Saham Indonesia | ${SITE_NAME}`,
    description:
      "Analisis performa dan rotasi sektor saham di Bursa Efek Indonesia.",
    url: `${baseUrl}/sectors`,
  },
  alternates: { canonical: `${baseUrl}/sectors` },
};

export default function SectorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
