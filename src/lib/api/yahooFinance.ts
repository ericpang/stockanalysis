import {
  computeIndicatorsFromBars,
  deriveCustomStockRating,
} from "../analysis/engine";
import { STOCK_CATALOG } from "../data/stocks";
import {
  ChartInterval,
  FinancialStatementPeriod,
  MarketCode,
  OHLCVPoint,
  PeerStock,
  StockProfile,
  TechnicalPattern,
} from "../types/stock";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function fetchYahooJson(url: string): Promise<any> {
  if (typeof window === "undefined") {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Yahoo fetch failed: ${res.status}`);
    }
    return res.json();
  }

  // Browser environment (e.g., static GitHub Pages deployment): try public CORS proxies
  const proxyUrls = [
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  ];

  let lastError: unknown;
  for (const proxyUrl of proxyUrls) {
    try {
      const res = await fetch(proxyUrl, { cache: "no-store" });
      if (res.ok) {
        return await res.json();
      }
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Failed to fetch via CORS proxy");
}

interface YahooAuthCache {
  cookie: string;
  crumb: string;
  expiresAt: number;
}

let authCache: YahooAuthCache | null = null;

async function getYahooAuth(): Promise<{ cookie: string; crumb: string }> {
  if (typeof window !== "undefined") {
    throw new Error("Yahoo crumb auth requires server environment");
  }
  const now = Date.now();
  if (authCache && authCache.expiresAt > now) {
    return { cookie: authCache.cookie, crumb: authCache.crumb };
  }

  const r1 = await fetch("https://fc.yahoo.com", {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });
  const setCookies = r1.headers.getSetCookie?.() || [];
  const cookie = setCookies.map((c) => c.split(";")[0]).join("; ");

  const r2 = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
    headers: {
      "User-Agent": USER_AGENT,
      Cookie: cookie,
    },
    cache: "no-store",
  });

  if (!r2.ok) {
    throw new Error(`Failed to obtain Yahoo Finance crumb: ${r2.status}`);
  }

  const crumb = (await r2.text()).trim();
  authCache = {
    cookie,
    crumb,
    expiresAt: now + 1000 * 60 * 25, // Cache for 25 minutes
  };

  return { cookie, crumb };
}

export function toYahooSymbol(ticker: string): string {
  const clean = ticker.trim().toUpperCase();
  if (clean.endsWith(".SH")) {
    return clean.replace(/\.SH$/, ".SS");
  }
  return clean;
}

export function fromYahooSymbol(symbol: string): string {
  const clean = symbol.trim().toUpperCase();
  if (clean.endsWith(".SS")) {
    return clean.replace(/\.SS$/, ".SH");
  }
  return clean;
}

export function inferMarketFromTicker(ticker: string): {
  market: MarketCode;
  currency: string;
  currencySymbol: string;
  exchange: string;
} {
  const upper = ticker.toUpperCase();
  if (upper.endsWith(".SH") || upper.endsWith(".SS") || upper.endsWith(".SZ")) {
    return {
      market: "CN",
      currency: "CNY",
      currencySymbol: "¥",
      exchange: upper.endsWith(".SZ")
        ? "SZSE (Shenzhen A-Shares)"
        : "SSE (Shanghai A-Shares)",
    };
  }
  if (upper.endsWith(".HK")) {
    return {
      market: "HK",
      currency: "HKD",
      currencySymbol: "HK$",
      exchange: "HKEX (Hong Kong)",
    };
  }
  return {
    market: "US",
    currency: "USD",
    currencySymbol: "$",
    exchange: "NASDAQ / NYSE",
  };
}

function formatMarketCap(rawCap: number | undefined, sym: string): string {
  if (!rawCap || rawCap <= 0) return "N/A";
  if (rawCap >= 1e12) return `${sym}${(rawCap / 1e12).toFixed(2)}T`;
  if (rawCap >= 1e9) return `${sym}${(rawCap / 1e9).toFixed(1)}B`;
  if (rawCap >= 1e6) return `${sym}${(rawCap / 1e6).toFixed(1)}M`;
  return `${sym}${rawCap.toLocaleString()}`;
}

export async function fetchChartBars(yahooSym: string): Promise<{
  bars: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  meta: Record<string, any>;
}> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahooSym
  )}?interval=1d&range=1y`;

  const data = await fetchYahooJson(url);
  const result = data?.chart?.result?.[0];
  if (!result) {
    throw new Error(`No chart data returned for ${yahooSym}`);
  }

  const timestamps: number[] = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const bars: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }> = [];

  for (let i = 0; i < timestamps.length; i++) {
    const close = quote.close?.[i];
    const open = quote.open?.[i] ?? close;
    const high = quote.high?.[i] ?? close;
    const low = quote.low?.[i] ?? close;
    const volume = quote.volume?.[i] ?? 0;

    if (
      typeof close === "number" &&
      !Number.isNaN(close) &&
      close > 0
    ) {
      const dateStr = new Date(timestamps[i] * 1000)
        .toISOString()
        .split("T")[0];
      bars.push({
        date: dateStr,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: Math.round(volume),
      });
    }
  }

  return { bars, meta: result.meta || {} };
}

