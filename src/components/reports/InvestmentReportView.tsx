"use client";

import React, { useMemo, useState } from "react";
import {
  evaluateAllMetrics,
  generateMarkdownReport,
} from "@/lib/analysis/engine";
import { StockProfile } from "@/lib/types/stock";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  FileCode2,
  FileSpreadsheet,
  FileText,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

interface InvestmentReportViewProps {
  stock: StockProfile;
}

export function InvestmentReportView({ stock }: InvestmentReportViewProps) {
  const [viewMode, setViewMode] = useState<"formatted" | "markdown">(
    "formatted"
  );
  const [copied, setCopied] = useState(false);

  const markdownReport = useMemo(
    () => generateMarkdownReport(stock),
    [stock]
  );

  const evaluatedMetrics = useMemo(() => evaluateAllMetrics(stock), [stock]);

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdownReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdownReport], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${stock.ticker}-stock-analysis-report.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    const headers = [
      "Category",
      "Metric",
      "Formula",
      "Value",
      "Industry Benchmark",
      "vs Industry (%)",
      "Assessment",
      "Interpretation",
    ];
    const rows = evaluatedMetrics.map((m) => [
      `"${m.category}"`,
      `"${m.label}"`,
      `"${m.formula}"`,
      `"${m.formattedValue}"`,
      `"${m.formattedIndustry}"`,
      `"${m.vsIndustryPercent.toFixed(1)}%"`,
      `"${m.assessment}"`,
      `"${m.interpretation}"`,
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${stock.ticker}-financial-metrics.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Report Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div
            className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-0.5"
            role="group"
            aria-label="Report format view"
          >
            <button
              type="button"
              onClick={() => setViewMode("formatted")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                viewMode === "formatted"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Structured Report
            </button>
            <button
              type="button"
              onClick={() => setViewMode("markdown")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                viewMode === "markdown"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileCode2 className="h-3.5 w-3.5" aria-hidden="true" />
              Raw Markdown (Skill Output)
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                <span className="text-emerald-300">Copied Markdown</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copy Report MD</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Export .MD</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Export Metrics .CSV</span>
          </button>
        </div>
      </div>

      {viewMode === "markdown" ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-200">
            {markdownReport}
          </pre>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Institutional Equity Research Report
                </span>
                <h2 className="mt-1 text-xl font-bold text-white">
                  Stock Analysis Report: {stock.ticker} — {stock.name}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Market: {stock.exchange} · Sector: {stock.sector} · Date:{" "}
                  {stock.updatedAt}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                    stock.rating === "Bullish"
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                      : stock.rating === "Bearish"
                      ? "border-rose-500/40 bg-rose-500/15 text-rose-300"
                      : "border-sky-500/40 bg-sky-500/15 text-sky-300"
                  }`}
                >
                  Rating: {stock.rating}
                </span>
                <span
                  className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                    stock.riskLevel === "Low"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : stock.riskLevel === "Medium"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  }`}
                >
                  Risk: {stock.riskLevel}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Executive Summary
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                {stock.executiveSummary}
              </p>
            </div>
          </section>

          {/* Bull Case vs Bear Case */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-emerald-500/25 bg-slate-900/80 p-5">
              <div className="flex items-center gap-2 text-emerald-400">
                <TrendingUp className="h-5 w-5" aria-hidden="true" />
                <h3 className="text-sm font-semibold uppercase tracking-wider">
                  Bull Case Catalysts
                </h3>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-slate-200">
                {stock.bullCase.map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-rose-500/25 bg-slate-900/80 p-5">
              <div className="flex items-center gap-2 text-rose-400">
                <TrendingDown className="h-5 w-5" aria-hidden="true" />
                <h3 className="text-sm font-semibold uppercase tracking-wider">
                  Bear Case Scenarios
                </h3>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-slate-200">
                {stock.bearCase.map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-400" />
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Key Risk Factors */}
          <section className="rounded-xl border border-amber-500/25 bg-slate-900/80 p-5">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              <h3 className="text-sm font-semibold uppercase tracking-wider">
                Key Risk Factors &amp; Monitoring Checklist
              </h3>
            </div>
            <ol className="mt-4 space-y-2.5 text-sm text-slate-200">
              {stock.riskFactors.map((risk, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xs font-semibold text-amber-300 tabular-nums">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{risk}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </div>
  );
}

