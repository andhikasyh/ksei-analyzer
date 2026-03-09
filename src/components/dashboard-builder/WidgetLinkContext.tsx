"use client";

import { createContext, useContext, useCallback, useState, ReactNode } from "react";
import type { LinkGroupId } from "@/lib/types";

interface WidgetLinkState {
  stockCodes: Record<LinkGroupId, string | null>;
  setStockForGroup: (group: LinkGroupId, code: string) => void;
  getStockForGroup: (group: LinkGroupId | null | undefined) => string | undefined;
}

const WidgetLinkContext = createContext<WidgetLinkState | null>(null);

export function WidgetLinkProvider({ children }: { children: ReactNode }) {
  const [stockCodes, setStockCodes] = useState<Record<LinkGroupId, string | null>>({
    A: null,
    B: null,
    C: null,
    D: null,
  });

  const setStockForGroup = useCallback((group: LinkGroupId, code: string) => {
    setStockCodes((prev) => ({ ...prev, [group]: code }));
  }, []);

  const getStockForGroup = useCallback(
    (group: LinkGroupId | null | undefined) => {
      if (!group) return undefined;
      return stockCodes[group] ?? undefined;
    },
    [stockCodes]
  );

  return (
    <WidgetLinkContext.Provider value={{ stockCodes, setStockForGroup, getStockForGroup }}>
      {children}
    </WidgetLinkContext.Provider>
  );
}

export function useWidgetLink() {
  const ctx = useContext(WidgetLinkContext);
  if (!ctx) throw new Error("useWidgetLink must be used within WidgetLinkProvider");
  return ctx;
}
