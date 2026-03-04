"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useColorMode } from "@/components/ThemeProvider";
import { useEffect, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/screener", label: "Screener" },
  { href: "/brokers", label: "Brokers" },
  { href: "/intelligent", label: "Insights" },
];

export function Navbar() {
  const pathname = usePathname();
  const { mode, toggleColorMode } = useColorMode();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mode === "dark";

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: isDark ? "rgba(6,10,20,0.85)" : "rgba(245,247,250,0.85)",
        backdropFilter: "blur(16px) saturate(1.4)",
        borderBottom: 1,
        borderColor: isDark
          ? "rgba(107,127,163,0.1)"
          : "rgba(12,18,34,0.06)",
      }}
    >
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 } }}>
        <Toolbar disableGutters sx={{ minHeight: 52, gap: 1 }}>
          <Box
            component={Link}
            href="/"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mr: 4,
              textDecoration: "none",
            }}
          >
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: "6px",
                background: isDark
                  ? "linear-gradient(135deg, #d4a843 0%, #e8c468 100%)"
                  : "linear-gradient(135deg, #a17c2f 0%, #c49a3a 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: isDark
                  ? "0 0 14px rgba(212,168,67,0.25), 0 0 4px rgba(212,168,67,0.15)"
                  : "0 0 10px rgba(161,124,47,0.18)",
                transition: "box-shadow 0.3s ease",
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 700,
                  fontSize: "0.6rem",
                  color: "#060a14",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                {">_"}
              </Typography>
            </Box>
            <Typography
              sx={{
                fontFamily: '"Outfit", sans-serif',
                fontWeight: 700,
                fontSize: "0.9rem",
                letterSpacing: "-0.02em",
                color: "text.primary",
              }}
            >
              Terminal
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 0.25, flex: 1 }}>
            {NAV_ITEMS.map(({ href, label }) => {
              const isActive =
                pathname === href ||
                (href !== "/" && pathname.startsWith(href));
              return (
                <Button
                  key={href}
                  component={Link}
                  href={href}
                  size="small"
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    fontSize: "0.8rem",
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? "primary.main" : "text.secondary",
                    bgcolor: isActive
                      ? isDark
                        ? "rgba(212,168,67,0.08)"
                        : "rgba(161,124,47,0.06)"
                      : "transparent",
                    borderRadius: 1.5,
                    minWidth: "auto",
                    position: "relative",
                    transition: "all 0.15s ease",
                    "&:hover": {
                      bgcolor: isDark
                        ? "rgba(212,168,67,0.06)"
                        : "rgba(161,124,47,0.04)",
                      color: isActive ? "primary.main" : "text.primary",
                    },
                    "&::after": isActive
                      ? {
                          content: '""',
                          position: "absolute",
                          bottom: 0,
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: 16,
                          height: 2,
                          borderRadius: 1,
                          bgcolor: "primary.main",
                        }
                      : {},
                  }}
                >
                  {label}
                </Button>
              );
            })}
          </Box>

          {mounted && (
            <IconButton
              onClick={toggleColorMode}
              size="small"
              sx={{
                width: 32,
                height: 32,
                color: "text.secondary",
                border: 1,
                borderColor: isDark
                  ? "rgba(107,127,163,0.12)"
                  : "rgba(12,18,34,0.08)",
                borderRadius: "8px",
                transition: "all 0.15s ease",
                "&:hover": {
                  borderColor: "primary.main",
                  color: "primary.main",
                  bgcolor: isDark
                    ? "rgba(212,168,67,0.06)"
                    : "rgba(161,124,47,0.04)",
                },
              }}
            >
              {mode === "dark" ? (
                <LightModeIcon sx={{ fontSize: 16 }} />
              ) : (
                <DarkModeIcon sx={{ fontSize: 16 }} />
              )}
            </IconButton>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
