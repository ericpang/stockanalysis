"use client";

import React from "react";
import { EvaluatedMetric, evaluateAllMetrics } from "@/lib/analysis/engine";
import { MetricAssessment, StockProfile } from "@/lib/types/stock";
import {
  CheckCircle2,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

interface FundamentalBreakdownProps {
  stock: StockProfile;
  compact?: boolean;
}

export function getAssessmentBadgeStyle(assessment: MetricAssessment): string {
  switch (assessment) {
    case "Undervalued":
    case "Attractive":
    case "Strong":
    case "Healthy":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "Fair":
    case "Moderate":
      return "bg-sky-500/15 text-sky-300 border-sky-500/30";
    case "Expensive":
    case "Caution":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  }
}

export function FundamentalBreakdown({
  stock,
  compact = false,
}: FundamentalBreakdownProps) {
  const allMetrics = evaluateAllMetrics(stock);

  if (compact) {
    const quickKeys = [
      "peRatio",
      "pbRatio",
      "evEbitda",
      "pegRatio",
      "roe",
      "roic",
      "revenueGrowthYoY",
      "netMargin",
      "debtToEquity",
      "fcfYield",
    ];
    const quickMetrics = allMetrics.filter((m) => quickKeys.includes(m.key));

    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
              Key Metrics at a Glance
            </h2>
            <p className="text-xs text-slate-400">
              Benchmarked against {stock.sector} peers
            </p>
          </div>
          <span className="rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 tabular-nums">
            ROIC Spread:{" "}
            <strong className="text-emerald-400">
              +{(stock.profitability.roic - stock.profitability.wacc).toFixed(1)}%
            </strong>{" "}
            vs WACC ({stock.profitability.wacc.toFixed(1)}%)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/50 text-xs font-medium uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Metric</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3 text-right">Sector Avg</th>
                <th className="px-4 py-3 text-right">vs Industry</th>
                <th className="px-4 py-3">Assessment</th>
                <th className="px-5 py-3">Skill Benchmark Rule</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 tabular-nums">
              {quickMetrics.map((m) => (
                <tr
                  key={m.key}
                  className="transition hover:bg-slate-800/35"
                >
                  <td className="px-5 py-3 font-medium text-slate-100">
                    <div>{m.label}</div>
                    <div className="text-[11px] font-normal text-slate-500">
                      {m.formula}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {m.category}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-white">
                    {m.formattedValue}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400">
                    {m.formattedIndustry}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    <span
                      className={
                        m.isPositiveComparison
                          ? "text-emerald-400"
                          : "text-amber-300"
                      }
                    >
                      {m.vsIndustryPercent >= 0 ? "+" : ""}
                      {m.vsIndustryPercent.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getAssessmentBadgeStyle(
                        m.assessment
                      )}`}
                    >
                      {m.assessment}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400">
                    {m.interpretation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const categories: Array<{
    title: EvaluatedMetric["category"];
    subtitle: string;
    icon: React.ReactNode;
  }> = [
    {
      title: "Valuation",
      subtitle: "Price multiples relative to earnings, book value, sales, and growth",
      icon: <Scale className="h-4 w-4 text-sky-400" aria-hidden="true" />,
    },
    {
      title: "Profitability",
      subtitle: "Pricing power, operational efficiency, and capital allocation returns",
      icon: <Sparkles className="h-4 w-4 text-emerald-400" aria-hidden="true" />,
    },
    {
      title: "Growth",
      subtitle: "Top-line demand, operating leverage, and free cash flow expansion",
      icon: <TrendingUp className="h-4 w-4 text-violet-400" aria-hidden="true" />,
    },
    {
      title: "Financial Health",
      subtitle: "Balance sheet leverage, liquidity buffer, and debt coverage",
      icon: <ShieldCheck className="h-4 w-4 text-amber-400" aria-hidden="true" />,
    },
  ];

  const roicSpread = stock.profitability.roic - stock.profitability.wacc;
  const hasOperatingLeverage =
    stock.growth.epsGrowthYoY > stock.growth.revenueGrowthYoY;

  return (
    <div className="space-y-6">
      {/* Fundamental Narrative Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-400">
            Business Model &amp; Moat
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {stock.businessOverview}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Financial Performance
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {stock.financialPerformanceSummary}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Valuation Assessment
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {stock.valuationSummary}
          </p>
        </div>
      </div>

      {/* Capital Efficiency & Operating Leverage Diagnostic Banner */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Economic Value Creation (ROIC vs WACC)
            </span>
            <div className="mt-1 flex items-baseline gap-2 tabular-nums">
              <span className="text-lg font-bold text-white">
                ROIC {stock.profitability.roic.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">
                vs WACC {stock.profitability.wacc.toFixed(1)}%
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Net Economic Spread:{" "}
              <strong
                className={
                  roicSpread >= 0 ? "text-emerald-400" : "text-rose-400"
                }
              >
                {roicSpread >= 0 ? "+" : ""}
                {roicSpread.toFixed(1)}%
              </strong>{" "}
              ({roicSpread > 0 ? "Creates Shareholder Value" : "Below Cost of Capital"})
            </p>
          </div>
          <CheckCircle2
            className={`h-8 w-8 shrink-0 ${
              roicSpread > 0 ? "text-emerald-400" : "text-amber-400"
            }`}
            aria-hidden="true"
          />
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Operating Leverage Diagnostic
            </span>
            <div className="mt-1 flex items-baseline gap-2 tabular-nums">
              <span className="text-lg font-bold text-white">
                EPS {stock.growth.epsGrowthYoY >= 0 ? "+" : ""}
                {stock.growth.epsGrowthYoY.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">
                vs Revenue {stock.growth.revenueGrowthYoY >= 0 ? "+" : ""}
                {stock.growth.revenueGrowthYoY.toFixed(1)}%
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {hasOperatingLeverage
                ? "Positive operating leverage: earnings growing faster than revenue."
                : "Margin compression or reinvestment phase: revenue outpacing EPS."}
            </p>
          </div>
          <TrendingUp
            className={`h-8 w-8 shrink-0 ${
              hasOperatingLeverage ? "text-emerald-400" : "text-sky-400"
            }`}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Category Breakdown Sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {categories.map((cat) => {
          const items = allMetrics.filter((m) => m.category === cat.title);
          return (
            <section
              key={cat.title}
              className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  {cat.icon}
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {cat.title} Metrics
                    </h3>
                    <p className="text-xs text-slate-400">{cat.subtitle}</p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-800/60">
                {items.map((m) => (
                  <div
                    key={m.key}
                    className="p-4 transition hover:bg-slate-800/30"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-medium text-slate-100">
                          {m.label}
                        </span>
                        <span className="ml-2 text-xs text-slate-500">
                          ({m.formula})
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 tabular-nums">
                        <span className="text-base font-bold text-white">
                          {m.formattedValue}
                        </span>
                        <span className="text-xs text-slate-400">
                          vs {m.formattedIndustry} ({m.vsIndustryPercent >= 0 ? "+" : ""}
                          {m.vsIndustryPercent.toFixed(0)}%)
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getAssessmentBadgeStyle(
                            m.assessment
                          )}`}
                        >
                          {m.assessment}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                      <span>{m.interpretation}</span>
                      <span className="text-slate-500">
                        Benchmark: {m.benchmarkRule}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

