export interface KSEIRecord {
  id: number;
  DATE: string;
  SHARE_CODE: string;
  ISSUER_NAME: string;
  INVESTOR_NAME: string;
  INVESTOR_TYPE: string;
  LOCAL_FOREIGN: string;
  NATIONALITY: string | null;
  DOMICILE: string;
  HOLDINGS_SCRIPLESS: string;
  HOLDINGS_SCRIP: string;
  TOTAL_HOLDING_SHARES: string;
  PERCENTAGE: number;
}

export const INVESTOR_TYPE_MAP: Record<string, string> = {
  CP: "Corporate",
  ID: "Individual",
  IB: "Investment Bank",
  SC: "Securities Company",
  MF: "Mutual Fund",
  PF: "Pension Fund",
  IS: "Insurance",
  FD: "Foundation",
  OT: "Others",
};

export const LOCAL_FOREIGN_MAP: Record<string, string> = {
  L: "Local",
  A: "Foreign",
};

export function formatShares(value: string | number): string {
  const num = typeof value === "string" ? parseInt(value, 10) : value;
  if (isNaN(num)) return "0";
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toLocaleString();
}

export function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function formatValue(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000_000) return sign + (abs / 1_000_000_000_000).toFixed(2) + "T";
  if (abs >= 1_000_000_000) return sign + (abs / 1_000_000_000).toFixed(2) + "B";
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return sign + (abs / 1_000).toFixed(1) + "K";
  return value.toLocaleString();
}

export interface BrokerActivity {
  code: string;
  name: string;
  volume: number;
  value: number;
  frequency: number;
}

export interface StockTradingSummary {
  stockCode: string;
  stockName: string;
  date: string;
  previous: number;
  open: number;
  high: number;
  low: number;
  close: number;
  change: number;
  volume: number;
  value: number;
  frequency: number;
  foreignBuy: number;
  foreignSell: number;
  foreignNet: number;
  bid: number;
  bidVolume: number;
  offer: number;
  offerVolume: number;
  listedShares: number;
}

export interface BrokerApiResponse {
  brokers: any[];
  stock: any;
  date: string;
  stockCode: string;
  error?: string;
}

