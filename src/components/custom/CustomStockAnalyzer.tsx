"use client";

import React, { useState } from "react";
import {
  deriveCustomStockRating,
  generateSyntheticHistory,
} from "@/lib/analysis/engine";
import { MarketCode, StockProfile } from "@/lib/types/stock";
import { Calculator, PlusCircle, Sparkles } from "lucide-react";

interface CustomStockAnalyzerProps {
  onAddStock: (newStock: StockProfile) => void;
}

export function CustomStockAnalyzer({ onAddStock }: CustomStockAnalyzerProps) {
  const [ticker, setTicker] = useState("TSLA");
  const [name, setName] = useState("Tesla, Inc.");
  const [market, setMarket] = useState<MarketCode>("US");
  const [sector, setSector] = useState("Consumer Discretionary / EV & Autonomy");
  const [price, setPrice] = useState("258.50");
  const [marketCap, setMarketCap] = useState("$815B");

  const [peRatio, setPeRatio] = useState("64.5");
  const [pbRatio, setPbRatio] = useState("11.8");
  const [psRatio, setPsRatio] = useState("8.4");
  const [evEbitda, setEvEbitda] = useState("42.0");
  const [pegRatio, setPegRatio] = useState("2.45");

  const [grossMargin, setGrossMargin] = useState("18.4");
  const [operatingMargin, setOperatingMargin] = useState("9.2");
  const [netMargin, setNetMargin] = useState("13.0");
  const [roe, setRoe] = useState("20.4");
  const [roic, setRoic] = useState("15.8");
  const [wacc, setWacc] = useState("10.5");

  const [revenueGrowthYoY, setRevenueGrowthYoY] = useState("14.2");
  const [epsGrowthYoY, setEpsGrowthYoY] = useState("18.5");
  const [fcfGrowthYoY, setFcfGrowthYoY] = useState("22.0");

  const [debtToEquity, setDebtToEquity] = useState("0.14");
  const [currentRatio, setCurrentRatio] = useState("1.82");
  const [interestCoverage, setInterestCoverage] = useState("36.0");
  const [fcfYield, setFcfYield] = useState("1.8");

  const [rsi14, setRsi14] = useState("61.5");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numPrice = Math.max(1, parseFloat(price) || 100);
    const numPe = parseFloat(peRatio) || 20;
    const numPb = parseFloat(pbRatio) || 3;
    const numPs = parseFloat(psRatio) || 4;
    const numEv = parseFloat(evEbitda) || 14;
    const numPeg = parseFloat(pegRatio) || 1.3;

    const numGross = parseFloat(grossMargin) || 40;
    const numOp = parseFloat(operatingMargin) || 18;
    const numNet = parseFloat(netMargin) || 12;
    const numRoe = parseFloat(roe) || 18;
    const numRoic = parseFloat(roic) || 15;
    const numWacc = parseFloat(wacc) || 8.5;

    const numRevG = parseFloat(revenueGrowthYoY) || 12;
    const numEpsG = parseFloat(epsGrowthYoY) || 15;
    const numFcfG = parseFloat(fcfGrowthYoY) || 14;

    const numDe = parseFloat(debtToEquity) || 0.5;
    const numCr = parseFloat(currentRatio) || 1.6;
    const numIc = parseFloat(interestCoverage) || 12;
    const numFcfY = parseFloat(fcfYield) || 3.5;
    const numRsi = Math.min(99, Math.max(1, parseFloat(rsi14) || 55));

    const currencySymbol =
      market === "US" ? "$" : market === "CN" ? "¥" : "HK$";
    const currency =
      market === "US" ? "USD" : market === "CN" ? "CNY" : "HKD";
    const exchange =
      market === "US"
        ? "NASDAQ / NYSE"
        : market === "CN"
        ? "SSE / SZSE (A-Shares)"
        : "HKEX (Hong Kong)";

    const { rating, riskLevel } = deriveCustomStockRating(
      numPe,
      numPeg,
      numRoe,
      numRevG,
      numDe,
      numRsi
    );

    const cleanTicker = ticker.trim().toUpperCase() || "CUSTOM";
    const support = Number((numPrice * 0.92).toFixed(2));
    const resistance = Number((numPrice * 1.09).toFixed(2));
    const sma50 = Number((numPrice * 0.96).toFixed(2));
    const sma200 = Number((numPrice * 0.89).toFixed(2));

    const customStock: StockProfile = {
      ticker: cleanTicker,
      name: name.trim() || cleanTicker,
      market,
      exchange,
      sector: sector.trim() || "General Equities",
      currency,
      currencySymbol,
      price: numPrice,
      change: Number((numPrice * 0.018).toFixed(2)),
      changePercent: 1.8,
      marketCap: marketCap.trim() || `${currencySymbol}100B`,
      updatedAt: "November 2026 (Custom Run)",
      rating,
      riskLevel,
      executiveSummary: `${
        name.trim() || cleanTicker
      } (${cleanTicker}) evaluated via custom fundamental and technical model in ${exchange}. Features a P/E of ${numPe.toFixed(
        1
      )}x, ROE of ${numRoe.toFixed(1)}%, and YoY revenue growth of ${numRevG.toFixed(
        1
      )}%, yielding an overall ${rating} rating with ${riskLevel} risk profile.`,
      businessOverview: `Custom equity analysis profile for ${
        name.trim() || cleanTicker
      } operating in the ${sector} sector across the ${market} market.`,
      financialPerformanceSummary: `Gross margin of ${numGross.toFixed(
        1
      )}%, operating margin of ${numOp.toFixed(
        1
      )}%, and net margin of ${numNet.toFixed(
        1
      )}%. ROIC stands at ${numRoic.toFixed(
        1
      )}% against a WACC of ${numWacc.toFixed(1)}%.`,
      valuationSummary: `Trades at ${numPe.toFixed(1)}x P/E, ${numPb.toFixed(
        2
      )}x P/B, ${numEv.toFixed(1)}x EV/EBITDA, and ${numPeg.toFixed(
        2
      )}x PEG ratio with a ${numFcfY.toFixed(1)}% free cash flow yield.`,
      priceTrendSummary: `Trading at ${currencySymbol}${numPrice.toFixed(
        2
      )} with key support estimated at ${currencySymbol}${support.toFixed(
        2
      )} and overhead resistance at ${currencySymbol}${resistance.toFixed(
        2
      )}. RSI(14) is ${numRsi.toFixed(1)}.`,
      valuation: {
        peRatio: numPe,
        pbRatio: numPb,
        psRatio: numPs,
        evEbitda: numEv,
        pegRatio: numPeg,
      },
      profitability: {
        grossMargin: numGross,
        operatingMargin: numOp,
        netMargin: numNet,
        roe: numRoe,
        roic: numRoic,
        wacc: numWacc,
      },
      growth: {
        revenueGrowthYoY: numRevG,
        epsGrowthYoY: numEpsG,
        fcfGrowthYoY: numFcfG,
      },
      health: {
        debtToEquity: numDe,
        currentRatio: numCr,
        interestCoverage: numIc,
        fcfYield: numFcfY,
      },
      industryBenchmarks: {
        peRatio: 22.0,
        pbRatio: 4.5,
        psRatio: 4.2,
        evEbitda: 14.5,
        pegRatio: 1.5,
        grossMargin: 38.0,
        operatingMargin: 16.0,
        netMargin: 12.0,
        roe: 16.0,
        roic: 13.0,
        revenueGrowthYoY: 10.0,
        epsGrowthYoY: 12.0,
        fcfGrowthYoY: 11.0,
        debtToEquity: 0.65,
        currentRatio: 1.5,
        interestCoverage: 12.0,
        fcfYield: 4.0,
      },
      technical: {
        support,
        resistance,
        low52Week: Number((numPrice * 0.72).toFixed(2)),
        high52Week: Number((numPrice * 1.14).toFixed(2)),
        sma50,
        sma200,
        rsi14: numRsi,
        macd: 2.15,
        macdSignal: 1.65,
        macdHist: 0.5,
        trendSignal: sma50 >= sma200 ? "Uptrend" : "Consolidation",
        patterns: [
          {
            name: "Custom Support / Resistance Channel",
            type: rating === "Bearish" ? "Bearish" : "Bullish",
            confidence: "Medium",
            description: `Key support zone modeled at ${currencySymbol}${support.toFixed(
              2
            )} with upside resistance target at ${currencySymbol}${resistance.toFixed(
              2
            )}.`,
            priceLevel: numPrice,
          },
        ],
        history: generateSyntheticHistory(numPrice, 0.021, 0.55, 909),
      },
      peers: [
        {
          ticker: "SECTOR-AVG",
          name: `${sector} Benchmark`,
          market,
          currencySymbol,
          price: Number((numPrice * 0.95).toFixed(2)),
          changePercent: 0.85,
          marketCap: `${currencySymbol}120B`,
          peRatio: 22.0,
          pbRatio: 4.5,
          evEbitda: 14.5,
          roe: 16.0,
          revenueGrowthYoY: 10.0,
          netMargin: 12.0,
          debtToEquity: 0.65,
        },
      ],
      riskFactors: [
        "Valuation multiple sensitivity to quarterly earnings or guidance revisions.",
        "Competitive margin pressure within the broader industry segment.",
        "Macroeconomic interest rate and FX fluctuations impacting discount rates.",
      ],
      bullCase: [
        `Sustained revenue expansion (+${numRevG.toFixed(
          1
        )}% YoY) and operating leverage drive multiple expansion.`,
        `ROIC (${numRoic.toFixed(1)}%) remains above WACC (${numWacc.toFixed(
          1
        )}%), compounding intrinsic shareholder value.`,
      ],
      bearCase: [
        "Slowing top-line demand compresses operating margins below sector averages.",
        `Multiple contraction if P/E (${numPe.toFixed(
          1
        )}x) reverts toward the industry benchmark (22.0x).`,
      ],
    };

    onAddStock(customStock);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6">
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <Calculator className="h-5 w-5 text-emerald-400" aria-hidden="true" />
          <div>
            <h2 className="text-base font-bold text-white">
              Custom Ticker &amp; Financial Model Input
            </h2>
            <p className="text-xs text-slate-400">
              Provide any stock ticker (US, China A-Shares, or Hong Kong) and
              financial data to run the full Stock Analysis Skill engine
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          17-Ratio Engine
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-6">
        {/* Company & Market Identity */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            1. Company &amp; Market Identification
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div>
              <label
                htmlFor="cust-ticker"
                className="block text-xs font-medium text-slate-300"
              >
                Ticker Symbol
              </label>
              <input
                id="cust-ticker"
                name="ticker"
                type="text"
                required
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="e.g., TSLA, 601318.SH…"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="cust-name"
                className="block text-xs font-medium text-slate-300"
              >
                Company Name
              </label>
              <input
                id="cust-name"
                name="companyName"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Tesla, Inc.…"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              />
            </div>

            <div>
              <label
                htmlFor="cust-market"
                className="block text-xs font-medium text-slate-300"
              >
                Market
              </label>
              <select
                id="cust-market"
                name="market"
                value={market}
                onChange={(e) => setMarket(e.target.value as MarketCode)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <option value="US">US (NYSE / NASDAQ)</option>
                <option value="CN">China A-Shares (SSE / SZSE)</option>
                <option value="HK">Hong Kong (HKEX)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="cust-price"
                className="block text-xs font-medium text-slate-300"
              >
                Current Price
              </label>
              <input
                id="cust-price"
                name="price"
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              />
            </div>

            <div>
              <label
                htmlFor="cust-mcap"
                className="block text-xs font-medium text-slate-300"
              >
                Market Cap
              </label>
              <input
                id="cust-mcap"
                name="marketCap"
                type="text"
                value={marketCap}
                onChange={(e) => setMarketCap(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              />
            </div>
          </div>

          <div className="mt-3">
            <label
              htmlFor="cust-sector"
              className="block text-xs font-medium text-slate-300"
            >
              Industry / Sector
            </label>
            <input
              id="cust-sector"
              name="sector"
              type="text"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            />
          </div>
        </div>

        {/* Valuation & Profitability Inputs */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-400">
              2. Valuation Multiples
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { id: "pe", label: "P/E Ratio", val: peRatio, set: setPeRatio },
                { id: "pb", label: "P/B Ratio", val: pbRatio, set: setPbRatio },
                { id: "ps", label: "P/S Ratio", val: psRatio, set: setPsRatio },
                {
                  id: "ev",
                  label: "EV/EBITDA",
                  val: evEbitda,
                  set: setEvEbitda,
                },
                {
                  id: "peg",
                  label: "PEG Ratio",
                  val: pegRatio,
                  set: setPegRatio,
                },
                { id: "rsi", label: "RSI (14)", val: rsi14, set: setRsi14 },
              ].map((item) => (
                <div key={item.id}>
                  <label
                    htmlFor={`cust-${item.id}`}
                    className="block text-xs text-slate-400"
                  >
                    {item.label}
                  </label>
                  <input
                    id={`cust-${item.id}`}
                    type="number"
                    step="0.01"
                    value={item.val}
                    onChange={(e) => item.set(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-sm text-white tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              3. Profitability Metrics (%)
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                {
                  id: "gm",
                  label: "Gross Margin %",
                  val: grossMargin,
                  set: setGrossMargin,
                },
                {
                  id: "om",
                  label: "Operating Margin %",
                  val: operatingMargin,
                  set: setOperatingMargin,
                },
                {
                  id: "nm",
                  label: "Net Margin %",
                  val: netMargin,
                  set: setNetMargin,
                },
                { id: "roe", label: "ROE %", val: roe, set: setRoe },
                { id: "roic", label: "ROIC %", val: roic, set: setRoic },
                { id: "wacc", label: "WACC %", val: wacc, set: setWacc },
              ].map((item) => (
                <div key={item.id}>
                  <label
                    htmlFor={`cust-${item.id}`}
                    className="block text-xs text-slate-400"
                  >
                    {item.label}
                  </label>
                  <input
                    id={`cust-${item.id}`}
                    type="number"
                    step="0.1"
                    value={item.val}
                    onChange={(e) => item.set(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-sm text-white tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Growth & Financial Health */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-400">
              4. YoY Growth Rates (%)
            </h3>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[
                {
                  id: "revg",
                  label: "Revenue YoY %",
                  val: revenueGrowthYoY,
                  set: setRevenueGrowthYoY,
                },
                {
                  id: "epsg",
                  label: "EPS YoY %",
                  val: epsGrowthYoY,
                  set: setEpsGrowthYoY,
                },
                {
                  id: "fcfg",
                  label: "FCF YoY %",
                  val: fcfGrowthYoY,
                  set: setFcfGrowthYoY,
                },
              ].map((item) => (
                <div key={item.id}>
                  <label
                    htmlFor={`cust-${item.id}`}
                    className="block text-xs text-slate-400"
                  >
                    {item.label}
                  </label>
                  <input
                    id={`cust-${item.id}`}
                    type="number"
                    step="0.1"
                    value={item.val}
                    onChange={(e) => item.set(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-sm text-white tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              5. Financial Health &amp; Cash Yield
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  id: "de",
                  label: "Debt/Equity",
                  val: debtToEquity,
                  set: setDebtToEquity,
                },
                {
                  id: "cr",
                  label: "Current Ratio",
                  val: currentRatio,
                  set: setCurrentRatio,
                },
                {
                  id: "ic",
                  label: "Interest Cov.",
                  val: interestCoverage,
                  set: setInterestCoverage,
                },
                {
                  id: "fcfy",
                  label: "FCF Yield %",
                  val: fcfYield,
                  set: setFcfYield,
                },
              ].map((item) => (
                <div key={item.id}>
                  <label
                    htmlFor={`cust-${item.id}`}
                    className="block text-xs text-slate-400"
                  >
                    {item.label}
                  </label>
                  <input
                    id={`cust-${item.id}`}
                    type="number"
                    step="0.01"
                    value={item.val}
                    onChange={(e) => item.set(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-sm text-white tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            <span>Run Full Stock Analysis &amp; Generate Report</span>
          </button>
        </div>
      </form>
    </div>
  );
}

