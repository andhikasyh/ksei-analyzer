import { SITE_NAME, SITE_DESCRIPTION, getBaseUrl } from "@/lib/site";
import { DashboardContent } from "@/components/DashboardContent";

const baseUrl = getBaseUrl();

export default function DashboardPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <section
        style={{
          padding: "16px 20px",
          borderRadius: "8px",
          border: "1px solid rgba(128,128,128,0.15)",
          background: "rgba(128,128,128,0.03)",
        }}
      >
        <h1
          style={{
            fontFamily: '"Outfit", sans-serif',
            fontWeight: 800,
            fontSize: "1.25rem",
            letterSpacing: "-0.02em",
            marginTop: 0,
            marginBottom: "4px",
          }}
        >
          {SITE_NAME}
        </h1>
        <h2
          style={{
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            fontWeight: 600,
            fontSize: "0.9rem",
            marginTop: 0,
            marginBottom: "10px",
          }}
        >
          Indonesian Stock Ownership &amp; Market Data Platform
        </h2>
        <p
          style={{
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            fontSize: "0.85rem",
            lineHeight: 1.7,
            marginTop: 0,
            marginBottom: "12px",
          }}
        >
          {SITE_NAME} is a financial data platform for the Indonesian stock
          exchange (IDX). {SITE_DESCRIPTION} Our tools help investors research
          beneficial ownership structures, monitor foreign and local investor
          activity, and stay informed with AI-powered market intelligence
          reports.
        </p>
        <nav
          style={{
            display: "flex",
            gap: "16px",
            flexWrap: "wrap",
            fontSize: "0.8rem",
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}
        >
          <a
            href={`${baseUrl}/privacy`}
            style={{
              color: "#1a73e8",
              textDecoration: "underline",
              fontWeight: 600,
            }}
          >
            Privacy Policy
          </a>
          <a
            href={`${baseUrl}/terms`}
            style={{
              color: "#1a73e8",
              textDecoration: "underline",
              fontWeight: 600,
            }}
          >
            Terms of Service
          </a>
        </nav>
      </section>

      <DashboardContent />
    </div>
  );
}
