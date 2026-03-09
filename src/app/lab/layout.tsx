import type { Metadata } from "next";
import { getBaseUrl, SITE_NAME } from "@/lib/site";

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  title: "Strategy Lab – Backtest Strategi Saham Indonesia",
  description:
    "Uji strategi investasi saham Indonesia dengan backtest historis. Simulasikan strategi trading di BEI menggunakan data historis dan analisis performa strategi Anda.",
  keywords: [
    "backtest saham Indonesia",
    "strategi trading BEI",
    "simulasi investasi saham",
    "strategy lab IDX",
    "stock backtest Indonesia",
    "uji strategi saham",
  ],
  openGraph: {
    title: `Strategy Lab – Backtest Saham | ${SITE_NAME}`,
    description:
      "Uji strategi investasi saham Indonesia dengan backtest historis di BEI.",
    url: `${baseUrl}/lab`,
  },
  alternates: { canonical: `${baseUrl}/lab` },
};

export default function LabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
