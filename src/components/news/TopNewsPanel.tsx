"use client";

import React, { useEffect, useMemo, useState } from "react";
import { buildFallbackNews } from "@/lib/api/yahooFinance";
import { StockNewsItem, StockProfile } from "@/lib/types/stock";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Newspaper,
} from "lucide-react";

interface TopNewsPanelProps {
  stock: StockProfile;
}

export function TopNewsPanel({ stock }: TopNewsPanelProps) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false);

  // Reset expanded items when switching stocks
  useEffect(() => {
    setExpandedIds({});
  }, [stock.ticker]);

  const newsItems: StockNewsItem[] = useMemo(() => {
    if (Array.isArray(stock.news) && stock.news.length > 0) {
      return stock.news.slice(0, 5);
    }
    return buildFallbackNews(stock.ticker, stock.name, stock.sector).slice(
      0,
      5
    );
  }, [stock.news, stock.ticker, stock.name, stock.sector]);

  const handleNewsItemClick = (item: StockNewsItem) => {
    const isCurrentlyExpanded = Boolean(expandedIds[item.id]);
    setExpandedIds((prev) => ({
      ...prev,
      [item.id]: !isCurrentlyExpanded,
    }));

    // When clicking a collapsed news item, expand it and open the full article in a new browser tab
    if (!isCurrentlyExpanded && item.url) {
      window.open(item.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <section
      aria-label={`Top 5 market news for ${stock.ticker}`}
      className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden"
    >
      {/* Compact Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 px-4 py-2.5 sm:px-5">
        <div className="flex items-center gap-2">
          <Newspaper
            className="h-4 w-4 text-emerald-400 shrink-0"
            aria-hidden="true"
          />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Top 5 Market News ({stock.ticker})
          </h2>
          <span className="hidden sm:inline-block text-[11px] text-slate-400">
            · Click any collapsed headline to expand &amp; open full article
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsPanelCollapsed((prev) => !prev)}
          aria-expanded={!isPanelCollapsed}
          className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-950/80 px-2 py-0.5 text-[11px] font-medium text-slate-400 transition hover:border-slate-700 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          {isPanelCollapsed ? (
            <>
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              Show 5 Headlines
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
              Collapse Panel
            </>
          )}
        </button>
      </div>

      {/* Top 5 Collapsed News List */}
      {!isPanelCollapsed && (
        <div className="divide-y divide-slate-800/60">
          {newsItems.map((item, idx) => {
            const isExpanded = Boolean(expandedIds[item.id]);
            return (
              <div key={item.id} className="transition hover:bg-slate-800/35">
                <button
                  type="button"
                  onClick={() => handleNewsItemClick(item)}
                  aria-expanded={isExpanded}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400 sm:px-5"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-800 text-[10px] font-bold tabular-nums text-emerald-400">
                      {idx + 1}
                    </span>
                    {isExpanded ? (
                      <ChevronDown
                        className="h-3.5 w-3.5 shrink-0 text-emerald-400"
                        aria-hidden="true"
                      />
                    ) : (
                      <ChevronRight
                        className="h-3.5 w-3.5 shrink-0 text-slate-500"
                        aria-hidden="true"
                      />
                    )}
                    <span className="truncate font-medium text-slate-100">
                      {item.title}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 text-[11px] text-slate-400">
                    <span className="hidden md:inline rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                      {item.publisher}
                    </span>
                    <span className="hidden sm:inline tabular-nums text-slate-500">
                      {item.publishedAt}
                    </span>
                    <ExternalLink
                      className="h-3 w-3 text-slate-500"
                      aria-hidden="true"
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-800/50 bg-slate-950/60 px-4 py-2.5 pl-12 text-xs text-slate-300 sm:px-5 sm:pl-14">
                    <p className="leading-relaxed text-slate-300">
                      {item.summary || item.title}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                      <span>
                        Source:{" "}
                        <strong className="text-slate-200">
                          {item.publisher}
                        </strong>{" "}
                        · {item.publishedAt}
                      </span>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-emerald-400 hover:text-emerald-300 hover:underline"
                      >
                        Read full article in new tab
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

