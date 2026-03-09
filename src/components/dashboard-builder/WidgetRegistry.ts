import type { WidgetType } from "@/lib/types";
import type { ComponentType } from "react";

export type WidgetCategory = "market" | "stock" | "screening" | "intelligence";

export interface WidgetMeta {
  type: WidgetType;
  label: string;
  labelId: string;
  category: WidgetCategory;
  needsStockCode: boolean;
  canEmitStock: boolean;
  defaultW: number;
  defaultH: number;
  minW: number;
  minH: number;
  icon: string;
}

export const WIDGET_REGISTRY: WidgetMeta[] = [
  { type: "IndexCards", label: "Index Cards", labelId: "Kartu Indeks", category: "market", needsStockCode: false, canEmitStock: false, defaultW: 12, defaultH: 3, minW: 6, minH: 2, icon: "ShowChart" },
  { type: "MarketHeatmap", label: "Market Heatmap", labelId: "Heatmap Pasar", category: "market", needsStockCode: false, canEmitStock: true, defaultW: 8, defaultH: 6, minW: 4, minH: 4, icon: "GridView" },
  { type: "MarketMovers", label: "Market Movers", labelId: "Penggerak Pasar", category: "market", needsStockCode: false, canEmitStock: true, defaultW: 6, defaultH: 5, minW: 4, minH: 3, icon: "TrendingUp" },
  { type: "ForeignFlowChart", label: "Foreign Flow", labelId: "Foreign Flow", category: "market", needsStockCode: false, canEmitStock: false, defaultW: 6, defaultH: 4, minW: 4, minH: 3, icon: "SwapHoriz" },
  { type: "EventCalendar", label: "Event Calendar", labelId: "Kalender Event", category: "market", needsStockCode: false, canEmitStock: false, defaultW: 6, defaultH: 5, minW: 4, minH: 3, icon: "Event" },
  { type: "Watchlist", label: "Watchlist", labelId: "Watchlist", category: "market", needsStockCode: false, canEmitStock: true, defaultW: 6, defaultH: 5, minW: 4, minH: 3, icon: "Star" },
  { type: "StockScreener", label: "Stock Screener", labelId: "Screener Saham", category: "screening", needsStockCode: false, canEmitStock: true, defaultW: 12, defaultH: 7, minW: 6, minH: 4, icon: "FilterList" },
  { type: "InvestorScreener", label: "Investor Screener", labelId: "Screener Investor", category: "screening", needsStockCode: false, canEmitStock: false, defaultW: 12, defaultH: 7, minW: 6, minH: 4, icon: "People" },
  { type: "MarketIntelligence", label: "Market Intelligence", labelId: "Market Intelligence", category: "intelligence", needsStockCode: false, canEmitStock: false, defaultW: 6, defaultH: 5, minW: 4, minH: 3, icon: "Psychology" },
  { type: "TradingViewChart", label: "TradingView Chart", labelId: "Chart TradingView", category: "stock", needsStockCode: true, canEmitStock: false, defaultW: 6, defaultH: 5, minW: 4, minH: 3, icon: "CandlestickChart" },
  { type: "CompanyProfile", label: "Company Profile", labelId: "Profil Perusahaan", category: "stock", needsStockCode: true, canEmitStock: false, defaultW: 6, defaultH: 6, minW: 4, minH: 3, icon: "Business" },
  { type: "FinancialTrends", label: "Financial Trends", labelId: "Tren Keuangan", category: "stock", needsStockCode: true, canEmitStock: false, defaultW: 6, defaultH: 5, minW: 4, minH: 3, icon: "BarChart" },
  { type: "OwnershipChart", label: "Ownership Chart", labelId: "Chart Kepemilikan", category: "stock", needsStockCode: true, canEmitStock: false, defaultW: 4, defaultH: 4, minW: 3, minH: 3, icon: "PieChart" },
  { type: "ShareholderHistory", label: "Shareholder History", labelId: "Riwayat Pemegang Saham", category: "stock", needsStockCode: true, canEmitStock: false, defaultW: 6, defaultH: 5, minW: 4, minH: 3, icon: "History" },
  { type: "DividendHistory", label: "Dividend History", labelId: "Riwayat Dividen", category: "stock", needsStockCode: true, canEmitStock: false, defaultW: 6, defaultH: 5, minW: 4, minH: 3, icon: "Payments" },
  { type: "BrokerSummary", label: "Broker Summary", labelId: "Ringkasan Broker", category: "stock", needsStockCode: true, canEmitStock: false, defaultW: 6, defaultH: 6, minW: 4, minH: 4, icon: "AccountBalance" },
  { type: "StockNews", label: "Stock News", labelId: "Berita Saham", category: "stock", needsStockCode: true, canEmitStock: false, defaultW: 4, defaultH: 5, minW: 3, minH: 3, icon: "Newspaper" },
  { type: "ConnectionGraph", label: "Connection Graph", labelId: "Graf Koneksi", category: "stock", needsStockCode: true, canEmitStock: false, defaultW: 6, defaultH: 6, minW: 4, minH: 4, icon: "Hub" },
];

