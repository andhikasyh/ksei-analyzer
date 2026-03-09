"use client";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import { ConnectionGraph } from "@/components/ConnectionGraph";
import { supabase, TABLE_NAME } from "@/lib/supabase";
import type { WidgetComponentProps } from "../WidgetRegistry";

interface GraphNode { id: string; name: string; type: string; val: number; }
interface GraphLink { source: string; target: string; value: number; }

export function ConnectionGraphWidget({ stockCode }: WidgetComponentProps) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!stockCode) return;
    setLoading(true);
    (async () => {
      const { data: records } = await supabase
        .from(TABLE_NAME)
        .select("INVESTOR_NAME, SHARE_CODE, PERCENTAGE, INVESTOR_TYPE")
        .eq("SHARE_CODE", stockCode)
        .order("DATE", { ascending: false })
        .limit(30);

      if (records && records.length > 0) {
        const nodeMap = new Map<string, GraphNode>();
        const linkArr: GraphLink[] = [];
        nodeMap.set(stockCode, { id: stockCode, name: stockCode, type: "stock", val: 10 });
        for (const r of records) {
          const inv = r.INVESTOR_NAME;
          if (!nodeMap.has(inv)) {
            nodeMap.set(inv, { id: inv, name: inv, type: r.INVESTOR_TYPE || "OT", val: 5 });
          }
          linkArr.push({ source: inv, target: stockCode, value: r.PERCENTAGE || 1 });
        }
        setNodes(Array.from(nodeMap.values()));
        setLinks(linkArr);
      }
      setLoading(false);
    })();
  }, [stockCode]);

  if (!stockCode) {
    return (
      <Box sx={{ p: 3, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <Typography sx={{ fontSize: "0.8rem", color: "text.disabled" }}>Select a stock to view connections</Typography>
      </Box>
    );
  }

  if (loading) return <Box sx={{ p: 2 }}><Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} /></Box>;

  if (nodes.length === 0) {
    return (
      <Box sx={{ p: 3, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <Typography sx={{ fontSize: "0.8rem", color: "text.disabled" }}>No connection data available</Typography>
      </Box>
    );
  }

  const connectionNodes = nodes.map((n) => ({
    id: n.id,
    label: n.name,
    type: (n.type === "stock" ? "stock" : "investor") as "stock" | "investor",
    size: n.val,
    isCenter: n.id === stockCode,
  }));
  const connectionLinks = links.map((l) => ({ source: l.source, target: l.target, value: l.value }));

  return (
    <Box sx={{ height: "100%", minHeight: 200 }}>
      <ConnectionGraph nodes={connectionNodes} links={connectionLinks} title={`${stockCode} Connections`} centerNodeId={stockCode} />
    </Box>
  );
}
