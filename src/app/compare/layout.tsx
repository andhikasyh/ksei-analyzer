import type { Metadata } from "next";
import { getBaseUrl, SITE_NAME } from "@/lib/site";

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  title: "Bandingkan Saham – Perbandingan Side-by-Side",
  description:
    "Bandingkan saham Indonesia secara side-by-side. Perbandingan fundamental, kepemilikan investor, valuasi, dan performa harga saham-saham di Bursa Efek Indonesia.",
  keywords: [
    "bandingkan saham",
    "perbandingan saham Indonesia",
    "compare stocks IDX",
    "perbandingan fundamental saham",
    "stock comparison Indonesia",
    "valuasi saham BEI",
  ],
  openGraph: {
    title: `Bandingkan Saham Indonesia | ${SITE_NAME}`,
    description:
      "Bandingkan saham BEI secara side-by-side: fundamental, kepemilikan, valuasi, dan performa.",
    url: `${baseUrl}/compare`,
  },
  alternates: { canonical: `${baseUrl}/compare` },
};

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
