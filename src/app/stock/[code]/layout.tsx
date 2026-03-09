import type { Metadata } from "next";
import { getBaseUrl, SITE_NAME } from "@/lib/site";

const baseUrl = getBaseUrl();

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const upper = (code || "").toUpperCase();
  return {
    title: `${upper} – Kepemilikan Saham, Pemegang Saham & Analisis KSEI`,
    description: `Data kepemilikan saham dan pemegang saham ${upper} di Bursa Efek Indonesia. Top holders, struktur kepemilikan KSEI, fundamental, aktivitas broker, dan analisis lengkap saham ${upper}. Alternatif data saham Stockbit & RTI.`,
    keywords: [
      `saham ${upper}`,
      `${upper} kepemilikan`,
      `${upper} pemegang saham`,
      `${upper} KSEI`,
      `analisis ${upper}`,
      "data saham KSEI",
      "pemegang saham terbesar",
      "beneficial owner saham",
    ],
    openGraph: {
      title: `Saham ${upper} – Kepemilikan & Analisis | ${SITE_NAME}`,
      description: `Data pemegang saham dan kepemilikan KSEI untuk saham ${upper} di BEI.`,
      url: `${baseUrl}/stock/${upper}`,
    },
    alternates: { canonical: `${baseUrl}/stock/${upper}` },
  };
}

export default function StockLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
