import Link from "next/link";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import { DashboardContent } from "@/components/DashboardContent";

export default function DashboardPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <section
        style={{
          padding: "12px 16px",
          borderRadius: "8px",
          border: "1px solid rgba(128,128,128,0.12)",
        }}
      >
        <h1
          style={{
            fontFamily: '"Outfit", sans-serif',
            fontWeight: 700,
            fontSize: "1rem",
            letterSpacing: "-0.02em",
            marginTop: 0,
            marginBottom: "6px",
          }}
        >
          {SITE_NAME} - Indonesian Stock Ownership &amp; Market Data
        </h1>
        <p
          style={{
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            fontSize: "0.85rem",
            lineHeight: 1.6,
            marginTop: 0,
            marginBottom: "8px",
            opacity: 0.75,
          }}
        >
          {SITE_DESCRIPTION}
        </p>
        <p
          style={{
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            fontSize: "0.72rem",
            marginTop: 0,
            marginBottom: 0,
            opacity: 0.5,
          }}
        >
          By using this site you agree to our{" "}
          <Link
            href="/terms"
            style={{
              color: "inherit",
              textDecoration: "underline",
              fontWeight: 600,
            }}
          >
            Terms of Service
          </Link>
          {" "}and{" "}
          <Link
            href="/privacy"
            style={{
              color: "inherit",
              textDecoration: "underline",
              fontWeight: 600,
            }}
          >
            Privacy Policy
          </Link>
          .
        </p>
      </section>

      <DashboardContent />
    </div>
  );
}
