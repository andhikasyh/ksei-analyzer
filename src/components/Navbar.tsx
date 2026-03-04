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
];

export function Navbar() {
  const pathname = usePathname();
  const { mode, toggleColorMode } = useColorMode();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: mode === "dark" ? "rgba(9,9,11,0.8)" : "rgba(250,250,250,0.8)",
        backdropFilter: "blur(12px)",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 } }}>
        <Toolbar disableGutters sx={{ minHeight: 56, gap: 1 }}>
          <Typography
            component={Link}
            href="/"
            sx={{
              fontWeight: 700,
              fontSize: "1rem",
              letterSpacing: "-0.02em",
              color: "text.primary",
              mr: 4,
            }}
          >
            BEI Analyzer
          </Typography>

          <Box sx={{ display: "flex", gap: 0.5, flex: 1 }}>
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
                    fontSize: "0.85rem",
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "text.primary" : "text.secondary",
                    bgcolor: isActive
                      ? mode === "dark"
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)"
                      : "transparent",
                    borderRadius: 1.5,
                    minWidth: "auto",
                    "&:hover": {
                      bgcolor:
                        mode === "dark"
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.06)",
                    },
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
                width: 34,
                height: 34,
                color: "text.secondary",
                border: 1,
                borderColor: "divider",
                borderRadius: 1.5,
              }}
            >
              {mode === "dark" ? (
                <LightModeIcon sx={{ fontSize: 18 }} />
              ) : (
                <DarkModeIcon sx={{ fontSize: 18 }} />
              )}
            </IconButton>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
