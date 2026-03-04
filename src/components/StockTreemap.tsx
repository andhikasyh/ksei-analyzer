"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import Skeleton from "@mui/material/Skeleton";

interface StockItem {
  code: string;
  stock_name: string;
  sector: string;
  market_cap: number;
  change_pct: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const SECTOR_HEADER_H = 20;
const GAP = 1.5;

function getChangeColor(pct: number): string {
  const abs = Math.abs(pct);
  const t = Math.min(abs / 3.5, 1);
  const intensity = Math.pow(t, 0.7);

  if (pct > 0.02) {
    return `rgb(${Math.round(16 + (1 - intensity) * 12)}, ${Math.round(42 + intensity * 155)}, ${Math.round(24 + intensity * 32)})`;
  }
  if (pct < -0.02) {
    return `rgb(${Math.round(42 + intensity * 168)}, ${Math.round(16 + (1 - intensity) * 12)}, ${Math.round(20 + (1 - intensity) * 8)})`;
  }
  return "#232528";
}

function worstInRow(row: { area: number }[], side: number): number {
  const sum = row.reduce((a, b) => a + b.area, 0);
  const thickness = side > 0 ? sum / side : 0;
  let worst = 0;
  for (const { area } of row) {
    const len = thickness > 0 ? area / thickness : 0;
    if (len > 0 && thickness > 0) {
      worst = Math.max(worst, Math.max(thickness / len, len / thickness));
    }
  }
  return worst;
}

function layoutStrip(
  items: { area: number; idx: number }[],
  rect: Rect,
  out: Rect[]
) {
  if (items.length === 0) return;
  if (items.length === 1) {
    out[items[0].idx] = { ...rect };
    return;
  }

  const { x, y, w, h } = rect;
  if (w <= 0 || h <= 0) {
    items.forEach((it) => (out[it.idx] = { x, y, w: 0, h: 0 }));
    return;
  }

  const horiz = w >= h;
  const side = horiz ? h : w;
  let row: typeof items = [];
  let bestWorst = Infinity;
  let splitAt = 0;

  for (let i = 0; i < items.length; i++) {
    const candidate = [...row, items[i]];
    const cw = worstInRow(candidate, side);
    if (cw <= bestWorst || row.length === 0) {
      row = candidate;
      bestWorst = cw;
      splitAt = i + 1;
    } else {
      break;
    }
  }

  const rowSum = row.reduce((a, b) => a + b.area, 0);
  const thickness = side > 0 ? rowSum / side : 0;

  let offset = 0;
  for (const item of row) {
    const length = thickness > 0 ? item.area / thickness : 0;
    out[item.idx] = horiz
      ? { x, y: y + offset, w: thickness, h: length }
      : { x: x + offset, y, w: length, h: thickness };
    offset += length;
  }

  const remaining = items.slice(splitAt);
  const nextRect: Rect = horiz
    ? { x: x + thickness, y, w: w - thickness, h }
    : { x, y: y + thickness, w, h: h - thickness };

  layoutStrip(remaining, nextRect, out);
}

function squarify(values: number[], container: Rect): Rect[] {
  const n = values.length;
  if (n === 0) return [];
  if (n === 1) return [{ ...container }];
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) return values.map(() => ({ x: 0, y: 0, w: 0, h: 0 }));

  const area = container.w * container.h;
  const indexed = values
    .map((v, i) => ({ area: Math.max(0, (v / total) * area), idx: i }))
    .sort((a, b) => b.area - a.area);

  const result: Rect[] = new Array(n);
  layoutStrip(indexed, { ...container }, result);
  return result;
}

interface StockTreemapProps {
  data: StockItem[];
  onStockClick?: (code: string) => void;
}

