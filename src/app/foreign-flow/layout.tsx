import type { Metadata } from "next";
import { getBaseUrl, SITE_NAME } from "@/lib/site";

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  title: "Foreign Flow – Arus Dana Asing Saham Indonesia",
  description:
    "Pantau arus dana investor asing (foreign flow) di Bursa Efek Indonesia. Data net buy/sell harian, tren foreign flow per saham, dan analisis pergerakan dana asing di BEI.",
  keywords: [
    "foreign flow Indonesia",
    "arus dana asing",
    "net foreign buy",
    "net foreign sell",
    "investor asing BEI",
    "foreign flow IDX",
    "foreign flow saham",
    "dana asing bursa saham",
    "foreign flow stockbit",
    "asing net buy sell hari ini",
    "data asing masuk keluar saham",
    "tracking dana asing gratis",
  ],
  openGraph: {
    title: `Foreign Flow – Arus Dana Asing | ${SITE_NAME}`,
    description:
      "Pantau arus dana investor asing di BEI. Data net buy/sell harian dan tren foreign flow per saham.",
    url: `${baseUrl}/foreign-flow`,
  },
  alternates: { canonical: `${baseUrl}/foreign-flow` },
};

export default function ForeignFlowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
