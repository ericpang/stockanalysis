"use client";

import React, { useMemo, useState } from "react";
import { PeerStock, StockProfile } from "@/lib/types/stock";
import { ArrowUpDown, Building2, ExternalLink } from "lucide-react";

interface PeerComparisonViewProps {
  stock: StockProfile;
  availableTickers: string[];
  onSelectTicker: (ticker: string) => void;
}

type SortKey =
  | "peRatio"
  | "pbRatio"
  | "evEbitda"
  | "roe"
  | "revenueGrowthYoY"
  | "netMargin"
  | "debtToEquity";

export function PeerComparisonView({
  stock,
  availableTickers,
  onSelectTicker,
}: PeerComparisonViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("peRatio");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const combinedRows: Array<PeerStock & { isSubject?: boolean }> =
    useMemo(() => {
      const subjectRow: PeerStock & { isSubject: boolean } = {
        ticker: stock.ticker,
        name: `${stock.name} (Selected)`,
        market: stock.market,
        currencySymbol: stock.currencySymbol,
        price: stock.price,
        changePercent: stock.changePercent,
        marketCap: stock.marketCap,
        peRatio: stock.valuation.peRatio,
        pbRatio: stock.valuation.pbRatio,
        evEbitda: stock.valuation.evEbitda,
        roe: stock.profitability.roe,
        revenueGrowthYoY: stock.growth.revenueGrowthYoY,
        netMargin: stock.profitability.netMargin,
        debtToEquity: stock.health.debtToEquity,
        isSubject: true,
      };

      const rows = [subjectRow, ...stock.peers];
      return rows.sort((a, b) => {
        const diff = a[sortKey] - b[sortKey];
        return sortAsc ? diff : -diff;
      });
    }, [stock, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(
        key === "peRatio" ||
          key === "pbRatio" ||
          key === "evEbitda" ||
          key === "debtToEquity"
      );
    }
  };

  const peerMedian = useMemo(() => {
    const avg = (vals: number[]) =>
      vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
    return {
      peRatio: avg(stock.peers.map((p) => p.peRatio)),
      pbRatio: avg(stock.peers.map((p) => p.pbRatio)),
      evEbitda: avg(stock.peers.map((p) => p.evEbitda)),
      roe: avg(stock.peers.map((p) => p.roe)),
      revenueGrowthYoY: avg(stock.peers.map((p) => p.revenueGrowthYoY)),
      netMargin: avg(stock.peers.map((p) => p.netMargin)),
      debtToEquity: avg(stock.peers.map((p) => p.debtToEquity)),
    };
  }, [stock.peers]);

  return (
    <div className="space-y-6">
      {/* Relative Positioning Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <span className="text-xs text-slate-400">
            P/E vs Peer Group Avg
          </span>
          <div className="mt-1.5 flex items-baseline gap-2 tabular-nums">
            <span className="text-xl font-bold text-white">
              {stock.valuation.peRatio.toFixed(1)}x
            </span>
            <span className="text-xs text-slate-400">
              vs {peerMedian.peRatio.toFixed(1)}x
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {stock.valuation.peRatio <= peerMedian.peRatio
              ? "Trades at a valuation discount to direct peers"
              : "Commands a quality/growth premium over peers"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <span className="text-xs text-slate-400">
            ROE vs Peer Group Avg
          </span>
          <div className="mt-1.5 flex items-baseline gap-2 tabular-nums">
            <span className="text-xl font-bold text-emerald-400">
              {stock.profitability.roe.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400">
              vs {peerMedian.roe.toFixed(1)}%
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {stock.profitability.roe >= peerMedian.roe
              ? "Superior shareholder equity returns vs peers"
              : "Lower ROE than peer group average"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <span className="text-xs text-slate-400">
            Revenue Growth vs Peers
          </span>
          <div className="mt-1.5 flex items-baseline gap-2 tabular-nums">
            <span className="text-xl font-bold text-sky-400">
              {stock.growth.revenueGrowthYoY >= 0 ? "+" : ""}
              {stock.growth.revenueGrowthYoY.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400">
              vs +{peerMedian.revenueGrowthYoY.toFixed(1)}%
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {stock.growth.revenueGrowthYoY >= peerMedian.revenueGrowthYoY
              ? "Gaining market share faster than competitors"
              : "Growing at a more mature pace than peers"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <span className="text-xs text-slate-400">
            Net Margin vs Peers
          </span>
          <div className="mt-1.5 flex items-baseline gap-2 tabular-nums">
            <span className="text-xl font-bold text-violet-400">
              {stock.profitability.netMargin.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400">
              vs {peerMedian.netMargin.toFixed(1)}%
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {stock.profitability.netMargin >= peerMedian.netMargin
              ? "Industry-leading bottom-line profit conversion"
              : "Lower net margin than peer group average"}
          </p>
        </div>
      </div>

      {/* Peer Comparison Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Building2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold text-white">
                Peer Comparison Matrix — {stock.sector}
              </h2>
              <p className="text-xs text-slate-400">
                Click any column header to sort relative peer rankings
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-medium uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Company / Ticker</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Market Cap</th>
                {(
                  [
                    { key: "peRatio", label: "P/E" },
                    { key: "pbRatio", label: "P/B" },
                    { key: "evEbitda", label: "EV/EBITDA" },
                    { key: "roe", label: "ROE" },
                    { key: "revenueGrowthYoY", label: "Rev Growth" },
                    { key: "netMargin", label: "Net Margin" },
                    { key: "debtToEquity", label: "Debt/Eq" },
                  ] as Array<{ key: SortKey; label: string }>
                ).map((col) => (
                  <th key={col.key} className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className={`inline-flex items-center gap-1 font-medium uppercase tracking-wider transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded ${
                        sortKey === col.key ? "text-emerald-400" : "text-slate-400"
                      }`}
                    >
                      <span>{col.label}</span>
                      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 tabular-nums">
              {combinedRows.map((row) => {
                const canInspect = !row.isSubject;
                return (
                  <tr
                    key={row.ticker}
                    className={
                      row.isSubject
                        ? "bg-emerald-500/10 font-medium"
                        : "hover:bg-slate-800/35 transition"
                    }
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            row.isSubject ? "text-emerald-300" : "text-white"
                          }`}
                        >
                          {row.ticker}
                        </span>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                          {row.market}
                        </span>
                        {canInspect && (
                          <button
                            type="button"
                            onClick={() => onSelectTicker(row.ticker)}
                            title={`Load live analysis for ${row.ticker}`}
                            aria-label={`Load live analysis for ${row.ticker}`}
                            className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[11px] text-sky-300 hover:border-sky-500/50 hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                          >
                            <span>Inspect Live</span>
                            <ExternalLink
                              className="h-2.5 w-2.5"
                              aria-hidden="true"
                            />
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">{row.name}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="text-slate-100">
                        {row.currencySymbol}
                        {row.price.toFixed(2)}
                      </div>
                      <div
                        className={`text-xs ${
                          row.changePercent >= 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {row.changePercent >= 0 ? "▲ +" : "▼ "}
                        {row.changePercent.toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-300">
                      {row.marketCap}
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-100">
                      {row.peRatio.toFixed(1)}x
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-200">
                      {row.pbRatio.toFixed(2)}x
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-200">
                      {row.evEbitda.toFixed(1)}x
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-emerald-300">
                      {row.roe.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3.5 text-right text-sky-300">
                      {row.revenueGrowthYoY >= 0 ? "+" : ""}
                      {row.revenueGrowthYoY.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-200">
                      {row.netMargin.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-300">
                      {row.debtToEquity.toFixed(2)}x
                    </td>
                  </tr>
                );
              })}

              {/* Sector Benchmark Average Row */}
              <tr className="border-t-2 border-slate-700 bg-slate-950/80 text-xs font-semibold text-slate-300">
                <td className="px-5 py-3">
                  Sector Benchmark Average ({stock.sector})
                </td>
                <td className="px-4 py-3 text-right">—</td>
                <td className="px-4 py-3 text-right">—</td>
                <td className="px-4 py-3 text-right">
                  {stock.industryBenchmarks.peRatio.toFixed(1)}x
                </td>
                <td className="px-4 py-3 text-right">
                  {stock.industryBenchmarks.pbRatio.toFixed(2)}x
                </td>
                <td className="px-4 py-3 text-right">
                  {stock.industryBenchmarks.evEbitda.toFixed(1)}x
                </td>
                <td className="px-4 py-3 text-right">
                  {stock.industryBenchmarks.roe.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right">
                  +{stock.industryBenchmarks.revenueGrowthYoY.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right">
                  {stock.industryBenchmarks.netMargin.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right">
                  {stock.industryBenchmarks.debtToEquity.toFixed(2)}x
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

