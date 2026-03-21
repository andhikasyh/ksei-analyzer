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
import { ConsentModal } from "@/components/ConsentModal";
import { getBaseUrl, SITE_NAME, SITE_DESCRIPTION, SITE_DESCRIPTION_EN, SITE_KEYWORDS } from "@/lib/site";
import "./globals.css";

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: `${SITE_NAME} – Analisis Saham Indonesia Gratis | Alternatif Stockbit & RTI`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "id_ID",
    alternateLocale: "en_US",
    url: baseUrl,
    siteName: SITE_NAME,
    title: `${SITE_NAME} – Platform Analisis Saham Indonesia Gratis`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} – Analisis Saham KSEI, Screener & Market Intelligence`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
                  inLanguage: ["id-ID", "en-US"],
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
                {
                  "@type": "WebApplication",
                  name: SITE_NAME,
                  url: baseUrl,
                  applicationCategory: "FinanceApplication",
                  operatingSystem: "Web",
                  description: SITE_DESCRIPTION_EN,
                  inLanguage: ["id", "en"],
                  offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "IDR",
                    description: "Free Indonesian stock analysis platform - alternative to Stockbit, RTI, IPOT",
                  },
                  audience: {
                    "@type": "Audience",
                    audienceType: "Investor",
                    geographicArea: {
                      "@type": "Country",
                      name: "Indonesia",
                    },
                  },
                  featureList: [
                    "KSEI beneficial ownership analysis",
                    "Stock screener with fundamental filters",
                    "Broker activity and market share tracking",
                    "Daily smart market intelligence reports",
                    "Foreign flow analytics and net buy/sell tracking",
                    "Sector analysis for BEI/IDX",
                    "Dividend data and yield analysis",
                    "Stock comparison tools",
                    "Portfolio tracking and watchlist",
                    "Real-time IHSG, LQ45, IDX30 data",
                  ],
                  alternativeHeadline: "Alternatif Stockbit dan RTI untuk analisis saham Indonesia",
                  keywords: "stockbit alternative, RTI alternative, aplikasi saham gratis, KSEI data, screener saham Indonesia",
                },
                {
                  "@type": "FAQPage",
                  mainEntity: [
                    {
                      "@type": "Question",
                      name: "Apa itu Gunaa dan bedanya dengan Stockbit?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Gunaa adalah platform analisis saham Indonesia gratis yang fokus pada data kepemilikan KSEI, aktivitas broker, foreign flow, dan market intelligence. Berbeda dengan Stockbit yang fokus pada social trading, Gunaa menyediakan analisis mendalam tentang perubahan kepemilikan saham dan pergerakan smart money.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Apakah Gunaa gratis? Apa bedanya dengan RTI Business?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Ya, Gunaa menyediakan fitur gratis termasuk screener saham, data broker, dan foreign flow. Dibanding RTI Business, Gunaa memiliki fitur unik seperti analisis kepemilikan KSEI dan laporan market intelligence harian.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Bagaimana cara melihat data kepemilikan saham KSEI?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Gunaa menyediakan data kepemilikan saham dari KSEI yang diperbarui secara berkala. Anda bisa melihat siapa saja pemegang saham terbesar, perubahan kepemilikan, dan aktivitas investor institusi maupun ritel.",
                      },
                    },
                  ],
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
              <ConsentModal />
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
