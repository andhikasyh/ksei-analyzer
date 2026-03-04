import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const upper = (code || "").toUpperCase();
  return {
    title: `${upper} – Stock Ownership & Shareholders`,
    description: `Beneficial ownership and shareholder data for ${upper} on the Indonesian stock exchange. Top holders, ownership structure, and KSEI data.`,
    openGraph: {
      title: `${upper} – Stock Ownership | ${SITE_NAME}`,
      description: `Shareholder and ownership data for ${upper} (IDX).`,
    },
  };
}

export default function StockLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
