import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Svg,
  Rect,
  Line,
  G,
  Path,
} from "@react-pdf/renderer";
import type {
  MarketIntelligenceReport,
  StockMover,
  TechnicalSignal,
  CommodityItem,
  CorporateEvent,
  PricePrediction,
  StockPick,
  NewsItem,
  SectorPerformance,
  BandarmologySignalReport,
  ChartDataPoint,
} from "./types";

Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hjQ.ttf", fontWeight: 500 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hjQ.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjQ.ttf", fontWeight: 700 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuDyYAZ9hjQ.ttf", fontWeight: 800 },
  ],
});

const NAVY = "#0f172a";
const NAVY_LIGHT = "#1e293b";
const ACCENT = "#6366f1";
const GREEN = "#16a34a";
const RED = "#dc2626";
const AMBER = "#d97706";
const GRAY = "#64748b";
const LIGHTGRAY = "#e2e8f0";
const LIGHT_BG = "#f8fafc";
const BORDER = "#e2e8f0";
const WHITE = "#ffffff";

const s = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 8.5,
    color: NAVY,
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 44,
    backgroundColor: WHITE,
  },
  coverPage: {
    fontFamily: "Inter",
    backgroundColor: NAVY,
    paddingHorizontal: 0,
    paddingVertical: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  coverInner: {
    paddingHorizontal: 56,
    paddingVertical: 56,
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
  },
  coverBrand: {
    fontSize: 11,
    fontWeight: 600,
    color: ACCENT,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: 800,
    color: WHITE,
    lineHeight: 1.2,
    marginBottom: 20,
  },
  coverDate: {
    fontSize: 13,
    fontWeight: 500,
    color: "#94a3b8",
    marginBottom: 32,
  },
  coverDivider: {
    width: 60,
    height: 3,
    backgroundColor: ACCENT,
    marginBottom: 32,
    borderRadius: 2,
  },
  coverSummary: {
    fontSize: 10.5,
    color: "#cbd5e1",
    lineHeight: 1.7,
    maxWidth: 420,
  },
  coverMetricsRow: {
    flexDirection: "row",
    gap: 24,
    marginTop: 40,
  },
  coverMetric: {
    alignItems: "flex-start",
  },
  coverMetricLabel: {
    fontSize: 7.5,
    fontWeight: 600,
    color: "#64748b",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  coverMetricValue: {
    fontSize: 16,
    fontWeight: 700,
    color: WHITE,
  },
  coverSentiment: {
    marginTop: 24,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  coverSentimentText: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  coverFooter: {
    position: "absolute",
    bottom: 40,
    left: 56,
    right: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  coverDisclaimer: {
    fontSize: 6.5,
    color: "#475569",
    maxWidth: 300,
  },
  header: {
    position: "absolute",
    top: 16,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  headerLeft: {
    fontSize: 7,
    fontWeight: 600,
    color: ACCENT,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  headerRight: {
    fontSize: 7,
    color: GRAY,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 6.5,
    color: GRAY,
  },
  pageNum: {
    fontSize: 7,
    fontWeight: 600,
    color: NAVY_LIGHT,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: NAVY,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 8,
    color: GRAY,
    marginBottom: 14,
  },
  sectionBar: {
    width: 32,
    height: 3,
    backgroundColor: ACCENT,
    borderRadius: 2,
    marginBottom: 10,
  },
  sectionWrap: {
    marginBottom: 22,
  },
  bodyText: {
    fontSize: 8.5,
    color: NAVY_LIGHT,
    lineHeight: 1.65,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: NAVY,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderCell: {
    fontSize: 6.5,
    fontWeight: 700,
    color: WHITE,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingRight: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  tableRowAlt: {
    backgroundColor: LIGHT_BG,
  },
  tableCell: {
    fontSize: 7.5,
    color: NAVY_LIGHT,
    paddingRight: 4,
  },
  tableCellBold: {
    fontSize: 7.5,
    fontWeight: 600,
    color: NAVY,
    paddingRight: 4,
  },
  positive: { color: GREEN },
  negative: { color: RED },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 6.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  cardBox: {
    backgroundColor: LIGHT_BG,
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  cardTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: NAVY,
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 8,
    color: NAVY_LIGHT,
    lineHeight: 1.6,
  },
  twoCol: {
    flexDirection: "row",
    gap: 12,
  },
  col: {
    flex: 1,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 4,
    paddingLeft: 4,
  },
  bullet: {
    fontSize: 8,
    color: ACCENT,
    marginRight: 6,
    marginTop: 1,
  },
  bulletText: {
    fontSize: 8,
    color: NAVY_LIGHT,
    lineHeight: 1.55,
    flex: 1,
  },
  disclaimer: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
  },
  disclaimerTitle: {
    fontSize: 7,
    fontWeight: 700,
    color: GRAY,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  disclaimerText: {
    fontSize: 6.5,
    color: GRAY,
    lineHeight: 1.6,
  },
});

interface Labels {
  brand: string;
  report: string;
  date: string;
  execSummary: string;
  sectorPerf: string;
  topGainers: string;
  topLosers: string;
  mostActive: string;
  techAnalysis: string;
  foreignFlow: string;
  commodities: string;
  corpEvents: string;
  bandarmology: string;
  predictions: string;
  stockPicks: string;
  outlook: string;
  newsDigest: string;
  disclaimer: string;
  disclaimerBody: string;
  advancing: string;
  declining: string;
  unchanged: string;
  totalValue: string;
  sentiment: string;
  sector: string;
  change: string;
  topStock: string;
  ticker: string;
  close: string;
  volume: string;
  reason: string;
  signal: string;
  pattern: string;
  support: string;
  resistance: string;
  rsi: string;
  notes: string;
  netFlow: string;
  topBought: string;
  topSold: string;
  name: string;
  commodity: string;
  direction: string;
  impact: string;
  affected: string;
  type: string;
  headline: string;
  companies: string;
  phase: string;
  buyConc: string;
  sellConc: string;
  buyers: string;
  sellers: string;
  current: string;
  shortTarget: string;
  midTarget: string;
  stopLoss: string;
  confidence: string;
  rationale: string;
  action: string;
  target: string;
  source: string;
  risks: string;
  catalysts: string;
  stForecast: string;
  keyLevels: string;
  volAnalysis: string;
  marketTrend: string;
  confidential: string;
  page: string;
}

const EN: Labels = {
  brand: "Gunaa MARKET INTELLIGENCE",
  report: "Daily Market Intelligence Report",
  date: "Report Date",
  execSummary: "Executive Summary",
  sectorPerf: "Sector Performance",
  topGainers: "Top Gainers",
  topLosers: "Top Losers",
  mostActive: "Most Active by Value",
  techAnalysis: "Technical Analysis",
  foreignFlow: "Foreign Flow Analysis",
  commodities: "Commodity Impact Analysis",
  corpEvents: "Corporate Events & M&A",
  bandarmology: "Bandarmology -- Smart Money Tracking",
  predictions: "Price Predictions & Targets",
  stockPicks: "Analyst Stock Picks",
  outlook: "Market Outlook & Forecast",
  newsDigest: "News Digest & Sentiment",
  disclaimer: "Disclaimer",
  disclaimerBody: "This report is generated by AI-assisted analysis and is provided for informational and educational purposes only. It does not constitute investment advice, a recommendation, or a solicitation to buy or sell any securities. Past performance does not guarantee future results. All investments carry risk, including the potential loss of principal. The data, opinions, and predictions contained in this report may be inaccurate or incomplete. Always conduct your own due diligence and consult with a licensed financial advisor before making any investment decisions. Gunaa and its affiliates are not liable for any losses arising from the use of this report.",
  advancing: "Advancing Stocks",
  declining: "Declining Stocks",
  unchanged: "Unchanged Stocks",
  totalValue: "Total Market Value",
  sentiment: "Sentiment",
  sector: "Sector",
  change: "Change",
  topStock: "Top Stock",
  ticker: "Ticker",
  close: "Close",
  volume: "Volume",
  reason: "Analysis",
  signal: "Signal",
  pattern: "Pattern",
  support: "Support",
  resistance: "Resistance",
  rsi: "RSI",
  notes: "Notes",
  netFlow: "Net Flow",
  topBought: "Top Foreign Bought",
  topSold: "Top Foreign Sold",
  name: "Name",
  commodity: "Commodity",
  direction: "Direction",
  impact: "Impact",
  affected: "Affected Stocks",
  type: "Type",
  headline: "Headline",
  companies: "Companies",
  phase: "Phase",
  buyConc: "Buy Conc.",
  sellConc: "Sell Conc.",
  buyers: "Buyers",
  sellers: "Sellers",
  current: "Current",
  shortTarget: "Short-term Target",
  midTarget: "Mid-term Target",
  stopLoss: "Stop Loss",
  confidence: "Confidence",
  rationale: "Rationale",
  action: "Action",
  target: "Target",
  source: "Source",
  risks: "Key Risks",
  catalysts: "Key Catalysts",
  stForecast: "Short-term Forecast",
  keyLevels: "Key Support & Resistance Levels",
  volAnalysis: "Volume Analysis",
  marketTrend: "Market Trend",
  confidential: "Confidential -- For subscriber use only",
  page: "Page",
};

const ID: Labels = {
  brand: "Gunaa INTELIJEN PASAR",
  report: "Laporan Intelijen Pasar Harian",
  date: "Tanggal Laporan",
  execSummary: "Ringkasan Eksekutif",
  sectorPerf: "Kinerja Sektoral",
  topGainers: "Saham Naik Terbesar",
  topLosers: "Saham Turun Terbesar",
  mostActive: "Saham Teraktif berdasarkan Nilai",
  techAnalysis: "Analisis Teknikal",
  foreignFlow: "Analisis Aliran Dana Asing",
  commodities: "Analisis Dampak Komoditas",
  corpEvents: "Aksi Korporasi & M&A",
  bandarmology: "Bandarmology -- Pelacakan Smart Money",
  predictions: "Prediksi & Target Harga",
  stockPicks: "Rekomendasi Saham Analis",
  outlook: "Prospek & Prakiraan Pasar",
  newsDigest: "Rangkuman Berita & Sentimen",
  disclaimer: "Disclaimer",
  disclaimerBody: "Laporan ini dihasilkan oleh analisis berbantuan AI dan disediakan hanya untuk tujuan informasi dan edukasi. Laporan ini bukan merupakan saran investasi, rekomendasi, atau ajakan untuk membeli atau menjual sekuritas apa pun. Kinerja masa lalu tidak menjamin hasil di masa depan. Semua investasi memiliki risiko, termasuk potensi kehilangan modal. Data, opini, dan prediksi dalam laporan ini mungkin tidak akurat atau tidak lengkap. Selalu lakukan riset sendiri dan konsultasikan dengan penasihat keuangan berlisensi sebelum membuat keputusan investasi. Gunaa dan afiliasinya tidak bertanggung jawab atas kerugian yang timbul dari penggunaan laporan ini.",
  advancing: "Saham Menguat",
  declining: "Saham Melemah",
  unchanged: "Saham Tetap",
  totalValue: "Total Nilai Pasar",
  sentiment: "Sentimen",
  sector: "Sektor",
  change: "Perubahan",
  topStock: "Saham Teratas",
  ticker: "Kode",
  close: "Harga",
  volume: "Volume",
  reason: "Analisis",
  signal: "Sinyal",
  pattern: "Pola",
  support: "Dukungan",
  resistance: "Resistensi",
  rsi: "RSI",
  notes: "Catatan",
  netFlow: "Arus Bersih",
  topBought: "Saham Paling Dibeli Asing",
  topSold: "Saham Paling Dijual Asing",
  name: "Nama",
  commodity: "Komoditas",
  direction: "Arah",
  impact: "Dampak",
  affected: "Saham Terdampak",
  type: "Tipe",
  headline: "Judul",
  companies: "Perusahaan",
  phase: "Fase",
  buyConc: "Konsentrasi Beli",
  sellConc: "Konsentrasi Jual",
  buyers: "Pembeli",
  sellers: "Penjual",
  current: "Saat ini",
  shortTarget: "Target Jk. Pendek",
  midTarget: "Target Jk. Menengah",
  stopLoss: "Stop Loss",
  confidence: "Keyakinan",
  rationale: "Rasional",
  action: "Aksi",
  target: "Target",
  source: "Sumber",
  risks: "Risiko Utama",
  catalysts: "Katalis Utama",
  stForecast: "Prakiraan Jk. Pendek",
  keyLevels: "Level Support & Resistance Kunci",
  volAnalysis: "Analisis Volume",
  marketTrend: "Tren Pasar",
  confidential: "Rahasia -- Hanya untuk pelanggan",
  page: "Halaman",
};

function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}

function fmtVal(v: number): string {
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (a >= 1e12) return sign + "Rp " + (a / 1e12).toFixed(2) + "T";
  if (a >= 1e9) return sign + "Rp " + (a / 1e9).toFixed(2) + "B";
  if (a >= 1e6) return sign + "Rp " + (a / 1e6).toFixed(1) + "M";
  return sign + "Rp " + fmtNum(a);
}

// AI returns netBuy/netSell in billions (e.g. 0.18 means Rp 180M)
function fmtFlowVal(v: number): string {
  if (Math.abs(v) < 1000) return fmtVal(v * 1e9);
  return fmtVal(v);
}

function fmtPct(v: number): string {
  return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
}

function sentimentColor(sent: string): { bg: string; fg: string } {
  switch (sent) {
    case "bullish":
    case "inflow":
      return { bg: "#dcfce7", fg: GREEN };
    case "bearish":
    case "outflow":
      return { bg: "#fee2e2", fg: RED };
    case "cautious":
      return { bg: "#fef3c7", fg: AMBER };
    default:
      return { bg: "#f1f5f9", fg: GRAY };
  }
}

function PageHeader({ l, dateStr }: { l: Labels; dateStr: string }) {
  return (
    <View style={s.header} fixed>
      <Text style={s.headerLeft}>{l.brand}</Text>
      <Text style={s.headerRight}>{dateStr}</Text>
    </View>
  );
}

function PageFooter({ l }: { l: Labels }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{l.confidential}</Text>
      <Text
        style={s.pageNum}
        render={({ pageNumber, totalPages }) => `${l.page} ${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View wrap={false}>
      <View style={s.sectionBar} />
      <Text style={s.sectionTitle}>{title}</Text>
      {subtitle && <Text style={s.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );
}

function Badge({ text, sentiment }: { text: string; sentiment: string }) {
  const c = sentimentColor(sentiment);
  return (
    <View style={[s.badge, { backgroundColor: c.bg }]}>
      <Text style={[s.badgeText, { color: c.fg }]}>{text}</Text>
    </View>
  );
}

function SectorBarChart({ sectors }: { sectors: SectorPerformance[] }) {
  const W = 500;
  const BAR_H = 9;
  const GAP = 3;
  const LABEL_W = 130;
  const BAR_AREA = W - LABEL_W - 50;
  const maxAbs = Math.max(...sectors.map((s) => Math.abs(s.change)), 0.01);
  const zeroX = LABEL_W + BAR_AREA * 0.5;

  return (
    <View style={{ marginBottom: 12, marginTop: 4 }}>
      <Svg width={W} height={sectors.length * (BAR_H + GAP) + 10}>
        {sectors.map((sp, i) => {
          const y = i * (BAR_H + GAP);
          const barWidth = (Math.abs(sp.change) / maxAbs) * (BAR_AREA * 0.45);
          const isPos = sp.change >= 0;
          const barX = isPos ? zeroX : zeroX - barWidth;
          const fill = isPos ? GREEN : RED;
          return (
            <G key={i}>
              <Rect x={0} y={y} width={LABEL_W - 4} height={BAR_H} fill="none" />
              <Path
                d={`M ${LABEL_W - 4} ${y + BAR_H / 2 - 3} L ${LABEL_W} ${y + BAR_H / 2} L ${LABEL_W - 4} ${y + BAR_H / 2 + 3}`}
                stroke="#cbd5e1"
                strokeWidth={0.3}
                fill="none"
              />
              <Rect x={barX} y={y + 1} width={barWidth} height={BAR_H - 2} fill={fill} rx={1} />
              <Line x1={zeroX} y1={y} x2={zeroX} y2={y + BAR_H} stroke="#cbd5e1" strokeWidth={0.5} />
            </G>
          );
        })}
        <Line x1={zeroX} y1={0} x2={zeroX} y2={sectors.length * (BAR_H + GAP)} stroke="#94a3b8" strokeWidth={0.5} />
      </Svg>
      <View style={{ position: "absolute", left: 0, top: 0 }}>
        {sectors.map((sp, i) => (
          <View key={i} style={{ height: BAR_H + GAP, justifyContent: "center" }}>
            <Text style={{ fontSize: 6, color: NAVY_LIGHT, width: LABEL_W - 6 }}>{sp.sector}</Text>
          </View>
        ))}
      </View>
      <View style={{ position: "absolute", left: LABEL_W + BAR_AREA * 0.5 + 4, top: 0 }}>
        {sectors.map((sp, i) => {
          const isPos = sp.change >= 0;
          return (
            <View key={i} style={{ height: BAR_H + GAP, justifyContent: "center" }}>
              <Text style={{ fontSize: 6, color: isPos ? GREEN : RED, fontWeight: 600 }}>{fmtPct(sp.change)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ForeignFlowLineChart({ data }: { data: ChartDataPoint[] }) {
  if (!data || data.length < 2) return null;
  const W = 500;
  const H = 80;
  const PAD = { top: 10, bottom: 20, left: 10, right: 10 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const vals = data.map((d) => d.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 1;

  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * innerW;
  const toY = (v: number) => PAD.top + innerH - ((v - minV) / range) * innerH;

  const pathD = data.map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(d.value)}`).join(" ");
  const areaD = `${pathD} L ${toX(data.length - 1)} ${PAD.top + innerH} L ${toX(0)} ${PAD.top + innerH} Z`;

  const zeroY = minV <= 0 && maxV >= 0 ? toY(0) : PAD.top + innerH;
  const netPositive = data[data.length - 1]?.value >= 0;

  return (
    <View style={{ marginBottom: 8, marginTop: 4 }}>
      <Svg width={W} height={H}>
        <Path d={areaD} fill={netPositive ? GREEN : RED} fillOpacity={0.1} />
        <Path d={pathD} stroke={netPositive ? GREEN : RED} strokeWidth={1.2} fill="none" />
        <Line x1={PAD.left} y1={zeroY} x2={W - PAD.right} y2={zeroY} stroke="#94a3b8" strokeWidth={0.5} strokeDasharray="2,2" />
        {data.map((d, i) => {
          if (i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) return null;
          return (
            <G key={i}>
              <Line x1={toX(i)} y1={PAD.top + innerH} x2={toX(i)} y2={PAD.top + innerH + 3} stroke="#94a3b8" strokeWidth={0.5} />
            </G>
          );
        })}
      </Svg>
      <View style={{ position: "absolute", bottom: 0, left: PAD.left, right: PAD.right, flexDirection: "row", justifyContent: "space-between" }}>
        {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1).map((d, i) => (
          <Text key={i} style={{ fontSize: 5.5, color: GRAY }}>{d.date?.slice(5)}</Text>
        ))}
      </View>
    </View>
  );
}

function MoversTable({ items, l }: { items: StockMover[]; l: Labels }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={s.tableHeader}>
        <Text style={[s.tableHeaderCell, { width: "8%" }]}>{l.ticker}</Text>
        <Text style={[s.tableHeaderCell, { width: "16%" }]}>{l.name}</Text>
        <Text style={[s.tableHeaderCell, { width: "9%", textAlign: "right" }]}>{l.close}</Text>
        <Text style={[s.tableHeaderCell, { width: "8%", textAlign: "right" }]}>{l.change}</Text>
        <Text style={[s.tableHeaderCell, { width: "10%", textAlign: "right" }]}>{l.volume}</Text>
        <Text style={[s.tableHeaderCell, { width: "49%" }]}>{l.reason}</Text>
      </View>
      {items.map((m, i) => (
        <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
          <Text style={[s.tableCellBold, { width: "8%" }]}>{m.code}</Text>
          <Text style={[s.tableCell, { width: "16%" }]}>{m.name}</Text>
          <Text style={[s.tableCell, { width: "9%", textAlign: "right" }]}>{fmtNum(m.close)}</Text>
          <Text style={[s.tableCell, { width: "8%", textAlign: "right" }, m.changePct >= 0 ? s.positive : s.negative]}>
            {fmtPct(m.changePct)}
          </Text>
          <Text style={[s.tableCell, { width: "10%", textAlign: "right" }]}>{fmtNum(m.volume)}</Text>
          <Text style={[s.tableCell, { width: "49%", fontSize: 7, lineHeight: 1.4 }]}>{m.reason}</Text>
        </View>
      ))}
    </View>
  );
}

function CoverPage({ report, dateStr, l }: { report: MarketIntelligenceReport; dateStr: string; l: Labels }) {
  const ov = report.marketOverview;
  const outlookSent = report.marketOutlook.sentiment;
  const sc = sentimentColor(outlookSent);

  return (
    <Page size="A4" style={s.coverPage}>
      <View style={s.coverInner}>
        <Text style={s.coverBrand}>{l.brand}</Text>
        <Text style={s.coverTitle}>{report.title}</Text>
        <Text style={s.coverDate}>{dateStr}</Text>
        <View style={s.coverDivider} />
        <Text style={s.coverSummary}>{ov.summary}</Text>

        <View style={s.coverMetricsRow}>
          <View style={s.coverMetric}>
            <Text style={s.coverMetricLabel}>{l.advancing}</Text>
            <Text style={[s.coverMetricValue, { color: GREEN }]}>{ov.advancingCount} <Text style={{ fontSize: 9, fontWeight: 400, color: "#94a3b8" }}>stocks</Text></Text>
          </View>
          <View style={s.coverMetric}>
            <Text style={s.coverMetricLabel}>{l.declining}</Text>
            <Text style={[s.coverMetricValue, { color: RED }]}>{ov.decliningCount} <Text style={{ fontSize: 9, fontWeight: 400, color: "#94a3b8" }}>stocks</Text></Text>
          </View>
          <View style={s.coverMetric}>
            <Text style={s.coverMetricLabel}>{l.unchanged}</Text>
            <Text style={[s.coverMetricValue, { color: GRAY }]}>{ov.unchangedCount} <Text style={{ fontSize: 9, fontWeight: 400, color: "#94a3b8" }}>stocks</Text></Text>
          </View>
          <View style={[s.coverMetric, { borderLeftWidth: 0.5, borderLeftColor: "#334155", paddingLeft: 24 }]}>
            <Text style={s.coverMetricLabel}>{l.totalValue} (IDR)</Text>
            <Text style={s.coverMetricValue}>{fmtVal(ov.totalValue)}</Text>
          </View>
        </View>

        {/* Market breadth bar */}
        {(() => {
          const total = ov.advancingCount + ov.decliningCount + ov.unchangedCount;
          if (total <= 0) return null;
          const advPct = (ov.advancingCount / total) * 100;
          const decPct = (ov.decliningCount / total) * 100;
          const unchPct = 100 - advPct - decPct;
          return (
            <View style={{ marginTop: 14 }}>
              <Text style={{ fontSize: 7, color: "#64748b", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 5 }}>
                Market Breadth
              </Text>
              <View style={{ flexDirection: "row", height: 6, borderRadius: 3, overflow: "hidden" }}>
                <View style={{ width: `${advPct}%`, backgroundColor: GREEN }} />
                <View style={{ width: `${unchPct}%`, backgroundColor: "#475569" }} />
                <View style={{ width: `${decPct}%`, backgroundColor: RED }} />
              </View>
              <View style={{ flexDirection: "row", gap: 14, marginTop: 5 }}>
                <Text style={{ fontSize: 6.5, color: GREEN }}>{advPct.toFixed(0)}% up</Text>
                <Text style={{ fontSize: 6.5, color: "#64748b" }}>{unchPct.toFixed(0)}% flat</Text>
                <Text style={{ fontSize: 6.5, color: RED }}>{decPct.toFixed(0)}% down</Text>
              </View>
            </View>
          );
        })()}

        <View style={[s.coverSentiment, { backgroundColor: sc.bg + "30" }]}>
          <Text style={[s.coverSentimentText, { color: sc.fg }]}>
            {l.sentiment}: {outlookSent.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={s.coverFooter}>
        <Text style={s.coverDisclaimer}>{l.confidential}</Text>
        <Text style={[s.coverDisclaimer, { textAlign: "right" }]}>Gunaa.com</Text>
      </View>
    </Page>
  );
}

export function MarketReportPDF({
  report,
  dateStr,
  lang = "en",
}: {
  report: MarketIntelligenceReport;
  dateStr: string;
  lang?: "en" | "id";
}) {
  const l = lang === "id" ? ID : EN;

  return (
    <Document
      title={`${l.report} - ${dateStr}`}
      author="Gunaa"
      subject="Market Intelligence"
    >
      <CoverPage report={report} dateStr={dateStr} l={l} />

      {/* EXECUTIVE SUMMARY + SECTOR PERFORMANCE */}
      <Page size="A4" style={s.page} wrap>
        <PageHeader l={l} dateStr={dateStr} />
        <PageFooter l={l} />

        <View style={s.sectionWrap}>
          <SectionHeading title={l.execSummary} />
          <Text style={s.bodyText}>{report.marketOverview.summary}</Text>
          <Text style={s.bodyText}>{report.marketOutlook.summary}</Text>
          {report.marketOutlook.shortTermForecast && (
            <View style={s.cardBox}>
              <Text style={s.cardTitle}>{l.stForecast}</Text>
              <Text style={s.cardBody}>{report.marketOutlook.shortTermForecast}</Text>
            </View>
          )}
        </View>

        <View style={s.sectionWrap}>
          <SectionHeading title={l.sectorPerf} />
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderCell, { width: "28%" }]}>{l.sector}</Text>
            <Text style={[s.tableHeaderCell, { width: "10%", textAlign: "right" }]}>{l.change}</Text>
            <Text style={[s.tableHeaderCell, { width: "12%", paddingLeft: 8 }]}>{l.topStock}</Text>
            <Text style={[s.tableHeaderCell, { width: "10%", textAlign: "right" }]}>%</Text>
            <Text style={[s.tableHeaderCell, { width: "14%", paddingLeft: 8 }]}>{l.sentiment}</Text>
          </View>
          {report.sectorPerformance?.map((sp: SectorPerformance, i: number) => (
            <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
              <Text style={[s.tableCellBold, { width: "28%" }]}>{sp.sector}</Text>
              <Text style={[s.tableCell, { width: "10%", textAlign: "right" }, sp.change >= 0 ? s.positive : s.negative]}>
                {fmtPct(sp.change)}
              </Text>
              <Text style={[s.tableCellBold, { width: "12%", paddingLeft: 8 }]}>{sp.topStock}</Text>
              <Text style={[s.tableCell, { width: "10%", textAlign: "right" }, sp.topStockChange >= 0 ? s.positive : s.negative]}>
                {fmtPct(sp.topStockChange)}
              </Text>
              <Text style={[s.tableCell, { width: "14%", paddingLeft: 8 }]}>
                {sp.sentiment}
              </Text>
            </View>
          ))}
          {report.sectorPerformance?.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 7, fontWeight: 600, color: GRAY, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                Sector Change Overview
              </Text>
              <SectorBarChart sectors={report.sectorPerformance} />
            </View>
          )}
        </View>

        {/* TOP MOVERS */}
        <View style={s.sectionWrap} break>
          <SectionHeading title={l.topGainers} />
          <MoversTable items={report.topMovers?.gainers || []} l={l} />
        </View>

        <View style={s.sectionWrap}>
          <SectionHeading title={l.topLosers} />
          <MoversTable items={report.topMovers?.losers || []} l={l} />
        </View>

        <View style={s.sectionWrap}>
          <SectionHeading title={l.mostActive} />
          <MoversTable items={report.topMovers?.mostActive || []} l={l} />
        </View>

        {/* TECHNICAL ANALYSIS */}
        <View style={s.sectionWrap} break>
          <SectionHeading title={l.techAnalysis} />

          <View style={s.cardBox}>
            <Text style={s.cardTitle}>{l.marketTrend}: {report.technicalAnalysis?.marketTrend?.toUpperCase()}</Text>
            <Text style={s.cardBody}>{report.technicalAnalysis?.marketTrendNotes}</Text>
          </View>

          {report.technicalAnalysis?.volumeAnalysis && (
            <View style={s.cardBox}>
              <Text style={s.cardTitle}>{l.volAnalysis}</Text>
              <Text style={s.cardBody}>{report.technicalAnalysis.volumeAnalysis}</Text>
            </View>
          )}

          {report.technicalAnalysis?.keyLevels?.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={[s.cardTitle, { marginBottom: 6 }]}>{l.keyLevels}</Text>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderCell, { width: "25%" }]}>Level</Text>
                <Text style={[s.tableHeaderCell, { width: "15%", textAlign: "right" }]}>Value</Text>
                <Text style={[s.tableHeaderCell, { width: "60%" }]}>Significance</Text>
              </View>
              {report.technicalAnalysis.keyLevels.map((kl, i) => (
                <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
                  <Text style={[s.tableCellBold, { width: "25%" }]}>{kl.label}</Text>
                  <Text style={[s.tableCell, { width: "15%", textAlign: "right", fontWeight: 600 }]}>{kl.value}</Text>
                  <Text style={[s.tableCell, { width: "60%", fontSize: 7, lineHeight: 1.4 }]}>{kl.significance}</Text>
                </View>
              ))}
            </View>
          )}

          {report.technicalAnalysis?.signals?.length > 0 && (
            <View>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderCell, { width: "7%" }]}>{l.ticker}</Text>
                <Text style={[s.tableHeaderCell, { width: "14%" }]}>{l.name}</Text>
                <Text style={[s.tableHeaderCell, { width: "8%" }]}>{l.signal}</Text>
                <Text style={[s.tableHeaderCell, { width: "12%" }]}>{l.pattern}</Text>
                <Text style={[s.tableHeaderCell, { width: "9%", textAlign: "right" }]}>{l.support}</Text>
                <Text style={[s.tableHeaderCell, { width: "9%", textAlign: "right" }]}>{l.resistance}</Text>
                <Text style={[s.tableHeaderCell, { width: "5%", textAlign: "right" }]}>{l.rsi}</Text>
                <Text style={[s.tableHeaderCell, { width: "36%" }]}>{l.notes}</Text>
              </View>
              {report.technicalAnalysis.signals.map((sig: TechnicalSignal, i: number) => {
                const sigColor = sig.signal === "bullish" ? s.positive : sig.signal === "bearish" ? s.negative : {};
                return (
                  <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
                    <Text style={[s.tableCellBold, { width: "7%" }]}>{sig.code}</Text>
                    <Text style={[s.tableCell, { width: "14%" }]}>{sig.name}</Text>
                    <Text style={[s.tableCell, { width: "8%" }, sigColor]}>{sig.signal}</Text>
                    <Text style={[s.tableCell, { width: "12%" }]}>{sig.pattern}</Text>
                    <Text style={[s.tableCell, { width: "9%", textAlign: "right" }]}>{fmtNum(sig.support)}</Text>
                    <Text style={[s.tableCell, { width: "9%", textAlign: "right" }]}>{fmtNum(sig.resistance)}</Text>
                    <Text style={[s.tableCell, { width: "5%", textAlign: "right" }]}>{sig.rsi}</Text>
                    <Text style={[s.tableCell, { width: "36%", fontSize: 7, lineHeight: 1.4 }]}>{sig.notes}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* FOREIGN FLOW */}
        <View style={s.sectionWrap} break>
          <SectionHeading title={l.foreignFlow} />
          <View style={s.cardBox}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <View>
                <Text style={[s.cardTitle, { marginBottom: 0 }]}>{l.netFlow}</Text>
                <Text style={{ fontSize: 16, fontWeight: 800, color: report.foreignFlow?.netFlow >= 0 ? GREEN : RED }}>
                  {report.foreignFlow?.netFlowLabel}
                </Text>
              </View>
              <Badge text={report.foreignFlow?.sentiment || "neutral"} sentiment={report.foreignFlow?.sentiment || "neutral"} />
            </View>
            {report.chartData?.foreignFlowChart?.length >= 2 && (
              <View style={{ marginBottom: 6 }}>
                <Text style={{ fontSize: 6.5, color: GRAY, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
                  Daily Net Foreign Flow Trend
                </Text>
                <ForeignFlowLineChart data={report.chartData.foreignFlowChart} />
              </View>
            )}
            <Text style={s.cardBody}>{report.foreignFlow?.summary}</Text>
          </View>

          <View style={s.twoCol}>
            <View style={s.col}>
              <Text style={[s.cardTitle, { marginBottom: 6 }]}>{l.topBought}</Text>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderCell, { width: "25%" }]}>{l.ticker}</Text>
                <Text style={[s.tableHeaderCell, { width: "40%" }]}>{l.name}</Text>
                <Text style={[s.tableHeaderCell, { width: "35%", textAlign: "right" }]}>{l.netFlow}</Text>
              </View>
              {report.foreignFlow?.topBought?.map((f, i) => (
                <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
                  <Text style={[s.tableCellBold, { width: "25%" }]}>{f.code}</Text>
                  <Text style={[s.tableCell, { width: "40%" }]}>{f.name}</Text>
                  <Text style={[s.tableCell, s.positive, { width: "35%", textAlign: "right" }]}>{fmtFlowVal(f.netBuy)}</Text>
                </View>
              ))}
            </View>
            <View style={s.col}>
              <Text style={[s.cardTitle, { marginBottom: 6 }]}>{l.topSold}</Text>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderCell, { width: "25%" }]}>{l.ticker}</Text>
                <Text style={[s.tableHeaderCell, { width: "40%" }]}>{l.name}</Text>
                <Text style={[s.tableHeaderCell, { width: "35%", textAlign: "right" }]}>{l.netFlow}</Text>
              </View>
              {report.foreignFlow?.topSold?.map((f, i) => (
                <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
                  <Text style={[s.tableCellBold, { width: "25%" }]}>{f.code}</Text>
                  <Text style={[s.tableCell, { width: "40%" }]}>{f.name}</Text>
                  <Text style={[s.tableCell, s.negative, { width: "35%", textAlign: "right" }]}>{fmtFlowVal(f.netSell)}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* COMMODITY ANALYSIS */}
        <View style={s.sectionWrap} break>
          <SectionHeading title={l.commodities} />
          <Text style={s.bodyText}>{report.commodityAnalysis?.summary}</Text>
          {report.commodityAnalysis?.commodities?.map((c: CommodityItem, i: number) => (
            <View key={i} style={s.cardBox} wrap={false}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={s.cardTitle}>{c.commodity}</Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <Badge text={c.priceDirection} sentiment={c.priceDirection === "up" ? "bullish" : c.priceDirection === "down" ? "bearish" : "neutral"} />
                  <Badge text={c.sentiment} sentiment={c.sentiment} />
                </View>
              </View>
              <Text style={s.cardBody}>{c.impact}</Text>
              {c.affectedStocks?.length > 0 && (
                <Text style={[s.cardBody, { fontSize: 7, marginTop: 3, color: GRAY }]}>
                  {l.affected}: {c.affectedStocks.map((as) => `${as.code} (${as.correlation})`).join(", ")}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* CORPORATE EVENTS */}
        {report.corporateEvents?.length > 0 && (
          <View style={s.sectionWrap} break>
            <SectionHeading title={l.corpEvents} />
            {report.corporateEvents.map((ev: CorporateEvent, i: number) => (
              <View key={i} style={s.cardBox} wrap={false}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                    <Badge text={ev.type} sentiment="neutral" />
                    <Badge text={ev.sentiment} sentiment={ev.sentiment} />
                  </View>
                  {ev.companies?.length > 0 && (
                    <Text style={{ fontSize: 7, fontWeight: 700, color: ACCENT }}>
                      {ev.companies.join(", ")}
                    </Text>
                  )}
                </View>
                <Text style={[s.cardTitle, { marginTop: 2 }]}>{ev.headline}</Text>
                <Text style={s.cardBody}>{ev.impact}</Text>
                {ev.source && <Text style={{ fontSize: 6.5, color: GRAY, marginTop: 2 }}>{l.source}: {ev.source}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* BANDARMOLOGY */}
        {(report.bandarmology?.signals?.length ?? 0) > 0 && report.bandarmology && (
          <View style={s.sectionWrap} break>
            <SectionHeading title={l.bandarmology} />
            <Text style={s.bodyText}>{report.bandarmology.summary}</Text>

            {(report.bandarmology.alertStocks?.length ?? 0) > 0 && report.bandarmology.alertStocks && (
              <View style={[s.cardBox, { backgroundColor: "#fef3c7", borderColor: "#fbbf24" }]}>
                <Text style={[s.cardTitle, { color: AMBER }]}>Alert Watchlist</Text>
                <Text style={[s.cardBody, { fontWeight: 600 }]}>{report.bandarmology.alertStocks.join(", ")}</Text>
              </View>
            )}

            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, { width: "7%" }]}>{l.ticker}</Text>
              <Text style={[s.tableHeaderCell, { width: "13%" }]}>{l.name}</Text>
              <Text style={[s.tableHeaderCell, { width: "10%" }]}>{l.phase}</Text>
              <Text style={[s.tableHeaderCell, { width: "7%" }]}>{l.confidence}</Text>
              <Text style={[s.tableHeaderCell, { width: "8%", textAlign: "right" }]}>{l.buyConc}</Text>
              <Text style={[s.tableHeaderCell, { width: "8%", textAlign: "right" }]}>{l.sellConc}</Text>
              <Text style={[s.tableHeaderCell, { width: "47%" }]}>Interpretation</Text>
            </View>
            {report.bandarmology.signals.map((sig: BandarmologySignalReport, i: number) => {
              const phaseColor =
                sig.phase === "accumulation" ? s.positive :
                sig.phase === "distribution" ? s.negative : {};
              return (
                <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
                  <Text style={[s.tableCellBold, { width: "7%" }]}>{sig.code}</Text>
                  <Text style={[s.tableCell, { width: "13%" }]}>{sig.name}</Text>
                  <Text style={[s.tableCell, { width: "10%", fontWeight: 600 }, phaseColor]}>{sig.phase}</Text>
                  <Text style={[s.tableCell, { width: "7%" }]}>{sig.confidence}</Text>
                  <Text style={[s.tableCell, { width: "8%", textAlign: "right" }]}>{sig.buyerConcentration?.toFixed(1)}%</Text>
                  <Text style={[s.tableCell, { width: "8%", textAlign: "right" }]}>{sig.sellerConcentration?.toFixed(1)}%</Text>
                  <Text style={[s.tableCell, { width: "47%", fontSize: 7, lineHeight: 1.4 }]}>{sig.interpretation}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* PRICE PREDICTIONS */}
        {report.pricePredictions?.length > 0 && (
          <View style={s.sectionWrap} break>
            <SectionHeading title={l.predictions} />
            {report.pricePredictions.map((pp: PricePrediction, i: number) => (
              <View key={i} style={s.cardBox} wrap={false}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={s.cardTitle}>{pp.code} -- {pp.name}</Text>
                  <Badge text={pp.confidence} sentiment={pp.confidence === "high" ? "bullish" : pp.confidence === "low" ? "bearish" : "neutral"} />
                </View>
                <View style={{ flexDirection: "row", gap: 16, marginBottom: 6 }}>
                  <View>
                    <Text style={{ fontSize: 6.5, color: GRAY, fontWeight: 600, textTransform: "uppercase" }}>{l.current}</Text>
                    <Text style={{ fontSize: 11, fontWeight: 700, color: NAVY }}>{fmtNum(pp.currentPrice)}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 6.5, color: GRAY, fontWeight: 600, textTransform: "uppercase" }}>{l.shortTarget}</Text>
                    <Text style={{ fontSize: 11, fontWeight: 700, color: GREEN }}>{fmtNum(pp.targetShortTerm)}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 6.5, color: GRAY, fontWeight: 600, textTransform: "uppercase" }}>{l.midTarget}</Text>
                    <Text style={{ fontSize: 11, fontWeight: 700, color: GREEN }}>{fmtNum(pp.targetMidTerm)}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 6.5, color: GRAY, fontWeight: 600, textTransform: "uppercase" }}>{l.stopLoss}</Text>
                    <Text style={{ fontSize: 11, fontWeight: 700, color: RED }}>{fmtNum(pp.stopLoss)}</Text>
                  </View>
                </View>
                <Text style={s.cardBody}>{pp.rationale}</Text>
                <Text style={{ fontSize: 6.5, color: GRAY, marginTop: 2 }}>Timeframe: {pp.timeframe}</Text>
              </View>
            ))}
          </View>
        )}

        {/* STOCK PICKS */}
        {report.stockPicks?.length > 0 && (
          <View style={s.sectionWrap} break>
            <SectionHeading title={l.stockPicks} />
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, { width: "7%" }]}>{l.ticker}</Text>
              <Text style={[s.tableHeaderCell, { width: "15%" }]}>{l.name}</Text>
              <Text style={[s.tableHeaderCell, { width: "8%" }]}>{l.action}</Text>
              <Text style={[s.tableHeaderCell, { width: "9%", textAlign: "right" }]}>{l.current}</Text>
              <Text style={[s.tableHeaderCell, { width: "9%", textAlign: "right" }]}>{l.target}</Text>
              <Text style={[s.tableHeaderCell, { width: "52%" }]}>{l.rationale}</Text>
            </View>
            {report.stockPicks.map((sp: StockPick, i: number) => {
              const actionColor =
                sp.action === "BUY" ? GREEN :
                sp.action === "SELL" ? RED :
                sp.action === "HOLD" ? AMBER : GRAY;
              return (
                <View key={i} wrap={false} style={{ marginBottom: 10, padding: 8, borderRadius: 4, backgroundColor: i % 2 === 1 ? "#f8f9fa" : "#ffffff", border: `0.5pt solid ${LIGHTGRAY}` }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ fontWeight: 700, fontSize: 10, color: NAVY }}>{sp.code}</Text>
                      <Text style={{ fontSize: 7.5, color: GRAY }}>{sp.name}</Text>
                      <View style={{ backgroundColor: `${actionColor}20`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 }}>
                        <Text style={{ fontSize: 7, fontWeight: 700, color: actionColor }}>{sp.action}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                      <Text style={{ fontSize: 7, color: GRAY }}>Current: <Text style={{ fontWeight: 700, color: NAVY }}>{fmtNum(sp.currentPrice)}</Text></Text>
                      {sp.targetPrice ? <Text style={{ fontSize: 7, color: GRAY }}>Target: <Text style={{ fontWeight: 700, color: ACCENT }}>{fmtNum(sp.targetPrice)}</Text></Text> : null}
                    </View>
                  </View>

                  {sp.fundamentals && (
                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
                      {[
                        { label: "PER", val: sp.fundamentals.per?.toFixed(1) },
                        { label: "PBV", val: sp.fundamentals.pbv?.toFixed(2) },
                        { label: "ROE", val: `${sp.fundamentals.roe?.toFixed(1)}%` },
                        { label: "D/E", val: sp.fundamentals.deRatio?.toFixed(2) },
                        { label: "EPS", val: fmtNum(sp.fundamentals.eps || 0) },
                      ].map((m) => (
                        <Text key={m.label} style={{ fontSize: 6.5, color: GRAY }}>{m.label}: <Text style={{ fontWeight: 700, color: NAVY }}>{m.val}</Text></Text>
                      ))}
                    </View>
                  )}

                  <Text style={{ fontSize: 7.5, lineHeight: 1.5, color: "#333", marginBottom: 3 }}>{sp.rationale}</Text>

                  {sp.technicalSetup && (
                    <Text style={{ fontSize: 7, lineHeight: 1.4, color: ACCENT, marginBottom: 2 }}>{sp.technicalSetup}</Text>
                  )}

                  {sp.riskAssessment && (
                    <Text style={{ fontSize: 7, lineHeight: 1.4, color: RED, marginBottom: 2 }}>Risk: {sp.riskAssessment}</Text>
                  )}

                  {sp.catalysts && sp.catalysts.length > 0 && (
                    <View style={{ flexDirection: "row", gap: 4, flexWrap: "wrap" }}>
                      {sp.catalysts.map((cat, ci) => (
                        <View key={ci} style={{ backgroundColor: "#e8eaf6", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2 }}>
                          <Text style={{ fontSize: 6, color: "#5c6bc0", fontWeight: 600 }}>{cat}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* MARKET OUTLOOK */}
        <View style={s.sectionWrap} break>
          <SectionHeading title={l.outlook} />
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
            <Badge text={report.marketOutlook.sentiment} sentiment={report.marketOutlook.sentiment} />
          </View>
          <Text style={s.bodyText}>{report.marketOutlook.summary}</Text>

          <View style={s.twoCol}>
            <View style={s.col}>
              <Text style={[s.cardTitle, { color: RED, marginBottom: 6 }]}>{l.risks}</Text>
              {report.marketOutlook.keyRisks?.map((r, i) => (
                <View key={i} style={s.bulletRow}>
                  <Text style={[s.bullet, { color: RED }]}>{"\u2022"}</Text>
                  <Text style={s.bulletText}>{r}</Text>
                </View>
              ))}
            </View>
            <View style={s.col}>
              <Text style={[s.cardTitle, { color: GREEN, marginBottom: 6 }]}>{l.catalysts}</Text>
              {report.marketOutlook.keyCatalysts?.map((c, i) => (
                <View key={i} style={s.bulletRow}>
                  <Text style={[s.bullet, { color: GREEN }]}>{"\u2022"}</Text>
                  <Text style={s.bulletText}>{c}</Text>
                </View>
              ))}
            </View>
          </View>

          {report.marketOutlook.shortTermForecast && (
            <View style={[s.cardBox, { marginTop: 8 }]}>
              <Text style={s.cardTitle}>{l.stForecast}</Text>
              <Text style={s.cardBody}>{report.marketOutlook.shortTermForecast}</Text>
            </View>
          )}
        </View>

        {/* NEWS DIGEST */}
        {report.newsSentiment?.length > 0 && (
          <View style={s.sectionWrap} break>
            <SectionHeading title={l.newsDigest} />
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, { width: "35%" }]}>{l.headline}</Text>
              <Text style={[s.tableHeaderCell, { width: "12%" }]}>{l.source}</Text>
              <Text style={[s.tableHeaderCell, { width: "8%" }]}>{l.sentiment}</Text>
              <Text style={[s.tableHeaderCell, { width: "45%" }]}>{l.impact}</Text>
            </View>
            {report.newsSentiment.map((n: NewsItem, i: number) => (
              <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
                <Text style={[s.tableCellBold, { width: "35%", fontSize: 7 }]}>{n.headline}</Text>
                <Text style={[s.tableCell, { width: "12%", fontSize: 7 }]}>{n.source}</Text>
                <Text style={[s.tableCell, { width: "8%" }, n.sentiment === "bullish" ? s.positive : n.sentiment === "bearish" ? s.negative : {}]}>
                  {n.sentiment}
                </Text>
                <Text style={[s.tableCell, { width: "45%", fontSize: 7, lineHeight: 1.4 }]}>{n.impact}</Text>
              </View>
            ))}
          </View>
        )}

        {/* DISCLAIMER */}
        <View style={s.disclaimer}>
          <Text style={s.disclaimerTitle}>{l.disclaimer}</Text>
          <Text style={s.disclaimerText}>{l.disclaimerBody}</Text>
        </View>
      </Page>
    </Document>
  );
}
