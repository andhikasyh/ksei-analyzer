import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

type Props = { params: Promise<{ name: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const decoded = decodeURIComponent(name || "");
  return {
    title: `${decoded} – Portfolio & Holdings`,
    description: `Stock portfolio and holdings for ${decoded} on the Indonesian stock exchange. KSEI beneficial ownership data.`,
    openGraph: {
      title: `${decoded} – Investor Holdings | ${SITE_NAME}`,
      description: `Portfolio and holdings for ${decoded} (IDX).`,
    },
  };
}

export default function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
