import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { INVESTOR_TYPE_MAP } from "@/lib/types";

type Props = { params: Promise<{ type: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;
  const code = (type || "").toUpperCase();
  const label = INVESTOR_TYPE_MAP[code] || code;
  return {
    title: `${label} Investors`,
    description: `List of ${label} investors on the Indonesian stock exchange with holdings and ownership data. KSEI beneficial ownership.`,
    openGraph: {
      title: `${label} Investors | ${SITE_NAME}`,
      description: `${label} investors and holdings on IDX.`,
    },
  };
}

export default function CategoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
