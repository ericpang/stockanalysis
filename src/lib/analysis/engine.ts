import {
  ChartInterval,
  FinancialStatementPeriod,
  MetricAssessment,
  OHLCVPoint,
  RiskLevel,
  SentimentRating,
  StockProfile,
} from "../types/stock";

export interface VolumeProfileBin {
  priceLow: number;
  priceHigh: number;
  priceMid: number;
  upVolume: number;
  downVolume: number;
  totalVolume: number;
  volumePct: number; // 0 to 100 relative to max bin
  isPOC: boolean;
  inValueArea: boolean;
}

export interface KeyPriceLevel {
  code: "R2" | "R1" | "POC" | "VAH" | "VAL" | "S1" | "S2";
  label: string;
  price: number;
  distancePct: number;
  type: "Resistance" | "Support" | "VolumeNode";
  strength: "Major" | "Immediate" | "Value Area";
}

export interface VolumeProfileAnalysis {
  bins: VolumeProfileBin[];
  poc: number;
  vah: number;
  val: number;
  totalVolume: number;
  buyVolumePct: number;
  r1: number;
  r2: number;
  s1: number;
  s2: number;
  keyLevels: KeyPriceLevel[];
}

export interface EvaluatedMetric {
  key: string;
  label: string;
  category: "Valuation" | "Profitability" | "Growth" | "Financial Health";
  formula: string;
  benchmarkRule: string;
  rawValue: number;
  formattedValue: string;
  industryValue: number;
  formattedIndustry: string;
  vsIndustryPercent: number;
  assessment: MetricAssessment;
  interpretation: string;
  isPositiveComparison: boolean;
}

export function evaluatePE(pe: number): {
  assessment: MetricAssessment;
  interpretation: string;
} {
  if (pe <= 0) {
    return { assessment: "Caution", interpretation: "Negative earnings (unprofitable)" };
  }
  if (pe < 15) {
    return { assessment: "Undervalued", interpretation: "<15 undervalued relative to earnings" };
  }
  if (pe <= 25) {
    return { assessment: "Fair", interpretation: "15–25 fair market multiple" };
  }
  return { assessment: "Expensive", interpretation: ">25 premium / expensive valuation" };
}

export function evaluatePB(pb: number): {
  assessment: MetricAssessment;
  interpretation: string;
} {
  if (pb < 1) {
    return { assessment: "Undervalued", interpretation: "<1 potential deep value below book" };
  }
  if (pb <= 3) {
    return { assessment: "Fair", interpretation: "1–3 balanced asset valuation" };
  }
  return { assessment: "Expensive", interpretation: ">3 high growth / intangibles priced in" };
}

export function evaluatePS(ps: number, industryPs: number): {
  assessment: MetricAssessment;
  interpretation: string;
} {
  if (ps < industryPs * 0.85) {
    return { assessment: "Attractive", interpretation: "Discounted revenue multiple vs peers" };
  }
  if (ps <= industryPs * 1.25) {
    return { assessment: "Fair", interpretation: "In line with sector revenue multiple" };
  }
  return { assessment: "Expensive", interpretation: "Rich revenue valuation vs peers" };
}

export function evaluateEvEbitda(evEbitda: number): {
  assessment: MetricAssessment;
  interpretation: string;
} {
  if (evEbitda < 10) {
    return { assessment: "Attractive", interpretation: "<10 attractive enterprise cash multiple" };
  }
  if (evEbitda <= 15) {
    return { assessment: "Fair", interpretation: "10–15 standard cash flow multiple" };
  }
  return { assessment: "Expensive", interpretation: ">15 expensive EV/EBITDA multiple" };
}

export function evaluatePEG(peg: number): {
  assessment: MetricAssessment;
  interpretation: string;
} {
  if (peg <= 0) {
    return { assessment: "Caution", interpretation: "Negative growth or earnings" };
  }
  if (peg < 1) {
    return { assessment: "Undervalued", interpretation: "<1 undervalued relative to growth" };
  }
  if (peg <= 1.8) {
    return { assessment: "Fair", interpretation: "1.0–1.8 growth reasonably priced" };
  }
  return { assessment: "Expensive", interpretation: ">1.8 premium paid for growth rate" };
}

