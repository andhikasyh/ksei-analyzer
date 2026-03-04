import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

type Props = { params: Promise<{ date: string }> };

function formatDateLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const label = formatDateLabel(date || "");
  return {
    title: `Market Report – ${label}`,
    description: `Daily market intelligence and AI report for the Indonesian stock market on ${label}. Sector analysis, top movers, and outlook.`,
    openGraph: {
      title: `Market Report – ${label} | ${SITE_NAME}`,
      description: `Daily market intelligence for IDX on ${label}.`,
    },
  };
}

export default function IntelligentDateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
