"use client";

import React, { useEffect, useMemo, useState } from "react";
import { StockProfile } from "@/lib/types/stock";
import {
  classifySectorArchetype,
  computeIntrinsicValuation,
  SectorArchetype,
} from "@/lib/analysis/engine";
import {
  Compass,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
} from "lucide-react";

interface IntrinsicValueViewProps {
  stock: StockProfile;
}

const ARCHETYPE_OPTIONS: Array<{ id: SectorArchetype; label: string }> = [
  { id: "tech-growth", label: "Tech, Cloud & Semiconductors" },
  { id: "consumer-moat", label: "Consumer Staples & Luxury" },
  { id: "internet-platform", label: "Internet & E-Commerce" },
  { id: "industrial-cyclical", label: "Industrials, EV & Energy" },
  { id: "financial-asset", label: "Financials, Banks & REITs" },
];

export function IntrinsicValueView({ stock }: IntrinsicValueViewProps) {
  const defaultBaseline = useMemo(
    () => computeIntrinsicValuation(stock),
    [stock]
  );

  const [archetype, setArchetype] = useState<SectorArchetype>(
    defaultBaseline.archetype
  );
  const [stage1Growth, setStage1Growth] = useState<number>(
    defaultBaseline.stage1GrowthPct
  );
  const [wacc, setWacc] = useState<number>(defaultBaseline.waccPct);
  const [termGrowth, setTermGrowth] = useState<number>(
    defaultBaseline.terminalGrowthPct
  );

  // Sync defaults when selected stock changes
  useEffect(() => {
    const base = computeIntrinsicValuation(stock);
    setArchetype(base.archetype);
    setStage1Growth(base.stage1GrowthPct);
    setWacc(base.waccPct);
    setTermGrowth(base.terminalGrowthPct);
  }, [stock]);

  const handleReset = () => {
    setArchetype(defaultBaseline.archetype);
    setStage1Growth(defaultBaseline.stage1GrowthPct);
    setWacc(defaultBaseline.waccPct);
    setTermGrowth(defaultBaseline.terminalGrowthPct);
  };

  const result = useMemo(
    () =>
      computeIntrinsicValuation(stock, {
        archetype,
        stage1GrowthPct: stage1Growth,
        waccPct: wacc,
        terminalGrowthPct: termGrowth,
      }),
    [stock, archetype, stage1Growth, wacc, termGrowth]
  );

  const sym = stock.currencySymbol;
  const activeModels = result.models.filter((m) => m.weight > 0);

  // Football field SVG scaling
  const { minChartVal, maxChartVal } = useMemo(() => {
    let min = stock.price * 0.7;
    let max = stock.price * 1.3;
    for (const m of activeModels) {
      min = Math.min(min, m.bearValue);
      max = Math.max(max, m.bullValue);
    }
    min = Math.min(min, result.blendedBearValue);
    max = Math.max(max, result.blendedBullValue);
    const pad = (max - min) * 0.12 || 10;
    return {
      minChartVal: Math.max(0, min - pad),
      maxChartVal: max + pad,
    };
  }, [activeModels, result, stock.price]);

  const xForVal = (v: number) => {
    const span = maxChartVal - minChartVal || 1;
    return 185 + ((v - minChartVal) / span) * 580;
  };

  return (
    <div className="space-y-6">
      {/* Top Executive Intrinsic Value Summary Card */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="space-y-2.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                <Scale className="h-3.5 w-3.5" aria-hidden="true" />
                Sector-Adaptive Valuation Model
              </span>
              <span className="rounded-md bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                Profile: {result.archetypeName}
              </span>
            </div>

            <h2 className="text-xl font-bold text-white sm:text-2xl">
              Intrinsic Fair Value Estimate for {stock.name} ({stock.ticker})
            </h2>

            <p className="text-sm leading-relaxed text-slate-300">
              {result.sectorRationale}
            </p>
            <p className="text-xs text-slate-400">
              <strong className="text-slate-200">Active Weighting Formula:</strong>{" "}
              {result.primaryMethodName}
            </p>
          </div>

          {/* Fair Value vs Live Price Readout Box */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-[410px]">
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 tabular-nums">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">
                Live Market Price
              </span>
              <div className="mt-1 text-2xl font-bold text-slate-200">
                {sym}
                {stock.price.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-400">
                {stock.exchange}
              </span>
            </div>

            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 tabular-nums">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                Blended Fair Value
              </span>
              <div className="mt-1 text-2xl font-extrabold text-white">
                {sym}
                {result.blendedFairValue.toFixed(2)}
              </div>
              <span className="text-[11px] text-emerald-300">
                Range: {sym}
                {result.blendedBearValue.toFixed(0)}–{sym}
                {result.blendedBullValue.toFixed(0)}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 tabular-nums">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">
                Implied Upside / Safety
              </span>
              <div
                className={`mt-1 text-2xl font-bold ${
                  result.upsidePct >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {result.upsidePct >= 0 ? "+" : ""}
                {result.upsidePct.toFixed(1)}%
              </div>
              <span
                className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                  result.verdict === "Undervalued"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : result.verdict === "Overvalued"
                    ? "bg-rose-500/20 text-rose-300"
                    : "bg-sky-500/20 text-sky-300"
                }`}
              >
                {result.verdict}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Football-Field Valuation Chart & DCF Sliders */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: SVG Football Field Chart */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3.5">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Valuation Football Field — Bear / Base / Bull Ranges ({stock.currency})
              </h3>
              <p className="text-xs text-slate-400">
                Comparing each valuation methodology against current market price (
                {sym}
                {stock.price.toFixed(2)})
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Base Fair Value
              </span>
              <span className="inline-flex items-center gap-1.5 text-amber-300">
                <span className="h-0.5 w-3.5 bg-amber-400" />
                Live Price ({sym}
                {stock.price.toFixed(2)})
              </span>
            </div>
          </div>

          <svg
            viewBox="0 0 820 265"
            className="mt-4 w-full overflow-visible"
            role="img"
            aria-label="Football field valuation range chart across DCF, EV/EBITDA, Growth P/E, and Blended Fair Value"
          >
            {/* X-axis grid ticks */}
            {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
              const val = minChartVal + t * (maxChartVal - minChartVal);
              const x = xForVal(val);
              return (
                <g key={idx}>
                  <line
                    x1={x}
                    y1="18"
                    x2={x}
                    y2="230"
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={x}
                    y="248"
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="10"
                    className="tabular-nums"
                  >
                    {sym}
                    {val.toFixed(0)}
                  </text>
                </g>
              );
            })}

            {/* Rows for each active model + Blended Fair Value */}
            {[
              ...activeModels.map((m) => ({
                label: `${m.shortName} (${m.weight}%)`,
                bear: m.bearValue,
                base: m.fairValue,
                bull: m.bullValue,
                isBlended: false,
              })),
              {
                label: "Blended Fair Value (100%)",
                bear: result.blendedBearValue,
                base: result.blendedFairValue,
                bull: result.blendedBullValue,
                isBlended: true,
              },
            ].map((row, idx) => {
              const y = 34 + idx * 42;
              const xBear = xForVal(row.bear);
              const xBase = xForVal(row.base);
              const xBull = xForVal(row.bull);
              const barW = Math.max(6, xBull - xBear);

              return (
                <g key={row.label}>
                  <text
                    x="10"
                    y={y + 13}
                    fill={row.isBlended ? "#34d399" : "#e2e8f0"}
                    fontSize="11"
                    fontWeight={row.isBlended ? "700" : "500"}
                  >
                    {row.label}
                  </text>

                  {/* Bear-to-Bull Range Bar */}
                  <rect
                    x={xBear}
                    y={y}
                    width={barW}
                    height="18"
                    rx="5"
                    fill={row.isBlended ? "#10b981" : "#0ea5e9"}
                    opacity={row.isBlended ? "0.35" : "0.25"}
                    stroke={row.isBlended ? "#10b981" : "#38bdf8"}
                    strokeWidth="1.2"
                  />

                  {/* Bear label */}
                  <text
                    x={xBear - 6}
                    y={y + 13}
                    textAnchor="end"
                    fill="#94a3b8"
                    fontSize="9.5"
                    className="tabular-nums"
                  >
                    {sym}
                    {row.bear.toFixed(0)}
                  </text>

                  {/* Bull label */}
                  <text
                    x={xBull + 6}
                    y={y + 13}
                    textAnchor="start"
                    fill="#94a3b8"
                    fontSize="9.5"
                    className="tabular-nums"
                  >
                    {sym}
                    {row.bull.toFixed(0)}
                  </text>

                  {/* Base Fair Value Diamond / Marker */}
                  <circle
                    cx={xBase}
                    cy={y + 9}
                    r="5"
                    fill={row.isBlended ? "#10b981" : "#38bdf8"}
                    stroke="#020617"
                    strokeWidth="1.5"
                  />
                  <text
                    x={xBase}
                    y={y - 4}
                    textAnchor="middle"
                    fill={row.isBlended ? "#34d399" : "#7dd3fc"}
                    fontSize="10"
                    fontWeight="700"
                    className="tabular-nums"
                  >
                    {sym}
                    {row.base.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* Current Live Market Price Vertical Reference Line */}
            <line
              x1={xForVal(stock.price)}
              y1="12"
              x2={xForVal(stock.price)}
              y2="232"
              stroke="#fbbf24"
              strokeWidth="2"
              strokeDasharray="5 3"
            />
            <rect
              x={xForVal(stock.price) - 46}
              y="2"
              width="92"
              height="16"
              rx="4"
              fill="#f59e0b"
            />
            <text
              x={xForVal(stock.price)}
              y="13"
              textAnchor="middle"
              fill="#020617"
              fontSize="9.5"
              fontWeight="700"
              className="tabular-nums"
            >
              Price: {sym}
              {stock.price.toFixed(2)}
            </text>
          </svg>
        </div>

        {/* Right Column: Interactive Assumptions & Sector Preset Controls */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Valuation Inputs
              </h3>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              Reset
            </button>
          </div>

          <div>
            <label
              htmlFor="val-archetype"
              className="block text-xs font-medium text-slate-300"
            >
              Sector Methodology Preset
            </label>
            <select
              id="val-archetype"
              name="archetype"
              value={archetype}
              onChange={(e) => setArchetype(e.target.value as SectorArchetype)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              {ARCHETYPE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                  {opt.id === classifySectorArchetype(stock.sector)
                    ? " (Auto-Detected)"
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <div className="flex justify-between text-xs tabular-nums">
                <label htmlFor="slider-growth" className="text-slate-300">
                  Stage-1 Growth Rate (Yrs 1–5)
                </label>
                <span className="font-bold text-emerald-400">
                  {stage1Growth.toFixed(1)}%
                </span>
              </div>
              <input
                id="slider-growth"
                type="range"
                min="2"
                max="40"
                step="0.5"
                value={stage1Growth}
                onChange={(e) => setStage1Growth(parseFloat(e.target.value))}
                className="mt-1.5 w-full accent-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs tabular-nums">
                <label htmlFor="slider-wacc" className="text-slate-300">
                  Discount Rate / WACC
                </label>
                <span className="font-bold text-sky-400">
                  {wacc.toFixed(1)}%
                </span>
              </div>
              <input
                id="slider-wacc"
                type="range"
                min="6.0"
                max="14.5"
                step="0.2"
                value={wacc}
                onChange={(e) => setWacc(parseFloat(e.target.value))}
                className="mt-1.5 w-full accent-sky-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs tabular-nums">
                <label htmlFor="slider-term" className="text-slate-300">
                  Terminal Growth Rate (Perpetuity)
                </label>
                <span className="font-bold text-violet-400">
                  {termGrowth.toFixed(1)}%
                </span>
              </div>
              <input
                id="slider-term"
                type="range"
                min="1.0"
                max="4.5"
                step="0.1"
                value={termGrowth}
                onChange={(e) => setTermGrowth(parseFloat(e.target.value))}
                className="mt-1.5 w-full accent-violet-500"
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400 space-y-1 tabular-nums">
            <div className="flex justify-between">
              <span>Margin of Safety:</span>
              <strong
                className={
                  result.marginOfSafetyPct >= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                }
              >
                {result.marginOfSafetyPct >= 0 ? "+" : ""}
                {result.marginOfSafetyPct.toFixed(1)}%
              </strong>
            </div>
            <div className="flex justify-between">
              <span>25% Margin-of-Safety Buy Entry:</span>
              <strong className="text-slate-200">
                {sym}
                {(result.blendedFairValue * 0.75).toFixed(2)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Model Breakdown Cards & 5x5 Sensitivity Matrix */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 4 Valuation Models Breakdown */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sparkles className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Component Valuation Models &amp; Sector Weights
              </h3>
              <p className="text-xs text-slate-400">
                How each methodology contributes to the {sym}
                {result.blendedFairValue.toFixed(2)} blended fair value
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {result.models.map((m) => (
              <div
                key={m.id}
                className={`rounded-lg border p-3.5 transition ${
                  m.weight > 0
                    ? "border-slate-800 bg-slate-950/60"
                    : "border-slate-800/40 bg-slate-950/25 opacity-60"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-white">{m.name}</span>
                    <span className="ml-2 rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 tabular-nums">
                      Weight: {m.weight}%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 tabular-nums">
                    <span className="text-base font-bold text-white">
                      {sym}
                      {m.fairValue.toFixed(2)}
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        m.upsidePct >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      ({m.upsidePct >= 0 ? "+" : ""}
                      {m.upsidePct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="mt-1 text-[11px] font-mono text-slate-400">
                  Formula: {m.formula}
                </div>
                <p className="mt-1 text-xs text-slate-400">{m.rationale}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 5x5 WACC vs Terminal Growth Sensitivity Matrix */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Compass className="h-4 w-4 text-sky-400" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Fair Value Sensitivity Matrix (WACC vs. Terminal Growth)
              </h3>
              <p className="text-xs text-slate-400">
                Green cells indicate fair value above live market price ({sym}
                {stock.price.toFixed(2)})
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs tabular-nums">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-2 text-left">
                    WACC \ Term. g
                  </th>
                  {result.sensitivityMatrix.terminalValues.map((tv) => (
                    <th key={tv} className="py-2.5 px-2 font-semibold text-violet-300">
                      {tv.toFixed(1)}%
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {result.sensitivityMatrix.waccValues.map((wVal, rIdx) => (
                  <tr key={wVal}>
                    <td className="py-2.5 px-2 text-left font-semibold text-sky-300">
                      {wVal.toFixed(1)}%
                    </td>
                    {result.sensitivityMatrix.grid[rIdx].map((cellPrice, cIdx) => {
                      const isCenter = rIdx === 2 && cIdx === 2;
                      const isAboveCurrent = cellPrice >= stock.price;
                      return (
                        <td
                          key={cIdx}
                          className={`py-2.5 px-2 font-medium ${
                            isCenter
                              ? "rounded-md border-2 border-emerald-400 bg-emerald-500/20 font-bold text-white"
                              : isAboveCurrent
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }`}
                        >
                          {sym}
                          {cellPrice.toFixed(1)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sector Valuation Methodology Guide */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>How to Choose the Right Valuation Method by Sector</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li>
                <strong className="text-slate-200">
                  Tech, SaaS &amp; Semiconductors:
                </strong>{" "}
                Use <strong>2-Stage DCF + Growth-Adjusted P/E (PEG)</strong>.
                Avoid P/B since R&amp;D and software ecosystems are expensed
                rather than capitalized on the balance sheet.
              </li>
              <li>
                <strong className="text-slate-200">
                  Consumer Staples &amp; Luxury:
                </strong>{" "}
                Use <strong>2-Stage DCF + Historical Target P/E</strong>. High
                margin stability and predictable cash conversion make DCF highly
                accurate.
              </li>
              <li>
                <strong className="text-slate-200">
                  Internet &amp; E-Commerce:
                </strong>{" "}
                Use <strong>2-Stage DCF + EV/EBITDA</strong>. Enterprise Value
                adjusts for large net cash reserves and strategic equity
                holdings.
              </li>
              <li>
                <strong className="text-slate-200">
                  Industrials, EVs &amp; Energy:
                </strong>{" "}
                Use <strong>EV/EBITDA + DCF</strong>. Heavy factory depreciation
                (D&amp;A) distorts GAAP P/E during capex cycles.
              </li>
              <li>
                <strong className="text-slate-200">
                  Banks, Insurance &amp; REITs:
                </strong>{" "}
                Use <strong>Justified P/B (ROE vs. Cost of Equity)</strong>.
                Never use EV/EBITDA because debt is operating capital for banks.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

