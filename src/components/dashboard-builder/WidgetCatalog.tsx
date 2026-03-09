"use client";

import { useState, useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import ButtonBase from "@mui/material/ButtonBase";
import Chip from "@mui/material/Chip";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import GridViewIcon from "@mui/icons-material/GridView";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import EventIcon from "@mui/icons-material/Event";
import StarIcon from "@mui/icons-material/Star";
import FilterListIcon from "@mui/icons-material/FilterList";
import PeopleIcon from "@mui/icons-material/People";
import PsychologyIcon from "@mui/icons-material/Psychology";
import CandlestickChartIcon from "@mui/icons-material/CandlestickChart";
import BusinessIcon from "@mui/icons-material/Business";
import BarChartIcon from "@mui/icons-material/BarChart";
import PieChartIcon from "@mui/icons-material/PieChart";
import HistoryIcon from "@mui/icons-material/History";
import PaymentsIcon from "@mui/icons-material/Payments";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import HubIcon from "@mui/icons-material/Hub";
import LinkIcon from "@mui/icons-material/Link";
import { useTheme } from "@mui/material/styles";
import { WIDGET_REGISTRY, type WidgetCategory } from "./WidgetRegistry";
import type { WidgetType } from "@/lib/types";
import { useLocale } from "@/lib/locale-context";

const ICON_MAP: Record<string, React.ComponentType<{ sx?: object }>> = {
  ShowChart: ShowChartIcon,
  GridView: GridViewIcon,
  TrendingUp: TrendingUpIcon,
  SwapHoriz: SwapHorizIcon,
  Event: EventIcon,
  Star: StarIcon,
  FilterList: FilterListIcon,
  People: PeopleIcon,
  Psychology: PsychologyIcon,
  CandlestickChart: CandlestickChartIcon,
  Business: BusinessIcon,
  BarChart: BarChartIcon,
  PieChart: PieChartIcon,
  History: HistoryIcon,
  Payments: PaymentsIcon,
  AccountBalance: AccountBalanceIcon,
  Newspaper: NewspaperIcon,
  Hub: HubIcon,
};

const CATEGORY_LABELS: Record<WidgetCategory, { en: string; id: string }> = {
  market: { en: "Market Overview", id: "Pasar" },
  stock: { en: "Stock Analysis", id: "Analisis Saham" },
  screening: { en: "Screening", id: "Screening" },
  intelligence: { en: "Intelligence", id: "Intelligence" },
};

const CATEGORY_ORDER: WidgetCategory[] = ["market", "stock", "screening", "intelligence"];

interface WidgetCatalogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (type: WidgetType, stockCode?: string) => void;
}

