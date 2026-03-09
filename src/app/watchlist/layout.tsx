import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Watchlist Saham",
  description:
    "Pantau saham pilihan Anda di Bursa Efek Indonesia. Watchlist pribadi untuk melacak harga, kepemilikan, dan pergerakan saham BEI.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function WatchlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
