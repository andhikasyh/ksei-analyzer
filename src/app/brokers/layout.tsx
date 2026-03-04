import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Broker Activity",
  description:
    "Trading activity and market share of brokers on the Indonesian stock exchange. Underwriter and broker-dealer rankings, volume and value analytics.",
  openGraph: {
    title: `Broker Activity | ${SITE_NAME}`,
    description:
      "Trading activity and market share of brokers on the Indonesian stock exchange. Broker rankings and analytics.",
  },
};

export default function BrokersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