export interface IDXBroker {
  code: string;
  name: string;
  license: string;
  is_foreign?: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface IDXFinancialRatio {
  id: number;
  code: string;
  stock_name: string;
  sector: string;
  sub_sector: string;
  industry: string;
  sub_industry: string;
  sector_code: string;
  sub_sector_code: string;
  industry_code: string;
  sub_industry_code: string;
  sharia: string;
  fs_date: string;
  fiscal_year_end: string;
  assets: string;
  liabilities: string;
  equity: string;
  sales: string;
  ebt: string;
  profit_period: string;
  profit_attr_owner: string;
  eps: string;
  audit: string;
  opini: string | null;
  book_value: string;
  per: string;
  price_bv: string;
  de_ratio: string;
  roa: string;
  roe: string;
  npm: string;
  created_at: string;
}

export interface IDXCompanyPerson {
  id: number;
  kode_emiten: string;
  nama: string;
  jabatan: string;
  afiliasi: boolean;
  created_at: string;
}

export interface IDXDividend {
  id: number;
  code: string;
  name: string;
  currency: string;
  cash_dividend: string;
  cum_dividend: string;
  ex_dividend: string;
  record_date: string;
  payment_date: string;
  note: string;
  created_at: string;
}

export interface IDXIndexSummary {
  id: number;
  date: string;
  index_code: string;
  previous: string;
  highest: string;
  lowest: string;
  close: string;
  change: string;
  volume: string;
  value: string;
  frequency: string;
  market_capital: string;
  number_of_stocks: number;
  created_at: string;
}

export interface IDXBrokerSummary {
  id: number;
  code: string;
  date: string;
  broker_code: string;
  broker_name: string;
  volume: string;
  value: string;
  frequency: number;
  created_at: string;
}

export interface IDXShareholder {
  id: number;
  snapshot_date: string;
  kode_emiten: string;
  nama: string;
  kategori: string;
  jumlah: string;
  persentase: string;
  pengendali: boolean;
  created_at: string;
}

export interface IDXStockSummary {
  id: number;
  date: string;
  stock_code: string;
  stock_name: string;
  remarks: string;
  previous: string;
  open_price: string;
  first_trade: string;
  high: string;
  low: string;
  close: string;
  change: string;
  volume: string;
  value: string;
  frequency: number;
  index_individual: string;
  offer: string;
  offer_volume: string;
  bid: string;
  bid_volume: string;
  listed_shares: string;
  tradeable_shares: string;
  weight_for_index: string;
  foreign_sell: string;
  foreign_buy: string;
  non_regular_volume: string;
  non_regular_value: string;
  non_regular_frequency: number;
  created_at: string;
}

export interface IDXCompany {
  kode_emiten: string;
  nama_emiten: string;
  alamat: string;
  bae: string;
  sektor: string;
  sub_sektor: string;
  industri: string;
  sub_industri: string;
  email: string;
  fax: string;
  telepon: string;
  website: string;
  kegiatan_usaha_utama: string;
  npwp: string;
  papan_pencatatan: string;
  tanggal_pencatatan: string;
  efek_saham: boolean;
  efek_obligasi: boolean;
  efek_etf: boolean;
  efek_eba: boolean;
  efek_spei: boolean;
  logo: string;
  details_fetched: boolean;
  created_at: string;
  updated_at: string;
}

export interface IDXSubsidiary {
  id: number;
  kode_emiten: string;
  nama: string;
  bidang_usaha: string;
  lokasi: string;
  persentase: string;
  jumlah_aset: string;
  mata_uang: string;
  satuan: string;
  status_operasi: string;
  tahun_komersil: string;
  created_at: string;
}

export interface IDXAuditCommittee {
  id: number;
  kode_emiten: string;
  nama: string;
  jabatan: string;
  created_at: string;
}

export interface IDXBond {
  id: number;
  kode_emiten: string;
  nama_emisi: string;
  listing_date: string;
  mature_date: string;
  rating: string;
  nominal: string;
  margin: string;
  wali_amanat: string;
  isin_code: string;
  created_at: string;
}

export interface IDXStockSplit {
  id: number;
  code: string;
  stock_name: string;
  ratio: string;
  ssrs: string;
  nominal_value: string;
  nominal_value_new: string;
  additional_listed_shares: string | null;
  listed_shares: string;
  listing_date: string;
  period_year: number;
  period_quarter: number;
  created_at: string;
}

export interface IDXCorporateAction {
  id: number;
  code: string;
  issuer_name: string;
  num_of_shares: string;
  action_type: string;
  action_type_raw: string;
  start_date: string;
  last_date: string;
  period_year: number;
  period_quarter: number;
  created_at: string;
}

export interface IDXCalendarEvent {
  id: number;
  code: string;
  event_type: string;
  event_type_raw: string;
  description: string;
  location: string;
  event_date: string;
  rups_datetime: string | null;
  pe_datetime: string | null;
  created_at: string;
  updated_at: string;
}

export function formatBillion(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (abs >= 1_000) return sign + (abs / 1_000).toFixed(1) + "T";
  return sign + abs.toFixed(1) + "B";
}

export function formatRatio(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  return num.toFixed(2);
}

export interface MarketOverview {
  tradingDate: string;
  totalVolume: number;
  totalValue: number;
  advancingCount: number;
  decliningCount: number;
  unchangedCount: number;
  summary: string;
}

export interface SectorPerformance {
  sector: string;
  change: number;
  topStock: string;
  topStockChange: number;
  sentiment: "bullish" | "bearish" | "neutral";
}

export interface StockMover {
  code: string;
  name: string;
  close: number;
  change: number;
  changePct: number;
  volume: number;
  reason: string;
}

export interface ForeignFlowData {
  netFlow: number;
  netFlowLabel: string;
  sentiment: "inflow" | "outflow" | "neutral";
  summary: string;
  topBought: { code: string; name: string; netBuy: number }[];
  topSold: { code: string; name: string; netSell: number }[];
}

export interface NewsItem {
  headline: string;
  source: string;
  url: string;
  sentiment: "bullish" | "bearish" | "neutral";
  impact: string;
}

export interface StockPick {
  code: string;
  name: string;
  action: "BUY" | "HOLD" | "SELL" | "WATCH";
  currentPrice: number;
  rationale: string;
  targetPrice?: number;
  fundamentals?: {
    per: number;
    pbv: number;
    roe: number;
    deRatio: number;
    eps: number;
  };
  technicalSetup?: string;
  riskAssessment?: string;
  catalysts?: string[];
}

export interface MarketOutlook {
  sentiment: "bullish" | "bearish" | "neutral" | "cautious";
  summary: string;
  keyRisks: string[];
  keyCatalysts: string[];
  shortTermForecast: string;
}

export interface TechnicalSignal {
  code: string;
  name: string;
  signal: "bullish" | "bearish" | "neutral";
  pattern: string;
  support: number;
  resistance: number;
  rsi: number;
  notes: string;
}

export interface TechnicalAnalysis {
  marketTrend: "uptrend" | "downtrend" | "sideways";
  marketTrendNotes: string;
  keyLevels: {
    label: string;
    value: string;
    significance: string;
  }[];
  signals: TechnicalSignal[];
  volumeAnalysis: string;
}

export interface CommodityItem {
  commodity: string;
  sentiment: "bullish" | "bearish" | "neutral";
  priceDirection: "up" | "down" | "flat";
  impact: string;
  affectedStocks: { code: string; name: string; correlation: "positive" | "negative" }[];
}

export interface CommodityAnalysis {
  summary: string;
  commodities: CommodityItem[];
}

export interface CorporateEvent {
  type: "acquisition" | "cooperation" | "merger" | "divestment" | "rumor" | "ipo" | "restructuring" | "other";
  headline: string;
  companies: string[];
  impact: string;
  sentiment: "bullish" | "bearish" | "neutral";
  source?: string;
  url?: string;
}

export interface PricePrediction {
  code: string;
  name: string;
  currentPrice: number;
  targetShortTerm: number;
  targetMidTerm: number;
  stopLoss: number;
  confidence: "high" | "medium" | "low";
  timeframe: string;
  rationale: string;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface ReportChartData {
  sectorPerformanceChart: { sector: string; change: number }[];
  foreignFlowChart: ChartDataPoint[];
  priceHistoryCharts: {
    code: string;
    name: string;
    data: ChartDataPoint[];
  }[];
  marketBreadthChart: ChartDataPoint[];
}

export interface BandarmologyBroker {
  broker: string;
  name: string;
  netValue: number;
  isForeign: boolean;
}

export interface BandarmologySignalReport {
  code: string;
  name: string;
  phase: "accumulation" | "distribution" | "markup" | "markdown" | "neutral";
  confidence: "high" | "medium" | "low";
  topBuyers: BandarmologyBroker[];
  topSellers: BandarmologyBroker[];
  buyerConcentration: number;
  sellerConcentration: number;
  buyerCount: number;
  sellerCount: number;
  interpretation: string;
}

export interface BandarmologyData {
  summary: string;
  signals: BandarmologySignalReport[];
  alertStocks: string[];
}

export interface AIDiscoveryItem {
  code: string;
  name: string;
  discoveryType: "volume_anomaly" | "foreign_flow_outlier" | "undervalued_fundamental" | "stealth_accumulation" | "sector_rotation_early";
  currentPrice: number;
  thesis: string;
  signals: string[];
  riskLevel: "high" | "medium" | "low";
  conviction: "high" | "medium" | "low";
  targetPrice?: number;
  fundamentals?: {
    per: number;
    pbv: number;
    roe: number;
    deRatio: number;
  };
  dataHighlight: string;
}

export interface AIDiscovery {
  summary: string;
  hiddenGems: AIDiscoveryItem[];
}

export interface MarketIntelligenceReport {
  title: string;
  marketOverview: MarketOverview;
  sectorPerformance: SectorPerformance[];
  topMovers: {
    gainers: StockMover[];
    losers: StockMover[];
    mostActive: StockMover[];
  };
  foreignFlow: ForeignFlowData;
  technicalAnalysis: TechnicalAnalysis;
  commodityAnalysis: CommodityAnalysis;
  corporateEvents: CorporateEvent[];
  pricePredictions: PricePrediction[];
  chartData: ReportChartData;
  newsSentiment: NewsItem[];
  stockPicks: StockPick[];
  bandarmology?: BandarmologyData;
  aiDiscovery?: AIDiscovery;
  marketOutlook: MarketOutlook;
  _indonesian?: MarketIntelligenceReport;
}

export interface MarketIntelligenceRow {
  id: number;
  report_date: string;
  report: MarketIntelligenceReport;
  title: string | null;
  image_url: string | null;
  created_at: string;
}

export interface MarketIntelligenceListItem {
  id: number;
  report_date: string;
  title: string | null;
  image_url: string | null;
  sentiment: string;
  summary: string;
  created_at: string;
}

export interface BAStockRanking {
  symbol: string;
  period: string;
  investor_type: string;
  market_board: string;
  date: string;
  broker_code: string;
  net_value: number;
  b_val: number;
  s_val: number;
  net_volume: number;
  b_lot: number;
  s_lot: number;
  value_share: number;
  rank: number;
}

export interface BABrokerRanking {
  broker_code: string;
  period: string;
  investor_type: string;
  market_board: string;
  date: string;
  symbol: string;
  net_value: number;
  b_val: number;
  s_val: number;
  net_volume: number;
  b_lot: number;
  s_lot: number;
  value_share: number;
  rank: number;
}
