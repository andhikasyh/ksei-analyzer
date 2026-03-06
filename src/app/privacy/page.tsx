import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy Policy for ${SITE_NAME} - Indonesian Stock Ownership & Market Data platform.`,
};

const LAST_UPDATED = "March 6, 2026";

const sectionHeading = {
  fontFamily: '"Outfit", sans-serif',
  fontWeight: 700,
  fontSize: { xs: "1.05rem", sm: "1.15rem" },
  color: "text.primary",
  mt: 5,
  mb: 1.5,
  letterSpacing: "-0.01em",
} as const;

const paragraph = {
  fontFamily: '"Plus Jakarta Sans", sans-serif',
  fontSize: { xs: "0.82rem", sm: "0.86rem" },
  color: "text.secondary",
  lineHeight: 1.75,
  mb: 2,
} as const;

const listItem = {
  fontFamily: '"Plus Jakarta Sans", sans-serif',
  fontSize: { xs: "0.82rem", sm: "0.86rem" },
  color: "text.secondary",
  lineHeight: 1.75,
  pl: 2,
  position: "relative" as const,
  "&::before": {
    content: '""',
    position: "absolute",
    left: 0,
    top: "0.65em",
    width: 4,
    height: 4,
    borderRadius: "50%",
    bgcolor: "primary.main",
    opacity: 0.6,
  },
} as const;

export default function PrivacyPolicyPage() {
  return (
    <Box
      className="animate-in"
      sx={{
        maxWidth: 720,
        mx: "auto",
        py: { xs: 3, sm: 5 },
        px: { xs: 0.5, sm: 0 },
      }}
    >
      <Typography
        sx={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: "0.65rem",
          fontWeight: 600,
          color: "primary.main",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          mb: 1.5,
        }}
      >
        Legal
      </Typography>

      <Typography
        component="h1"
        sx={{
          fontFamily: '"Outfit", sans-serif',
          fontWeight: 800,
          fontSize: { xs: "1.6rem", sm: "2rem" },
          color: "text.primary",
          letterSpacing: "-0.03em",
          lineHeight: 1.2,
          mb: 1,
        }}
      >
        Privacy Policy
      </Typography>

      <Typography
        sx={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: "0.7rem",
          color: "text.disabled",
          mb: 4,
        }}
      >
        Last updated: {LAST_UPDATED}
      </Typography>

      <Box
        sx={{
          width: "100%",
          height: "1px",
          bgcolor: "divider",
          mb: 4,
          opacity: 0.5,
        }}
      />

      <Typography sx={paragraph}>
        {SITE_NAME} (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the {SITE_NAME} platform, providing Indonesian stock market data, KSEI beneficial ownership analysis, and market intelligence services. This Privacy Policy explains how we collect, use, and protect your information when you use our services.
      </Typography>

      <Typography sx={sectionHeading}>1. Information We Collect</Typography>

      <Typography sx={{ ...paragraph, fontWeight: 600, color: "text.primary", mb: 1 }}>
        Account Information
      </Typography>
      <Typography sx={paragraph}>
        When you create an account or subscribe to our Pro plan, we collect your email address and authentication credentials through our identity provider.
      </Typography>

      <Typography sx={{ ...paragraph, fontWeight: 600, color: "text.primary", mb: 1 }}>
        Usage Data
      </Typography>
      <Typography sx={paragraph}>
        We automatically collect information about how you interact with our platform, including pages visited, features used, search queries, and access timestamps. This data helps us improve the service.
      </Typography>

      <Typography sx={{ ...paragraph, fontWeight: 600, color: "text.primary", mb: 1 }}>
        Payment Information
      </Typography>
      <Typography sx={paragraph}>
        Payments for Pro subscriptions are processed through our third-party payment provider (Mayar). We do not store your credit card details or full payment information on our servers. We only receive transaction confirmations and subscription status.
      </Typography>

      <Typography sx={sectionHeading}>2. How We Use Your Information</Typography>
      <Typography sx={paragraph}>We use the information we collect to:</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 2 }}>
        {[
          "Provide, maintain, and improve our platform and services",
          "Process subscriptions and manage your account",
          "Send transactional communications related to your account",
          "Generate market intelligence reports and AI-powered analysis",
          "Analyze usage patterns to enhance user experience",
          "Detect, prevent, and address technical issues or abuse",
        ].map((item) => (
          <Typography key={item} sx={listItem}>{item}</Typography>
        ))}
      </Box>

      <Typography sx={sectionHeading}>3. Data Sharing & Third-Party Services</Typography>
      <Typography sx={paragraph}>
        We do not sell, rent, or trade your personal information to third parties. We share data only with the following service providers that are essential to operating our platform:
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 2 }}>
        {[
          "Supabase -- authentication and database hosting",
          "Vercel -- application hosting and analytics",
          "Anthropic -- AI-powered market analysis and chat features",
          "Mayar -- payment processing for Pro subscriptions",
        ].map((item) => (
          <Typography key={item} sx={listItem}>{item}</Typography>
        ))}
      </Box>
      <Typography sx={paragraph}>
        Each third-party provider processes data according to their own privacy policies. We recommend reviewing those policies for further details.
      </Typography>

      <Typography sx={sectionHeading}>4. Cookies & Local Storage</Typography>
      <Typography sx={paragraph}>
        We use cookies and browser local storage to maintain your session, remember your preferences (such as theme settings), and collect anonymized analytics. These are necessary for the proper functioning of the platform.
      </Typography>

      <Typography sx={sectionHeading}>5. Data Security</Typography>
      <Typography sx={paragraph}>
        We implement industry-standard security measures to protect your data, including encrypted connections (HTTPS), secure authentication flows, and row-level security on our database. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
      </Typography>

      <Typography sx={sectionHeading}>6. Data Retention</Typography>
      <Typography sx={paragraph}>
        We retain your account information for as long as your account is active or as needed to provide you services. Usage data is retained in aggregated, anonymized form for analytics purposes. If you request account deletion, we will remove your personal data within a reasonable timeframe.
      </Typography>

      <Typography sx={sectionHeading}>7. Your Rights</Typography>
      <Typography sx={paragraph}>You have the right to:</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 2 }}>
        {[
          "Access the personal data we hold about you",
          "Request correction of inaccurate data",
          "Request deletion of your account and associated data",
          "Withdraw consent for data processing at any time",
        ].map((item) => (
          <Typography key={item} sx={listItem}>{item}</Typography>
        ))}
      </Box>
      <Typography sx={paragraph}>
        To exercise any of these rights, please contact us through the feedback widget on our platform or reach out via email.
      </Typography>

      <Typography sx={sectionHeading}>8. Children&apos;s Privacy</Typography>
      <Typography sx={paragraph}>
        Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal data, we will take steps to delete such information.
      </Typography>

      <Typography sx={sectionHeading}>9. Changes to This Policy</Typography>
      <Typography sx={paragraph}>
        We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated revision date. Continued use of the platform after changes constitutes acceptance of the revised policy.
      </Typography>

      <Typography sx={sectionHeading}>10. Contact</Typography>
      <Typography sx={paragraph}>
        If you have any questions about this Privacy Policy, please contact us through the feedback feature available on our platform.
      </Typography>

      <Box sx={{ mt: 5, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
        <Typography
          sx={{
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            fontSize: "0.78rem",
            color: "text.disabled",
          }}
        >
          See also:{" "}
          <Link
            href="/terms"
            style={{ fontWeight: 600 }}
          >
            Terms of Service
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}
