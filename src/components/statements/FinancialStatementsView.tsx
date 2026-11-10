"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  FinancialStatementPeriod,
  StockProfile,
} from "@/lib/types/stock";
import { buildFallbackStatements } from "@/lib/analysis/engine";
import {
  BarChart3,
  Landmark,
  Layers,
  TrendingUp,
  Wallet,
} from "lucide-react";

interface FinancialStatementsViewProps {
  stock: StockProfile;
}

export function FinancialStatementsView({
  stock,
}: FinancialStatementsViewProps) {
  const [periodType, setPeriodType] = useState<"annual" | "quarterly">(
    "annual"
  );
  const [cache, setCache] = useState<
    Record<string, FinancialStatementPeriod[]>
  >({});
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const cacheKey = `${stock.ticker.toUpperCase()}__${periodType}`;

  useEffect(() => {
    if (cache[cacheKey]) return;

    let cancelled = false;
    setIsLoading(true);

    fetch(
      `/api/stock?ticker=${encodeURIComponent(
        stock.ticker
      )}&statements=${periodType}`,
      { cache: "no-store" }
    )
      .then((r) => r.json())
      .then((data) => {
        if (
          !cancelled &&
          Array.isArray(data.periods) &&
          data.periods.length > 0
        ) {
          setCache((prev) => ({
            ...prev,
            [cacheKey]: data.periods,
          }));
        }
      })
      .catch(() => {
        // Fallback handled seamlessly by buildFallbackStatements
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [stock.ticker, periodType, cacheKey, cache]);

  const periods: FinancialStatementPeriod[] = useMemo(() => {
    if (cache[cacheKey] && cache[cacheKey].length > 0) {
      return cache[cacheKey];
    }
    return buildFallbackStatements(stock, periodType);
  }, [cache, cacheKey, stock, periodType]);

  const latest = periods[periods.length - 1];
  const sym = stock.currencySymbol;

  const formatB = (val: number) => {
    const abs = Math.abs(val);
    const sign = val < 0 ? "-" : "";
    if (abs >= 1000) return `${sign}${sym}${(abs / 1000).toFixed(2)}T`;
    return `${sign}${sym}${abs.toFixed(1)}B`;
  };

  // Max values for scaling SVG bar charts
  const maxIncomeVal = useMemo(() => {
    let m = 1;
    for (const p of periods) {
      m = Math.max(
        m,
        p.totalRevenue,
        p.grossProfit,
        Math.abs(p.operatingIncome),
        Math.abs(p.netIncome)
      );
    }
    return m * 1.15;
  }, [periods]);

  const maxBalanceVal = useMemo(() => {
    let m = 1;
    for (const p of periods) {
      m = Math.max(
        m,
        p.totalAssets,
        p.totalLiabilities,
        Math.abs(p.stockholdersEquity)
      );
    }
    return m * 1.15;
  }, [periods]);

  const maxCashDebtVal = useMemo(() => {
    let m = 1;
    for (const p of periods) {
      m = Math.max(m, p.cashAndEquivalents, p.totalDebt);
    }
    return m * 1.18;
  }, [periods]);

  return (
    <div className="space-y-6">
      {/* Header Controls & Period Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/80 px-5 py-4">
        <div className="flex items-center gap-3">
          <Landmark className="h-5 w-5 text-emerald-400" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Core Income Statement &amp; Balance Sheet Metrics ({stock.currency})
            </h2>
            <p className="text-xs text-slate-400">
              Focused exclusively on essential earnings power, margin trajectory,
              and balance sheet solvency
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isLoading && (
            <span className="text-xs text-amber-300 animate-pulse">
              Syncing {periodType} statements…
            </span>
          )}
          <div
            className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-0.5"
            role="group"
            aria-label="Statement reporting frequency"
          >
            <button
              type="button"
              onClick={() => setPeriodType("annual")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                periodType === "annual"
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Annual (FY)
            </button>
            <button
              type="button"
              onClick={() => setPeriodType("quarterly")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                periodType === "quarterly"
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Quarterly (Q)
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 Essential KPI Cards (Latest Period) */}
      {latest && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total Revenue ({latest.period})</span>
              <BarChart3 className="h-4 w-4 text-sky-400" aria-hidden="true" />
            </div>
            <div className="mt-1.5 text-xl font-bold text-white tabular-nums">
              {formatB(latest.totalRevenue)}
            </div>
            <p className="mt-1 text-xs text-slate-400 tabular-nums">
              Gross Profit: {formatB(latest.grossProfit)} (
              {latest.grossMarginPct.toFixed(1)}%)
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Net Income ({latest.period})</span>
              <TrendingUp
                className="h-4 w-4 text-emerald-400"
                aria-hidden="true"
              />
            </div>
            <div className="mt-1.5 text-xl font-bold text-emerald-400 tabular-nums">
              {formatB(latest.netIncome)}
            </div>
            <p className="mt-1 text-xs text-slate-400 tabular-nums">
              Net Margin: {latest.netMarginPct.toFixed(1)}% · Operating:{" "}
              {latest.operatingMarginPct.toFixed(1)}%
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total Assets vs. Equity</span>
              <Layers className="h-4 w-4 text-violet-400" aria-hidden="true" />
            </div>
            <div className="mt-1.5 text-xl font-bold text-white tabular-nums">
              {formatB(latest.totalAssets)}
            </div>
            <p className="mt-1 text-xs text-slate-400 tabular-nums">
              Equity: {formatB(latest.stockholdersEquity)} · Liab:{" "}
              {formatB(latest.totalLiabilities)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Cash vs. Total Debt</span>
              <Wallet className="h-4 w-4 text-amber-400" aria-hidden="true" />
            </div>
            <div className="mt-1.5 text-xl font-bold text-white tabular-nums">
              {formatB(latest.cashAndEquivalents)}{" "}
              <span className="text-xs font-normal text-slate-400">
                vs {formatB(latest.totalDebt)} Debt
              </span>
            </div>
            <p className="mt-1 text-xs tabular-nums">
              Net {latest.netCash >= 0 ? "Cash" : "Debt"}:{" "}
              <strong
                className={
                  latest.netCash >= 0 ? "text-emerald-400" : "text-amber-300"
                }
              >
                {formatB(latest.netCash)}
              </strong>
            </p>
          </div>
        </div>
      )}

      {/* SECTION 1: INCOME STATEMENT CHARTS & TABLE */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3.5">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400">
              1. Income Statement — Revenue, Profit &amp; Margin Trajectory
            </h3>
            <p className="text-xs text-slate-400">
              Core top-line revenue conversion into Gross Profit, Operating Income,
              and Net Income
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <span className="h-2.5 w-2.5 rounded-sm bg-sky-500" />
              Revenue
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <span className="h-2.5 w-2.5 rounded-sm bg-violet-500" />
              Gross Profit
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
              Operating Income
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
              Net Income
            </span>
          </div>
        </div>

        {/* Income Statement Charts Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Chart 1A: Revenue, Gross Profit, Operating Income & Net Income Grouped Bars */}
          <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Revenue &amp; Earnings Scale (Billions {stock.currency})
            </h4>
            <svg
              viewBox="0 0 440 220"
              className="mt-3 w-full overflow-visible"
              role="img"
              aria-label="Income Statement Revenue and Profit Bar Chart"
            >
              {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
                const y = 20 + (1 - t) * 165;
                const val = maxIncomeVal * t;
                return (
                  <g key={idx}>
                    <line
                      x1="10"
                      y1={y}
                      x2="385"
                      y2={y}
                      stroke="#1e293b"
                      strokeDasharray="3 3"
                    />
                    <text
                      x="390"
                      y={y + 3}
                      fill="#94a3b8"
                      fontSize="9.5"
                      className="tabular-nums"
                    >
                      {sym}
                      {val.toFixed(0)}B
                    </text>
                  </g>
                );
              })}

              {periods.map((p, i) => {
                const groupW = 365 / Math.max(1, periods.length);
                const groupX = 18 + i * groupW;
                const barW = Math.min(16, (groupW - 22) / 4);
                const baseY = 185;

                const bars = [
                  { val: p.totalRevenue, color: "#0ea5e9" },
                  { val: p.grossProfit, color: "#8b5cf6" },
                  { val: Math.max(0, p.operatingIncome), color: "#f59e0b" },
                  { val: Math.max(0, p.netIncome), color: "#10b981" },
                ];

                return (
                  <g key={p.period}>
                    {bars.map((b, bIdx) => {
                      const h = Math.max(
                        2,
                        (b.val / (maxIncomeVal || 1)) * 165
                      );
                      const x = groupX + bIdx * (barW + 2.5);
                      return (
                        <rect
                          key={bIdx}
                          x={x}
                          y={baseY - h}
                          width={barW}
                          height={h}
                          fill={b.color}
                          rx="2"
                        />
                      );
                    })}
                    <text
                      x={groupX + (barW * 4 + 7.5) / 2}
                      y="204"
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="10"
                      fontWeight="600"
                    >
                      {p.period}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Chart 1B: Gross, Operating & Net Margin % Trend */}
          <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Profitability Margin Trajectory (%)
              </h4>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-violet-300">● Gross %</span>
                <span className="text-amber-300">● Operating %</span>
                <span className="text-emerald-300">● Net %</span>
              </div>
            </div>

            <svg
              viewBox="0 0 440 220"
              className="mt-3 w-full overflow-visible"
              role="img"
              aria-label="Income Statement Margin Percentages Chart"
            >
              {[0, 25, 50, 75, 100].map((pct) => {
                const y = 20 + (1 - pct / 100) * 165;
                return (
                  <g key={pct}>
                    <line
                      x1="15"
                      y1={y}
                      x2="385"
                      y2={y}
                      stroke="#1e293b"
                      strokeDasharray="3 3"
                    />
                    <text
                      x="392"
                      y={y + 3}
                      fill="#94a3b8"
                      fontSize="9.5"
                      className="tabular-nums"
                    >
                      {pct}%
                    </text>
                  </g>
                );
              })}

              {(
                [
                  { key: "grossMarginPct", color: "#a78bfa" },
                  { key: "operatingMarginPct", color: "#fbbf24" },
                  { key: "netMarginPct", color: "#34d399" },
                ] as const
              ).map((serie) => {
                const pts = periods.map((p, i) => {
                  const x =
                    periods.length <= 1
                      ? 200
                      : 45 + (i / (periods.length - 1)) * 315;
                  const val = Math.min(100, Math.max(0, p[serie.key]));
                  const y = 20 + (1 - val / 100) * 165;
                  return { x, y, val, period: p.period };
                });
                const pathD = pts
                  .map(
                    (pt, idx) =>
                      `${idx === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(
                        1
                      )}`
                  )
                  .join(" ");

                return (
                  <g key={serie.key}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke={serie.color}
                      strokeWidth="2.2"
                    />
                    {pts.map((pt, idx) => (
                      <g key={idx}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="3.5"
                          fill={serie.color}
                        />
                        <text
                          x={pt.x}
                          y={pt.y - 7}
                          textAnchor="middle"
                          fill={serie.color}
                          fontSize="9.5"
                          fontWeight="600"
                          className="tabular-nums"
                        >
                          {pt.val.toFixed(1)}%
                        </text>
                      </g>
                    ))}
                  </g>
                );
              })}

              {periods.map((p, i) => {
                const x =
                  periods.length <= 1
                    ? 200
                    : 45 + (i / (periods.length - 1)) * 315;
                return (
                  <text
                    key={p.period}
                    x={x}
                    y="204"
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="10"
                    fontWeight="600"
                  >
                    {p.period}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Core Income Statement Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-800/80">
          <table className="w-full text-left text-xs tabular-nums">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-2.5">Essential Income Metric</th>
                {periods.map((p) => (
                  <th key={p.period} className="px-4 py-2.5 text-right">
                    {p.period} ({p.asOfDate})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr className="hover:bg-slate-800/30">
                <td className="px-4 py-2.5 font-semibold text-sky-300">
                  Total Revenue
                </td>
                {periods.map((p) => (
                  <td
                    key={p.period}
                    className="px-4 py-2.5 text-right font-semibold text-white"
                  >
                    {formatB(p.totalRevenue)}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="px-4 py-2.5 font-medium text-violet-300">
                  Gross Profit (Gross Margin %)
                </td>
                {periods.map((p) => (
                  <td key={p.period} className="px-4 py-2.5 text-right text-slate-200">
                    {formatB(p.grossProfit)}{" "}
                    <span className="text-slate-400">
                      ({p.grossMarginPct.toFixed(1)}%)
                    </span>
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="px-4 py-2.5 font-medium text-amber-300">
                  Operating Income / EBIT (Op Margin %)
                </td>
                {periods.map((p) => (
                  <td key={p.period} className="px-4 py-2.5 text-right text-slate-200">
                    {formatB(p.operatingIncome)}{" "}
                    <span className="text-slate-400">
                      ({p.operatingMarginPct.toFixed(1)}%)
                    </span>
                  </td>
                ))}
              </tr>
              <tr className="bg-emerald-500/5 hover:bg-emerald-500/10">
                <td className="px-4 py-2.5 font-bold text-emerald-300">
                  Net Income (Net Profit Margin %)
                </td>
                {periods.map((p) => (
                  <td
                    key={p.period}
                    className="px-4 py-2.5 text-right font-bold text-emerald-400"
                  >
                    {formatB(p.netIncome)}{" "}
                    <span className="font-normal text-slate-300">
                      ({p.netMarginPct.toFixed(1)}%)
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 2: BALANCE SHEET CHARTS & TABLE */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3.5">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">
              2. Balance Sheet — Assets, Liabilities, Equity &amp; Liquidity
            </h3>
            <p className="text-xs text-slate-400">
              Core capital structure, stockholders&apos; equity backing, and
              cash-to-debt coverage
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <span className="h-2.5 w-2.5 rounded-sm bg-sky-500" />
              Total Assets
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
              Total Liabilities
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
              Stockholders&apos; Equity
            </span>
          </div>
        </div>

        {/* Balance Sheet Charts Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Chart 2A: Total Assets vs Total Liabilities vs Stockholders' Equity */}
          <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Assets vs. Liabilities &amp; Equity (Billions {stock.currency})
            </h4>
            <svg
              viewBox="0 0 440 220"
              className="mt-3 w-full overflow-visible"
              role="img"
              aria-label="Balance Sheet Assets Liabilities and Equity Bar Chart"
            >
              {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
                const y = 20 + (1 - t) * 165;
                const val = maxBalanceVal * t;
                return (
                  <g key={idx}>
                    <line
                      x1="10"
                      y1={y}
                      x2="385"
                      y2={y}
                      stroke="#1e293b"
                      strokeDasharray="3 3"
                    />
                    <text
                      x="390"
                      y={y + 3}
                      fill="#94a3b8"
                      fontSize="9.5"
                      className="tabular-nums"
                    >
                      {sym}
                      {val.toFixed(0)}B
                    </text>
                  </g>
                );
              })}

              {periods.map((p, i) => {
                const groupW = 365 / Math.max(1, periods.length);
                const groupX = 22 + i * groupW;
                const barW = Math.min(20, (groupW - 22) / 3);
                const baseY = 185;

                const bars = [
                  { val: p.totalAssets, color: "#0ea5e9" },
                  { val: p.totalLiabilities, color: "#f43f5e" },
                  { val: Math.max(0, p.stockholdersEquity), color: "#10b981" },
                ];

                return (
                  <g key={p.period}>
                    {bars.map((b, bIdx) => {
                      const h = Math.max(
                        2,
                        (b.val / (maxBalanceVal || 1)) * 165
                      );
                      const x = groupX + bIdx * (barW + 3);
                      return (
                        <rect
                          key={bIdx}
                          x={x}
                          y={baseY - h}
                          width={barW}
                          height={h}
                          fill={b.color}
                          rx="2"
                        />
                      );
                    })}
                    <text
                      x={groupX + (barW * 3 + 6) / 2}
                      y="204"
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="10"
                      fontWeight="600"
                    >
                      {p.period}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Chart 2B: Cash & Equivalents vs Total Debt */}
          <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Cash &amp; Equivalents vs. Total Debt (Billions {stock.currency})
              </h4>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-emerald-300">■ Cash &amp; Equiv.</span>
                <span className="text-amber-300">■ Total Debt</span>
              </div>
            </div>

            <svg
              viewBox="0 0 440 220"
              className="mt-3 w-full overflow-visible"
              role="img"
              aria-label="Balance Sheet Cash versus Total Debt Bar Chart"
            >
              {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
                const y = 20 + (1 - t) * 165;
                const val = maxCashDebtVal * t;
                return (
                  <g key={idx}>
                    <line
                      x1="10"
                      y1={y}
                      x2="385"
                      y2={y}
                      stroke="#1e293b"
                      strokeDasharray="3 3"
                    />
                    <text
                      x="390"
                      y={y + 3}
                      fill="#94a3b8"
                      fontSize="9.5"
                      className="tabular-nums"
                    >
                      {sym}
                      {val.toFixed(0)}B
                    </text>
                  </g>
                );
              })}

              {periods.map((p, i) => {
                const groupW = 365 / Math.max(1, periods.length);
                const groupX = 28 + i * groupW;
                const barW = Math.min(24, (groupW - 26) / 2);
                const baseY = 185;

                const cashH = Math.max(
                  2,
                  (p.cashAndEquivalents / (maxCashDebtVal || 1)) * 165
                );
                const debtH = Math.max(
                  2,
                  (p.totalDebt / (maxCashDebtVal || 1)) * 165
                );

                return (
                  <g key={p.period}>
                    <rect
                      x={groupX}
                      y={baseY - cashH}
                      width={barW}
                      height={cashH}
                      fill="#10b981"
                      rx="2"
                    />
                    <rect
                      x={groupX + barW + 4}
                      y={baseY - debtH}
                      width={barW}
                      height={debtH}
                      fill="#f59e0b"
                      rx="2"
                    />
                    <text
                      x={groupX + barW + 2}
                      y="204"
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="10"
                      fontWeight="600"
                    >
                      {p.period}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Core Balance Sheet Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-800/80">
          <table className="w-full text-left text-xs tabular-nums">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-2.5">Essential Balance Sheet Metric</th>
                {periods.map((p) => (
                  <th key={p.period} className="px-4 py-2.5 text-right">
                    {p.period} ({p.asOfDate})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr className="hover:bg-slate-800/30">
                <td className="px-4 py-2.5 font-semibold text-sky-300">
                  Total Assets
                </td>
                {periods.map((p) => (
                  <td
                    key={p.period}
                    className="px-4 py-2.5 text-right font-semibold text-white"
                  >
                    {formatB(p.totalAssets)}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="px-4 py-2.5 font-medium text-rose-300">
                  Total Liabilities
                </td>
                {periods.map((p) => (
                  <td key={p.period} className="px-4 py-2.5 text-right text-slate-200">
                    {formatB(p.totalLiabilities)}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="px-4 py-2.5 font-semibold text-emerald-300">
                  Stockholders&apos; Equity
                </td>
                {periods.map((p) => (
                  <td
                    key={p.period}
                    className="px-4 py-2.5 text-right font-semibold text-emerald-400"
                  >
                    {formatB(p.stockholdersEquity)}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="px-4 py-2.5 font-medium text-emerald-300">
                  Cash &amp; Cash Equivalents
                </td>
                {periods.map((p) => (
                  <td key={p.period} className="px-4 py-2.5 text-right text-slate-200">
                    {formatB(p.cashAndEquivalents)}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="px-4 py-2.5 font-medium text-amber-300">
                  Total Debt
                </td>
                {periods.map((p) => (
                  <td key={p.period} className="px-4 py-2.5 text-right text-slate-200">
                    {formatB(p.totalDebt)}
                  </td>
                ))}
              </tr>
              <tr className="bg-slate-950/60">
                <td className="px-4 py-2.5 font-bold text-slate-200">
                  Net Cash / (Debt) Position
                </td>
                {periods.map((p) => (
                  <td
                    key={p.period}
                    className={`px-4 py-2.5 text-right font-bold ${
                      p.netCash >= 0 ? "text-emerald-400" : "text-amber-300"
                    }`}
                  >
                    {formatB(p.netCash)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

