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

const DARK = {
  bg: "#060a14",
  bgPaper: "#0d1425",
  bgElevated: "#111b30",
  textPrimary: "#e8edf5",
  textSecondary: "#6b7fa3",
  primary: "#d4a843",
  primaryLight: "#e8c468",
  secondary: "#38bdf8",
  divider: "rgba(107,127,163,0.10)",
  success: "#34d399",
  warning: "#fbbf24",
  error: "#fb7185",
  border: "rgba(107,127,163,0.12)",
};

const LIGHT = {
  bg: "#f5f7fa",
  bgPaper: "#ffffff",
  bgElevated: "#f0f2f6",
  textPrimary: "#0c1222",
  textSecondary: "#546280",
  primary: "#a17c2f",
  primaryLight: "#c49a3a",
  secondary: "#0369a1",
  divider: "rgba(12,18,34,0.07)",
  success: "#059669",
  warning: "#d97706",
  error: "#e11d48",
  border: "rgba(12,18,34,0.08)",
};

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

  const theme = useMemo(() => {
    const p = mode === "dark" ? DARK : LIGHT;

    return createTheme({
      palette: {
        mode,
        background: { default: p.bg, paper: p.bgPaper },
        text: { primary: p.textPrimary, secondary: p.textSecondary },
        primary: { main: p.primary, light: p.primaryLight },
        secondary: { main: p.secondary },
        divider: p.divider,
        success: { main: p.success },
        warning: { main: p.warning },
        error: { main: p.error },
      },
      typography: {
        fontFamily: '"Plus Jakarta Sans", "Outfit", system-ui, sans-serif',
        h4: {
          fontFamily: '"Outfit", "Plus Jakarta Sans", sans-serif',
          fontWeight: 800,
          letterSpacing: "-0.03em",
        },
        h5: {
          fontFamily: '"Outfit", "Plus Jakarta Sans", sans-serif',
          fontWeight: 700,
          letterSpacing: "-0.025em",
        },
        h6: {
          fontFamily: '"Outfit", "Plus Jakarta Sans", sans-serif',
          fontWeight: 700,
          letterSpacing: "-0.02em",
        },
        subtitle1: {
          fontFamily: '"Outfit", "Plus Jakarta Sans", sans-serif',
          fontWeight: 700,
          letterSpacing: "-0.01em",
        },
        subtitle2: {
          fontFamily: '"Outfit", "Plus Jakarta Sans", sans-serif',
          fontWeight: 600,
          letterSpacing: "-0.005em",
        },
        body1: { fontWeight: 400 },
        body2: { fontSize: "0.85rem", fontWeight: 400 },
        caption: {
          fontSize: "0.72rem",
          fontWeight: 500,
          letterSpacing: "0.03em",
        },
      },
      shape: { borderRadius: 10 },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            ":root": {
              colorScheme: mode,
              "--accent": p.primary,
              "--accent-light": p.primaryLight,
              "--bg-elevated": p.bgElevated,
              "--border": p.border,
              "--mono": '"JetBrains Mono", "SF Mono", "Fira Code", monospace',
            },
            body: {
              backgroundColor: p.bg,
            },
          },
        },
        MuiPaper: {
          defaultProps: { elevation: 0 },
          styleOverrides: {
            root: {
              backgroundImage: "none",
              border: `1px solid ${p.border}`,
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: "none",
              fontWeight: 600,
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              borderRadius: 8,
              letterSpacing: "-0.01em",
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: 6,
              fontWeight: 600,
              fontSize: "0.7rem",
              fontFamily: '"Plus Jakarta Sans", sans-serif',
            },
          },
        },
        MuiTableCell: {
          styleOverrides: {
            head: {
              fontSize: "0.68rem",
              fontWeight: 700,
              fontFamily: '"Outfit", sans-serif',
              color: p.textSecondary,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              backgroundColor:
                mode === "dark"
                  ? "rgba(13,20,37,0.9)"
                  : "rgba(240,242,246,0.9)",
              borderBottom: `1px solid ${p.border}`,
              padding: "8px 12px",
            },
            root: {
              borderColor: p.border,
              padding: "6px 12px",
              fontSize: "0.82rem",
            },
          },
        },
        MuiTooltip: {
          styleOverrides: {
            tooltip: {
              backgroundColor:
                mode === "dark" ? DARK.bgElevated : LIGHT.bgPaper,
              color: p.textPrimary,
              border: `1px solid ${p.border}`,
              fontSize: "0.78rem",
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              borderRadius: 8,
              boxShadow:
                mode === "dark"
                  ? "0 8px 32px rgba(0,0,0,0.5)"
                  : "0 8px 32px rgba(0,0,0,0.1)",
            },
          },
        },
        MuiAutocomplete: {
          styleOverrides: {
            paper: {
              borderRadius: 10,
              border: `1px solid ${p.border}`,
              boxShadow:
                mode === "dark"
                  ? "0 12px 40px rgba(0,0,0,0.6)"
                  : "0 12px 40px rgba(0,0,0,0.12)",
            },
          },
        },
        MuiLinearProgress: {
          styleOverrides: {
            root: {
              borderRadius: 4,
              height: 3,
            },
          },
        },
      },
    });
  }, [mode]);

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
