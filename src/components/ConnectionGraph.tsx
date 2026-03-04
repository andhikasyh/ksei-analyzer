"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import dynamic from "next/dynamic";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <Skeleton variant="rounded" height={450} sx={{ borderRadius: 3 }} />
  ),
});

export interface GraphNode {
  id: string;
  label: string;
  type: "stock" | "investor";
  size: number;
  isCenter?: boolean;
}

export interface GraphLink {
  source: string;
  target: string;
  value: number;
}

interface ConnectionGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  title: string;
  centerNodeId: string;
}

const STOCK_COLOR = "#d4a843";
const INVESTOR_COLOR = "#8b5cf6";
const CENTER_RING = "#e8c468";

function truncate(str: string, len: number) {
  return str.length > len ? str.slice(0, len) + "..." : str;
}

export function ConnectionGraph({
  nodes,
  links,
  title,
  centerNodeId,
}: ConnectionGraphProps) {
  const theme = useTheme();
  const router = useRouter();
  const isDark = theme.palette.mode === "dark";
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 450 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        setDimensions({ width: w, height: Math.min(450, Math.max(350, w * 0.5)) });
      }
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force("charge").strength(-200);
      fgRef.current.d3Force("link").distance((link: any) => {
        const src = typeof link.source === "object" ? link.source : null;
        if (src?.isCenter) return 100;
        return 140;
      });
      fgRef.current.d3ReheatSimulation();
      setTimeout(() => {
        fgRef.current?.zoomToFit(400, 40);
      }, 800);
    }
  }, [nodes, links]);

  const connectedToHovered = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const connected = new Set<string>();
    connected.add(hoveredNode);
    links.forEach((l) => {
      const src = typeof l.source === "object" ? (l.source as any).id : l.source;
      const tgt = typeof l.target === "object" ? (l.target as any).id : l.target;
      if (src === hoveredNode) connected.add(tgt);
      if (tgt === hoveredNode) connected.add(src);
    });
    return connected;
  }, [hoveredNode, links]);

  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x as number;
      const y = node.y as number;
      const isCenter = node.id === centerNodeId;
      const isStock = node.type === "stock";
      const baseRadius = isCenter ? 10 : 4 + node.size * 8;
      const radius = baseRadius;

      const dimmed =
        hoveredNode !== null && !connectedToHovered.has(node.id);
      const alpha = dimmed ? 0.15 : 1;

      ctx.globalAlpha = alpha;

      if (isCenter) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 3, 0, 2 * Math.PI);
        ctx.fillStyle = isDark
          ?           "rgba(232,196,104,0.15)"
          : "rgba(212,168,67,0.12)";
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = isStock ? STOCK_COLOR : INVESTOR_COLOR;
      ctx.fill();

      if (isCenter) {
        ctx.strokeStyle = CENTER_RING;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      const fontSize = isCenter
        ? 12 / globalScale
        : Math.max(10 / globalScale, 3);
      const maxLabelLen = isCenter ? 30 : globalScale > 1.5 ? 25 : 18;
      const label = truncate(node.label, maxLabelLen);

      ctx.font = `${isCenter ? "600" : "400"} ${fontSize}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = isDark
        ? `rgba(232,237,245,${dimmed ? 0.15 : 0.9})`
        : `rgba(12,18,34,${dimmed ? 0.15 : 0.85})`;
      ctx.fillText(label, x, y + radius + 3);

      ctx.globalAlpha = 1;
    },
    [centerNodeId, hoveredNode, connectedToHovered, isDark]
  );

  const linkCanvasObject = useCallback(
    (link: any, ctx: CanvasRenderingContext2D) => {
      const src = link.source;
      const tgt = link.target;
      if (!src || !tgt || src.x == null || tgt.x == null) return;

      const srcId =
        typeof src === "object" ? src.id : src;
      const tgtId =
        typeof tgt === "object" ? tgt.id : tgt;
      const dimmed =
        hoveredNode !== null &&
        !connectedToHovered.has(srcId) &&
        !connectedToHovered.has(tgtId);

      const width = 0.5 + (link.value / 50) * 2;
      const alpha = dimmed ? 0.04 : 0.12 + (link.value / 100) * 0.25;

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = isDark
        ? `rgba(107,127,163,${alpha})`
        : `rgba(84,98,128,${alpha})`;
      ctx.lineWidth = width;
      ctx.stroke();
    },
    [hoveredNode, connectedToHovered, isDark]
  );

  const handleNodeClick = useCallback(
    (node: any) => {
      if (node.id === centerNodeId) return;
      if (node.type === "stock") {
        router.push(`/stock/${node.id}`);
      } else {
        router.push(`/investor/${encodeURIComponent(node.id)}`);
      }
    },
    [router, centerNodeId]
  );

  const graphData = useMemo(
    () => ({
      nodes: nodes.map((n) => ({ ...n })),
      links: links.map((l) => ({ ...l })),
    }),
    [nodes, links]
  );

  if (nodes.length === 0) return null;

  return (
    <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
      <Box sx={{ px: 2.5, pt: 2, pb: 0.5 }}>
        <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>
          {title}
        </Typography>
      </Box>
      <Box
        ref={containerRef}
        sx={{
          width: "100%",
          cursor: "grab",
          "&:active": { cursor: "grabbing" },
        }}
      >
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="rgba(0,0,0,0)"
          nodeCanvasObject={nodeCanvasObject}
          nodePointerAreaPaint={(node: any, color, ctx) => {
            const r = node.id === centerNodeId ? 14 : 6 + node.size * 8;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          linkCanvasObjectMode={() => "replace"}
          linkCanvasObject={linkCanvasObject}
          onNodeClick={handleNodeClick}
          onNodeHover={(node: any) =>
            setHoveredNode(node ? node.id : null)
          }
          cooldownTicks={100}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          enableNodeDrag={true}
          minZoom={0.5}
          maxZoom={5}
        />
      </Box>
      <Box
        sx={{
          px: 2.5,
          pb: 1.5,
          display: "flex",
          gap: 2.5,
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: STOCK_COLOR,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Stock
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: INVESTOR_COLOR,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Investor
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
          Click a node to navigate. Scroll to zoom.
        </Typography>
      </Box>
    </Paper>
  );
}

export function ConnectionGraphSkeleton() {
  return (
    <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
      <Box sx={{ px: 2.5, pt: 2, pb: 1 }}>
        <Skeleton width={140} height={18} />
      </Box>
      <Skeleton
        variant="rounded"
        height={400}
        sx={{ mx: 2.5, mb: 2, borderRadius: 2 }}
      />
    </Paper>
  );
}
