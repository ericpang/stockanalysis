import fs from "fs";
import path from "path";
import { DayTradeDashboard } from "@/components/DayTradeDashboard";
import { fetchLiveStockProfile } from "@/lib/api/yahooFinance";
import { STOCK_CATALOG } from "@/lib/data/stocks";
import { StockProfile } from "@/lib/types/stock";

// Additional popular US, China A-Share, and HK tickers pre-fetched at build time
// so searching for them on static GitHub Pages works with live Yahoo Finance data.
const EXTRA_SEARCHABLE_TICKERS = [
  "TSLA",
  "GOOGL",
  "AMZN",
  "META",
  "AMD",
  "NFLX",
  "TSM",
  "AVGO",
  "BRK-B",
  "JPM",
  "LLY",
  "WMT",
  "COST",
  "PLTR",
  "COIN",
  "INTC",
  "DIS",
  "BABA",
  "PDD",
  "1810.HK",
  "3690.HK",
  "1211.HK",
  "0388.HK",
  "9618.HK",
  "000858.SZ",
  "601318.SH",
  "002594.SZ",
  "600036.SH",
  ...STOCK_CATALOG.flatMap((s) => s.peers.map((p) => p.ticker.toUpperCase())),
];

export default async function DayTradePage() {
  const isStaticExport = process.env.STATIC_EXPORT === "true";

  const settledCatalog = await Promise.allSettled(
    STOCK_CATALOG.map((base) => fetchLiveStockProfile(base.ticker, base))
  );

  const liveStocks = settledCatalog.map((res, idx) =>
    res.status === "fulfilled" ? res.value : STOCK_CATALOG[idx]
  );

  const extraStocksMap: Record<string, StockProfile> = {};
  const nowIso = new Date().toISOString();
  const initialSyncedAt = `${nowIso.slice(11, 19)} UTC`;

  // Only pre-fetch the extended static dictionary when building for static GitHub Pages;
  // on Vercel / Node servers, /api/stock dynamically fetches any ticker on demand.
  if (isStaticExport) {
    const uniqueExtraTickers = Array.from(
      new Set(
        EXTRA_SEARCHABLE_TICKERS.map((t) => t.toUpperCase()).filter(
          (t) => !STOCK_CATALOG.some((c) => c.ticker.toUpperCase() === t)
        )
      )
    );

    const settledExtra = await Promise.allSettled(
      uniqueExtraTickers.map((ticker) => fetchLiveStockProfile(ticker))
    );
    for (const res of settledExtra) {
      if (res.status === "fulfilled" && res.value) {
        extraStocksMap[res.value.ticker.toUpperCase()] = res.value;
      }
    }

    try {
      const publicDir = path.join(process.cwd(), "public");
      fs.mkdirSync(publicDir, { recursive: true });
      fs.writeFileSync(
        path.join(publicDir, "live-data.json"),
        JSON.stringify({
          stocks: liveStocks,
          extraStocks: extraStocksMap,
          fetchedAt: nowIso,
        })
      );
    } catch {
      // Ignore read-only filesystem errors if any
    }
  }

  return (
    <DayTradeDashboard
      initialStocks={liveStocks}
      initialExtraStocks={extraStocksMap}
      initialSyncedAt={initialSyncedAt}
    />
  );
}