export function evaluateAllMetrics(stock: StockProfile): EvaluatedMetric[] {
  const { valuation, profitability, growth, health, industryBenchmarks: ind } = stock;

  const pctDiff = (val: number, bench: number) =>
    bench !== 0 ? ((val - bench) / Math.abs(bench)) * 100 : 0;

  const peEval = evaluatePE(valuation.peRatio);
  const pbEval = evaluatePB(valuation.pbRatio);
  const psEval = evaluatePS(valuation.psRatio, ind.psRatio);
  const evEval = evaluateEvEbitda(valuation.evEbitda);
  const pegEval = evaluatePEG(valuation.pegRatio);

  const grossEval: { assessment: MetricAssessment; interpretation: string } =
    profitability.grossMargin > 40
      ? { assessment: "Strong", interpretation: ">40% strong pricing power & moat" }
      : profitability.grossMargin >= 25
      ? { assessment: "Moderate", interpretation: "25–40% moderate gross margin" }
      : { assessment: "Caution", interpretation: "<25% thin gross margin pressure" };

  const opEval: { assessment: MetricAssessment; interpretation: string } =
    profitability.operatingMargin > 15
      ? { assessment: "Strong", interpretation: ">15% efficient operating execution" }
      : profitability.operatingMargin >= 8
      ? { assessment: "Moderate", interpretation: "8–15% standard operating margin" }
      : { assessment: "Caution", interpretation: "<8% tight operating leverage" };

  const netEval: { assessment: MetricAssessment; interpretation: string } =
    profitability.netMargin > 10
      ? { assessment: "Healthy", interpretation: ">10% healthy bottom-line profitability" }
      : profitability.netMargin >= 5
      ? { assessment: "Moderate", interpretation: "5–10% moderate net profitability" }
      : { assessment: "Caution", interpretation: "<5% low net margin buffer" };

  const roeEval: { assessment: MetricAssessment; interpretation: string } =
    profitability.roe > 15
      ? { assessment: "Strong", interpretation: ">15% strong capital efficiency" }
      : profitability.roe >= 10
      ? { assessment: "Moderate", interpretation: "10–15% adequate equity return" }
      : { assessment: "Caution", interpretation: "<10% sub-par return on equity" };

  const roicSpread = profitability.roic - profitability.wacc;
  const roicEval: { assessment: MetricAssessment; interpretation: string } =
    roicSpread > 2
      ? {
          assessment: "Strong",
          interpretation: `ROIC exceeds WACC (${profitability.wacc.toFixed(1)}%) — value creation`,
        }
      : roicSpread >= 0
      ? {
          assessment: "Fair",
          interpretation: `ROIC matches WACC (${profitability.wacc.toFixed(1)}%)`,
        }
      : {
          assessment: "Caution",
          interpretation: `ROIC below WACC (${profitability.wacc.toFixed(1)}%) — value erosion`,
        };

  const revGrowthEval: { assessment: MetricAssessment; interpretation: string } =
    growth.revenueGrowthYoY > 10
      ? { assessment: "Strong", interpretation: ">10% YoY indicates strong top-line demand" }
      : growth.revenueGrowthYoY >= 3
      ? { assessment: "Moderate", interpretation: "3–10% steady mature top-line expansion" }
      : { assessment: "Caution", interpretation: "<3% slowing top-line growth" };

  const hasOperatingLeverage = growth.epsGrowthYoY > growth.revenueGrowthYoY;
  const epsGrowthEval: { assessment: MetricAssessment; interpretation: string } =
    hasOperatingLeverage && growth.epsGrowthYoY > 10
      ? {
          assessment: "Strong",
          interpretation: "Outpaces revenue growth (positive operating leverage)",
        }
      : growth.epsGrowthYoY > 0
      ? {
          assessment: "Moderate",
          interpretation: "Positive earnings expansion",
        }
      : {
          assessment: "Caution",
          interpretation: "Contracting EPS YoY",
        };

  const fcfGrowthEval: { assessment: MetricAssessment; interpretation: string } =
    growth.fcfGrowthYoY > 10
      ? { assessment: "Strong", interpretation: "Strong sustainable cash flow expansion" }
      : growth.fcfGrowthYoY >= 0
      ? { assessment: "Healthy", interpretation: "Positive free cash flow growth" }
      : { assessment: "Caution", interpretation: "Free cash flow contraction YoY" };

  const deEval: { assessment: MetricAssessment; interpretation: string } =
    health.debtToEquity < 1
      ? { assessment: "Healthy", interpretation: "<1.0 conservative leverage profile" }
      : health.debtToEquity <= 2
      ? { assessment: "Moderate", interpretation: "1.0–2.0 manageable leverage" }
      : { assessment: "Caution", interpretation: ">2.0 elevated debt burden" };

  const crEval: { assessment: MetricAssessment; interpretation: string } =
    health.currentRatio > 1.5
      ? { assessment: "Healthy", interpretation: ">1.5 comfortable short-term liquidity" }
      : health.currentRatio >= 1.0
      ? { assessment: "Moderate", interpretation: "1.0–1.5 adequate working capital" }
      : { assessment: "Caution", interpretation: "<1.0 tight near-term liquidity" };

  const icEval: { assessment: MetricAssessment; interpretation: string } =
    health.interestCoverage > 5
      ? { assessment: "Healthy", interpretation: ">5x comfortable debt service coverage" }
      : health.interestCoverage >= 2.5
      ? { assessment: "Moderate", interpretation: "2.5–5x moderate interest coverage" }
      : { assessment: "Caution", interpretation: "<2.5x tight interest coverage" };

  const fcfYieldEval: { assessment: MetricAssessment; interpretation: string } =
    health.fcfYield > 5
      ? { assessment: "Attractive", interpretation: ">5% attractive cash flow yield" }
      : health.fcfYield >= 2.5
      ? { assessment: "Fair", interpretation: "2.5–5% standard FCF yield" }
      : { assessment: "Expensive", interpretation: "<2.5% low cash yield vs market cap" };

  return [
    {
      key: "peRatio",
      label: "P/E Ratio",
      category: "Valuation",
      formula: "Price / EPS",
      benchmarkRule: "<15 undervalued, >25 expensive",
      rawValue: valuation.peRatio,
      formattedValue: `${valuation.peRatio.toFixed(1)}x`,
      industryValue: ind.peRatio,
      formattedIndustry: `${ind.peRatio.toFixed(1)}x`,
      vsIndustryPercent: pctDiff(valuation.peRatio, ind.peRatio),
      assessment: peEval.assessment,
      interpretation: peEval.interpretation,
      isPositiveComparison: valuation.peRatio <= ind.peRatio,
    },
    {
      key: "pbRatio",
      label: "P/B Ratio",
      category: "Valuation",
      formula: "Price / Book Value",
      benchmarkRule: "<1 potential value, >3 growth priced in",
      rawValue: valuation.pbRatio,
      formattedValue: `${valuation.pbRatio.toFixed(2)}x`,
      industryValue: ind.pbRatio,
      formattedIndustry: `${ind.pbRatio.toFixed(2)}x`,
      vsIndustryPercent: pctDiff(valuation.pbRatio, ind.pbRatio),
      assessment: pbEval.assessment,
      interpretation: pbEval.interpretation,
      isPositiveComparison: valuation.pbRatio <= ind.pbRatio,
    },
    {
      key: "psRatio",
      label: "P/S Ratio",
      category: "Valuation",
      formula: "Price / Revenue",
      benchmarkRule: "Useful for revenue multiple comparison",
      rawValue: valuation.psRatio,
      formattedValue: `${valuation.psRatio.toFixed(2)}x`,
      industryValue: ind.psRatio,
      formattedIndustry: `${ind.psRatio.toFixed(2)}x`,
      vsIndustryPercent: pctDiff(valuation.psRatio, ind.psRatio),
      assessment: psEval.assessment,
      interpretation: psEval.interpretation,
      isPositiveComparison: valuation.psRatio <= ind.psRatio,
    },
    {
      key: "evEbitda",
      label: "EV/EBITDA",
      category: "Valuation",
      formula: "Enterprise Value / EBITDA",
      benchmarkRule: "<10 attractive, >15 expensive",
      rawValue: valuation.evEbitda,
      formattedValue: `${valuation.evEbitda.toFixed(1)}x`,
      industryValue: ind.evEbitda,
      formattedIndustry: `${ind.evEbitda.toFixed(1)}x`,
      vsIndustryPercent: pctDiff(valuation.evEbitda, ind.evEbitda),
      assessment: evEval.assessment,
      interpretation: evEval.interpretation,
      isPositiveComparison: valuation.evEbitda <= ind.evEbitda,
    },
    {
      key: "pegRatio",
      label: "PEG Ratio",
      category: "Valuation",
      formula: "P/E / Growth Rate",
      benchmarkRule: "<1 undervalued relative to growth",
      rawValue: valuation.pegRatio,
      formattedValue: `${valuation.pegRatio.toFixed(2)}x`,
      industryValue: ind.pegRatio,
      formattedIndustry: `${ind.pegRatio.toFixed(2)}x`,
      vsIndustryPercent: pctDiff(valuation.pegRatio, ind.pegRatio),
      assessment: pegEval.assessment,
      interpretation: pegEval.interpretation,
      isPositiveComparison: valuation.pegRatio <= ind.pegRatio,
    },
    {
      key: "grossMargin",
      label: "Gross Margin",
      category: "Profitability",
      formula: "Gross Profit / Revenue",
      benchmarkRule: ">40% strong pricing power",
      rawValue: profitability.grossMargin,
      formattedValue: `${profitability.grossMargin.toFixed(1)}%`,
      industryValue: ind.grossMargin,
      formattedIndustry: `${ind.grossMargin.toFixed(1)}%`,
      vsIndustryPercent: pctDiff(profitability.grossMargin, ind.grossMargin),
      assessment: grossEval.assessment,
      interpretation: grossEval.interpretation,
      isPositiveComparison: profitability.grossMargin >= ind.grossMargin,
    },
    {
      key: "operatingMargin",
      label: "Operating Margin",
      category: "Profitability",
      formula: "Operating Income / Revenue",
      benchmarkRule: ">15% efficient operations",
      rawValue: profitability.operatingMargin,
      formattedValue: `${profitability.operatingMargin.toFixed(1)}%`,
      industryValue: ind.operatingMargin,
      formattedIndustry: `${ind.operatingMargin.toFixed(1)}%`,
      vsIndustryPercent: pctDiff(profitability.operatingMargin, ind.operatingMargin),
      assessment: opEval.assessment,
      interpretation: opEval.interpretation,
      isPositiveComparison: profitability.operatingMargin >= ind.operatingMargin,
    },
    {
      key: "netMargin",
      label: "Net Margin",
      category: "Profitability",
      formula: "Net Income / Revenue",
      benchmarkRule: ">10% healthy profitability",
      rawValue: profitability.netMargin,
      formattedValue: `${profitability.netMargin.toFixed(1)}%`,
      industryValue: ind.netMargin,
      formattedIndustry: `${ind.netMargin.toFixed(1)}%`,
      vsIndustryPercent: pctDiff(profitability.netMargin, ind.netMargin),
      assessment: netEval.assessment,
      interpretation: netEval.interpretation,
      isPositiveComparison: profitability.netMargin >= ind.netMargin,
    },
    {
      key: "roe",
      label: "ROE",
      category: "Profitability",
      formula: "Net Income / Shareholder Equity",
      benchmarkRule: ">15% good capital efficiency",
      rawValue: profitability.roe,
      formattedValue: `${profitability.roe.toFixed(1)}%`,
      industryValue: ind.roe,
      formattedIndustry: `${ind.roe.toFixed(1)}%`,
      vsIndustryPercent: pctDiff(profitability.roe, ind.roe),
      assessment: roeEval.assessment,
      interpretation: roeEval.interpretation,
      isPositiveComparison: profitability.roe >= ind.roe,
    },
    {
      key: "roic",
      label: "ROIC",
      category: "Profitability",
      formula: "NOPAT / Invested Capital",
      benchmarkRule: ">WACC value creation",
      rawValue: profitability.roic,
      formattedValue: `${profitability.roic.toFixed(1)}%`,
      industryValue: ind.roic,
      formattedIndustry: `${ind.roic.toFixed(1)}%`,
      vsIndustryPercent: pctDiff(profitability.roic, ind.roic),
      assessment: roicEval.assessment,
      interpretation: roicEval.interpretation,
      isPositiveComparison: profitability.roic >= ind.roic,
    },
    {
      key: "revenueGrowthYoY",
      label: "Revenue Growth",
      category: "Growth",
      formula: "(Rev_t - Rev_t-1) / Rev_t-1",
      benchmarkRule: ">10% YoY indicates strong demand",
      rawValue: growth.revenueGrowthYoY,
      formattedValue: `${growth.revenueGrowthYoY >= 0 ? "+" : ""}${growth.revenueGrowthYoY.toFixed(1)}%`,
      industryValue: ind.revenueGrowthYoY,
      formattedIndustry: `${ind.revenueGrowthYoY.toFixed(1)}%`,
      vsIndustryPercent: pctDiff(growth.revenueGrowthYoY, ind.revenueGrowthYoY),
      assessment: revGrowthEval.assessment,
      interpretation: revGrowthEval.interpretation,
      isPositiveComparison: growth.revenueGrowthYoY >= ind.revenueGrowthYoY,
    },
    {
      key: "epsGrowthYoY",
      label: "EPS Growth",
      category: "Growth",
      formula: "(EPS_t - EPS_t-1) / EPS_t-1",
      benchmarkRule: "Should outpace revenue (operating leverage)",
      rawValue: growth.epsGrowthYoY,
      formattedValue: `${growth.epsGrowthYoY >= 0 ? "+" : ""}${growth.epsGrowthYoY.toFixed(1)}%`,
      industryValue: ind.epsGrowthYoY,
      formattedIndustry: `${ind.epsGrowthYoY.toFixed(1)}%`,
      vsIndustryPercent: pctDiff(growth.epsGrowthYoY, ind.epsGrowthYoY),
      assessment: epsGrowthEval.assessment,
      interpretation: epsGrowthEval.interpretation,
      isPositiveComparison: growth.epsGrowthYoY >= ind.epsGrowthYoY,
    },
    {
      key: "fcfGrowthYoY",
      label: "FCF Growth",
      category: "Growth",
      formula: "(FCF_t - FCF_t-1) / FCF_t-1",
      benchmarkRule: "Sustainable cash growth driver",
      rawValue: growth.fcfGrowthYoY,
      formattedValue: `${growth.fcfGrowthYoY >= 0 ? "+" : ""}${growth.fcfGrowthYoY.toFixed(1)}%`,
      industryValue: ind.fcfGrowthYoY,
      formattedIndustry: `${ind.fcfGrowthYoY.toFixed(1)}%`,
      vsIndustryPercent: pctDiff(growth.fcfGrowthYoY, ind.fcfGrowthYoY),
      assessment: fcfGrowthEval.assessment,
      interpretation: fcfGrowthEval.interpretation,
      isPositiveComparison: growth.fcfGrowthYoY >= ind.fcfGrowthYoY,
    },
    {
      key: "debtToEquity",
      label: "Debt/Equity",
      category: "Financial Health",
      formula: "Total Debt / Shareholder Equity",
      benchmarkRule: "<1.0 for most industries",
      rawValue: health.debtToEquity,
      formattedValue: `${health.debtToEquity.toFixed(2)}x`,
      industryValue: ind.debtToEquity,
      formattedIndustry: `${ind.debtToEquity.toFixed(2)}x`,
      vsIndustryPercent: pctDiff(health.debtToEquity, ind.debtToEquity),
      assessment: deEval.assessment,
      interpretation: deEval.interpretation,
      isPositiveComparison: health.debtToEquity <= ind.debtToEquity,
    },
    {
      key: "currentRatio",
      label: "Current Ratio",
      category: "Financial Health",
      formula: "Current Assets / Current Liabilities",
      benchmarkRule: ">1.5 healthy liquidity",
      rawValue: health.currentRatio,
      formattedValue: `${health.currentRatio.toFixed(2)}x`,
      industryValue: ind.currentRatio,
      formattedIndustry: `${ind.currentRatio.toFixed(2)}x`,
      vsIndustryPercent: pctDiff(health.currentRatio, ind.currentRatio),
      assessment: crEval.assessment,
      interpretation: crEval.interpretation,
      isPositiveComparison: health.currentRatio >= ind.currentRatio,
    },
    {
      key: "interestCoverage",
      label: "Interest Coverage",
      category: "Financial Health",
      formula: "EBIT / Interest Expense",
      benchmarkRule: ">5x comfortable coverage",
      rawValue: health.interestCoverage,
      formattedValue: `${health.interestCoverage.toFixed(1)}x`,
      industryValue: ind.interestCoverage,
      formattedIndustry: `${ind.interestCoverage.toFixed(1)}x`,
      vsIndustryPercent: pctDiff(health.interestCoverage, ind.interestCoverage),
      assessment: icEval.assessment,
      interpretation: icEval.interpretation,
      isPositiveComparison: health.interestCoverage >= ind.interestCoverage,
    },
    {
      key: "fcfYield",
      label: "FCF Yield",
      category: "Financial Health",
      formula: "Free Cash Flow / Market Cap",
      benchmarkRule: ">5% attractive cash yield",
      rawValue: health.fcfYield,
      formattedValue: `${health.fcfYield.toFixed(1)}%`,
      industryValue: ind.fcfYield,
      formattedIndustry: `${ind.fcfYield.toFixed(1)}%`,
      vsIndustryPercent: pctDiff(health.fcfYield, ind.fcfYield),
      assessment: fcfYieldEval.assessment,
      interpretation: fcfYieldEval.interpretation,
      isPositiveComparison: health.fcfYield >= ind.fcfYield,
    },
  ];
}

