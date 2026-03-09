"use client";

import { Suspense, lazy, useState, useMemo, useCallback, useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Popover from "@mui/material/Popover";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import InputAdornment from "@mui/material/InputAdornment";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import CloseIcon from "@mui/icons-material/Close";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import SettingsIcon from "@mui/icons-material/Settings";
import SearchIcon from "@mui/icons-material/Search";
import CheckIcon from "@mui/icons-material/Check";
import { useTheme } from "@mui/material/styles";
import { supabase } from "@/lib/supabase";
import type { WidgetConfig, LinkGroupId } from "@/lib/types";
import { LINK_GROUP_COLORS } from "@/lib/types";
import { getWidgetMeta, getWidgetLoader } from "./WidgetRegistry";
import { useWidgetLink } from "./WidgetLinkContext";
import { useLocale } from "@/lib/locale-context";

interface WidgetShellProps {
  widget: WidgetConfig;
  onRemove: (id: string) => void;
  onUpdateConfig: (id: string, config: Partial<WidgetConfig>) => void;
  isEditing: boolean;
}

function WidgetFallback() {
  return (
    <Box sx={{ p: 2 }}>
      <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />
    </Box>
  );
}

export function WidgetShell({ widget, onRemove, onUpdateConfig, isEditing }: WidgetShellProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { locale } = useLocale();
  const meta = getWidgetMeta(widget.type);
  const { setStockForGroup, getStockForGroup } = useWidgetLink();

  const [linkAnchor, setLinkAnchor] = useState<null | HTMLElement>(null);
  const [configAnchor, setConfigAnchor] = useState<null | HTMLElement>(null);
  const [stockSearch, setStockSearch] = useState("");
  const [stockOptions, setStockOptions] = useState<{ code: string; name: string }[]>([]);
  const [stockOptionsLoaded, setStockOptionsLoaded] = useState(false);
  const stockSearchRef = useRef<HTMLInputElement>(null);

  const linkedStock = getStockForGroup(widget.linkGroup);
  const effectiveStockCode = linkedStock || widget.config?.stockCode;

  useEffect(() => {
    if (!configAnchor || stockOptionsLoaded) return;
    (async () => {
      const { data } = await supabase
        .from("idx_companies")
        .select("kode_emiten, nama_emiten")
        .order("kode_emiten", { ascending: true })
        .limit(1000);
      if (data) {
        setStockOptions(data.map((d: any) => ({ code: d.kode_emiten, name: d.nama_emiten })));
        setStockOptionsLoaded(true);
      }
    })();
  }, [configAnchor, stockOptionsLoaded]);

  useEffect(() => {
    if (configAnchor && stockSearchRef.current) {
      setTimeout(() => stockSearchRef.current?.focus(), 150);
    }
  }, [configAnchor]);

  const filteredStocks = useMemo(() => {
    if (!stockSearch.trim()) return stockOptions.slice(0, 30);
    const q = stockSearch.toLowerCase();
    return stockOptions.filter((s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)).slice(0, 30);
  }, [stockOptions, stockSearch]);

  const handleStockSelect = useCallback(
    (code: string) => {
      if (widget.linkGroup) {
        setStockForGroup(widget.linkGroup, code);
      }
    },
    [widget.linkGroup, setStockForGroup]
  );

  const handleLinkGroupChange = useCallback(
    (group: LinkGroupId | null) => {
      onUpdateConfig(widget.i, { linkGroup: group });
      setLinkAnchor(null);
    },
    [widget.i, onUpdateConfig]
  );

  const handleStockPick = useCallback((code: string) => {
    onUpdateConfig(widget.i, { config: { ...widget.config, stockCode: code } });
    if (widget.linkGroup) {
      setStockForGroup(widget.linkGroup, code);
    }
    setConfigAnchor(null);
    setStockSearch("");
  }, [widget.i, widget.config, widget.linkGroup, onUpdateConfig, setStockForGroup]);

  const WidgetComponent = useMemo(() => {
    const loader = getWidgetLoader(widget.type);
    return lazy(loader);
  }, [widget.type]);

  const title = locale === "id" ? (meta?.labelId ?? widget.type) : (meta?.label ?? widget.type);

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: "10px",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"}`,
        bgcolor: isDark ? "rgba(12,12,12,0.95)" : "rgba(255,255,255,0.95)",
        overflow: "hidden",
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        "&:hover": isEditing ? {
          borderColor: isDark ? "rgba(201,162,39,0.25)" : "rgba(201,162,39,0.3)",
          boxShadow: isDark
            ? "0 4px 20px rgba(0,0,0,0.4)"
            : "0 4px 20px rgba(0,0,0,0.08)",
        } : {},
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          px: 1,
          py: 0.5,
          minHeight: 36,
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
          bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
          flexShrink: 0,
        }}
      >
        {isEditing && (
          <Box
            className="drag-handle"
            sx={{
              cursor: "grab",
              display: "flex",
              alignItems: "center",
              color: "text.disabled",
              "&:active": { cursor: "grabbing" },
            }}
          >
            <DragIndicatorIcon sx={{ fontSize: 16 }} />
          </Box>
        )}

        {widget.linkGroup && (
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: LINK_GROUP_COLORS[widget.linkGroup],
              flexShrink: 0,
              boxShadow: `0 0 6px ${LINK_GROUP_COLORS[widget.linkGroup]}66`,
            }}
          />
        )}

        <Typography
          sx={{
            fontSize: "0.7rem",
            fontWeight: 600,
            fontFamily: '"JetBrains Mono", monospace',
            letterSpacing: "-0.01em",
            color: "text.secondary",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
          {effectiveStockCode && (
            <Box component="span" sx={{ ml: 0.75, color: "#c9a227", fontWeight: 700 }}>
              {effectiveStockCode}
            </Box>
          )}
        </Typography>

        {isEditing && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
            {meta?.needsStockCode && (
              <Tooltip title="Configure stock">
                <IconButton
                  size="small"
                  onClick={(e) => setConfigAnchor(e.currentTarget)}
                  sx={{ width: 24, height: 24, color: "text.disabled" }}
                >
                  <SettingsIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            )}

            {(meta?.needsStockCode || meta?.canEmitStock) && (
              <Tooltip title={widget.linkGroup ? `Link group ${widget.linkGroup}` : "Link to group"}>
                <IconButton
                  size="small"
                  onClick={(e) => setLinkAnchor(e.currentTarget)}
                  sx={{
                    width: 24,
                    height: 24,
                    color: widget.linkGroup ? LINK_GROUP_COLORS[widget.linkGroup] : "text.disabled",
                  }}
                >
                  {widget.linkGroup ? <LinkIcon sx={{ fontSize: 14 }} /> : <LinkOffIcon sx={{ fontSize: 14 }} />}
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="Remove widget">
              <IconButton
                size="small"
                onClick={() => onRemove(widget.i)}
                sx={{
                  width: 24,
                  height: 24,
                  color: "text.disabled",
                  "&:hover": { color: "#fb7185" },
                }}
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        <Suspense fallback={<WidgetFallback />}>
          <WidgetComponent
            stockCode={effectiveStockCode}
            onStockSelect={meta?.canEmitStock ? handleStockSelect : undefined}
          />
        </Suspense>
      </Box>

      {/* Link group menu */}
      <Menu
        anchorEl={linkAnchor}
        open={Boolean(linkAnchor)}
        onClose={() => setLinkAnchor(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "10px",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
              bgcolor: isDark ? "#0d0d0d" : "#fafafa",
              minWidth: 140,
            },
          },
        }}
      >
        <MenuItem
          onClick={() => handleLinkGroupChange(null)}
          sx={{ fontSize: "0.78rem", fontFamily: '"Plus Jakarta Sans", sans-serif' }}
        >
          <LinkOffIcon sx={{ fontSize: 14, mr: 1, color: "text.disabled" }} />
          No link
        </MenuItem>
        {(["A", "B", "C", "D"] as LinkGroupId[]).map((g) => (
          <MenuItem
            key={g}
            onClick={() => handleLinkGroupChange(g)}
            selected={widget.linkGroup === g}
            sx={{ fontSize: "0.78rem", fontFamily: '"Plus Jakarta Sans", sans-serif' }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: LINK_GROUP_COLORS[g],
                mr: 1,
                boxShadow: `0 0 4px ${LINK_GROUP_COLORS[g]}55`,
              }}
            />
            Group {g}
          </MenuItem>
        ))}
      </Menu>

      {/* Stock picker popover */}
      <Popover
        open={Boolean(configAnchor)}
        anchorEl={configAnchor}
        onClose={() => { setConfigAnchor(null); setStockSearch(""); }}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "12px",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
              bgcolor: isDark ? "#0a0a0a" : "#fff",
              width: 280,
              maxHeight: 360,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: isDark ? "0 12px 40px rgba(0,0,0,0.6)" : "0 12px 40px rgba(0,0,0,0.12)",
            },
          },
        }}
      >
        <Box sx={{ p: 1.25, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}>
          <TextField
            inputRef={stockSearchRef}
            fullWidth
            size="small"
            placeholder="Search BBRI, TLKM..."
            value={stockSearch}
            onChange={(e) => setStockSearch(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filteredStocks.length > 0) {
                handleStockPick(filteredStocks[0].code);
              }
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 15, color: "text.disabled" }} />
                  </InputAdornment>
                ),
                sx: {
                  fontSize: "0.8rem",
                  fontFamily: '"JetBrains Mono", monospace',
                  borderRadius: "8px",
                  bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                },
              },
            }}
          />
        </Box>
        <List dense sx={{ flex: 1, overflow: "auto", py: 0.5 }}>
          {filteredStocks.map((s) => (
            <ListItemButton
              key={s.code}
              onClick={() => handleStockPick(s.code)}
              selected={effectiveStockCode === s.code}
              sx={{
                py: 0.5,
                px: 1.5,
                borderRadius: "6px",
                mx: 0.5,
                mb: 0.25,
                "&.Mui-selected": {
                  bgcolor: isDark ? "rgba(201,162,39,0.1)" : "rgba(201,162,39,0.08)",
                },
              }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: "#c9a227", minWidth: 44 }}>
                      {s.code}
                    </Typography>
                    <Typography sx={{ fontSize: "0.68rem", color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.name}
                    </Typography>
                    {effectiveStockCode === s.code && (
                      <CheckIcon sx={{ fontSize: 14, color: "#c9a227", ml: "auto", flexShrink: 0 }} />
                    )}
                  </Box>
                }
              />
            </ListItemButton>
          ))}
          {filteredStocks.length === 0 && (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.72rem", color: "text.disabled" }}>No stocks found</Typography>
            </Box>
          )}
        </List>
      </Popover>
    </Box>
  );
}
