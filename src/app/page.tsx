import type { Metadata } from "next";
import { DashboardContent } from "@/components/DashboardContent";
import { getBaseUrl, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  title: `${SITE_NAME} – Analisis Saham Indonesia Gratis | Data KSEI, Screener & AI Intelligence`,
  description: `${SITE_DESCRIPTION} Platform analisis saham terlengkap sebagai alternatif Stockbit, RTI Business, dan aplikasi saham Indonesia lainnya.`,
  alternates: { canonical: baseUrl },
  openGraph: {
    title: `${SITE_NAME} – Platform Analisis Saham Indonesia Gratis | Alternatif Stockbit & RTI`,
    description:
      "Analisis data kepemilikan KSEI, screener saham, aktivitas broker, foreign flow, dan AI market intelligence untuk investor BEI/IDX. Gratis dan lengkap.",
    url: baseUrl,
  },
};

export default function DashboardPage() {
  return <DashboardContent />;
}
