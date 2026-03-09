import type { Metadata } from "next";
import { getBaseUrl, SITE_NAME } from "@/lib/site";

const baseUrl = getBaseUrl();

type Props = { params: Promise<{ date: string }> };

function formatDateLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const label = formatDateLabel(date || "");
  return {
    title: `Laporan Pasar Saham – ${label}`,
    description: `Laporan market intelligence dan analisis AI untuk pasar saham Indonesia tanggal ${label}. Analisis sektor, top mover, foreign flow, dan outlook pasar BEI.`,
    openGraph: {
      title: `Laporan Pasar Saham – ${label} | ${SITE_NAME}`,
      description: `Laporan market intelligence harian untuk BEI tanggal ${label}.`,
      url: `${baseUrl}/intelligent/${date}`,
    },
    alternates: { canonical: `${baseUrl}/intelligent/${date}` },
  };
}

export default function IntelligentDateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