export function StockTreemap({ data, onStockClick }: StockTreemapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        setSize({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const sectors = useMemo(() => {
    const map = new Map<string, StockItem[]>();
    for (const stock of data) {
      if (stock.market_cap <= 0 || !stock.sector) continue;
      const arr = map.get(stock.sector) || [];
      arr.push(stock);
      map.set(stock.sector, arr);
    }
    return Array.from(map.entries())
      .map(([name, stocks]) => ({
        name,
        stocks: stocks.sort((a, b) => b.market_cap - a.market_cap),
        totalCap: stocks.reduce((a, b) => a + b.market_cap, 0),
      }))
      .sort((a, b) => b.totalCap - a.totalCap);
  }, [data]);

  const sectorRects = useMemo(() => {
    if (size.w === 0 || size.h === 0) return [];
    return squarify(
      sectors.map((s) => s.totalCap),
      { x: 0, y: 0, w: size.w, h: size.h }
    );
  }, [sectors, size]);

  const tiles = useMemo(() => {
    if (sectorRects.length === 0) return [];
    return sectors.flatMap((sector, si) => {
      const sr = sectorRects[si];
      if (!sr || sr.w < 1 || sr.h < 1) return [];
      const headerH = Math.min(SECTOR_HEADER_H, sr.h * 0.25);
      const innerRect: Rect = {
        x: sr.x + GAP,
        y: sr.y + headerH,
        w: sr.w - GAP * 2,
        h: sr.h - headerH - GAP,
      };
      if (innerRect.w <= 0 || innerRect.h <= 0) return [];
      const stockRects = squarify(
        sector.stocks.map((s) => s.market_cap),
        innerRect
      );
      return sector.stocks.map((stock, i) => ({
        ...stock,
        rect: stockRects[i],
      }));
    });
  }, [sectors, sectorRects]);

  return (
    <Box
      ref={containerRef}
      sx={{
        width: "100%",
        height: { xs: 380, sm: 460, md: 520 },
        position: "relative",
        borderRadius: 2.5,
        overflow: "hidden",
        bgcolor: "#0c0c0c",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {sectors.map((sector, i) => {
        const sr = sectorRects[i];
        if (!sr || sr.w < 36) return null;
        return (
          <Box
            key={sector.name}
            sx={{
              position: "absolute",
              left: sr.x + GAP + 4,
              top: sr.y + 2,
              width: sr.w - GAP * 2 - 8,
              height: SECTOR_HEADER_H - 2,
              display: "flex",
              alignItems: "center",
              zIndex: 5,
              pointerEvents: "none",
            }}
          >
            <Typography
              sx={{
                fontSize: sr.w > 180 ? "0.68rem" : "0.55rem",
                fontWeight: 700,
                color: "rgba(255,255,255,0.6)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                letterSpacing: "0.01em",
                textShadow: "0 1px 4px rgba(0,0,0,0.8)",
              }}
            >
              {sector.name} &#8250;
            </Typography>
          </Box>
        );
      })}

      {tiles.map((tile) => {
        if (!tile.rect || tile.rect.w < 3 || tile.rect.h < 3) return null;
        const minDim = Math.min(tile.rect.w, tile.rect.h);
        const tileArea = tile.rect.w * tile.rect.h;
        const showCode = minDim > 16 && tileArea > 450;
        const showPct = minDim > 22 && tileArea > 700;
        const showName = tile.rect.w > 90 && tile.rect.h > 45;

        let codeFontSize = "0.5rem";
        let pctFontSize = "0.42rem";
        if (tileArea > 18000) {
          codeFontSize = "0.95rem";
          pctFontSize = "0.72rem";
        } else if (tileArea > 8000) {
          codeFontSize = "0.78rem";
          pctFontSize = "0.62rem";
        } else if (tileArea > 3000) {
          codeFontSize = "0.65rem";
          pctFontSize = "0.52rem";
        } else if (tileArea > 1200) {
          codeFontSize = "0.55rem";
          pctFontSize = "0.45rem";
        }

        return (
          <Tooltip
            key={tile.code}
            title={`${tile.code} - ${tile.stock_name} | ${tile.change_pct > 0 ? "+" : ""}${tile.change_pct.toFixed(2)}%`}
            arrow
            placement="top"
            enterDelay={150}
            slotProps={{
              tooltip: {
                sx: {
                  fontSize: "0.72rem",
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  bgcolor: "rgba(20,20,24,0.95)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  py: 0.5,
                  px: 1,
                },
              },
              arrow: {
                sx: { color: "rgba(20,20,24,0.95)" },
              },
            }}
          >
            <Box
              onClick={() => onStockClick?.(tile.code)}
              sx={{
                position: "absolute",
                left: tile.rect.x + GAP * 0.5,
                top: tile.rect.y + GAP * 0.5,
                width: tile.rect.w - GAP,
                height: tile.rect.h - GAP,
                bgcolor: getChangeColor(tile.change_pct),
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                borderRadius: "2px",
                transition: "filter 0.12s ease, box-shadow 0.12s ease",
                "&:hover": {
                  filter: "brightness(1.4)",
                  zIndex: 10,
                  boxShadow: "0 0 12px rgba(255,255,255,0.12)",
                },
              }}
            >
              {showCode && (
                <Typography
                  sx={{
                    fontSize: codeFontSize,
                    fontWeight: 800,
                    color: "#fff",
                    lineHeight: 1.15,
                    fontFamily: '"JetBrains Mono", monospace',
                    textShadow: "0 1px 4px rgba(0,0,0,0.6)",
                  }}
                >
                  {tile.code}
                </Typography>
              )}
              {showPct && (
                <Typography
                  sx={{
                    fontSize: pctFontSize,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.82)",
                    lineHeight: 1.15,
                    fontFamily: '"JetBrains Mono", monospace',
                    textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                  }}
                >
                  {tile.change_pct > 0 ? "+" : ""}
                  {tile.change_pct.toFixed(2)}%
                </Typography>
              )}
              {showName && (
                <Typography
                  sx={{
                    fontSize: "0.46rem",
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.45)",
                    lineHeight: 1.2,
                    mt: 0.25,
                    px: 0.5,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "95%",
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                  }}
                >
                  {tile.stock_name}
                </Typography>
              )}
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}

export function StockTreemapSkeleton() {
  return (
    <Skeleton
      variant="rounded"
      sx={{
        width: "100%",
        height: { xs: 380, sm: 460, md: 520 },
        borderRadius: 2.5,
        bgcolor: "rgba(255,255,255,0.04)",
      }}
    />
  );
}
