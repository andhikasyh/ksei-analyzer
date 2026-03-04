import { IDXFinancialRatio } from "./types";

export function clampScore(v: number): number {
  return Math.max(0, Math.min(100, v));
}

export function scoreROE(roe: number): number {
  if (roe <= 0) return clampScore(5 + roe);
  if (roe <= 20) return clampScore((roe / 20) * 85 + 15);
  return clampScore(95 + (roe - 20) * 0.25);
}

export function scoreROA(roa: number): number {
  if (roa <= 0) return clampScore(5 + roa * 2);
  if (roa <= 3) return clampScore((roa / 3) * 70 + 15);
  if (roa <= 10) return clampScore(85 + ((roa - 3) / 7) * 15);
  return 100;
}

export function scoreNPM(npm: number): number {
  if (npm <= 0) return clampScore(5 + npm * 0.5);
  if (npm <= 15) return clampScore((npm / 15) * 60 + 15);
  if (npm <= 40) return clampScore(75 + ((npm - 15) / 25) * 20);
  return clampScore(95 + (npm - 40) * 0.1);
}

export function scorePE(pe: number): number {
  if (pe < 0) return 8;
  if (pe <= 5) return clampScore(60 + pe * 6);
  if (pe <= 15) return clampScore(95 - (pe - 5) * 0.5);
  if (pe <= 30) return clampScore(90 - (pe - 15) * 2);
  if (pe <= 60) return clampScore(60 - (pe - 30) * 1.5);
  return 10;
}

export function scoreDE(de: number): number {
  if (de < 0) return 8;
  if (de <= 1) return clampScore(95 - de * 10);
  if (de <= 3) return clampScore(85 - (de - 1) * 15);
  if (de <= 7) return clampScore(55 - (de - 3) * 7);
  return clampScore(Math.max(8, 27 - (de - 7) * 2));
}

export function computeFinancialScore(fin: IDXFinancialRatio): number {
  const roe = parseFloat(fin.roe) || 0;
  const roa = parseFloat(fin.roa) || 0;
  const npm = parseFloat(fin.npm) || 0;
  const per = parseFloat(fin.per) || 0;
  const de = parseFloat(fin.de_ratio) || 0;

  const scores = [
    scoreROE(roe),
    scoreROA(roa),
    scoreNPM(npm),
    scorePE(per),
    scoreDE(de),
  ];

  return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
}

export interface OwnershipMetrics {
  investorCount: number;
  foreignPct: number;
  institutionalPct: number;
  topHolderPct: number;
}

export function scoreOwnership(m: OwnershipMetrics): { score: number; raw: string } {
  if (m.investorCount === 0) return { score: 0, raw: "No data" };

  const diversityScore = clampScore(Math.min(100, Math.log2(m.investorCount + 1) * 15));

  let foreignScore: number;
  if (m.foreignPct <= 5) foreignScore = 30 + m.foreignPct * 4;
  else if (m.foreignPct <= 35) foreignScore = 50 + ((m.foreignPct - 5) / 30) * 50;
  else foreignScore = clampScore(100 - (m.foreignPct - 35) * 0.8);

  const instScore = clampScore(m.institutionalPct * 2.5);

  let concScore: number;
  if (m.topHolderPct <= 30) concScore = 90;
  else if (m.topHolderPct <= 60) concScore = 90 - (m.topHolderPct - 30);
  else concScore = clampScore(60 - (m.topHolderPct - 60) * 1.5);

  const total = Math.round(
    diversityScore * 0.2 + foreignScore * 0.3 + instScore * 0.25 + concScore * 0.25
  );

  const parts = [];
  if (m.foreignPct > 0) parts.push(`${m.foreignPct.toFixed(0)}% foreign`);
  parts.push(`${m.investorCount} investors`);

  return { score: clampScore(total), raw: parts.join(", ") };
}

export interface RadarDataPoint {
  axis: string;
  value: number;
  raw: string;
}

export function buildRadarData(fin: IDXFinancialRatio, ownership?: OwnershipMetrics): RadarDataPoint[] {
  const roe = parseFloat(fin.roe) || 0;
  const roa = parseFloat(fin.roa) || 0;
  const npm = parseFloat(fin.npm) || 0;
  const per = parseFloat(fin.per) || 0;
  const de = parseFloat(fin.de_ratio) || 0;

  const data: RadarDataPoint[] = [
    { axis: "Profitability", value: scoreROE(roe), raw: `ROE ${roe.toFixed(2)}%` },
    { axis: "Efficiency", value: scoreROA(roa), raw: `ROA ${roa.toFixed(2)}%` },
    { axis: "Margins", value: scoreNPM(npm), raw: `NPM ${npm.toFixed(2)}%` },
    { axis: "Valuation", value: scorePE(per), raw: `P/E ${per.toFixed(2)}x` },
    { axis: "Stability", value: scoreDE(de), raw: `D/E ${de.toFixed(2)}` },
  ];

  if (ownership && ownership.investorCount > 0) {
    const ow = scoreOwnership(ownership);
    data.push({ axis: "Ownership", value: ow.score, raw: ow.raw });
  }

  return data;
}
