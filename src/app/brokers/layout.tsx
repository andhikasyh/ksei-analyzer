import type { Metadata } from "next";
import { getBaseUrl, SITE_NAME } from "@/lib/site";

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  title: "Aktivitas Broker – Ranking & Market Share Broker BEI",
  description:
    "Pantau aktivitas dan ranking broker saham di Bursa Efek Indonesia. Data market share, volume transaksi, top broker buyer/seller, dan analisis aktivitas broker-dealer BEI.",
  keywords: [
    "broker saham Indonesia",
    "aktivitas broker BEI",
    "ranking broker IDX",
    "market share broker",
    "top broker BEI",
    "broker activity Indonesia",
    "broker dealer BEI",
    "volume transaksi broker",
    "data broker stockbit",
    "broker summary IDX",
    "net buy sell broker",
    "analisis broker saham gratis",
  ],
  openGraph: {
    title: `Aktivitas Broker Saham Indonesia | ${SITE_NAME}`,
    description:
      "Ranking dan aktivitas broker di BEI. Market share, volume transaksi, dan analisis broker-dealer.",
    url: `${baseUrl}/brokers`,
  },
  alternates: { canonical: `${baseUrl}/brokers` },
};

export default function BrokersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