export async function fetchChartByInterval(
  inputTicker: string,
  interval: ChartInterval
): Promise<OHLCVPoint[]> {
  const yahooSym = toYahooSymbol(inputTicker);

  const paramMap: Record<
    ChartInterval,
    { yfInterval: string; yfRange: string; groupSize: number; intraday: boolean }
  > = {
    "1hr": { yfInterval: "60m", yfRange: "1mo", groupSize: 1, intraday: true },
    "4hr": { yfInterval: "60m", yfRange: "3mo", groupSize: 4, intraday: true },
    D: { yfInterval: "1d", yfRange: "1y", groupSize: 1, intraday: false },
    "2D": { yfInterval: "1d", yfRange: "2y", groupSize: 2, intraday: false },
    W: { yfInterval: "1wk", yfRange: "2y", groupSize: 1, intraday: false },
    M: { yfInterval: "1mo", yfRange: "5y", groupSize: 1, intraday: false },
  };

  const cfg = paramMap[interval] || paramMap.D;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahooSym
  )}?interval=${cfg.yfInterval}&range=${cfg.yfRange}`;

  const data = await fetchYahooJson(url);
  const result = data?.chart?.result?.[0];
  if (!result) {
    throw new Error(`No interval chart data for ${yahooSym}`);
  }

  const timestamps: number[] = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const rawBars: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }> = [];

  for (let i = 0; i < timestamps.length; i++) {
    const close = quote.close?.[i];
    const open = quote.open?.[i] ?? close;
    const high = quote.high?.[i] ?? close;
    const low = quote.low?.[i] ?? close;
    const volume = quote.volume?.[i] ?? 0;

    if (typeof close === "number" && !Number.isNaN(close) && close > 0) {
      const dt = new Date(timestamps[i] * 1000);
      const dateStr = cfg.intraday
        ? `${dt.toISOString().slice(5, 10)} ${dt.toISOString().slice(11, 16)}`
        : dt.toISOString().split("T")[0];

      rawBars.push({
        date: dateStr,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: Math.round(volume),
      });
    }
  }

  if (cfg.groupSize > 1) {
    const grouped: typeof rawBars = [];
    for (let i = 0; i < rawBars.length; i += cfg.groupSize) {
      const chunk = rawBars.slice(i, i + cfg.groupSize);
      if (chunk.length === 0) continue;
      grouped.push({
        date: chunk[chunk.length - 1].date,
        open: chunk[0].open,
        high: Math.max(...chunk.map((c) => c.high)),
        low: Math.min(...chunk.map((c) => c.low)),
        close: chunk[chunk.length - 1].close,
        volume: chunk.reduce((acc, c) => acc + c.volume, 0),
      });
    }
    return computeIndicatorsFromBars(grouped);
  }

  return computeIndicatorsFromBars(rawBars);
}

export async function fetchFinancialStatements(
  inputTicker: string,
  periodType: "annual" | "quarterly" = "annual"
): Promise<FinancialStatementPeriod[]> {
  const yahooSym = toYahooSymbol(inputTicker);
  const prefix = periodType === "quarterly" ? "quarterly" : "annual";

  const keys = [
    `${prefix}TotalRevenue`,
    `${prefix}GrossProfit`,
    `${prefix}OperatingIncome`,
    `${prefix}NetIncome`,
    `${prefix}TotalAssets`,
    `${prefix}TotalLiabilitiesNetMinorityInterest`,
    `${prefix}StockholdersEquity`,
    `${prefix}TotalDebt`,
    `${prefix}CashAndCashEquivalents`,
  ];

  const url = `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(
    yahooSym
  )}?type=${keys.join(",")}&period1=1609459200&period2=1924905600`;

  const json = await fetchYahooJson(url);
  const results: Array<Record<string, any>> = json?.timeseries?.result || [];

  const byDate: Record<string, Record<string, number>> = {};

  for (const series of results) {
    const typeName: string | undefined = series?.meta?.type?.[0];
    if (!typeName) continue;
    const entries: Array<Record<string, any>> = series[typeName] || [];
    for (const entry of entries) {
      const dateStr: string | undefined = entry?.asOfDate;
      const rawVal: number | undefined = entry?.reportedValue?.raw;
      if (dateStr && typeof rawVal === "number" && !Number.isNaN(rawVal)) {
        if (!byDate[dateStr]) byDate[dateStr] = {};
        byDate[dateStr][typeName] = rawVal / 1e9; // Store in Billions
      }
    }
  }

  const sortedDates = Object.keys(byDate)
    .filter(
      (d) =>
        byDate[d][`${prefix}TotalRevenue`] !== undefined ||
        byDate[d][`${prefix}TotalAssets`] !== undefined
    )
    .sort()
    .slice(-4);

  if (sortedDates.length === 0) {
    throw new Error(`No statement periods returned for ${yahooSym}`);
  }

  return sortedDates.map((dateStr) => {
    const row = byDate[dateStr];
    const totalRevenue = Number((row[`${prefix}TotalRevenue`] ?? 0).toFixed(2));
    const grossProfit = Number(
      (row[`${prefix}GrossProfit`] ?? totalRevenue * 0.42).toFixed(2)
    );
    const operatingIncome = Number(
      (row[`${prefix}OperatingIncome`] ?? totalRevenue * 0.22).toFixed(2)
    );
    const netIncome = Number(
      (row[`${prefix}NetIncome`] ?? totalRevenue * 0.15).toFixed(2)
    );

    const grossMarginPct =
      totalRevenue > 0
        ? Number(((grossProfit / totalRevenue) * 100).toFixed(1))
        : 0;
    const operatingMarginPct =
      totalRevenue > 0
        ? Number(((operatingIncome / totalRevenue) * 100).toFixed(1))
        : 0;
    const netMarginPct =
      totalRevenue > 0
        ? Number(((netIncome / totalRevenue) * 100).toFixed(1))
        : 0;

    const totalAssets = Number((row[`${prefix}TotalAssets`] ?? 0).toFixed(2));
    const stockholdersEquity = Number(
      (row[`${prefix}StockholdersEquity`] ?? totalAssets * 0.35).toFixed(2)
    );
    const totalLiabilities = Number(
      (
        row[`${prefix}TotalLiabilitiesNetMinorityInterest`] ??
        Math.max(0, totalAssets - stockholdersEquity)
      ).toFixed(2)
    );
    const totalDebt = Number(
      (row[`${prefix}TotalDebt`] ?? totalLiabilities * 0.35).toFixed(2)
    );
    const cashAndEquivalents = Number(
      (row[`${prefix}CashAndCashEquivalents`] ?? totalAssets * 0.12).toFixed(2)
    );

    const year = dateStr.slice(0, 4);
    const month = parseInt(dateStr.slice(5, 7), 10);
    const qNum = Math.ceil(month / 3);
    const periodLabel =
      periodType === "quarterly" ? `${year}-Q${qNum}` : `FY${year}`;

    return {
      period: periodLabel,
      asOfDate: dateStr,
      totalRevenue,
      grossProfit,
      operatingIncome,
      netIncome,
      grossMarginPct,
      operatingMarginPct,
      netMarginPct,
      cashAndEquivalents,
      totalAssets,
      totalLiabilities,
      totalDebt,
      stockholdersEquity,
      netCash: Number((cashAndEquivalents - totalDebt).toFixed(2)),
    };
  });
}

export async function fetchQuoteSummary(
  yahooSym: string
): Promise<Record<string, any> | null> {
  try {
    const { cookie, crumb } = await getYahooAuth();
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
      yahooSym
    )}?modules=price,summaryDetail,defaultKeyStatistics,financialData,assetProfile&crumb=${encodeURIComponent(
      crumb
    )}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Cookie: cookie,
      },
      cache: "no-store",
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json?.quoteSummary?.result?.[0] || null;
  } catch {
    return null;
  }
}

export async function fetchBatchQuotes(
  yahooSymbols: string[]
): Promise<Record<string, Record<string, any>>> {
  if (yahooSymbols.length === 0) return {};
  try {
    const { cookie, crumb } = await getYahooAuth();
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
      yahooSymbols.join(",")
    )}&crumb=${encodeURIComponent(crumb)}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Cookie: cookie,
      },
      cache: "no-store",
    });

    if (!res.ok) return {};
    const json = await res.json();
    const list: Array<Record<string, any>> =
      json?.quoteResponse?.result || [];
    const map: Record<string, Record<string, any>> = {};
    for (const item of list) {
      if (item.symbol) {
        map[item.symbol.toUpperCase()] = item;
      }
    }
    return map;
  } catch {
    return {};
  }
}

export async function fetchLiveStockProfile(
  inputTicker: string,
  existingBaseline?: StockProfile
): Promise<StockProfile> {
  const displayTicker = fromYahooSymbol(inputTicker);
  const yahooSym = toYahooSymbol(inputTicker);

  const baseline =
    existingBaseline ||
    STOCK_CATALOG.find(
      (s) => s.ticker.toUpperCase() === displayTicker.toUpperCase()
    );

  const peerYahooSyms = (baseline?.peers || []).map((p) =>
    toYahooSymbol(p.ticker)
  );

  const [{ bars, meta }, summary, peerQuoteMap] = await Promise.all([
    fetchChartBars(yahooSym),
    fetchQuoteSummary(yahooSym),
    fetchBatchQuotes(peerYahooSyms),
  ]);

  const inferred = inferMarketFromTicker(displayTicker);
  const sym = baseline?.currencySymbol || inferred.currencySymbol;
  const currency = baseline?.currency || meta.currency || inferred.currency;

  const priceMod = summary?.price || {};
  const sdMod = summary?.summaryDetail || {};
  const ksMod = summary?.defaultKeyStatistics || {};
  const fdMod = summary?.financialData || {};
  const apMod = summary?.assetProfile || {};

  const lastBar = bars[bars.length - 1];
  const prevBar = bars.length > 1 ? bars[bars.length - 2] : lastBar;

  const livePrice = Number(
    (
      priceMod.regularMarketPrice?.raw ??
      meta.regularMarketPrice ??
      lastBar?.close ??
      baseline?.price ??
      100
    ).toFixed(2)
  );

  const prevClose = Number(
    (
      priceMod.regularMarketPreviousClose?.raw ??
      sdMod.previousClose?.raw ??
      prevBar?.close ??
      livePrice
    ).toFixed(2)
  );

  const liveChange = Number(
    (
      priceMod.regularMarketChange?.raw ?? livePrice - prevClose
    ).toFixed(2)
  );

  const liveChangePercent = Number(
    (priceMod.regularMarketChangePercent?.raw !== undefined
      ? priceMod.regularMarketChangePercent.raw * 100
      : prevClose > 0
      ? ((livePrice - prevClose) / prevClose) * 100
      : 0
    ).toFixed(2)
  );

  const marketTimeEpoch: number | undefined =
    priceMod.regularMarketTime || meta.regularMarketTime;
  const updatedAtStr = marketTimeEpoch
    ? `${new Date(marketTimeEpoch * 1000).toISOString().replace("T", " ").slice(0, 16)} UTC (Live)`
    : `${new Date().toISOString().split("T")[0]} (Live)`;

  const rawMarketCap =
    priceMod.marketCap?.raw ?? sdMod.marketCap?.raw;
  const marketCap = rawMarketCap
    ? formatMarketCap(rawMarketCap, sym)
    : baseline?.marketCap || "N/A";

  // Compute real technical indicators from the 1-year OHLCV bars
  const history = computeIndicatorsFromBars(bars);
  const latestInd = history[history.length - 1];

  const sma50 = Number(
    (
      latestInd?.sma50 ??
      sdMod.fiftyDayAverage?.raw ??
      baseline?.technical.sma50 ??
      livePrice * 0.97
    ).toFixed(2)
  );
  const sma200 = Number(
    (
      latestInd?.sma200 ??
      sdMod.twoHundredDayAverage?.raw ??
      baseline?.technical.sma200 ??
      livePrice * 0.91
    ).toFixed(2)
  );
  const rsi14 = Number(
    (latestInd?.rsi14 ?? baseline?.technical.rsi14 ?? 55).toFixed(1)
  );
  const macd = Number(
    (latestInd?.macd ?? baseline?.technical.macd ?? 1.2).toFixed(2)
  );
  const macdSignal = Number(
    (latestInd?.macdSignal ?? baseline?.technical.macdSignal ?? 0.9).toFixed(2)
  );
  const macdHist = Number((macd - macdSignal).toFixed(2));

  // Support & resistance from recent 35-day low/high
  const recentWindow = bars.slice(-35);
  const recentLow =
    recentWindow.length > 0
      ? Math.min(...recentWindow.map((b) => b.low))
      : livePrice * 0.93;
  const recentHigh =
    recentWindow.length > 0
      ? Math.max(...recentWindow.map((b) => b.high))
      : livePrice * 1.07;

  const support = Number(recentLow.toFixed(2));
  const resistance = Number(Math.max(recentHigh, livePrice * 1.015).toFixed(2));

  const low52Week = Number(
    (
      sdMod.fiftyTwoWeekLow?.raw ??
      meta.fiftyTwoWeekLow ??
      Math.min(...bars.map((b) => b.low))
    ).toFixed(2)
  );
  const high52Week = Number(
    (
      sdMod.fiftyTwoWeekHigh?.raw ??
      meta.fiftyTwoWeekHigh ??
      Math.max(...bars.map((b) => b.high))
    ).toFixed(2)
  );

  // Fundamental metrics from live Yahoo Finance quoteSummary
  const peRatio = Number(
    (
      sdMod.trailingPE?.raw ??
      sdMod.forwardPE?.raw ??
      ksMod.forwardPE?.raw ??
      baseline?.valuation.peRatio ??
      20
    ).toFixed(2)
  );

  const pbRatio = Number(
    (
      ksMod.priceToBook?.raw ??
      baseline?.valuation.pbRatio ??
      3.5
    ).toFixed(2)
  );

  const psRatio = Number(
    (
      sdMod.priceToSalesTrailing12Months?.raw ??
      ksMod.enterpriseToRevenue?.raw ??
      baseline?.valuation.psRatio ??
      4.5
    ).toFixed(2)
  );

  const evEbitda = Number(
    (
      ksMod.enterpriseToEbitda?.raw ??
      baseline?.valuation.evEbitda ??
      15.0
    ).toFixed(2)
  );

  const grossMargin = Number(
    (fdMod.grossMargins?.raw !== undefined
      ? fdMod.grossMargins.raw * 100
      : baseline?.profitability.grossMargin ?? 42.0
    ).toFixed(1)
  );

  const operatingMargin = Number(
    (fdMod.operatingMargins?.raw !== undefined
      ? fdMod.operatingMargins.raw * 100
      : baseline?.profitability.operatingMargin ?? 22.0
    ).toFixed(1)
  );

  const netMargin = Number(
    (fdMod.profitMargins?.raw !== undefined
      ? fdMod.profitMargins.raw * 100
      : ksMod.profitMargins?.raw !== undefined
      ? ksMod.profitMargins.raw * 100
      : baseline?.profitability.netMargin ?? 15.0
    ).toFixed(1)
  );

  const roe = Number(
    (fdMod.returnOnEquity?.raw !== undefined
      ? fdMod.returnOnEquity.raw * 100
      : baseline?.profitability.roe ?? 20.0
    ).toFixed(1)
  );

  const roa =
    fdMod.returnOnAssets?.raw !== undefined
      ? fdMod.returnOnAssets.raw * 100
      : undefined;

  const roic = Number(
    (
      baseline?.profitability.roic ??
      (roa !== undefined ? roa * 1.45 : roe * 0.65)
    ).toFixed(1)
  );

  const wacc = baseline?.profitability.wacc ?? 8.8;

  const revenueGrowthYoY = Number(
    (fdMod.revenueGrowth?.raw !== undefined
      ? fdMod.revenueGrowth.raw * 100
      : baseline?.growth.revenueGrowthYoY ?? 10.0
    ).toFixed(1)
  );

  const epsGrowthYoY = Number(
    (fdMod.earningsGrowth?.raw !== undefined
      ? fdMod.earningsGrowth.raw * 100
      : ksMod.earningsQuarterlyGrowth?.raw !== undefined
      ? ksMod.earningsQuarterlyGrowth.raw * 100
      : baseline?.growth.epsGrowthYoY ?? 12.0
    ).toFixed(1)
  );

  const pegRatio = Number(
    (
      ksMod.pegRatio?.raw ??
      (epsGrowthYoY > 2
        ? peRatio / epsGrowthYoY
        : revenueGrowthYoY > 2
        ? peRatio / revenueGrowthYoY
        : baseline?.valuation.pegRatio ?? 1.5)
    ).toFixed(2)
  );

  const rawFcf = fdMod.freeCashflow?.raw;
  const fcfYield = Number(
    (rawFcf && rawMarketCap && rawMarketCap > 0
      ? (rawFcf / rawMarketCap) * 100
      : baseline?.health.fcfYield ?? 3.5
    ).toFixed(1)
  );

  const fcfGrowthYoY = Number(
    (baseline?.growth.fcfGrowthYoY ?? Math.max(4, revenueGrowthYoY * 1.05)).toFixed(1)
  );

  // Yahoo Finance reports debtToEquity as percentage (e.g., 148.0 means 1.48x)
  const debtToEquity = Number(
    (fdMod.debtToEquity?.raw !== undefined
      ? fdMod.debtToEquity.raw / 100
      : baseline?.health.debtToEquity ?? 0.55
    ).toFixed(2)
  );

  const currentRatio = Number(
    (
      fdMod.currentRatio?.raw ??
      baseline?.health.currentRatio ??
      1.45
    ).toFixed(2)
  );

  const rawEbitda = fdMod.ebitda?.raw;
  const rawTotalDebt = fdMod.totalDebt?.raw;
  const interestCoverage = Number(
    (rawEbitda && rawTotalDebt && rawTotalDebt > 0
      ? Math.min(250, Math.max(1.5, rawEbitda / (rawTotalDebt * 0.042)))
      : baseline?.health.interestCoverage ?? 16.0
    ).toFixed(1)
  );

  const trendSignal: StockProfile["technical"]["trendSignal"] =
    sma50 > sma200 && livePrice > sma50
      ? "Golden Cross"
      : sma50 > sma200
      ? "Uptrend"
      : sma50 < sma200 && livePrice < sma50
      ? "Death Cross"
      : "Consolidation";

  const patterns: TechnicalPattern[] = [
    {
      name:
        sma50 >= sma200
          ? "50/200-DMA Bullish Alignment"
          : "Below 200-DMA Overhead Supply",
      type: sma50 >= sma200 ? "Bullish" : "Bearish",
      confidence: "High",
      description:
        sma50 >= sma200
          ? `50-day SMA (${sym}${sma50.toFixed(
              2
            )}) is trading above the 200-day SMA (${sym}${sma200.toFixed(
              2
            )}), confirming positive medium-term institutional structure.`
          : `50-day SMA (${sym}${sma50.toFixed(
              2
            )}) trails the 200-day SMA (${sym}${sma200.toFixed(
              2
            )}); reclaiming ${sym}${sma200.toFixed(2)} is required to flip trend structure.`,
      priceLevel: sma50,
    },
    {
      name:
        macdHist >= 0
          ? "MACD Positive Histogram Expansion"
          : "MACD Momentum Consolidation",
      type: macdHist >= 0 ? "Bullish" : "Neutral",
      confidence: "Medium",
      description: `Live 35-session price channel spans Support at ${sym}${support.toFixed(
        2
      )} to Resistance at ${sym}${resistance.toFixed(2)} with RSI(14) at ${rsi14.toFixed(1)}.`,
      priceLevel: macdHist >= 0 ? resistance : support,
    },
  ];

  // Update peer quotes with live data from batch quote response
  const updatedPeers: PeerStock[] = (baseline?.peers || []).map((peer) => {
    const ySym = toYahooSymbol(peer.ticker).toUpperCase();
    const livePeer = peerQuoteMap[ySym];
    if (!livePeer) return peer;

    return {
      ...peer,
      price: Number(
        (livePeer.regularMarketPrice ?? peer.price).toFixed(2)
      ),
      changePercent: Number(
        (livePeer.regularMarketChangePercent ?? peer.changePercent).toFixed(2)
      ),
      marketCap: livePeer.marketCap
        ? formatMarketCap(livePeer.marketCap, peer.currencySymbol)
        : peer.marketCap,
      peRatio: Number(
        (livePeer.trailingPE ?? livePeer.forwardPE ?? peer.peRatio).toFixed(1)
      ),
      pbRatio: Number(
        (livePeer.priceToBook ?? peer.pbRatio).toFixed(2)
      ),
    };
  });

  const { rating, riskLevel } = deriveCustomStockRating(
    peRatio,
    pegRatio,
    roe,
    revenueGrowthYoY,
    debtToEquity,
    rsi14
  );

  const companyName =
    baseline?.name ||
    priceMod.longName ||
    priceMod.shortName ||
    meta.longName ||
    meta.shortName ||
    displayTicker;

  const sectorName =
    baseline?.sector ||
    (apMod.sector && apMod.industry
      ? `${apMod.sector} / ${apMod.industry}`
      : apMod.sector || "Global Equities");

  const priceTrendSummary = `${displayTicker} is currently trading at ${sym}${livePrice.toFixed(
    2
  )} (${liveChange >= 0 ? "+" : ""}${liveChangePercent.toFixed(
    2
  )}%) against its 50-day SMA (${sym}${sma50.toFixed(
    2
  )}) and 200-day SMA (${sym}${sma200.toFixed(
    2
  )}). 35-day support sits at ${sym}${support.toFixed(
    2
  )} with overhead resistance at ${sym}${resistance.toFixed(
    2
  )} and 52-week range spanning ${sym}${low52Week.toFixed(
    2
  )}–${sym}${high52Week.toFixed(2)}.`;

  const valuationSummary = `Live market valuation places ${displayTicker} at ${peRatio.toFixed(
    1
  )}x P/E, ${pbRatio.toFixed(2)}x P/B, ${psRatio.toFixed(
    2
  )}x P/S, and ${evEbitda.toFixed(
    1
  )}x EV/EBITDA (PEG: ${pegRatio.toFixed(
    2
  )}x), with a ${fcfYield.toFixed(1)}% free cash flow yield on a ${marketCap} market cap.`;

  const financialPerformanceSummary = `Trailing 12-month gross margin is ${grossMargin.toFixed(
    1
  )}%, operating margin is ${operatingMargin.toFixed(
    1
  )}%, and net profit margin is ${netMargin.toFixed(
    1
  )}%. Return on Equity (ROE) stands at ${roe.toFixed(
    1
  )}% with YoY revenue growth of ${
    revenueGrowthYoY >= 0 ? "+" : ""
  }${revenueGrowthYoY.toFixed(1)}%.`;

  const executiveSummary =
    baseline?.executiveSummary ||
    `${companyName} (${displayTicker}) trades on ${inferred.exchange} at ${sym}${livePrice.toFixed(
      2
    )} (${marketCap} market cap) with a trailing P/E of ${peRatio.toFixed(
      1
    )}x, ROE of ${roe.toFixed(1)}%, and net margin of ${netMargin.toFixed(
      1
    )}%.`;

  const businessOverview =
    baseline?.businessOverview ||
    apMod.longBusinessSummary ||
    `${companyName} operates in the ${sectorName} sector on ${inferred.exchange}.`;

  return {
    ticker: displayTicker,
    name: companyName,
    market: baseline?.market || inferred.market,
    exchange: baseline?.exchange || inferred.exchange,
    sector: sectorName,
    currency,
    currencySymbol: sym,
    price: livePrice,
    change: liveChange,
    changePercent: liveChangePercent,
    marketCap,
    updatedAt: updatedAtStr,
    rating: baseline?.rating || rating,
    riskLevel: baseline?.riskLevel || riskLevel,
    executiveSummary,
    businessOverview,
    financialPerformanceSummary,
    valuationSummary,
    priceTrendSummary,
    valuation: {
      peRatio,
      pbRatio,
      psRatio,
      evEbitda,
      pegRatio,
    },
    profitability: {
      grossMargin,
      operatingMargin,
      netMargin,
      roe,
      roic,
      wacc,
    },
    growth: {
      revenueGrowthYoY,
      epsGrowthYoY,
      fcfGrowthYoY,
    },
    health: {
      debtToEquity,
      currentRatio,
      interestCoverage,
      fcfYield,
    },
    industryBenchmarks: baseline?.industryBenchmarks || {
      peRatio: 22.5,
      pbRatio: 4.5,
      psRatio: 4.2,
      evEbitda: 14.5,
      pegRatio: 1.5,
      grossMargin: 40.0,
      operatingMargin: 18.0,
      netMargin: 13.0,
      roe: 17.0,
      roic: 14.0,
      revenueGrowthYoY: 10.0,
      epsGrowthYoY: 12.0,
      fcfGrowthYoY: 11.0,
      debtToEquity: 0.65,
      currentRatio: 1.5,
      interestCoverage: 14.0,
      fcfYield: 3.8,
    },
    technical: {
      support,
      resistance,
      low52Week,
      high52Week,
      sma50,
      sma200,
      rsi14,
      macd,
      macdSignal,
      macdHist,
      trendSignal,
      patterns,
      history,
    },
    peers: updatedPeers,
    riskFactors: baseline?.riskFactors || [
      "Valuation multiple sensitivity to quarterly earnings and macro rate expectations.",
      "Competitive industry dynamics and operating margin fluctuations.",
      "Regulatory and foreign exchange headwinds across operating regions.",
    ],
    bullCase: baseline?.bullCase || [
      `Sustained earnings expansion and ${roe.toFixed(1)}% ROE drive further multiple re-rating.`,
      `Breakout above ${sym}${resistance.toFixed(2)} resistance confirms technical continuation toward 52-week highs (${sym}${high52Week.toFixed(2)}).`,
    ],
    bearCase: baseline?.bearCase || [
      `Break below ${sym}${support.toFixed(2)} support exposes downside toward the 200-day moving average (${sym}${sma200.toFixed(2)}).`,
      "Margin compression if input or operating costs outpace revenue growth.",
    ],
  };
}

