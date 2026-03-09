import type { Metadata } from "next";
import { getBaseUrl, SITE_NAME } from "@/lib/site";

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  title: "Dividen Saham – Data Dividen BEI Terlengkap",
  description:
    "Data dividen saham Indonesia terlengkap. Lihat riwayat dividen, jadwal cum date, yield dividen, dan saham-saham pembagi dividen terbaik di Bursa Efek Indonesia.",
  keywords: [
    "dividen saham Indonesia",
    "jadwal dividen BEI",
    "cum date dividen",
    "dividend yield IDX",
    "saham dividen terbaik",
    "riwayat dividen",
    "Indonesia stock dividends",
    "IDX dividend data",
  ],
  openGraph: {
    title: `Data Dividen Saham Indonesia | ${SITE_NAME}`,
    description:
      "Data dividen saham terlengkap di BEI. Riwayat dividen, jadwal cum date, dan yield dividen.",
    url: `${baseUrl}/dividends`,
  },
  alternates: { canonical: `${baseUrl}/dividends` },
};

export default function DividendsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
