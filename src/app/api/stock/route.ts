import { NextRequest, NextResponse } from "next/server";
import {
  fetchChartByInterval,
  fetchFinancialStatements,
  fetchLiveStockProfile,
} from "@/lib/api/yahooFinance";
import { STOCK_CATALOG } from "@/lib/data/stocks";
import { ChartInterval } from "@/lib/types/stock";

export const dynamic = "force-dynamic";

const VALID_INTERVALS: ChartInterval[] = ["1hr", "4hr", "D", "2D", "W", "M"];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tickerParam = searchParams.get("ticker")?.trim();
  const intervalParam = searchParams.get("interval")?.trim() as
    | ChartInterval
    | undefined;
  const statementsParam = searchParams.get("statements")?.trim() as
    | "annual"
    | "quarterly"
    | undefined;

  try {
    if (
      tickerParam &&
      (statementsParam === "annual" || statementsParam === "quarterly")
    ) {
      const periods = await fetchFinancialStatements(
        tickerParam,
        statementsParam
      );
      return NextResponse.json({
        ticker: tickerParam,
        periodType: statementsParam,
        periods,
        fetchedAt: new Date().toISOString(),
      });
    }

    if (
      tickerParam &&
      intervalParam &&
      VALID_INTERVALS.includes(intervalParam)
    ) {
      const history = await fetchChartByInterval(tickerParam, intervalParam);
      return NextResponse.json({
        ticker: tickerParam,
        interval: intervalParam,
        history,
        fetchedAt: new Date().toISOString(),
      });
    }

    if (tickerParam) {
      const profile = await fetchLiveStockProfile(tickerParam);
      return NextResponse.json({
        stock: profile,
        fetchedAt: new Date().toISOString(),
      });
    }

    // Fetch live market data for all catalog tickers in parallel
    const settled = await Promise.allSettled(
      STOCK_CATALOG.map((base) => fetchLiveStockProfile(base.ticker, base))
    );

    const liveStocks = settled.map((res, idx) =>
      res.status === "fulfilled" ? res.value : STOCK_CATALOG[idx]
    );

    return NextResponse.json({
      stocks: liveStocks,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err?.message || "Failed to fetch live market data",
      },
      { status: 500 }
    );
  }
}
