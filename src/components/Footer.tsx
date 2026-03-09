"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { useLocale } from "@/lib/locale-context";

const LEGAL_LINKS = [
  { href: "/privacy", labelKey: "common.privacyPolicy" },
  { href: "/terms", labelKey: "common.termsOfService" },
];

export function Footer() {
  const { t } = useLocale();
  return (
    <Box
      component="footer"
      sx={{
        position: "relative",
        zIndex: 1,
        borderTop: 1,
        borderColor: (theme) =>
          theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.06)"
            : "rgba(0,0,0,0.06)",
        mt: 6,
      }}
    >
      <Container
        maxWidth="xl"
        sx={{
          px: { xs: 1.5, sm: 2, md: 3 },
          py: { xs: 2.5, sm: 3 },
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "center", sm: "center" },
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: "0.65rem",
            color: "text.disabled",
            letterSpacing: "0.02em",
          }}
        >
          {new Date().getFullYear()} {t("common.siteName")}
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 2, sm: 3 },
          }}
        >
          {LEGAL_LINKS.map(({ href, labelKey }) => (
            <Typography
              key={href}
              component={Link}
              href={href}
              sx={{
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                fontSize: "0.7rem",
                color: "text.disabled",
                textDecoration: "none",
                transition: "color 0.15s ease",
                "&:hover": {
                  color: "primary.main",
                },
              }}
            >
              {t(labelKey)}
            </Typography>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
