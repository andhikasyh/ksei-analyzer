"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { ResponsiveGridLayout, useContainerWidth, verticalCompactor } from "react-grid-layout";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import LockIcon from "@mui/icons-material/Lock";
import DashboardCustomizeIcon from "@mui/icons-material/DashboardCustomize";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useTheme } from "@mui/material/styles";
import type { WidgetConfig, WidgetType, LinkGroupId, DashboardLayout } from "@/lib/types";
import { useProContext } from "@/lib/pro-context";
import { useLocale } from "@/lib/locale-context";
import { WidgetLinkProvider } from "./WidgetLinkContext";
import { WidgetShell } from "./WidgetShell";
import { WidgetCatalog } from "./WidgetCatalog";
import { getWidgetMeta, WIDGET_REGISTRY } from "./WidgetRegistry";
import { DASHBOARD_TEMPLATES, type DashboardTemplate } from "./templates";

import "react-grid-layout/css/styles.css";

const STORAGE_KEY = "lensaham_dashboard_layout";
const COLS = { lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 };
const BREAKPOINTS = { lg: 1200, md: 900, sm: 600, xs: 480, xxs: 0 };
const ROW_HEIGHT = 60;

function generateId(): string {
  return `w-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function DashboardBuilder() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { user } = useProContext();
  const { locale } = useLocale();

  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [dashboardId, setDashboardId] = useState<string | null>(null);
  const [dashboardName, setDashboardName] = useState("My Dashboard");
  const [dashboards, setDashboards] = useState<DashboardLayout[]>([]);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({ open: false, message: "", severity: "info" });
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [templateAnchor, setTemplateAnchor] = useState<null | HTMLElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);

  // Load dashboards
  useEffect(() => {
    if (!user) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setWidgets(parsed);
        }
      } catch { /* ignore */ }
      loadedRef.current = true;
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/user/dashboards");
        if (res.ok) {
          const { dashboards: dbs } = await res.json();
          setDashboards(dbs);
          const defaultDb = dbs.find((d: DashboardLayout) => d.is_default) || dbs[0];
          if (defaultDb) {
            setDashboardId(defaultDb.id);
            setDashboardName(defaultDb.name);
            setWidgets(Array.isArray(defaultDb.layout) ? defaultDb.layout : []);
          }
        }
      } catch { /* ignore */ }
      loadedRef.current = true;
    })();
  }, [user]);

  // Auto-save (debounced)
  const scheduleSave = useCallback(
    (newWidgets: WidgetConfig[]) => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        if (!user) {
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newWidgets)); } catch { /* ignore */ }
          return;
        }
        (async () => {
          setSaving(true);
          try {
            if (dashboardId) {
              await fetch("/api/user/dashboards", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: dashboardId, layout: newWidgets }),
              });
            } else {
              const res = await fetch("/api/user/dashboards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: dashboardName, layout: newWidgets, is_default: true }),
              });
              if (res.ok) {
                const { dashboard } = await res.json();
                setDashboardId(dashboard.id);
              }
            }
          } catch { /* ignore */ }
          setSaving(false);
        })();
      }, 1500);
    },
    [user, dashboardId, dashboardName]
  );

  const addWidget = useCallback(
    (type: WidgetType, stockCode?: string) => {
      const meta = getWidgetMeta(type);
      if (!meta) return;
      const maxY = widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);
      const newWidget: WidgetConfig = {
        i: generateId(),
        type,
        x: 0,
        y: maxY,
        w: meta.defaultW,
        h: meta.defaultH,
        config: stockCode ? { stockCode } : {},
        linkGroup: null,
      };
      const next = [...widgets, newWidget];
      setWidgets(next);
      scheduleSave(next);
    },
    [widgets, scheduleSave]
  );

  const removeWidget = useCallback(
    (id: string) => {
      const next = widgets.filter((w) => w.i !== id);
      setWidgets(next);
      scheduleSave(next);
    },
    [widgets, scheduleSave]
  );

  const updateWidgetConfig = useCallback(
    (id: string, updates: Partial<WidgetConfig>) => {
      const next = widgets.map((w) =>
        w.i === id ? { ...w, ...updates, config: updates.config ? { ...w.config, ...updates.config } : w.config } : w
      );
      setWidgets(next);
      scheduleSave(next);
    },
    [widgets, scheduleSave]
  );

  const currentBreakpointRef = useRef("lg");

  const handleBreakpointChange = useCallback((bp: string) => {
    currentBreakpointRef.current = bp;
  }, []);

  const handleLayoutChange = useCallback(
    (layout: readonly { i: string; x: number; y: number; w: number; h: number }[], _layouts: unknown) => {
      if (!isEditing) return;
      if (currentBreakpointRef.current !== "lg" && currentBreakpointRef.current !== "md") return;
      const next = widgets.map((w) => {
        const item = layout.find((l) => l.i === w.i);
        if (item) return { ...w, x: item.x, y: item.y, w: item.w, h: item.h };
        return w;
      });
      setWidgets(next);
      scheduleSave(next);
    },
    [widgets, isEditing, scheduleSave]
  );

  const applyTemplate = useCallback(
    (template: DashboardTemplate) => {
      setWidgets(template.widgets);
      scheduleSave(template.widgets);
      setTemplateAnchor(null);
      setSnackbar({ open: true, message: `Template "${template.name}" applied`, severity: "success" });
    },
    [scheduleSave]
  );

  const deleteDashboard = useCallback(async () => {
    if (!dashboardId || !user) return;
    await fetch(`/api/user/dashboards?id=${dashboardId}`, { method: "DELETE" });
    setWidgets([]);
    setDashboardId(null);
    setDashboardName("My Dashboard");
    setMenuAnchor(null);
    setSnackbar({ open: true, message: "Dashboard deleted", severity: "info" });
  }, [dashboardId, user]);

  const duplicateDashboard = useCallback(async () => {
    if (!user) return;
    const newName = `${dashboardName} (copy)`;
    const res = await fetch("/api/user/dashboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, layout: widgets }),
    });
    if (res.ok) {
      const { dashboard } = await res.json();
      setDashboardId(dashboard.id);
      setDashboardName(newName);
      setSnackbar({ open: true, message: "Dashboard duplicated", severity: "success" });
    }
    setMenuAnchor(null);
  }, [user, dashboardName, widgets]);

  const { width: containerWidth, containerRef, mounted: containerMounted } = useContainerWidth({ initialWidth: 1280 });

  const responsiveLayouts = useMemo(() => {
    const makeLayout = (cols: number) =>
      widgets.map((w) => {
        const meta = getWidgetMeta(w.type);
        const minW = meta?.minW ?? 2;
        const minH = meta?.minH ?? 2;
        const scaledW = Math.max(minW, Math.min(cols, Math.round((w.w / 12) * cols)));
        const scaledX = Math.min(w.x, Math.max(0, cols - scaledW));
        return { i: w.i, x: cols === 12 ? w.x : scaledX, y: w.y, w: cols === 12 ? w.w : scaledW, h: w.h, minW, minH };
      });

    return {
      lg: makeLayout(12),
      md: makeLayout(12),
      sm: makeLayout(6).map((item) => ({ ...item, x: 0, w: 6 })),
      xs: makeLayout(4).map((item) => ({ ...item, x: 0, w: 4 })),
      xxs: makeLayout(2).map((item) => ({ ...item, x: 0, w: 2 })),
    };
  }, [widgets]);

  const dragConfig = useMemo(() => ({
    enabled: isEditing,
    handle: ".drag-handle",
    bounded: false,
    threshold: 3,
  }), [isEditing]);

  const resizeConfig = useMemo(() => ({
    enabled: isEditing,
    handles: ["se" as const],
  }), [isEditing]);

  return (
    <WidgetLinkProvider>
      <Box
        sx={{
          minHeight: "calc(100vh - 80px)",
          position: "relative",
          mx: { xs: -1.5, sm: -2, md: -3 },
          mt: { xs: -1.5, sm: -2, md: -3 },
        }}
      >
        {/* Toolbar */}
        <Box
          sx={{
            position: "sticky",
            top: 56,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: { xs: 1.5, sm: 2.5 },
            py: 1,
            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
            bgcolor: isDark ? "rgba(5,5,5,0.95)" : "rgba(248,247,244,0.95)",
            backdropFilter: "blur(12px)",
          }}
        >
          <DashboardCustomizeIcon sx={{ fontSize: 18, color: "#c9a227" }} />
          <Typography
            sx={{
              fontSize: "0.85rem",
              fontWeight: 700,
              fontFamily: '"Outfit", sans-serif',
              letterSpacing: "-0.02em",
              flex: 1,
            }}
          >
            {dashboardName}
          </Typography>

          {saving && (
            <Chip
              label={locale === "id" ? "Menyimpan..." : "Saving..."}
              size="small"
              sx={{
                fontSize: "0.6rem",
                height: 22,
                fontFamily: '"JetBrains Mono", monospace',
                bgcolor: "rgba(201,162,39,0.08)",
                color: "#c9a227",
              }}
            />
          )}

          {!user && (
            <Chip
              icon={<LockIcon sx={{ fontSize: "12px !important" }} />}
              label={locale === "id" ? "Login untuk menyimpan" : "Login to save"}
              size="small"
              sx={{
                fontSize: "0.62rem",
                height: 24,
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                bgcolor: isDark ? "rgba(251,113,133,0.08)" : "rgba(251,113,133,0.06)",
                color: "#fb7185",
                border: "1px solid rgba(251,113,133,0.15)",
                "& .MuiChip-icon": { color: "#fb7185" },
              }}
            />
          )}

          <Tooltip title={locale === "id" ? "Template" : "Templates"}>
            <IconButton
              size="small"
              onClick={(e) => setTemplateAnchor(e.currentTarget)}
              sx={{
                width: 32,
                height: 32,
                color: "text.secondary",
                border: 1,
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                borderRadius: "8px",
                "&:hover": { borderColor: "#c9a227", color: "#c9a227" },
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          <Button
            size="small"
            startIcon={isEditing ? <SaveIcon sx={{ fontSize: "14px !important" }} /> : <EditIcon sx={{ fontSize: "14px !important" }} />}
            onClick={() => setIsEditing(!isEditing)}
            sx={{
              fontSize: "0.72rem",
              fontWeight: 600,
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              px: 1.5,
              py: 0.5,
              borderRadius: "8px",
              color: isEditing ? "#22c55e" : "#c9a227",
              border: `1px solid ${isEditing ? "rgba(34,197,94,0.2)" : "rgba(201,162,39,0.2)"}`,
              bgcolor: isEditing ? "rgba(34,197,94,0.06)" : "rgba(201,162,39,0.04)",
              "&:hover": {
                bgcolor: isEditing ? "rgba(34,197,94,0.1)" : "rgba(201,162,39,0.08)",
              },
            }}
          >
            {isEditing
              ? (locale === "id" ? "Selesai" : "Done")
              : (locale === "id" ? "Edit" : "Edit")}
          </Button>

          {isEditing && (
            <Button
              size="small"
              startIcon={<AddIcon sx={{ fontSize: "14px !important" }} />}
              onClick={() => setCatalogOpen(true)}
              sx={{
                fontSize: "0.72rem",
                fontWeight: 600,
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                px: 1.5,
                py: 0.5,
                borderRadius: "8px",
                color: "#c9a227",
                bgcolor: isDark ? "rgba(201,162,39,0.08)" : "rgba(201,162,39,0.06)",
                border: "1px solid rgba(201,162,39,0.15)",
                "&:hover": { bgcolor: "rgba(201,162,39,0.12)" },
              }}
            >
              {locale === "id" ? "Tambah" : "Add Widget"}
            </Button>
          )}

          {user && (
            <>
              <IconButton
                size="small"
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                sx={{
                  width: 32,
                  height: 32,
                  color: "text.secondary",
                  border: 1,
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  borderRadius: "8px",
                }}
              >
                <MoreVertIcon sx={{ fontSize: 16 }} />
              </IconButton>
              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                slotProps={{
                  paper: {
                    sx: {
                      borderRadius: "10px",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                      bgcolor: isDark ? "#0d0d0d" : "#fafafa",
                      minWidth: 160,
                    },
                  },
                }}
              >
                <MenuItem onClick={duplicateDashboard} sx={{ fontSize: "0.78rem", gap: 1 }}>
                  <ContentCopyIcon sx={{ fontSize: 14 }} />
                  Duplicate
                </MenuItem>
                <MenuItem onClick={deleteDashboard} sx={{ fontSize: "0.78rem", gap: 1, color: "#fb7185" }}>
                  <DeleteIcon sx={{ fontSize: 14 }} />
                  Delete
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>

        {/* Template menu */}
        <Menu
          anchorEl={templateAnchor}
          open={Boolean(templateAnchor)}
          onClose={() => setTemplateAnchor(null)}
          slotProps={{
            paper: {
              sx: {
                borderRadius: "10px",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                bgcolor: isDark ? "#0d0d0d" : "#fafafa",
                minWidth: 220,
              },
            },
          }}
        >
          {DASHBOARD_TEMPLATES.map((t) => (
            <MenuItem
              key={t.id}
              onClick={() => applyTemplate(t)}
              sx={{ fontSize: "0.78rem", fontFamily: '"Plus Jakarta Sans", sans-serif', gap: 1 }}
            >
              <Box>
                <Typography sx={{ fontSize: "0.78rem", fontWeight: 600 }}>{t.name}</Typography>
                <Typography sx={{ fontSize: "0.62rem", color: "text.disabled" }}>{t.description}</Typography>
              </Box>
            </MenuItem>
          ))}
        </Menu>

        {/* Empty state */}
        {widgets.length === 0 && loadedRef.current && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 400,
              gap: 2,
              px: 3,
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: "16px",
                bgcolor: isDark ? "rgba(201,162,39,0.06)" : "rgba(201,162,39,0.04)",
                border: `1px solid ${isDark ? "rgba(201,162,39,0.12)" : "rgba(201,162,39,0.1)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <DashboardCustomizeIcon sx={{ fontSize: 28, color: "#c9a227" }} />
            </Box>
            <Typography
              sx={{
                fontSize: "1rem",
                fontWeight: 700,
                fontFamily: '"Outfit", sans-serif',
                letterSpacing: "-0.02em",
                textAlign: "center",
              }}
            >
              {locale === "id" ? "Buat dashboard kustom kamu" : "Build your custom dashboard"}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.8rem",
                color: "text.secondary",
                textAlign: "center",
                maxWidth: 400,
              }}
            >
              {locale === "id"
                ? "Tambah widget untuk chart, screener, berita, broker, dan lainnya. Hubungkan widget untuk sync data saham."
                : "Add widgets for charts, screeners, news, brokers, and more. Link widgets to sync stock data across them."}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
              <Button
                size="small"
                startIcon={<AddIcon sx={{ fontSize: "14px !important" }} />}
                onClick={() => { setIsEditing(true); setCatalogOpen(true); }}
                sx={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  px: 2,
                  py: 0.75,
                  borderRadius: "8px",
                  bgcolor: "#c9a227",
                  color: "#050505",
                  "&:hover": { bgcolor: "#dbb63a" },
                }}
              >
                {locale === "id" ? "Tambah Widget" : "Add Widget"}
              </Button>
              <Button
                size="small"
                startIcon={<AutoAwesomeIcon sx={{ fontSize: "14px !important" }} />}
                onClick={(e) => setTemplateAnchor(e.currentTarget)}
                sx={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  px: 2,
                  py: 0.75,
                  borderRadius: "8px",
                  color: "#c9a227",
                  border: "1px solid rgba(201,162,39,0.2)",
                  "&:hover": { bgcolor: "rgba(201,162,39,0.08)" },
                }}
              >
                {locale === "id" ? "Pakai Template" : "Use Template"}
              </Button>
            </Box>
          </Box>
        )}

        {/* Grid */}
        <Box ref={containerRef} sx={{ width: "100%", minHeight: widgets.length > 0 ? 100 : 0 }}>
          {widgets.length > 0 && containerMounted && containerWidth > 0 && (
            <ResponsiveGridLayout
              className="dashboard-grid"
              width={containerWidth}
              layouts={responsiveLayouts}
              breakpoints={BREAKPOINTS}
              cols={COLS}
              rowHeight={ROW_HEIGHT}
              dragConfig={dragConfig}
              resizeConfig={resizeConfig}
              onLayoutChange={handleLayoutChange}
              onBreakpointChange={handleBreakpointChange}
              compactor={verticalCompactor}
              margin={[10, 10]}
              containerPadding={[8, 8]}
            >
              {widgets.map((w) => (
                <div key={w.i}>
                  <WidgetShell
                    widget={w}
                    onRemove={removeWidget}
                    onUpdateConfig={updateWidgetConfig}
                    isEditing={isEditing}
                  />
                </div>
              ))}
            </ResponsiveGridLayout>
          )}
        </Box>

        <WidgetCatalog open={catalogOpen} onClose={() => setCatalogOpen(false)} onAdd={addWidget} />

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert severity={snackbar.severity} sx={{ fontSize: "0.78rem" }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </WidgetLinkProvider>
  );
}
