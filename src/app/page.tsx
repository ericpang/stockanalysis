"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MARKET_LABELS, STOCK_CATALOG } from "@/lib/data/stocks";
import { AnalysisMode, MarketCode, StockProfile } from "@/lib/types/stock";
import { FundamentalBreakdown } from "@/components/metrics/FundamentalBreakdown";
import { TechnicalChart } from "@/components/charts/TechnicalChart";
import { PeerComparisonView } from "@/components/peers/PeerComparisonView";
import { InvestmentReportView } from "@/components/reports/InvestmentReportView";
import { CustomStockAnalyzer } from "@/components/custom/CustomStockAnalyzer";
import { FinancialStatementsView } from "@/components/statements/FinancialStatementsView";
import { IntrinsicValueView } from "@/components/valuation/IntrinsicValueView";
import {
  Activity,
  BarChart3,
  BookOpen,
  Calculator,
  FileText,
  Globe2,
  Landmark,
  Layers,
  Moon,
  Radio,
  RefreshCw,
  Scale,
  Search,
  ShieldAlert,
  Sun,
  TrendingUp,
  Users,
} from "lucide-react";

export default function DayTradeApp() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [stocks, setStocks] = useState<StockProfile[]>(STOCK_CATALOG);
  const [selectedTicker, setSelectedTicker] = useState<string>("AAPL");
  const [marketFilter, setMarketFilter] = useState<"ALL" | MarketCode>("ALL");
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("quick");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isFetchingTicker, setIsFetchingTicker] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const syncAllLiveQuotes = useCallback(async () => {
    setIsSyncing(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/stock", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.stocks) && data.stocks.length > 0) {
        setStocks((prev) => {
          const updatedMap = new Map<string, StockProfile>(
            data.stocks.map((s: StockProfile) => [s.ticker.toUpperCase(), s])
          );
          const merged = prev.map(
            (existing) =>
              updatedMap.get(existing.ticker.toUpperCase()) || existing
          );
          for (const s of data.stocks as StockProfile[]) {
            if (
              !merged.some(
                (m) => m.ticker.toUpperCase() === s.ticker.toUpperCase()
              )
            ) {
              merged.push(s);
            }
          }
          return merged;
        });
        setLastSyncedAt(
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
      }
    } catch {
      setFetchError("Could not reach live market data feed; showing cached snapshot.");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Automatically fetch live market data on initial load
  useEffect(() => {
    syncAllLiveQuotes();
  }, [syncAllLiveQuotes]);

  // Initialize and persist color theme (dark / light)
  useEffect(() => {
    const saved = localStorage.getItem("daytrade-theme");
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      document.documentElement.classList.remove("dark", "light");
      document.documentElement.classList.add(saved);
    }
  }, []);

  const toggleColorTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.remove("dark", "light");
      document.documentElement.classList.add(next);
      localStorage.setItem("daytrade-theme", next);
      return next;
    });
  };

  // Keyboard shortcut Cmd/Ctrl + K to focus ticker search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const fetchSingleLiveTicker = useCallback(
    async (rawTicker: string) => {
      const clean = rawTicker.trim().toUpperCase();
      if (!clean) return;

      setIsFetchingTicker(true);
      setFetchError(null);
      try {
        const res = await fetch(
          `/api/stock?ticker=${encodeURIComponent(clean)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (!res.ok || !data.stock) {
          throw new Error(data.error || `Ticker ${clean} not found`);
        }
        const liveProfile: StockProfile = data.stock;
        setStocks((prev) => {
          const exists = prev.some(
            (s) => s.ticker.toUpperCase() === liveProfile.ticker.toUpperCase()
          );
          if (exists) {
            return prev.map((s) =>
              s.ticker.toUpperCase() === liveProfile.ticker.toUpperCase()
                ? liveProfile
                : s
            );
          }
          return [liveProfile, ...prev];
        });
        setSelectedTicker(liveProfile.ticker);
        setMarketFilter("ALL");
        setSearchQuery("");
        if (analysisMode === "custom") {
          setAnalysisMode("quick");
        }
      } catch (err: any) {
        setFetchError(
          `Could not fetch live data for "${clean}". Try formats like AAPL, TSLA, 600519.SH, 000858.SZ, or 0700.HK.`
        );
      } finally {
        setIsFetchingTicker(false);
      }
    },
    [analysisMode]
  );

  const filteredStocks = useMemo(() => {
    return stocks.filter((s) => {
      const matchesMarket =
        marketFilter === "ALL" || s.market === marketFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        s.ticker.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q);
      return matchesMarket && matchesQuery;
    });
  }, [stocks, marketFilter, searchQuery]);

  const activeStock = useMemo(() => {
    return (
      stocks.find(
        (s) => s.ticker.toUpperCase() === selectedTicker.toUpperCase()
      ) ||
      filteredStocks[0] ||
      stocks[0]
    );
  }, [stocks, selectedTicker, filteredStocks]);

  const handleSelectTicker = (ticker: string) => {
    const exists = stocks.some(
      (s) => s.ticker.toUpperCase() === ticker.toUpperCase()
    );
    if (exists) {
      setSelectedTicker(ticker);
      if (analysisMode === "custom") {
        setAnalysisMode("quick");
      }
    } else {
      fetchSingleLiveTicker(ticker);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    const exactMatch = stocks.find(
      (s) => s.ticker.toUpperCase() === q.toUpperCase()
    );
    if (exactMatch) {
      setSelectedTicker(exactMatch.ticker);
      setSearchQuery("");
      return;
    }
    fetchSingleLiveTicker(q);
  };

  const handleAddCustomStock = (newStock: StockProfile) => {
    setStocks((prev) => {
      const exists = prev.some(
        (s) => s.ticker.toUpperCase() === newStock.ticker.toUpperCase()
      );
      if (exists) {
        return prev.map((s) =>
          s.ticker.toUpperCase() === newStock.ticker.toUpperCase()
            ? newStock
            : s
        );
      }
      return [newStock, ...prev];
    });
    setSelectedTicker(newStock.ticker);
    setMarketFilter("ALL");
    setAnalysisMode("report");
  };

  const modeTabs: Array<{
    id: AnalysisMode;
    label: string;
    subtitle: string;
    icon: React.ReactNode;
  }> = [
    {
      id: "quick",
      label: "Quick Analysis",
      subtitle: "Key metrics & chart snapshot",
      icon: <Layers className="h-4 w-4" aria-hidden="true" />,
    },
    {
      id: "deep-dive",
      label: "Deep Dive (Fundamental)",
      subtitle: "17 valuation, margin & health ratios",
      icon: <BookOpen className="h-4 w-4" aria-hidden="true" />,
    },
    {
      id: "valuation",
      label: "Intrinsic / Fair Value",
      subtitle: "Sector-weighted DCF, EV/EBITDA & P/E",
      icon: <Scale className="h-4 w-4" aria-hidden="true" />,
    },
    {
      id: "statements",
      label: "Income & Balance Sheet",
      subtitle: "Core revenue, profit, assets & debt charts",
      icon: <Landmark className="h-4 w-4" aria-hidden="true" />,
    },
    {
      id: "technical",
      label: "Technical Review",
      subtitle: "SMA 50/200, RSI, MACD & patterns",
      icon: <Activity className="h-4 w-4" aria-hidden="true" />,
    },
    {
      id: "peers",
      label: "Peer Comparison",
      subtitle: "Competitor & sector benchmarking",
      icon: <Users className="h-4 w-4" aria-hidden="true" />,
    },
    {
      id: "report",
      label: "Investment Report",
      subtitle: "Full thesis & Markdown/CSV export",
      icon: <FileText className="h-4 w-4" aria-hidden="true" />,
    },
    {
      id: "custom",
      label: "Custom Ticker Input",
      subtitle: "Analyze custom financial data",
      icon: <Calculator className="h-4 w-4" aria-hidden="true" />,
    },
  ];

  const isPriceUp = activeStock.change >= 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navigation & Search Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          {/* Brand & Live Feed Status */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400">
              <BarChart3 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white">
                  DayTrade
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                  <Radio
                    className={`h-3 w-3 ${
                      isSyncing ? "animate-pulse text-amber-300" : "text-emerald-400"
                    }`}
                    aria-hidden="true"
                  />
                  {isSyncing
                    ? "Syncing Live Market Feed…"
                    : lastSyncedAt
                    ? `Live Feed · Synced ${lastSyncedAt}`
                    : "Live Market Feed"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                US · China A-Shares · Hong Kong Real-Time Equity Research
              </p>
            </div>
          </div>

          {/* Market Filter Pills */}
          <nav
            aria-label="Market exchange filter"
            className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 p-1"
          >
            {(
              [
                { code: "ALL", label: "All Markets" },
                { code: "US", label: "US (NYSE/NASDAQ)" },
                { code: "CN", label: "China A-Shares" },
                { code: "HK", label: "Hong Kong (HKEX)" },
              ] as const
            ).map((m) => (
              <button
                key={m.code}
                type="button"
                onClick={() => setMarketFilter(m.code)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  marketFilter === m.code
                    ? "bg-emerald-500 text-slate-950 font-semibold"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {m.label}
              </button>
            ))}
          </nav>

          {/* Search & Live Lookup Form + Sync Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex-1 sm:w-64"
            >
              <label htmlFor="ticker-search" className="sr-only">
                Search or fetch any live ticker (e.g., TSLA, 600519.SH, 0700.HK)
              </label>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                id="ticker-search"
                name="tickerSearch"
                type="search"
                autoComplete="off"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Any ticker (TSLA, 0700.HK)… ↵"
                className="w-full rounded-xl border border-slate-800 bg-slate-900 py-1.5 pl-9 pr-14 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:border-emerald-500/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              />
              {searchQuery.trim() && (
                <button
                  type="submit"
                  disabled={isFetchingTicker}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  {isFetchingTicker ? "…" : "Fetch"}
                </button>
              )}
            </form>

            <button
              type="button"
              onClick={syncAllLiveQuotes}
              disabled={isSyncing}
              title="Refresh live quotes and fundamentals from Yahoo Finance"
              aria-label="Refresh live quotes and fundamentals"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-700 hover:bg-slate-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-emerald-400" : ""}`}
                aria-hidden="true"
              />
              <span className="hidden md:inline">Sync Live</span>
            </button>

            <button
              type="button"
              onClick={toggleColorTheme}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} color theme`}
              aria-label={`Switch to ${theme === "dark" ? "Light" : "Dark"} color theme`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-700 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                  <span className="hidden md:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                  <span className="hidden md:inline">Dark</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Multi-Market Watchlist Strip */}
        <div className="border-t border-slate-800/70 bg-slate-900/40">
          <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2 sm:px-6">
            <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1">
              <Globe2 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              Live Tickers:
            </span>
            {filteredStocks.map((item) => {
              const isSelected = item.ticker === activeStock.ticker;
              const up = item.changePercent >= 0;
              return (
                <button
                  key={item.ticker}
                  type="button"
                  onClick={() => handleSelectTicker(item.ticker)}
                  className={`group flex shrink-0 items-center gap-2.5 rounded-lg border px-3 py-1.5 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    isSelected
                      ? "border-emerald-500/50 bg-emerald-500/15 text-white"
                      : "border-slate-800/90 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80"
                  }`}
                >
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                    {item.market}
                  </span>
                  <span className="font-bold text-white">{item.ticker}</span>
                  <span className="hidden md:inline text-slate-400 truncate max-w-[130px]">
                    {item.name}
                  </span>
                  <span className="tabular-nums font-medium text-slate-200">
                    {item.currencySymbol}
                    {item.price.toFixed(2)}
                  </span>
                  <span
                    className={`tabular-nums font-medium ${
                      up ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {up ? "▲ +" : "▼ "}
                    {item.changePercent.toFixed(2)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6"
      >
        {fetchError && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200"
          >
            <span>{fetchError}</span>
            <button
              type="button"
              onClick={() => setFetchError(null)}
              className="ml-4 font-semibold underline hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Active Company Executive Header Banner */}
        <section
          aria-label="Selected stock overview"
          className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 p-5 sm:p-6"
        >
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            {/* Left: Identity & Executive Summary */}
            <div className="space-y-2.5 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                  {activeStock.exchange}
                </span>
                <span className="rounded-md bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                  {activeStock.sector}
                </span>
                <span className="text-xs text-slate-400 tabular-nums">
                  {MARKET_LABELS[activeStock.market].currency} · Cap:{" "}
                  <strong className="text-slate-200">
                    {activeStock.marketCap}
                  </strong>{" "}
                  · As of {activeStock.updatedAt}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {activeStock.name} ({activeStock.ticker})
                </h1>
              </div>

              <p className="text-sm leading-relaxed text-slate-300">
                {activeStock.executiveSummary}
              </p>
            </div>

            {/* Right: Price Quote & Rating Badges */}
            <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-800/90 bg-slate-950/70 p-4 sm:flex-row lg:flex-col lg:items-end lg:min-w-[260px]">
              <div className="tabular-nums lg:text-right">
                <div className="text-xs uppercase tracking-wider text-slate-400">
                  Live Market Price ({activeStock.currency})
                </div>
                <div className="mt-0.5 flex items-baseline gap-2.5 lg:justify-end">
                  <span className="text-3xl font-extrabold text-white">
                    {activeStock.currencySymbol}
                    {activeStock.price.toFixed(2)}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                      isPriceUp
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                    }`}
                  >
                    {isPriceUp ? "▲ +" : "▼ "}
                    {activeStock.change.toFixed(2)} (
                    {isPriceUp ? "+" : ""}
                    {activeStock.changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    activeStock.rating === "Bullish"
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                      : activeStock.rating === "Bearish"
                      ? "border-rose-500/40 bg-rose-500/15 text-rose-300"
                      : "border-sky-500/40 bg-sky-500/15 text-sky-300"
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Rating: {activeStock.rating}</span>
                </div>

                <div
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    activeStock.riskLevel === "Low"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : activeStock.riskLevel === "Medium"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Risk: {activeStock.riskLevel}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Mode Navigation Tabs */}
          <div
            className="mt-6 grid grid-cols-2 gap-2 border-t border-slate-800/80 pt-5 sm:grid-cols-4 xl:grid-cols-8"
            role="tablist"
            aria-label="Stock analysis mode selector"
          >
            {modeTabs.map((tab) => {
              const active = analysisMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setAnalysisMode(tab.id)}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    active
                      ? "border-emerald-500/60 bg-emerald-500/15 text-white shadow-sm"
                      : "border-slate-800/90 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        active ? "text-emerald-400" : "text-slate-400"
                      }
                    >
                      {tab.icon}
                    </span>
                    <span className="text-xs font-semibold">{tab.label}</span>
                  </div>
                  <span className="mt-1 text-[11px] text-slate-400 line-clamp-1">
                    {tab.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Active Analysis Mode Workspace */}
        {analysisMode === "quick" && (
          <div className="space-y-6">
            <FundamentalBreakdown stock={activeStock} compact />
            <TechnicalChart stock={activeStock} />
          </div>
        )}

        {analysisMode === "deep-dive" && (
          <FundamentalBreakdown stock={activeStock} />
        )}

        {analysisMode === "valuation" && (
          <IntrinsicValueView stock={activeStock} />
        )}

        {analysisMode === "statements" && (
          <FinancialStatementsView stock={activeStock} />
        )}

        {analysisMode === "technical" && (
          <TechnicalChart stock={activeStock} />
        )}

        {analysisMode === "peers" && (
          <PeerComparisonView
            stock={activeStock}
            availableTickers={stocks.map((s) => s.ticker)}
            onSelectTicker={handleSelectTicker}
          />
        )}

        {analysisMode === "report" && (
          <InvestmentReportView stock={activeStock} />
        )}

        {analysisMode === "custom" && (
          <CustomStockAnalyzer onAddStock={handleAddCustomStock} />
        )}
      </main>

      {/* Footer Disclaimer */}
      <footer className="mt-12 border-t border-slate-800/80 bg-slate-950 py-6 text-xs text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
          <div>
            <strong className="text-slate-300">DayTrade Equity Research</strong>{" "}
            — Powered by live Yahoo Finance market data,{" "}
            <code className="text-emerald-400">stock-analysis</code> &amp;{" "}
            <code className="text-sky-400">web-design-guidelines</code>.
          </div>
          <p className="text-center sm:text-right text-slate-500">
            Disclaimer: For informational and educational purposes only. Does
            not constitute investment advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
