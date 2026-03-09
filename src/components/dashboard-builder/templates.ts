import type { WidgetConfig } from "@/lib/types";

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  widgets: WidgetConfig[];
}

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: "trader",
    name: "Trader",
    description: "Chart, movers, broker flow, watchlist",
    widgets: [
      { i: "t-chart", type: "TradingViewChart", x: 0, y: 0, w: 8, h: 5, config: { stockCode: "BBRI" }, linkGroup: "A" },
      { i: "t-watchlist", type: "Watchlist", x: 8, y: 0, w: 4, h: 5, config: {}, linkGroup: "A" },
      { i: "t-movers", type: "MarketMovers", x: 0, y: 5, w: 6, h: 5, config: {}, linkGroup: "A" },
      { i: "t-broker", type: "BrokerSummary", x: 6, y: 5, w: 6, h: 5, config: { stockCode: "BBRI" }, linkGroup: "A" },
      { i: "t-news", type: "StockNews", x: 0, y: 10, w: 4, h: 4, config: { stockCode: "BBRI" }, linkGroup: "A" },
      { i: "t-foreign", type: "ForeignFlowChart", x: 4, y: 10, w: 8, h: 4, config: {}, linkGroup: null },
    ],
  },
  {
    id: "researcher",
    name: "Researcher",
    description: "Fundamentals, ownership, dividends, connections",
    widgets: [
      { i: "r-profile", type: "CompanyProfile", x: 0, y: 0, w: 6, h: 6, config: { stockCode: "BBCA" }, linkGroup: "A" },
      { i: "r-screener", type: "StockScreener", x: 6, y: 0, w: 6, h: 6, config: {}, linkGroup: "A" },
      { i: "r-trends", type: "FinancialTrends", x: 0, y: 6, w: 6, h: 5, config: { stockCode: "BBCA" }, linkGroup: "A" },
      { i: "r-ownership", type: "OwnershipChart", x: 6, y: 6, w: 3, h: 5, config: { stockCode: "BBCA" }, linkGroup: "A" },
      { i: "r-dividend", type: "DividendHistory", x: 9, y: 6, w: 3, h: 5, config: { stockCode: "BBCA" }, linkGroup: "A" },
      { i: "r-shareholder", type: "ShareholderHistory", x: 0, y: 11, w: 6, h: 5, config: { stockCode: "BBCA" }, linkGroup: "A" },
      { i: "r-graph", type: "ConnectionGraph", x: 6, y: 11, w: 6, h: 5, config: { stockCode: "BBCA" }, linkGroup: "A" },
    ],
  },
  {
    id: "overview",
    name: "Market Overview",
    description: "Indices, heatmap, foreign flow, intelligence",
    widgets: [
      { i: "o-index", type: "IndexCards", x: 0, y: 0, w: 12, h: 3, config: {}, linkGroup: null },
      { i: "o-heatmap", type: "MarketHeatmap", x: 0, y: 3, w: 8, h: 6, config: {}, linkGroup: "A" },
      { i: "o-movers", type: "MarketMovers", x: 8, y: 3, w: 4, h: 6, config: {}, linkGroup: "A" },
      { i: "o-foreign", type: "ForeignFlowChart", x: 0, y: 9, w: 6, h: 4, config: {}, linkGroup: null },
      { i: "o-intel", type: "MarketIntelligence", x: 6, y: 9, w: 6, h: 4, config: {}, linkGroup: null },
      { i: "o-calendar", type: "EventCalendar", x: 0, y: 13, w: 12, h: 5, config: {}, linkGroup: null },
    ],
  },
];