export function WidgetCatalog({ open, onClose, onAdd }: WidgetCatalogProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { locale } = useLocale();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<WidgetCategory | null>(null);

  const filtered = useMemo(() => {
    let items = WIDGET_REGISTRY;
    if (activeCategory) items = items.filter((w) => w.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (w) =>
          w.label.toLowerCase().includes(q) ||
          w.labelId.toLowerCase().includes(q) ||
          w.type.toLowerCase().includes(q)
      );
    }
    return items;
  }, [search, activeCategory]);

  const grouped = useMemo(() => {
    const map = new Map<WidgetCategory, typeof filtered>();
    for (const cat of CATEGORY_ORDER) {
      const items = filtered.filter((w) => w.category === cat);
      if (items.length > 0) map.set(cat, items);
    }
    return map;
  }, [filtered]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "100vw", sm: 380 },
            bgcolor: isDark ? "#080808" : "#f8f7f4",
            borderLeft: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
          },
        },
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Header */}
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
            <Typography
              sx={{
                fontSize: "1rem",
                fontWeight: 700,
                fontFamily: '"Outfit", sans-serif',
                letterSpacing: "-0.02em",
              }}
            >
              {locale === "id" ? "Tambah Widget" : "Add Widget"}
            </Typography>
            <IconButton onClick={onClose} size="small" sx={{ color: "text.secondary" }}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          <TextField
            fullWidth
            size="small"
            placeholder={locale === "id" ? "Cari widget..." : "Search widgets..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <SearchIcon sx={{ fontSize: 16, color: "text.disabled", mr: 0.75 }} />,
                sx: {
                  fontSize: "0.8rem",
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  borderRadius: "8px",
                  bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                },
              },
            }}
          />

          <Box sx={{ display: "flex", gap: 0.5, mt: 1.5, flexWrap: "wrap" }}>
            <Chip
              label={locale === "id" ? "Semua" : "All"}
              size="small"
              onClick={() => setActiveCategory(null)}
              sx={{
                fontSize: "0.68rem",
                fontWeight: activeCategory === null ? 700 : 500,
                bgcolor: activeCategory === null
                  ? isDark ? "rgba(201,162,39,0.12)" : "rgba(201,162,39,0.1)"
                  : "transparent",
                color: activeCategory === null ? "#c9a227" : "text.secondary",
                border: `1px solid ${activeCategory === null ? "rgba(201,162,39,0.2)" : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
              }}
            />
            {CATEGORY_ORDER.map((cat) => (
              <Chip
                key={cat}
                label={locale === "id" ? CATEGORY_LABELS[cat].id : CATEGORY_LABELS[cat].en}
                size="small"
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                sx={{
                  fontSize: "0.68rem",
                  fontWeight: activeCategory === cat ? 700 : 500,
                  bgcolor: activeCategory === cat
                    ? isDark ? "rgba(201,162,39,0.12)" : "rgba(201,162,39,0.1)"
                    : "transparent",
                  color: activeCategory === cat ? "#c9a227" : "text.secondary",
                  border: `1px solid ${activeCategory === cat ? "rgba(201,162,39,0.2)" : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Widget list */}
        <Box sx={{ flex: 1, overflow: "auto", px: 2, py: 1.5 }}>
          {Array.from(grouped.entries()).map(([cat, items]) => (
            <Box key={cat} sx={{ mb: 2 }}>
              <Typography
                sx={{
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  fontFamily: '"JetBrains Mono", monospace',
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "text.disabled",
                  mb: 0.75,
                  px: 0.5,
                }}
              >
                {locale === "id" ? CATEGORY_LABELS[cat].id : CATEGORY_LABELS[cat].en}
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {items.map((w) => {
                  const Icon = ICON_MAP[w.icon] ?? ShowChartIcon;
                  return (
                    <ButtonBase
                      key={w.type}
                      onClick={() => {
                        onAdd(w.type);
                        onClose();
                      }}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.25,
                        px: 1.25,
                        py: 1,
                        borderRadius: "8px",
                        border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"}`,
                        bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                        justifyContent: "flex-start",
                        width: "100%",
                        textAlign: "left",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          bgcolor: isDark ? "rgba(201,162,39,0.06)" : "rgba(201,162,39,0.04)",
                          borderColor: isDark ? "rgba(201,162,39,0.15)" : "rgba(201,162,39,0.12)",
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 30,
                          height: 30,
                          borderRadius: "7px",
                          bgcolor: isDark ? "rgba(201,162,39,0.08)" : "rgba(201,162,39,0.06)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon sx={{ fontSize: 15, color: "#c9a227" }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            fontFamily: '"Plus Jakarta Sans", sans-serif',
                            color: "text.primary",
                          }}
                        >
                          {locale === "id" ? w.labelId : w.label}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", mt: 0.25 }}>
                          {w.needsStockCode && (
                            <Typography
                              sx={{
                                fontSize: "0.6rem",
                                color: "text.disabled",
                                fontFamily: '"JetBrains Mono", monospace',
                              }}
                            >
                              needs ticker
                            </Typography>
                          )}
                          {w.canEmitStock && (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                              <LinkIcon sx={{ fontSize: 10, color: "text.disabled" }} />
                              <Typography
                                sx={{
                                  fontSize: "0.6rem",
                                  color: "text.disabled",
                                  fontFamily: '"JetBrains Mono", monospace',
                                }}
                              >
                                linkable
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </ButtonBase>
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Drawer>
  );
}