export function getWidgetMeta(type: WidgetType): WidgetMeta | undefined {
  return WIDGET_REGISTRY.find((w) => w.type === type);
}

export type WidgetComponentProps = {
  stockCode?: string;
  onStockSelect?: (code: string) => void;
  width?: number;
  height?: number;
};

const widgetComponentMap: Record<WidgetType, () => Promise<{ default: ComponentType<WidgetComponentProps> }>> = {
  IndexCards: () => import("./widgets/IndexCardsWidget").then((m) => ({ default: m.IndexCardsWidget })),
  MarketHeatmap: () => import("./widgets/MarketHeatmapWidget").then((m) => ({ default: m.MarketHeatmapWidget })),
  MarketMovers: () => import("./widgets/MarketMoversWidget").then((m) => ({ default: m.MarketMoversWidget })),
  ForeignFlowChart: () => import("./widgets/ForeignFlowWidget").then((m) => ({ default: m.ForeignFlowWidget })),
  EventCalendar: () => import("./widgets/EventCalendarWidget").then((m) => ({ default: m.EventCalendarWidget })),
  Watchlist: () => import("./widgets/WatchlistWidget").then((m) => ({ default: m.WatchlistWidget })),
  StockScreener: () => import("./widgets/StockScreenerWidget").then((m) => ({ default: m.StockScreenerWidget })),
  InvestorScreener: () => import("./widgets/InvestorScreenerWidget").then((m) => ({ default: m.InvestorScreenerWidget })),
  MarketIntelligence: () => import("./widgets/MarketIntelligenceWidget").then((m) => ({ default: m.MarketIntelligenceWidget })),
  TradingViewChart: () => import("./widgets/TradingViewChartWidget").then((m) => ({ default: m.TradingViewChartWidget })),
  CompanyProfile: () => import("./widgets/CompanyProfileWidget").then((m) => ({ default: m.CompanyProfileWidget })),
  FinancialTrends: () => import("./widgets/FinancialTrendsWidget").then((m) => ({ default: m.FinancialTrendsWidget })),
  OwnershipChart: () => import("./widgets/OwnershipChartWidget").then((m) => ({ default: m.OwnershipChartWidget })),
  ShareholderHistory: () => import("./widgets/ShareholderHistoryWidget").then((m) => ({ default: m.ShareholderHistoryWidget })),
  DividendHistory: () => import("./widgets/DividendHistoryWidget").then((m) => ({ default: m.DividendHistoryWidget })),
  BrokerSummary: () => import("./widgets/BrokerSummaryWidget").then((m) => ({ default: m.BrokerSummaryWidget })),
  StockNews: () => import("./widgets/StockNewsWidget").then((m) => ({ default: m.StockNewsWidget })),
  ConnectionGraph: () => import("./widgets/ConnectionGraphWidget").then((m) => ({ default: m.ConnectionGraphWidget })),
};

export function getWidgetLoader(type: WidgetType) {
  return widgetComponentMap[type];
}
