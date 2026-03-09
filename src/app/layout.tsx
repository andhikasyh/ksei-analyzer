import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Navbar } from "@/components/Navbar";
import { LayoutShell } from "@/components/LayoutShell";
import { FloatingChat } from "@/components/FloatingChat";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { BackToTop } from "@/components/BackToTop";
import { Footer } from "@/components/Footer";
import { ProProvider } from "@/lib/pro-context";
import { LocaleProvider } from "@/lib/locale-context";
import { getBaseUrl, SITE_NAME, SITE_DESCRIPTION, SITE_KEYWORDS } from "@/lib/site";
import "./globals.css";

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: `${SITE_NAME} – Indonesian Stock Ownership & Market Data`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: SITE_NAME,
    title: `${SITE_NAME} – Indonesian Stock Ownership & Market Data`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} – Indonesian Stock Ownership & Market Data`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: { canonical: baseUrl },
  category: "Finance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": `${baseUrl}/#website`,
                  url: baseUrl,
                  name: SITE_NAME,
                  description: SITE_DESCRIPTION,
                  potentialAction: {
                    "@type": "SearchAction",
                    target: { "@type": "EntryPoint", urlTemplate: `${baseUrl}/?q={search_term_string}` },
                    "query-input": "required name=search_term_string",
                  },
                },
                {
                  "@type": "Organization",
                  "@id": `${baseUrl}/#organization`,
                  name: SITE_NAME,
                  url: baseUrl,
                  description: SITE_DESCRIPTION,
                },
              ],
            }),
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <ProProvider>
            <LocaleProvider>
              <Navbar />
              <LayoutShell>{children}</LayoutShell>
              <Footer />
              <FloatingChat />
              <FeedbackWidget />
              <BackToTop />
            </LocaleProvider>
          </ProProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
