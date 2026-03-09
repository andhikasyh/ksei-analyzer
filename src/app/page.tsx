import type { Metadata } from "next";
import { DashboardContent } from "@/components/DashboardContent";
import { getBaseUrl, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  title: `${SITE_NAME} – Analisis Kepemilikan Saham KSEI & Data Pasar BEI`,
  description: SITE_DESCRIPTION,
  alternates: { canonical: baseUrl },
  openGraph: {
    title: `${SITE_NAME} – Platform Analisis Saham Indonesia`,
    description:
      "Analisis data kepemilikan KSEI, screener saham, aktivitas broker, foreign flow, dan market intelligence untuk Bursa Efek Indonesia.",
    url: baseUrl,
  },
};

export default function DashboardPage() {
  return <DashboardContent />;
}
