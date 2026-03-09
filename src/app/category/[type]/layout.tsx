import type { Metadata } from "next";
import { getBaseUrl, SITE_NAME } from "@/lib/site";
import { INVESTOR_TYPE_MAP } from "@/lib/types";

const baseUrl = getBaseUrl();

type Props = { params: Promise<{ type: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;
  const code = (type || "").toUpperCase();
  const label = INVESTOR_TYPE_MAP[code] || code;
  return {
    title: `Investor ${label} – Daftar & Kepemilikan Saham`,
    description: `Daftar investor ${label} di Bursa Efek Indonesia beserta data kepemilikan saham dan portofolio. Data beneficial ownership KSEI untuk kategori ${label}.`,
    openGraph: {
      title: `Investor ${label} di BEI | ${SITE_NAME}`,
      description: `Daftar dan kepemilikan saham investor ${label} di Bursa Efek Indonesia.`,
      url: `${baseUrl}/category/${type.toLowerCase()}`,
    },
    alternates: { canonical: `${baseUrl}/category/${type.toLowerCase()}` },
  };
}

export default function CategoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