export function interpretRSI(rsi: number): {
  zone: "Overbought" | "Oversold" | "Bullish Momentum" | "Neutral";
  description: string;
} {
  if (rsi > 70) {
    return {
      zone: "Overbought",
      description: "RSI > 70 indicates extended buying momentum; watch for pullback or consolidation.",
    };
  }
  if (rsi < 30) {
    return {
      zone: "Oversold",
      description: "RSI < 30 signals oversold conditions; potential mean-reversion bounce setup.",
    };
  }
  if (rsi >= 55) {
    return {
      zone: "Bullish Momentum",
      description: "RSI between 55–70 reflects constructive upward momentum without extreme exhaustion.",
    };
  }
  return {
    zone: "Neutral",
    description: "RSI between 30–55 indicates balanced two-way trading momentum.",
  };
}

export function generateMarkdownReport(stock: StockProfile): string {
  const evaluated = evaluateAllMetrics(stock);
  const keyMetricKeys = [
    "peRatio",
    "pbRatio",
    "roe",
    "revenueGrowthYoY",
    "netMargin",
    "debtToEquity",
  ];
  const glanceMetrics = evaluated.filter((m) => keyMetricKeys.includes(m.key));

  const formatDelta = (pct: number) =>
    `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;

  const rows = glanceMetrics
    .map(
      (m) =>
        `| ${m.label} | ${m.formattedValue} | ${formatDelta(m.vsIndustryPercent)} | ${m.assessment} (${m.interpretation}) |`
    )
    .join("\n");

  const sym = stock.currencySymbol;
  const vpvr = computeVolumeProfileAndLevels(
    stock.technical.history,
    stock.price,
    20
  );
  const intrinsic = computeIntrinsicValuation(stock);
  const intrinsicModelRows = intrinsic.models
    .filter((m) => m.weight > 0)
    .map(
      (m) =>
        `| ${m.name} | ${m.weight}% | ${sym}${m.fairValue.toFixed(2)} | ${sym}${m.bearValue.toFixed(0)} – ${sym}${m.bullValue.toFixed(0)} | ${m.upsidePct >= 0 ? "+" : ""}${m.upsidePct.toFixed(1)}% |`
    )
    .join("\n");

  return `# Stock Analysis Report: ${stock.ticker}

**Company**: ${stock.name}
**Market**: ${stock.exchange} (${stock.market})
**Sector**: ${stock.sector}
**Analysis Date**: ${stock.updatedAt}

---

## Executive Summary

${stock.executiveSummary}

**Rating**: ${stock.rating}
**Risk Level**: ${stock.riskLevel}

---

## Key Metrics at a Glance

| Metric | Value | vs Industry | Assessment |
|--------|-------|-------------|------------|
${rows}

---

## Fundamental Analysis

### Business Overview
${stock.businessOverview}

### Financial Performance
${stock.financialPerformanceSummary}

### Valuation Assessment
${stock.valuationSummary}

### Sector-Adaptive Intrinsic / Fair Value (${intrinsic.archetypeName})
- **Blended Fair Value**: **${sym}${intrinsic.blendedFairValue.toFixed(2)}** vs Live Price **${sym}${stock.price.toFixed(2)}** (**${intrinsic.upsidePct >= 0 ? "+" : ""}${intrinsic.upsidePct.toFixed(1)}%** Implied Upside · **${intrinsic.verdict}**)
- **Bear – Bull Fair Value Range**: ${sym}${intrinsic.blendedBearValue.toFixed(2)} – ${sym}${intrinsic.blendedBullValue.toFixed(2)} (Margin of Safety: ${intrinsic.marginOfSafetyPct >= 0 ? "+" : ""}${intrinsic.marginOfSafetyPct.toFixed(1)}%)
- **Methodology Rationale**: ${intrinsic.sectorRationale}

| Valuation Model | Sector Weight | Base Fair Value | Bear – Bull Range | Implied Upside |
|-----------------|---------------|-----------------|-------------------|----------------|
${intrinsicModelRows}

---

## Technical Analysis

### Price Trend
${stock.priceTrendSummary}

### Key Levels & Volume Profile (VPVR)
- **Immediate Support (S1)**: ${sym}${vpvr.s1.toFixed(2)} | **Major Support (S2)**: ${sym}${vpvr.s2.toFixed(2)}
- **Immediate Resistance (R1)**: ${sym}${vpvr.r1.toFixed(2)} | **Major Resistance (R2)**: ${sym}${vpvr.r2.toFixed(2)}
- **Point of Control (POC)**: ${sym}${vpvr.poc.toFixed(2)} | **70% Value Area**: ${sym}${vpvr.val.toFixed(2)} – ${sym}${vpvr.vah.toFixed(2)} (${vpvr.buyVolumePct.toFixed(1)}% Buy Volume)
- **52-week Range**: ${sym}${stock.technical.low52Week.toFixed(2)} - ${sym}${stock.technical.high52Week.toFixed(2)}
- **Moving Averages**: 50-DMA (${sym}${stock.technical.sma50.toFixed(2)}) | 200-DMA (${sym}${stock.technical.sma200.toFixed(2)}) — ${stock.technical.trendSignal}
- **Momentum**: RSI(14) at ${stock.technical.rsi14.toFixed(1)} | MACD at ${stock.technical.macd.toFixed(2)} (Signal: ${stock.technical.macdSignal.toFixed(2)})

---

## Risk Factors

${stock.riskFactors.map((r, i) => `${i + 1}. ${r}`).join("\n")}

---

## Investment Thesis

### Bull Case
${stock.bullCase.map((b) => `- ${b}`).join("\n")}

### Bear Case
${stock.bearCase.map((b) => `- ${b}`).join("\n")}

---

## Disclaimer

This analysis is for informational purposes only and does not constitute investment advice. Past performance does not guarantee future results.
`;
}

export function generateSyntheticHistory(
  basePrice: number,
  volatility: number,
  trendBias: number,
  seed: number
): OHLCVPoint[] {
  const points: OHLCVPoint[] = [];
  const totalDays = 220;
  let price = basePrice * (1 - trendBias * 0.22);
  let s = seed;

  const nextRand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };

  const closes: number[] = [];
  const rawDays: { date: string; open: number; high: number; low: number; close: number; volume: number }[] = [];

  const endDate = new Date("2026-11-09T00:00:00Z");

  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - Math.floor(i * 1.4));
    const dateStr = d.toISOString().split("T")[0];

    const dailyReturn = (nextRand() - 0.485 + trendBias * 0.004) * volatility;
    const open = price;
    const close = Math.max(price * (1 + dailyReturn), basePrice * 0.35);
    const intradaySpread = Math.abs(close - open) + price * volatility * (0.3 + nextRand() * 0.6);
    const high = Math.max(open, close) + intradaySpread * 0.5;
    const low = Math.max(Math.min(open, close) - intradaySpread * 0.5, basePrice * 0.25);
    const volume = Math.round((18_000_000 + nextRand() * 45_000_000) * (1 + Math.abs(dailyReturn) * 15));

    price = close;
    closes.push(close);
    rawDays.push({ date: dateStr, open, high, low, close, volume });
  }

  // Scale so the final close matches basePrice exactly
  const scale = basePrice / rawDays[rawDays.length - 1].close;
  for (let i = 0; i < rawDays.length; i++) {
    rawDays[i].open = Number((rawDays[i].open * scale).toFixed(2));
    rawDays[i].high = Number((rawDays[i].high * scale).toFixed(2));
    rawDays[i].low = Number((rawDays[i].low * scale).toFixed(2));
    rawDays[i].close = Number((rawDays[i].close * scale).toFixed(2));
    closes[i] = rawDays[i].close;
  }

  // Compute SMA50, SMA200, EMA12, EMA26, MACD, RSI14
  let ema12 = closes[0];
  let ema26 = closes[0];
  let macdSignal = 0;
  const k12 = 2 / 13;
  const k26 = 2 / 27;
  const k9 = 2 / 10;

  for (let i = 0; i < rawDays.length; i++) {
    const c = closes[i];
    ema12 = c * k12 + ema12 * (1 - k12);
    ema26 = c * k26 + ema26 * (1 - k26);
    const macd = ema12 - ema26;
    macdSignal = i === 0 ? macd : macd * k9 + macdSignal * (1 - k9);
    const macdHist = macd - macdSignal;

    const slice50 = closes.slice(Math.max(0, i - 49), i + 1);
    const sma50 = slice50.reduce((a, b) => a + b, 0) / slice50.length;

    const slice200 = closes.slice(Math.max(0, i - 199), i + 1);
    const sma200 = slice200.reduce((a, b) => a + b, 0) / slice200.length;

    // 14-day RSI
    let gains = 0;
    let losses = 0;
    const startIdx = Math.max(1, i - 13);
    for (let j = startIdx; j <= i; j++) {
      const diff = closes[j] - closes[j - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }
    const rs = losses === 0 ? 100 : gains / losses;
    const rsi14 = losses === 0 ? 75 : 100 - 100 / (1 + rs);

    points.push({
      ...rawDays[i],
      sma50: Number(sma50.toFixed(2)),
      sma200: Number(sma200.toFixed(2)),
      rsi14: Number(rsi14.toFixed(1)),
      macd: Number(macd.toFixed(2)),
      macdSignal: Number(macdSignal.toFixed(2)),
      macdHist: Number(macdHist.toFixed(2)),
    });
  }

  // Return last 90 trading sessions for crisp charting with authentic 200-day moving averages
  return points.slice(-90);
}

export function computeIndicatorsFromBars(
  rawBars: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>
): OHLCVPoint[] {
  if (rawBars.length === 0) return [];
  const points: OHLCVPoint[] = [];
  const closes = rawBars.map((b) => b.close);

  let ema12 = closes[0];
  let ema26 = closes[0];
  let macdSignal = 0;
  const k12 = 2 / 13;
  const k26 = 2 / 27;
  const k9 = 2 / 10;

  for (let i = 0; i < rawBars.length; i++) {
    const c = closes[i];
    ema12 = c * k12 + ema12 * (1 - k12);
    ema26 = c * k26 + ema26 * (1 - k26);
    const macd = ema12 - ema26;
    macdSignal = i === 0 ? macd : macd * k9 + macdSignal * (1 - k9);
    const macdHist = macd - macdSignal;

    const slice50 = closes.slice(Math.max(0, i - 49), i + 1);
    const sma50 = slice50.reduce((a, b) => a + b, 0) / slice50.length;

    const slice200 = closes.slice(Math.max(0, i - 199), i + 1);
    const sma200 = slice200.reduce((a, b) => a + b, 0) / slice200.length;

    let gains = 0;
    let losses = 0;
    const startIdx = Math.max(1, i - 13);
    for (let j = startIdx; j <= i; j++) {
      const diff = closes[j] - closes[j - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }
    const rs = losses === 0 ? 100 : gains / losses;
    const rsi14 = losses === 0 ? 75 : 100 - 100 / (1 + rs);

    points.push({
      date: rawBars[i].date,
      open: Number(rawBars[i].open.toFixed(2)),
      high: Number(rawBars[i].high.toFixed(2)),
      low: Number(rawBars[i].low.toFixed(2)),
      close: Number(rawBars[i].close.toFixed(2)),
      volume: Math.round(rawBars[i].volume),
      sma50: Number(sma50.toFixed(2)),
      sma200: Number(sma200.toFixed(2)),
      rsi14: Number(rsi14.toFixed(1)),
      macd: Number(macd.toFixed(2)),
      macdSignal: Number(macdSignal.toFixed(2)),
      macdHist: Number(macdHist.toFixed(2)),
    });
  }

  return points.slice(-90);
}

export function deriveCustomStockRating(
  pe: number,
  peg: number,
  roe: number,
  revGrowth: number,
  debtToEquity: number,
  rsi: number
): { rating: SentimentRating; riskLevel: RiskLevel } {
  let score = 0;
  if (pe > 0 && pe < 20) score += 1;
  else if (pe > 35 || pe <= 0) score -= 1;

  if (peg > 0 && peg <= 1.2) score += 1;
  else if (peg > 2.2) score -= 1;

  if (roe >= 15) score += 1;
  else if (roe < 8) score -= 1;

  if (revGrowth >= 10) score += 1;
  else if (revGrowth < 0) score -= 1;

  if (rsi >= 45 && rsi <= 68) score += 0.5;
  else if (rsi > 75) score -= 0.5;

  const rating: SentimentRating =
    score >= 2 ? "Bullish" : score <= -1 ? "Bearish" : "Neutral";

  const riskLevel: RiskLevel =
    debtToEquity > 1.8 || pe > 45 || pe <= 0
      ? "High"
      : debtToEquity < 0.8 && roe >= 15
      ? "Low"
      : "Medium";

  return { rating, riskLevel };
}

export function computeVolumeProfileAndLevels(
  bars: OHLCVPoint[],
  currentPrice: number,
  numBins = 20
): VolumeProfileAnalysis {
  if (bars.length === 0) {
    const p = currentPrice || 100;
    return {
      bins: [],
      poc: p,
      vah: Number((p * 1.03).toFixed(2)),
      val: Number((p * 0.97).toFixed(2)),
      totalVolume: 0,
      buyVolumePct: 50,
      r1: Number((p * 1.04).toFixed(2)),
      r2: Number((p * 1.08).toFixed(2)),
      s1: Number((p * 0.96).toFixed(2)),
      s2: Number((p * 0.92).toFixed(2)),
      keyLevels: [],
    };
  }

  let minP = Infinity;
  let maxP = -Infinity;
  for (const b of bars) {
    if (b.low < minP) minP = b.low;
    if (b.high > maxP) maxP = b.high;
  }
  if (maxP <= minP) {
    maxP = minP + 1;
  }

  const binSize = (maxP - minP) / numBins;
  const rawBins = Array.from({ length: numBins }, (_, i) => {
    const priceLow = minP + i * binSize;
    const priceHigh = priceLow + binSize;
    return {
      priceLow: Number(priceLow.toFixed(2)),
      priceHigh: Number(priceHigh.toFixed(2)),
      priceMid: Number(((priceLow + priceHigh) / 2).toFixed(2)),
      upVolume: 0,
      downVolume: 0,
      totalVolume: 0,
      volumePct: 0,
      isPOC: false,
      inValueArea: false,
    };
  });

  let grandTotalVol = 0;
  let grandBuyVol = 0;

  // Distribute each bar's volume across the price bins overlapped by its [low, high] range
  for (const b of bars) {
    const isUp = b.close >= b.open;
    const vol = Math.max(1, b.volume);
    grandTotalVol += vol;
    if (isUp) grandBuyVol += vol;

    const startBin = Math.max(
      0,
      Math.min(numBins - 1, Math.floor((b.low - minP) / binSize))
    );
    const endBin = Math.max(
      0,
      Math.min(numBins - 1, Math.floor((b.high - minP) / binSize))
    );
    const spanCount = Math.max(1, endBin - startBin + 1);
    const volPerBin = vol / spanCount;

    for (let idx = startBin; idx <= endBin; idx++) {
      rawBins[idx].totalVolume += volPerBin;
      if (isUp) rawBins[idx].upVolume += volPerBin;
      else rawBins[idx].downVolume += volPerBin;
    }
  }

  // Find POC (Point of Control: bin with maximum volume)
  let pocIdx = 0;
  let maxBinVol = 0;
  for (let i = 0; i < rawBins.length; i++) {
    if (rawBins[i].totalVolume > maxBinVol) {
      maxBinVol = rawBins[i].totalVolume;
      pocIdx = i;
    }
  }
  rawBins[pocIdx].isPOC = true;

  // Compute 70% Value Area around POC (expanding up/down to capture 70% of total volume)
  const targetVA = grandTotalVol * 0.7;
  let accVol = rawBins[pocIdx].totalVolume;
  rawBins[pocIdx].inValueArea = true;
  let lowIdx = pocIdx;
  let highIdx = pocIdx;

  while (accVol < targetVA && (lowIdx > 0 || highIdx < numBins - 1)) {
    const nextUpVol = highIdx < numBins - 1 ? rawBins[highIdx + 1].totalVolume : -1;
    const nextDownVol = lowIdx > 0 ? rawBins[lowIdx - 1].totalVolume : -1;

    if (nextUpVol >= nextDownVol && highIdx < numBins - 1) {
      highIdx++;
      rawBins[highIdx].inValueArea = true;
      accVol += rawBins[highIdx].totalVolume;
    } else if (lowIdx > 0) {
      lowIdx--;
      rawBins[lowIdx].inValueArea = true;
      accVol += rawBins[lowIdx].totalVolume;
    } else {
      break;
    }
  }

  for (const bin of rawBins) {
    bin.volumePct = maxBinVol > 0 ? (bin.totalVolume / maxBinVol) * 100 : 0;
  }

  const poc = rawBins[pocIdx].priceMid;
  const vah = rawBins[highIdx].priceHigh;
  const val = rawBins[lowIdx].priceLow;

  // Compute S1, S2, R1, R2 from swing pivots + volume profile nodes
  const highsAbove = bars
    .map((b) => b.high)
    .filter((h) => h > currentPrice * 1.003)
    .sort((a, b) => a - b);
  const lowsBelow = bars
    .map((b) => b.low)
    .filter((l) => l < currentPrice * 0.997)
    .sort((a, b) => b - a);

  const r1Raw =
    highsAbove.length > 0
      ? highsAbove[Math.min(highsAbove.length - 1, Math.floor(highsAbove.length * 0.45))]
      : Math.max(currentPrice * 1.028, vah);
  const r2Raw =
    highsAbove.length > 0
      ? highsAbove[highsAbove.length - 1]
      : Math.max(r1Raw * 1.035, maxP);

  const s1Raw =
    lowsBelow.length > 0
      ? lowsBelow[Math.min(lowsBelow.length - 1, Math.floor(lowsBelow.length * 0.45))]
      : Math.min(currentPrice * 0.972, val);
  const s2Raw =
    lowsBelow.length > 0
      ? lowsBelow[lowsBelow.length - 1]
      : Math.min(s1Raw * 0.965, minP);

  const r1 = Number(Math.max(r1Raw, currentPrice * 1.008).toFixed(2));
  const r2 = Number(Math.max(r2Raw, r1 * 1.018).toFixed(2));
  const s1 = Number(Math.min(s1Raw, currentPrice * 0.992).toFixed(2));
  const s2 = Number(Math.min(s2Raw, s1 * 0.982).toFixed(2));

  const pctFromCurrent = (lvl: number) =>
    currentPrice > 0 ? Number((((lvl - currentPrice) / currentPrice) * 100).toFixed(2)) : 0;

  const keyLevels: KeyPriceLevel[] = [
    {
      code: "R2",
      label: "Major Resistance (R2)",
      price: r2,
      distancePct: pctFromCurrent(r2),
      type: "Resistance",
      strength: "Major",
    },
    {
      code: "R1",
      label: "Immediate Resistance (R1)",
      price: r1,
      distancePct: pctFromCurrent(r1),
      type: "Resistance",
      strength: "Immediate",
    },
    {
      code: "VAH",
      label: "Value Area High (VAH 70%)",
      price: Number(vah.toFixed(2)),
      distancePct: pctFromCurrent(vah),
      type: "VolumeNode",
      strength: "Value Area",
    },
    {
      code: "POC",
      label: "Point of Control (POC)",
      price: Number(poc.toFixed(2)),
      distancePct: pctFromCurrent(poc),
      type: "VolumeNode",
      strength: "Major",
    },
    {
      code: "VAL",
      label: "Value Area Low (VAL 70%)",
      price: Number(val.toFixed(2)),
      distancePct: pctFromCurrent(val),
      type: "VolumeNode",
      strength: "Value Area",
    },
    {
      code: "S1",
      label: "Immediate Support (S1)",
      price: s1,
      distancePct: pctFromCurrent(s1),
      type: "Support",
      strength: "Immediate",
    },
    {
      code: "S2",
      label: "Major Support (S2)",
      price: s2,
      distancePct: pctFromCurrent(s2),
      type: "Support",
      strength: "Major",
    },
  ];

  return {
    bins: rawBins,
    poc: Number(poc.toFixed(2)),
    vah: Number(vah.toFixed(2)),
    val: Number(val.toFixed(2)),
    totalVolume: Math.round(grandTotalVol),
    buyVolumePct:
      grandTotalVol > 0
        ? Number(((grandBuyVol / grandTotalVol) * 100).toFixed(1))
        : 50,
    r1,
    r2,
    s1,
    s2,
    keyLevels,
  };
}

export function resampleBarsForInterval(
  baseBars: OHLCVPoint[],
  interval: ChartInterval
): OHLCVPoint[] {
  if (baseBars.length === 0 || interval === "D") {
    return baseBars;
  }

  // If 2D, W, or M, aggregate consecutive daily bars
  if (interval === "2D" || interval === "W" || interval === "M") {
    const groupSize = interval === "2D" ? 2 : interval === "W" ? 5 : 21;
    const aggregated: Array<{
      date: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }> = [];

    for (let i = 0; i < baseBars.length; i += groupSize) {
      const chunk = baseBars.slice(i, i + groupSize);
      if (chunk.length === 0) continue;
      aggregated.push({
        date: chunk[chunk.length - 1].date,
        open: chunk[0].open,
        high: Math.max(...chunk.map((c) => c.high)),
        low: Math.min(...chunk.map((c) => c.low)),
        close: chunk[chunk.length - 1].close,
        volume: chunk.reduce((acc, c) => acc + c.volume, 0),
      });
    }
    return computeIndicatorsFromBars(aggregated);
  }

  // For intraday 1hr or 4hr fallback before live API returns, subdivide recent daily bars into intraday sessions
  const stepsPerDay = interval === "1hr" ? 6 : 2;
  const recentDays = baseBars.slice(-Math.ceil(72 / stepsPerDay));
  const subBars: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }> = [];

  for (const day of recentDays) {
    const spread = day.high - day.low;
    for (let s = 0; s < stepsPerDay; s++) {
      const t0 = s / stepsPerDay;
      const t1 = (s + 1) / stepsPerDay;
      const open = day.open + (day.close - day.open) * t0;
      const close = day.open + (day.close - day.open) * t1;
      const high = Math.max(open, close) + spread * (0.18 / stepsPerDay);
      const low = Math.min(open, close) - spread * (0.18 / stepsPerDay);
      const hourLabel =
        interval === "1hr"
          ? `${9 + s}:30`
          : s === 0
          ? "09:30"
          : "13:30";
      subBars.push({
        date: `${day.date} ${hourLabel}`,
        open,
        high,
        low,
        close,
        volume: Math.round(day.volume / stepsPerDay),
      });
    }
  }

  return computeIndicatorsFromBars(subBars);
}

export function buildFallbackStatements(
  stock: StockProfile,
  periodType: "annual" | "quarterly"
): FinancialStatementPeriod[] {
  // Parse marketCap string (e.g. "$4.98T" or "¥1.81T" or "$815B") to estimate base scale in billions
  const numMatch = stock.marketCap.match(/([\d.]+)\s*([TBM])?/i);
  let mcapB = 350;
  if (numMatch) {
    const val = parseFloat(numMatch[1]);
    const unit = (numMatch[2] || "B").toUpperCase();
    if (unit === "T") mcapB = val * 1000;
    else if (unit === "M") mcapB = val / 1000;
    else mcapB = val;
  }

  const ps = Math.max(0.8, stock.valuation.psRatio || 5);
  const annualRevB = mcapB / ps;
  const gRate = (stock.growth.revenueGrowthYoY || 10) / 100;
  const gm = (stock.profitability.grossMargin || 42) / 100;
  const om = (stock.profitability.operatingMargin || 22) / 100;
  const nm = (stock.profitability.netMargin || 15) / 100;
  const pb = Math.max(0.8, stock.valuation.pbRatio || 4);
  const latestEquityB = mcapB / pb;
  const de = Math.max(0.02, stock.health.debtToEquity || 0.5);

  const labels =
    periodType === "annual"
      ? [
          { period: "FY2023", date: "2023-12-31", scale: 1 / Math.pow(1 + gRate, 3) },
          { period: "FY2024", date: "2024-12-31", scale: 1 / Math.pow(1 + gRate, 2) },
          { period: "FY2025", date: "2025-12-31", scale: 1 / (1 + gRate) },
          { period: "FY2026", date: "2026-09-30", scale: 1.0 },
        ]
      : [
          { period: "2025-Q4", date: "2025-12-31", scale: 0.235 },
          { period: "2026-Q1", date: "2026-03-31", scale: 0.242 },
          { period: "2026-Q2", date: "2026-06-30", scale: 0.255 },
          { period: "2026-Q3", date: "2026-09-30", scale: 0.268 },
        ];

  return labels.map((item, idx) => {
    const rev = Number((annualRevB * item.scale).toFixed(2));
    const marginDrift = (idx - (labels.length - 1)) * 0.008;
    const gMargin = Math.min(0.95, Math.max(0.08, gm + marginDrift));
    const oMargin = Math.min(gMargin - 0.04, Math.max(0.03, om + marginDrift));
    const nMargin = Math.min(oMargin, Math.max(0.02, nm + marginDrift * 0.8));

    const grossProfit = Number((rev * gMargin).toFixed(2));
    const operatingIncome = Number((rev * oMargin).toFixed(2));
    const netIncome = Number((rev * nMargin).toFixed(2));

    const bScale =
      periodType === "annual" ? item.scale : 0.91 + idx * 0.03;
    const equity = Number((latestEquityB * bScale).toFixed(2));
    const totalDebt = Number((equity * de).toFixed(2));
    const totalLiabilities = Number((totalDebt * 1.65 + equity * 0.35).toFixed(2));
    const totalAssets = Number((equity + totalLiabilities).toFixed(2));
    const cashAndEquivalents = Number(
      (Math.max(equity * 0.28, totalDebt * 0.55) * (0.95 + idx * 0.02)).toFixed(2)
    );

    return {
      period: item.period,
      asOfDate: item.date,
      totalRevenue: rev,
      grossProfit,
      operatingIncome,
      netIncome,
      grossMarginPct: Number((gMargin * 100).toFixed(1)),
      operatingMarginPct: Number((oMargin * 100).toFixed(1)),
      netMarginPct: Number((nMargin * 100).toFixed(1)),
      cashAndEquivalents,
      totalAssets,
      totalLiabilities,
      totalDebt,
      stockholdersEquity: equity,
      netCash: Number((cashAndEquivalents - totalDebt).toFixed(2)),
    };
  });
}

export type SectorArchetype =
  | "tech-growth"
  | "consumer-moat"
  | "internet-platform"
  | "industrial-cyclical"
  | "financial-asset";

export interface ValuationModelResult {
  id: "dcf" | "evEbitda" | "peGrowth" | "pbGraham";
  name: string;
  shortName: string;
  formula: string;
  weight: number; // 0 to 100
  fairValue: number;
  bearValue: number;
  bullValue: number;
  upsidePct: number;
  rationale: string;
}

export interface IntrinsicValuationResult {
  archetype: SectorArchetype;
  archetypeName: string;
  primaryMethodName: string;
  sectorRationale: string;
  blendedFairValue: number;
  blendedBearValue: number;
  blendedBullValue: number;
  upsidePct: number;
  marginOfSafetyPct: number;
  verdict: "Undervalued" | "Fairly Valued" | "Overvalued";
  stage1GrowthPct: number;
  waccPct: number;
  terminalGrowthPct: number;
  models: ValuationModelResult[];
  sensitivityMatrix: {
    waccValues: number[];
    terminalValues: number[];
    grid: number[][]; // [waccIdx][termIdx] -> fairValue
  };
}

export function classifySectorArchetype(sectorStr: string): SectorArchetype {
  const s = sectorStr.toLowerCase();
  if (
    s.includes("bank") ||
    s.includes("financ") ||
    s.includes("insur") ||
    s.includes("real estate") ||
    s.includes("reit")
  ) {
    return "financial-asset";
  }
  if (
    s.includes("staple") ||
    s.includes("spirit") ||
    s.includes("baijiu") ||
    s.includes("food") ||
    s.includes("beverage") ||
    s.includes("household")
  ) {
    return "consumer-moat";
  }
  if (
    s.includes("internet") ||
    s.includes("e-commerce") ||
    s.includes("communication") ||
    s.includes("gaming") ||
    s.includes("media")
  ) {
    return "internet-platform";
  }
  if (
    s.includes("industri") ||
    s.includes("batter") ||
    s.includes("energy") ||
    s.includes("auto") ||
    s.includes("manufactur") ||
    s.includes("material")
  ) {
    return "industrial-cyclical";
  }
  return "tech-growth";
}

export function computeIntrinsicValuation(
  stock: StockProfile,
  overrides?: {
    archetype?: SectorArchetype;
    stage1GrowthPct?: number;
    waccPct?: number;
    terminalGrowthPct?: number;
  }
): IntrinsicValuationResult {
  const archetype =
    overrides?.archetype || classifySectorArchetype(stock.sector);
  const price = Math.max(0.01, stock.price);

  // Default stage-1 5-year FCF/EPS CAGR clamped to realistic sustainable range
  const rawGrowth =
    (stock.growth.fcfGrowthYoY * 0.45 +
      stock.growth.epsGrowthYoY * 0.35 +
      stock.growth.revenueGrowthYoY * 0.2) ||
    12;
  const defaultStage1Growth = Number(
    Math.min(34, Math.max(4, rawGrowth * 0.78)).toFixed(1)
  );
  const defaultWacc = Number(
    Math.min(13.5, Math.max(6.5, stock.profitability.wacc || 8.8)).toFixed(1)
  );
  const defaultTermGrowth =
    stock.market === "CN" ? 3.0 : stock.market === "HK" ? 2.8 : 2.5;

  const stage1GrowthPct = overrides?.stage1GrowthPct ?? defaultStage1Growth;
  const waccPct = overrides?.waccPct ?? defaultWacc;
  const terminalGrowthPct = Math.min(
    waccPct - 1.5,
    overrides?.terminalGrowthPct ?? defaultTermGrowth
  );

  // 1. Two-Stage Free Cash Flow DCF Model
  // Current FCF per share = price * (fcfYield / 100); if FCF yield is low due to heavy growth capex, blend with normalized earnings FCF conversion
  const epsPerShare =
    stock.valuation.peRatio > 0 ? price / stock.valuation.peRatio : price * 0.04;
  const reportedFcfPerShare = price * (Math.max(1.2, stock.health.fcfYield) / 100);
  const baseFcfPerShare = Math.max(
    reportedFcfPerShare,
    epsPerShare * 0.85
  );

  const calcDcfPrice = (g1Pct: number, discPct: number, gTermPct: number) => {
    const g1 = g1Pct / 100;
    const r = Math.max(0.05, discPct / 100);
    const gt = Math.min(r - 0.012, gTermPct / 100);

    let pvFcf = 0;
    let fcf = baseFcfPerShare;
    // 10-year 2-stage projection: years 1-5 at g1, years 6-10 tapering linearly to gt
    for (let yr = 1; yr <= 10; yr++) {
      const yrGrowth =
        yr <= 5 ? g1 : g1 - ((g1 - gt) * (yr - 5)) / 5;
      fcf = fcf * (1 + yrGrowth);
      pvFcf += fcf / Math.pow(1 + r, yr);
    }
    const terminalFcf = fcf * (1 + gt);
    const terminalValue = terminalFcf / (r - gt);
    const pvTerminal = terminalValue / Math.pow(1 + r, 10);

    return Math.max(price * 0.25, pvFcf + pvTerminal);
  };

  const dcfFair = Number(
    calcDcfPrice(stage1GrowthPct, waccPct, terminalGrowthPct).toFixed(2)
  );
  const dcfBear = Number(
    calcDcfPrice(
      Math.max(2, stage1GrowthPct - 4),
      waccPct + 1.2,
      Math.max(1.5, terminalGrowthPct - 0.5)
    ).toFixed(2)
  );
  const dcfBull = Number(
    calcDcfPrice(
      stage1GrowthPct + 4,
      Math.max(5.5, waccPct - 1.0),
      Math.min(waccPct - 1.5, terminalGrowthPct + 0.5)
    ).toFixed(2)
  );

  // 2. Quality-Adjusted EV/EBITDA Multiple Model
  // Adjusts sector benchmark EV/EBITDA for the company's ROIC-over-WACC spread and growth premium
  const roicPremium = Math.min(
    1.45,
    Math.max(
      0.75,
      1 + (stock.profitability.roic - stock.profitability.wacc) * 0.012
    )
  );
  const fairEvEbitdaMultiple =
    stock.industryBenchmarks.evEbitda * roicPremium;
  const currentEvEbitda = Math.max(3, stock.valuation.evEbitda);
  const evEbitdaFair = Number(
    (price * (fairEvEbitdaMultiple / currentEvEbitda)).toFixed(2)
  );
  const evEbitdaBear = Number((evEbitdaFair * 0.84).toFixed(2));
  const evEbitdaBull = Number((evEbitdaFair * 1.18).toFixed(2));

  // 3. Growth-Adjusted P/E & PEG Target Multiple (Peter Lynch / GARP Fair P/E)
  // Fair P/E anchored on sector benchmark P/E + sustainable growth + ROE moat
  const growthAdjustedFairPE = Math.min(
    45,
    Math.max(
      11,
      stock.industryBenchmarks.peRatio * 0.55 +
        (stage1GrowthPct * 1.15 + Math.min(25, stock.profitability.roe * 0.22)) *
          0.45
    )
  );
  const peGrowthFair = Number((epsPerShare * growthAdjustedFairPE).toFixed(2));
  const peGrowthBear = Number((peGrowthFair * 0.82).toFixed(2));
  const peGrowthBull = Number((peGrowthFair * 1.2).toFixed(2));

  // 4. Justified P/B (Excess Return / ROE vs Cost of Equity) & Graham Model
  const bookValuePerShare =
    stock.valuation.pbRatio > 0 ? price / stock.valuation.pbRatio : price * 0.25;
  const ke = Math.max(0.07, waccPct / 100);
  const gSust = Math.min(ke - 0.015, terminalGrowthPct / 100);
  const roeDec = Math.max(0.06, stock.profitability.roe / 100);
  const justifiedPB = Math.max(0.8, (roeDec - gSust) / (ke - gSust));
  const justifiedPbPrice = bookValuePerShare * justifiedPB;
  const grahamPrice =
    epsPerShare > 0 && bookValuePerShare > 0
      ? Math.sqrt(22.5 * epsPerShare * bookValuePerShare)
      : price * 0.85;
  const pbGrahamFair = Number(
    (justifiedPbPrice * 0.7 + grahamPrice * 0.3).toFixed(2)
  );
  const pbGrahamBear = Number((pbGrahamFair * 0.85).toFixed(2));
  const pbGrahamBull = Number((pbGrahamFair * 1.15).toFixed(2));

  // Sector-specific weighting & rationale
  const sectorConfigs: Record<
    SectorArchetype,
    {
      name: string;
      primaryMethod: string;
      rationale: string;
      weights: { dcf: number; evEbitda: number; peGrowth: number; pbGraham: number };
    }
  > = {
    "tech-growth": {
      name: "Technology, Cloud & Semiconductors",
      primaryMethod: "2-Stage DCF (40%) + Growth-Adjusted P/E (35%) + EV/EBITDA (20%)",
      rationale:
        "Tech and semiconductor leaders generate high ROIC from intangible IP and software ecosystems. Book value (P/B) understates intangible moats, so 2-Stage FCF DCF and Growth-Adjusted P/E (PEG) receive 75% combined weight.",
      weights: { dcf: 40, evEbitda: 20, peGrowth: 35, pbGraham: 5 },
    },
    "consumer-moat": {
      name: "Consumer Staples & Luxury Franchises",
      primaryMethod: "2-Stage DCF (50%) + Target P/E Multiple (30%) + EV/EBITDA (15%)",
      rationale:
        "Premium consumer staples (such as Baijiu spirits and global beverage franchises) exhibit resilient pricing power, predictable recurring demand, and high dividend/FCF conversion—making 2-Stage DCF the gold-standard anchor (50% weight).",
      weights: { dcf: 50, evEbitda: 15, peGrowth: 30, pbGraham: 5 },
    },
    "internet-platform": {
      name: "Internet, E-Commerce & Digital Platforms",
      primaryMethod: "2-Stage DCF (40%) + EV/EBITDA (35%) + Growth P/E (20%)",
      rationale:
        "Digital platforms and e-commerce leaders hold large net cash balances and equity investment portfolios that distort headline P/E. Combining 2-Stage FCF DCF (40%) with Enterprise Value / EBITDA (35%) captures both cash generation and balance sheet value.",
      weights: { dcf: 40, evEbitda: 35, peGrowth: 20, pbGraham: 5 },
    },
    "industrial-cyclical": {
      name: "Industrials, EV Manufacturing & Clean Energy",
      primaryMethod: "EV/EBITDA Multiple (40%) + 2-Stage DCF (30%) + Target P/E (20%)",
      rationale:
        "Capital-intensive battery, EV, and industrial manufacturers incur heavy factory depreciation (D&A) that depresses GAAP net earnings early in expansion cycles. Enterprise Value to EBITDA (40%) and DCF (30%) avoid depreciation distortion.",
      weights: { dcf: 30, evEbitda: 40, peGrowth: 20, pbGraham: 10 },
    },
    "financial-asset": {
      name: "Financials, Banks, Insurance & Real Estate",
      primaryMethod: "Justified P/B Excess Return (50%) + Target P/E (35%) + EPV (15%)",
      rationale:
        "For banks, insurers, and asset-heavy financials, debt is operational inventory rather than enterprise financing—rendering EV/EBITDA inapplicable. Intrinsic value is governed by Justified Price-to-Book (ROE vs. Cost of Equity, 50% weight) and sustainable P/E (35%).",
      weights: { dcf: 15, evEbitda: 0, peGrowth: 35, pbGraham: 50 },
    },
  };

  const cfg = sectorConfigs[archetype];
  const w = cfg.weights;

  const pctDiff = (fv: number) =>
    Number((((fv - price) / price) * 100).toFixed(1));

  const models: ValuationModelResult[] = [
    {
      id: "dcf",
      name: "2-Stage Free Cash Flow (DCF)",
      shortName: "2-Stage DCF",
      formula: "∑ FCF_t / (1 + WACC)^t + TV / (1 + WACC)^10",
      weight: w.dcf,
      fairValue: dcfFair,
      bearValue: dcfBear,
      bullValue: dcfBull,
      upsidePct: pctDiff(dcfFair),
      rationale: `Discounts 10-year projected FCF (${stage1GrowthPct.toFixed(
        1
      )}% Stage-1 growth tapering to ${terminalGrowthPct.toFixed(
        1
      )}% terminal) at ${waccPct.toFixed(1)}% WACC.`,
    },
    {
      id: "evEbitda",
      name: "Quality-Adjusted EV/EBITDA Multiple",
      shortName: "EV/EBITDA Model",
      formula: "(Sector EV/EBITDA × ROIC Premium) × EBITDA / Shs",
      weight: w.evEbitda,
      fairValue: evEbitdaFair,
      bearValue: evEbitdaBear,
      bullValue: evEbitdaBull,
      upsidePct: pctDiff(evEbitdaFair),
      rationale: `Applies a fair ${fairEvEbitdaMultiple.toFixed(
        1
      )}x EV/EBITDA multiple (vs ${stock.industryBenchmarks.evEbitda.toFixed(
        1
      )}x sector avg) reflecting ${stock.profitability.roic.toFixed(1)}% ROIC.`,
    },
    {
      id: "peGrowth",
      name: "Growth-Adjusted P/E (GARP / PEG)",
      shortName: "Growth P/E Model",
      formula: "Normalized EPS × Growth & ROE Adjusted Fair P/E",
      weight: w.peGrowth,
      fairValue: peGrowthFair,
      bearValue: peGrowthBear,
      bullValue: peGrowthBull,
      upsidePct: pctDiff(peGrowthFair),
      rationale: `Applies a fair ${growthAdjustedFairPE.toFixed(
        1
      )}x P/E multiple to normalized earnings power based on growth and ${stock.profitability.roe.toFixed(
        1
      )}% ROE.`,
    },
    {
      id: "pbGraham",
      name: "Justified P/B (ROE Excess Return) & Graham",
      shortName: "Justified P/B & Graham",
      formula: "BVPS × (ROE - g) / (Ke - g)",
      weight: w.pbGraham,
      fairValue: pbGrahamFair,
      bearValue: pbGrahamBear,
      bullValue: pbGrahamBull,
      upsidePct: pctDiff(pbGrahamFair),
      rationale: `Anchors on book value and excess equity return (${stock.profitability.roe.toFixed(
        1
      )}% ROE vs ${waccPct.toFixed(1)}% cost of capital).`,
    },
  ];

  const blendedFairValue = Number(
    models
      .reduce((acc, m) => acc + m.fairValue * (m.weight / 100), 0)
      .toFixed(2)
  );
  const blendedBearValue = Number(
    models
      .reduce((acc, m) => acc + m.bearValue * (m.weight / 100), 0)
      .toFixed(2)
  );
  const blendedBullValue = Number(
    models
      .reduce((acc, m) => acc + m.bullValue * (m.weight / 100), 0)
      .toFixed(2)
  );

  const upsidePct = pctDiff(blendedFairValue);
  const marginOfSafetyPct =
    blendedFairValue > 0
      ? Number(
          (((blendedFairValue - price) / blendedFairValue) * 100).toFixed(1)
        )
      : 0;

  const verdict: IntrinsicValuationResult["verdict"] =
    upsidePct >= 10
      ? "Undervalued"
      : upsidePct <= -10
      ? "Overvalued"
      : "Fairly Valued";

  // 5x5 Sensitivity Matrix (WACC vs Terminal Growth)
  const waccSteps = [-1.0, -0.5, 0, 0.5, 1.0].map((d) =>
    Number(Math.max(5.5, waccPct + d).toFixed(1))
  );
  const termSteps = [-0.6, -0.3, 0, 0.3, 0.6].map((d) =>
    Number(Math.max(1.0, terminalGrowthPct + d).toFixed(1))
  );

  const nonDcfWeightedSum = models
    .filter((m) => m.id !== "dcf")
    .reduce((acc, m) => acc + m.fairValue * (m.weight / 100), 0);
  const dcfWeightFrac = w.dcf / 100;

  const grid = waccSteps.map((wVal) =>
    termSteps.map((tVal) => {
      const simDcf = calcDcfPrice(stage1GrowthPct, wVal, tVal);
      return Number((simDcf * dcfWeightFrac + nonDcfWeightedSum).toFixed(2));
    })
  );

  return {
    archetype,
    archetypeName: cfg.name,
    primaryMethodName: cfg.primaryMethod,
    sectorRationale: cfg.rationale,
    blendedFairValue,
    blendedBearValue,
    blendedBullValue,
    upsidePct,
    marginOfSafetyPct,
    verdict,
    stage1GrowthPct,
    waccPct,
    terminalGrowthPct,
    models,
    sensitivityMatrix: {
      waccValues: waccSteps,
      terminalValues: termSteps,
      grid,
    },
  };
}



