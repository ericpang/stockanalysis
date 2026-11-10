export type MarketCode = "US" | "CN" | "HK";

export type ChartInterval = "1hr" | "4hr" | "D" | "2D" | "W" | "M";

export type AnalysisMode =
  | "quick"
  | "deep-dive"
  | "valuation"
  | "statements"
  | "technical"
  | "peers"
  | "report"
  | "custom";

export interface FinancialStatementPeriod {
  period: string; // e.g., "FY2023" or "2026-Q3"
  asOfDate: string;
  // Core Income Statement (in billions of reporting currency)
  totalRevenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  grossMarginPct: number;
  operatingMarginPct: number;
  netMarginPct: number;
  // Core Balance Sheet (in billions of reporting currency)
  cashAndEquivalents: number;
  totalAssets: number;
  totalLiabilities: number;
  totalDebt: number;
  stockholdersEquity: number;
  netCash: number; // cashAndEquivalents - totalDebt
}

export type SentimentRating = "Bullish" | "Neutral" | "Bearish";
export type RiskLevel = "Low" | "Medium" | "High";
export type MetricAssessment =
  | "Undervalued"
  | "Attractive"
  | "Strong"
  | "Healthy"
  | "Fair"
  | "Moderate"
  | "Expensive"
  | "Caution";

export interface OHLCVPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma50: number;
  sma200: number;
  rsi14: number;
  macd: number;
  macdSignal: number;
  macdHist: number;
}

export interface TechnicalPattern {
  name: string;
  type: "Bullish" | "Bearish" | "Neutral";
  confidence: "High" | "Medium" | "Low";
  description: string;
  priceLevel?: number;
}

export interface ValuationMetrics {
  peRatio: number;
  pbRatio: number;
  psRatio: number;
  evEbitda: number;
  pegRatio: number;
}

export interface ProfitabilityMetrics {
  grossMargin: number; // percentage e.g. 46.2
  operatingMargin: number;
  netMargin: number;
  roe: number;
  roic: number;
  wacc: number;
}

export interface GrowthMetrics {
  revenueGrowthYoY: number; // percentage
  epsGrowthYoY: number;
  fcfGrowthYoY: number;
}

export interface FinancialHealthMetrics {
  debtToEquity: number;
  currentRatio: number;
  interestCoverage: number;
  fcfYield: number; // percentage
}

export interface IndustryBenchmarks {
  peRatio: number;
  pbRatio: number;
  psRatio: number;
  evEbitda: number;
  pegRatio: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  roe: number;
  roic: number;
  revenueGrowthYoY: number;
  epsGrowthYoY: number;
  fcfGrowthYoY: number;
  debtToEquity: number;
  currentRatio: number;
  interestCoverage: number;
  fcfYield: number;
}

export interface PeerStock {
  ticker: string;
  name: string;
  market: MarketCode;
  currencySymbol: string;
  price: number;
  changePercent: number;
  marketCap: string;
  peRatio: number;
  pbRatio: number;
  evEbitda: number;
  roe: number;
  revenueGrowthYoY: number;
  netMargin: number;
  debtToEquity: number;
}

export interface StockProfile {
  ticker: string;
  name: string;
  market: MarketCode;
  exchange: string;
  sector: string;
  currency: string;
  currencySymbol: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: string;
  updatedAt: string;
  rating: SentimentRating;
  riskLevel: RiskLevel;
  executiveSummary: string;
  businessOverview: string;
  financialPerformanceSummary: string;
  valuationSummary: string;
  priceTrendSummary: string;
  valuation: ValuationMetrics;
  profitability: ProfitabilityMetrics;
  growth: GrowthMetrics;
  health: FinancialHealthMetrics;
  industryBenchmarks: IndustryBenchmarks;
  technical: {
    support: number;
    resistance: number;
    low52Week: number;
    high52Week: number;
    sma50: number;
    sma200: number;
    rsi14: number;
    macd: number;
    macdSignal: number;
    macdHist: number;
    trendSignal: "Golden Cross" | "Death Cross" | "Uptrend" | "Downtrend" | "Consolidation";
    patterns: TechnicalPattern[];
    history: OHLCVPoint[];
  };
  peers: PeerStock[];
  riskFactors: string[];
  bullCase: string[];
  bearCase: string[];
}

