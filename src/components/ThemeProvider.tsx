"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  ThemeProvider as MuiThemeProvider,
  createTheme,
} from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";

interface ColorModeContextType {
  mode: "light" | "dark";
  toggleColorMode: () => void;
}

const ColorModeContext = createContext<ColorModeContextType>({
  mode: "dark",
  toggleColorMode: () => {},
});

export function useColorMode() {
  return useContext(ColorModeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const stored = localStorage.getItem("theme-mode") as
      | "light"
      | "dark"
      | null;
    if (stored) setMode(stored);
  }, []);

  const toggleColorMode = () => {
    setMode((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("theme-mode", next);
      return next;
    });
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === "dark"
            ? {
                background: { default: "#09090b", paper: "#18181b" },
                text: { primary: "#fafafa", secondary: "#a1a1aa" },
                primary: { main: "#3b82f6", light: "#60a5fa" },
                secondary: { main: "#22d3ee" },
                divider: "#27272a",
                success: { main: "#22c55e" },
                warning: { main: "#eab308" },
                error: { main: "#ef4444" },
              }
            : {
                background: { default: "#fafafa", paper: "#ffffff" },
                text: { primary: "#09090b", secondary: "#71717a" },
                primary: { main: "#2563eb", light: "#3b82f6" },
                secondary: { main: "#0891b2" },
                divider: "#e4e4e7",
                success: { main: "#16a34a" },
                warning: { main: "#ca8a04" },
                error: { main: "#dc2626" },
              }),
        },
        typography: {
          fontFamily:
            '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          h5: { fontWeight: 700, letterSpacing: "-0.02em" },
          h6: { fontWeight: 700, letterSpacing: "-0.01em" },
          subtitle1: { fontWeight: 600 },
          subtitle2: { fontWeight: 600 },
          body2: { fontSize: "0.875rem" },
          caption: { fontSize: "0.75rem", letterSpacing: "0.02em" },
        },
        shape: { borderRadius: 12 },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              ":root": { colorScheme: mode },
              body: {
                backgroundColor:
                  mode === "dark" ? "#09090b" : "#fafafa",
              },
            },
          },
          MuiPaper: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
              root: {
                backgroundImage: "none",
                border: `1px solid ${
                  mode === "dark"
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.06)"
                }`,
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: "none",
                fontWeight: 500,
                borderRadius: 8,
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: { borderRadius: 6, fontWeight: 500, fontSize: "0.75rem" },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              head: {
                fontSize: "0.75rem",
                fontWeight: 600,
                color: mode === "dark" ? "#a1a1aa" : "#71717a",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                backgroundColor:
                  mode === "dark" ? "#141416" : "#f4f4f5",
                borderBottom: `1px solid ${
                  mode === "dark"
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.06)"
                }`,
              },
              root: {
                borderColor:
                  mode === "dark"
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.06)",
              },
            },
          },
          MuiTooltip: {
            styleOverrides: {
              tooltip: {
                backgroundColor: mode === "dark" ? "#27272a" : "#fafafa",
                color: mode === "dark" ? "#fafafa" : "#09090b",
                border: `1px solid ${
                  mode === "dark"
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.1)"
                }`,
                fontSize: "0.8rem",
              },
            },
          },
        },
      }),
    [mode]
  );

  return (
    <ColorModeContext.Provider value={{ mode, toggleColorMode }}>
      <AppRouterCacheProvider>
        <MuiThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </MuiThemeProvider>
      </AppRouterCacheProvider>
    </ColorModeContext.Provider>
  );
}
