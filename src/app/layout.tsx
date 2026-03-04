import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Navbar } from "@/components/Navbar";
import { LayoutShell } from "@/components/LayoutShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "iDX Analyzer - BEI Ownership Data",
  description:
    "Analyze KSEI beneficial ownership data for Indonesian stock exchange",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <Navbar />
          <LayoutShell>{children}</LayoutShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
