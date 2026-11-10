import fs from "fs";
import path from "path";
import { DayTradeDashboard } from "@/components/DayTradeDashboard";
import { fetchLiveStockProfile } from "@/lib/api/yahooFinance";
import { STOCK_CATALOG } from "@/lib/data/stocks";

export default async function DayTradePage() {
  const settled = await Promise.allSettled(
    STOCK_CATALOG.map((base) => fetchLiveStockProfile(base.ticker, base))
  );

  const liveStocks = settled.map((res, idx) =>
    res.status === "fulfilled" ? res.value : STOCK_CATALOG[idx]
  );

  const nowIso = new Date().toISOString();
  const initialSyncedAt = `${nowIso.slice(11, 19)} UTC`;

  // Write static snapshot to public/live-data.json so GitHub Pages static export serves ./live-data.json
  try {
    const publicDir = path.join(process.cwd(), "public");
    fs.mkdirSync(publicDir, { recursive: true });
    fs.writeFileSync(
      path.join(publicDir, "live-data.json"),
      JSON.stringify({
        stocks: liveStocks,
        fetchedAt: nowIso,
      })
    );
  } catch {
    // Ignore read-only filesystem errors if any
  }

  return (
    <DayTradeDashboard
      initialStocks={liveStocks}
      initialSyncedAt={initialSyncedAt}
    />
  );
}
