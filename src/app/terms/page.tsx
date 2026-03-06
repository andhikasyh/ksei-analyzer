import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of Service for ${SITE_NAME} - Indonesian Stock Ownership & Market Data platform.`,
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

export default function TermsOfServicePage() {
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
        Terms of Service
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
        Welcome to {SITE_NAME}. By accessing or using our platform, you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree with any part of these Terms, please do not use our services.
      </Typography>

      <Typography sx={sectionHeading}>1. Description of Service</Typography>
      <Typography sx={paragraph}>
        {SITE_NAME} is a financial data platform that provides analysis of KSEI beneficial ownership data, IDX stock market information, broker activity tracking, stock screening, investor portfolio analysis, and AI-powered market intelligence for the Indonesian stock exchange.
      </Typography>

      <Typography sx={sectionHeading}>2. Acceptance of Terms</Typography>
      <Typography sx={paragraph}>
        By creating an account, subscribing to any plan, or otherwise using the platform, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. We reserve the right to modify these Terms at any time. Continued use after modifications constitutes acceptance of the updated Terms.
      </Typography>

      <Typography sx={sectionHeading}>3. User Accounts</Typography>
      <Typography sx={paragraph}>
        To access certain features, you may need to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 2 }}>
        {[
          "Provide accurate and complete information during registration",
          "Keep your account credentials secure and confidential",
          "Notify us immediately of any unauthorized access to your account",
          "Not share your account with others or create multiple accounts",
        ].map((item) => (
          <Typography key={item} sx={listItem}>{item}</Typography>
        ))}
      </Box>

      <Typography sx={sectionHeading}>4. Subscriptions & Payments</Typography>
      <Typography sx={paragraph}>
        {SITE_NAME} offers both free and paid (Pro) subscription tiers. Pro subscriptions provide access to additional features including advanced analytics, AI-powered chat, and detailed market reports.
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 2 }}>
        {[
          "Pro subscriptions are billed according to the plan selected at the time of purchase",
          "Payments are processed securely through our third-party payment provider",
          "Subscriptions may auto-renew unless cancelled before the renewal date",
          "Refunds are handled on a case-by-case basis at our discretion",
        ].map((item) => (
          <Typography key={item} sx={listItem}>{item}</Typography>
        ))}
      </Box>

      <Typography sx={sectionHeading}>5. Investment Disclaimer</Typography>
      <Box
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 2,
          border: "1px solid",
          borderColor: "warning.dark",
          bgcolor: "rgba(212,168,67,0.05)",
          mb: 2,
        }}
      >
        <Typography
          sx={{
            ...paragraph,
            mb: 0,
            fontWeight: 500,
          }}
        >
          The information provided on {SITE_NAME} is for informational and educational purposes only. It does not constitute financial advice, investment advice, trading advice, or any other sort of advice. You should not treat any of the content as such. {SITE_NAME} does not recommend that any securities, transactions, or investment strategies are suitable for any specific person. The data and analysis on this platform should not be used as the sole basis for making investment decisions. Always conduct your own research and consult with a qualified financial advisor before making any investment.
        </Typography>
      </Box>
      <Typography sx={paragraph}>
        Past performance of securities discussed on this platform is not indicative of future results. Trading and investing in securities involves risk and may result in the loss of your invested capital.
      </Typography>

      <Typography sx={sectionHeading}>6. Data Accuracy</Typography>
      <Typography sx={paragraph}>
        While we strive to provide accurate and up-to-date information sourced from KSEI, IDX, and other official sources, we do not warrant the completeness, reliability, or accuracy of any data presented on the platform. Market data may be delayed, and AI-generated analysis may contain inaccuracies. Users should verify critical information through official channels before making decisions.
      </Typography>

      <Typography sx={sectionHeading}>7. Acceptable Use</Typography>
      <Typography sx={paragraph}>You agree not to:</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 2 }}>
        {[
          "Use the platform for any unlawful purpose or in violation of applicable regulations",
          "Attempt to gain unauthorized access to our systems, accounts, or data",
          "Scrape, crawl, or use automated means to extract data from the platform without permission",
          "Redistribute, resell, or commercially exploit the data or content without authorization",
          "Interfere with or disrupt the platform's infrastructure or other users' access",
          "Impersonate any person or misrepresent your affiliation with any entity",
        ].map((item) => (
          <Typography key={item} sx={listItem}>{item}</Typography>
        ))}
      </Box>

      <Typography sx={sectionHeading}>8. Intellectual Property</Typography>
      <Typography sx={paragraph}>
        All content on {SITE_NAME}, including but not limited to text, graphics, logos, data compilations, analysis reports, and software, is the property of {SITE_NAME} or its content suppliers and is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works from our content without explicit written permission.
      </Typography>

      <Typography sx={sectionHeading}>9. Limitation of Liability</Typography>
      <Typography sx={paragraph}>
        To the fullest extent permitted by law, {SITE_NAME} and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or other intangible losses, resulting from:
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 2 }}>
        {[
          "Your use of or inability to use the platform",
          "Any investment or trading decisions made based on information from the platform",
          "Unauthorized access to your account or data",
          "Errors, inaccuracies, or omissions in the data or content provided",
          "Any interruption or cessation of the service",
        ].map((item) => (
          <Typography key={item} sx={listItem}>{item}</Typography>
        ))}
      </Box>

      <Typography sx={sectionHeading}>10. Termination</Typography>
      <Typography sx={paragraph}>
        We reserve the right to suspend or terminate your account and access to the platform at our sole discretion, without prior notice, for conduct that we believe violates these Terms, is harmful to other users, or is otherwise objectionable. Upon termination, your right to use the platform ceases immediately.
      </Typography>

      <Typography sx={sectionHeading}>11. Governing Law</Typography>
      <Typography sx={paragraph}>
        These Terms shall be governed by and construed in accordance with the laws of the Republic of Indonesia. Any disputes arising from these Terms or your use of the platform shall be resolved through the competent courts in Indonesia.
      </Typography>

      <Typography sx={sectionHeading}>12. Contact</Typography>
      <Typography sx={paragraph}>
        If you have any questions about these Terms, please contact us through the feedback feature available on our platform.
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
            href="/privacy"
            style={{ fontWeight: 600 }}
          >
            Privacy Policy
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}
