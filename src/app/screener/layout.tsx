import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Stock Screener",
  description:
    "Screen IDX stocks by index, financials, and fundamentals. Filter by sector, liquidity, and ownership. Indonesian equity screener powered by KSEI data.",
  openGraph: {
    title: `Stock Screener | ${SITE_NAME}`,
    description:
      "Screen IDX stocks by index, financials, and fundamentals. Indonesian equity screener powered by KSEI data.",
  },
};

export default function ScreenerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
