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
