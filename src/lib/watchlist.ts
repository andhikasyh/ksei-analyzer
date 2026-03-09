"use client";

import { useState, useEffect, useCallback } from "react";

export interface WatchlistEntry {
  code: string;
  addedAt: string;
}

const STORAGE_KEY = "lensaham_watchlist";

function readStorage(): WatchlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WatchlistEntry[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(entries: WatchlistEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore quota errors
  }
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);

  useEffect(() => {
    setWatchlist(readStorage());
  }, []);

  const addStock = useCallback((code: string) => {
    setWatchlist((prev) => {
      if (prev.some((e) => e.code === code)) return prev;
      const next = [...prev, { code, addedAt: new Date().toISOString() }];
      writeStorage(next);
      return next;
    });
  }, []);

  const removeStock = useCallback((code: string) => {
    setWatchlist((prev) => {
      const next = prev.filter((e) => e.code !== code);
      writeStorage(next);
      return next;
    });
  }, []);

  const isWatched = useCallback(
    (code: string) => watchlist.some((e) => e.code === code),
    [watchlist]
  );

  const toggle = useCallback(
    (code: string) => {
      if (watchlist.some((e) => e.code === code)) {
        removeStock(code);
      } else {
        addStock(code);
      }
    },
    [watchlist, addStock, removeStock]
  );

  return { watchlist, addStock, removeStock, isWatched, toggle };
}
