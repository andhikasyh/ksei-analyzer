"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useColorMode } from "@/components/ThemeProvider";
import { useProContext } from "@/lib/pro-context";
import { SITE_NAME } from "@/lib/site";
import { useEffect, useState, useCallback } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import Stack from "@mui/material/Stack";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import LensIcon from "@mui/icons-material/Lens";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import { ProPaywallModal } from "@/components/ProPaywallModal";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/screener", label: "Screener" },
  { href: "/brokers", label: "Brokers" },
  { href: "/intelligent", label: "Insights" },
];

export function Navbar() {
  const pathname = usePathname();
  const { mode, toggleColorMode } = useColorMode();
  const { user, isPro, signOut, loading: proLoading } = useProContext();
  const [mounted, setMounted] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mode === "dark";
  const accent = isDark ? "#d4a843" : "#a17c2f";

  const handleMenuOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleSignOut = useCallback(async () => {
    handleMenuClose();
    await signOut();
  }, [signOut, handleMenuClose]);

  return (
    <>
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
        <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>
          <Toolbar disableGutters sx={{ minHeight: 56, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0, md: 3 }, minWidth: 0 }}>
              <Box
                component={Link}
                href="/"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  textDecoration: "none",
                  flexShrink: 0,
                }}
              >
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: "8px",
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
                  <LensIcon sx={{ fontSize: 18, color: "#060a14" }} />
                </Box>
                <Typography
                  sx={{
                    fontFamily: '"Outfit", sans-serif',
                    fontWeight: 700,
                    fontSize: { xs: "0.82rem", sm: "0.9rem" },
                    letterSpacing: "-0.02em",
                    color: "text.primary",
                  }}
                >
                  {SITE_NAME}
                </Typography>
              </Box>

              <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 0.5 }}>
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
                        py: 0.75,
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
                        borderBottom: "2px solid transparent",
                        ...(isActive && {
                          borderBottomColor: "primary.main",
                        }),
                        transition: "color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease",
                        "&:hover": {
                          bgcolor: isDark
                            ? "rgba(212,168,67,0.06)"
                            : "rgba(161,124,47,0.04)",
                          color: isActive ? "primary.main" : "text.primary",
                        },
                      }}
                    >
                      {label}
                    </Button>
                  );
                })}
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0 }}>
              <IconButton
                onClick={() => setMobileMenuOpen(true)}
                size="small"
                aria-label="Open menu"
                sx={{
                  display: { xs: "inline-flex", md: "none" },
                  width: 40,
                  height: 40,
                  color: "text.secondary",
                  border: 1,
                  borderColor: isDark
                    ? "rgba(107,127,163,0.12)"
                    : "rgba(12,18,34,0.08)",
                  borderRadius: "8px",
                  "&:hover": {
                    borderColor: "primary.main",
                    color: "primary.main",
                    bgcolor: isDark ? "rgba(212,168,67,0.06)" : "rgba(161,124,47,0.04)",
                  },
                }}
              >
                <MenuIcon sx={{ fontSize: 22 }} />
              </IconButton>

              {mounted && !proLoading && (
                <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 0.75 }}>
                {user ? (
                  <>
                    {isPro && (
                      <Box
                        sx={{
                          px: 1,
                          py: 0.35,
                          borderRadius: "6px",
                          background: isDark
                            ? "linear-gradient(135deg, rgba(212,168,67,0.12), rgba(212,168,67,0.07))"
                            : "linear-gradient(135deg, rgba(161,124,47,0.1), rgba(161,124,47,0.06))",
                          border: `1px solid ${isDark ? "rgba(212,168,67,0.22)" : "rgba(161,124,47,0.18)"}`,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "0.6rem",
                            fontWeight: 700,
                            color: accent,
                            fontFamily: '"JetBrains Mono", monospace',
                            letterSpacing: "0.06em",
                          }}
                        >
                          PRO
                        </Typography>
                      </Box>
                    )}

                    <IconButton
                      size="small"
                      onClick={handleMenuOpen}
                      aria-label="Account menu"
                      sx={{
                        width: 40,
                        height: 40,
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
                      <AccountCircleIcon sx={{ fontSize: 18 }} />
                    </IconButton>

                    <Menu
                      anchorEl={anchorEl}
                      open={Boolean(anchorEl)}
                      onClose={handleMenuClose}
                      slotProps={{
                        paper: {
                          sx: {
                            borderRadius: "12px",
                            border: `1px solid ${isDark ? "rgba(107,127,163,0.15)" : "rgba(12,18,34,0.08)"}`,
                            bgcolor: isDark ? "#0d1425" : "#ffffff",
                            boxShadow: isDark
                              ? "0 8px 32px rgba(0,0,0,0.5)"
                              : "0 8px 32px rgba(0,0,0,0.1)",
                            backgroundImage: "none",
                            minWidth: 200,
                            mt: 0.5,
                          },
                        },
                      }}
                      transformOrigin={{ horizontal: "right", vertical: "top" }}
                      anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                    >
                      <Box sx={{ px: 2, py: 1.25 }}>
                        <Typography
                          sx={{
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            color: "text.primary",
                            fontFamily: '"Plus Jakarta Sans", sans-serif',
                            mb: 0.25,
                          }}
                        >
                          {user.email}
                        </Typography>
                        <Box
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            px: 0.75,
                            py: 0.25,
                            borderRadius: "5px",
                            bgcolor: isPro
                              ? isDark ? "rgba(212,168,67,0.1)" : "rgba(161,124,47,0.08)"
                              : isDark ? "rgba(107,127,163,0.1)" : "rgba(12,18,34,0.05)",
                            border: `1px solid ${isPro
                              ? isDark ? "rgba(212,168,67,0.2)" : "rgba(161,124,47,0.15)"
                              : isDark ? "rgba(107,127,163,0.15)" : "rgba(12,18,34,0.08)"}`,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.58rem",
                              fontWeight: 700,
                              color: isPro ? accent : "text.secondary",
                              fontFamily: '"JetBrains Mono", monospace',
                              letterSpacing: "0.05em",
                            }}
                          >
                            {isPro ? "PRO MEMBER" : "FREE"}
                          </Typography>
                        </Box>
                      </Box>

                      <Divider sx={{ my: 0.5 }} />

                      {!isPro && (
                        <MenuItem
                          onClick={() => {
                            handleMenuClose();
                            setPaywallOpen(true);
                          }}
                          sx={{
                            fontSize: "0.78rem",
                            fontFamily: '"Plus Jakarta Sans", sans-serif',
                            py: 0.85,
                            gap: 1.25,
                            color: accent,
                            fontWeight: 600,
                          }}
                        >
                          Upgrade ke Pro
                        </MenuItem>
                      )}

                      <MenuItem
                        onClick={handleSignOut}
                        sx={{
                          fontSize: "0.78rem",
                          fontFamily: '"Plus Jakarta Sans", sans-serif',
                          py: 0.85,
                          gap: 1.25,
                          color: "text.secondary",
                          "&:hover": { color: "#fb7185" },
                        }}
                      >
                        <LogoutIcon sx={{ fontSize: 15 }} />
                        Keluar
                      </MenuItem>
                    </Menu>
                  </>
                ) : (
                  <Button
                    size="small"
                    onClick={() => setPaywallOpen(true)}
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: accent,
                      border: `1px solid ${isDark ? "rgba(212,168,67,0.2)" : "rgba(161,124,47,0.18)"}`,
                      borderRadius: "8px",
                      bgcolor: isDark ? "rgba(212,168,67,0.05)" : "rgba(161,124,47,0.04)",
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                      transition: "all 0.15s ease",
                      "&:hover": {
                        bgcolor: isDark ? "rgba(212,168,67,0.1)" : "rgba(161,124,47,0.08)",
                        borderColor: accent,
                      },
                    }}
                  >
                    Masuk
                  </Button>
                )}
                </Box>
              )}

              {mounted && (
                <IconButton
                  onClick={toggleColorMode}
                  size="small"
                  aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  sx={{
                    width: 40,
                    height: 40,
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
                    <LightModeIcon sx={{ fontSize: 18 }} />
                  ) : (
                    <DarkModeIcon sx={{ fontSize: 18 }} />
                  )}
                </IconButton>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: "min(320px, 100vw)", sm: 320 },
              borderLeft: `1px solid ${isDark ? "rgba(107,127,163,0.12)" : "rgba(12,18,34,0.08)"}`,
              bgcolor: isDark ? "#0d1425" : "#fafafa",
              pt: 2,
              pb: 2,
            },
          },
        }}
      >
        <List sx={{ px: 1 }}>
          {NAV_ITEMS.map(({ href, label }) => {
            const isActive =
              pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <ListItem key={href} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  component={Link}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  sx={{
                    borderRadius: 1.5,
                    py: 1.25,
                    bgcolor: isActive
                      ? isDark ? "rgba(212,168,67,0.1)" : "rgba(161,124,47,0.08)"
                      : "transparent",
                    color: isActive ? "primary.main" : "text.primary",
                    fontWeight: isActive ? 700 : 500,
                    "&:hover": {
                      bgcolor: isDark ? "rgba(212,168,67,0.06)" : "rgba(161,124,47,0.04)",
                    },
                  }}
                >
                  <ListItemText primary={label} primaryTypographyProps={{ fontSize: "0.9rem" }} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        {mounted && !proLoading && (
          <>
            <Divider sx={{ my: 1.5, mx: 1 }} />
            <Box sx={{ px: 2 }}>
              {user ? (
                <Stack spacing={1}>
                  <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {user.email}
                  </Typography>
                  {!isPro && (
                    <Button
                      size="small"
                      fullWidth
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setPaywallOpen(true);
                      }}
                      sx={{ fontSize: "0.78rem", fontWeight: 600, color: accent }}
                    >
                      Upgrade ke Pro
                    </Button>
                  )}
                  <Button
                    size="small"
                    startIcon={<LogoutIcon sx={{ fontSize: 16 }} />}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    sx={{ fontSize: "0.78rem", color: "text.secondary" }}
                  >
                    Keluar
                  </Button>
                </Stack>
              ) : (
                <Button
                  fullWidth
                  size="medium"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setPaywallOpen(true);
                  }}
                  sx={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: accent,
                    border: `1px solid ${isDark ? "rgba(212,168,67,0.2)" : "rgba(161,124,47,0.18)"}`,
                    borderRadius: "8px",
                    py: 1,
                    "&:hover": {
                      bgcolor: isDark ? "rgba(212,168,67,0.08)" : "rgba(161,124,47,0.06)",
                      borderColor: accent,
                    },
                  }}
                >
                  Masuk
                </Button>
              )}
            </Box>
          </>
        )}
      </Drawer>

      <ProPaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        initialMode={user ? "pro" : "login"}
      />
    </>
  );
}
