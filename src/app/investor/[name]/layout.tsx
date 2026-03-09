import type { Metadata } from "next";
import { getBaseUrl, SITE_NAME } from "@/lib/site";

const baseUrl = getBaseUrl();

type Props = { params: Promise<{ name: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const decoded = decodeURIComponent(name || "");
  return {
    title: `${decoded} – Portofolio & Kepemilikan Saham`,
    description: `Portofolio dan data kepemilikan saham ${decoded} di Bursa Efek Indonesia. Data beneficial ownership KSEI dan daftar saham yang dimiliki.`,
    openGraph: {
      title: `${decoded} – Portofolio Investor | ${SITE_NAME}`,
      description: `Portofolio dan kepemilikan saham ${decoded} di BEI.`,
      url: `${baseUrl}/investor/${encodeURIComponent(decoded)}`,
    },
    alternates: { canonical: `${baseUrl}/investor/${encodeURIComponent(decoded)}` },
  };
}

export default function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
