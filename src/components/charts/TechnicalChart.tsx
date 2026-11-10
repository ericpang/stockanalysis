"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChartInterval,
  OHLCVPoint,
  StockProfile,
} from "@/lib/types/stock";
import {
  computeVolumeProfileAndLevels,
  interpretRSI,
  resampleBarsForInterval,
} from "@/lib/analysis/engine";
import { fetchChartByInterval } from "@/lib/api/yahooFinance";
import {
  Activity,
  BarChart2,
  Eye,
  Layers,
  Move,
  RotateCcw,
  ShieldAlert,
  TrendingUp,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface TechnicalChartProps {
  stock: StockProfile;
}

type SubIndicator = "RSI" | "MACD" | "VOLUME";

const INTERVAL_OPTIONS: Array<{ id: ChartInterval; label: string; title: string }> = [
  { id: "1hr", label: "1hr", title: "1-Hour Intraday Candles" },
  { id: "4hr", label: "4hr", title: "4-Hour Intraday Candles" },
  { id: "D", label: "D", title: "1-Day Candles" },
  { id: "2D", label: "2D", title: "2-Day Candles" },
  { id: "W", label: "W", title: "1-Week Candles" },
  { id: "M", label: "M", title: "1-Month Candles" },
];

export function TechnicalChart({ stock }: TechnicalChartProps) {
  const [interval, setIntervalState] = useState<ChartInterval>("D");
  const [intervalCache, setIntervalCache] = useState<
    Record<string, OHLCVPoint[]>
  >({});
  const [isLoadingInterval, setIsLoadingInterval] = useState<boolean>(false);

  const [chartStyle, setChartStyle] = useState<"candles" | "area">("candles");
  const [showSMA50, setShowSMA50] = useState(true);
  const [showSMA200, setShowSMA200] = useState(true);
  const [showLevels, setShowLevels] = useState(true);
  const [showVPVR, setShowVPVR] = useState(true);
  const [subIndicator, setSubIndicator] = useState<SubIndicator>("RSI");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [cursorSvgPos, setCursorSvgPos] = useState<{ x: number; y: number } | null>(
    null
  );

  // Pan & Zoom state for draggable candlestick viewport
  const [windowSize, setWindowSize] = useState<number>(75);
  const [panOffset, setPanOffset] = useState<number>(0);
  const [priceOffset, setPriceOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{
    active: boolean;
    startClientX: number;
    startClientY: number;
    startPanOffset: number;
    startPriceOffset: number;
    plotPxWidth: number;
    plotPxHeight: number;
    priceSpan: number;
  } | null>(null);

  const cacheKey = `${stock.ticker.toUpperCase()}__${interval}`;

  // Reset pan/zoom when ticker or interval changes
  useEffect(() => {
    setPanOffset(0);
    setPriceOffset(0);
    setWindowSize(75);
    setHoverIndex(null);
    setCursorSvgPos(null);
  }, [stock.ticker, interval]);

  // Fetch real interval bars from Yahoo Finance when interval !== "D"
  useEffect(() => {
    if (interval === "D") return;
    if (intervalCache[cacheKey]) return;

    let cancelled = false;
    setIsLoadingInterval(true);

    fetch(
      `/api/stock?ticker=${encodeURIComponent(
        stock.ticker
      )}&interval=${encodeURIComponent(interval)}`,
      { cache: "no-store" }
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Static mode"))))
      .then((data) => {
        if (Array.isArray(data.history) && data.history.length > 0) {
          return data.history as OHLCVPoint[];
        }
        throw new Error("Empty history");
      })
      .catch(() => fetchChartByInterval(stock.ticker, interval))
      .then((history) => {
        if (!cancelled && Array.isArray(history) && history.length > 0) {
          setIntervalCache((prev) => ({
            ...prev,
            [cacheKey]: history,
          }));
        }
      })
      .catch(() => {
        // Fallback handled automatically by resampleBarsForInterval
      })
      .finally(() => {
        if (!cancelled) setIsLoadingInterval(false);
      });

    return () => {
      cancelled = true;
    };
  }, [stock.ticker, interval, cacheKey, intervalCache]);

  const fullData: OHLCVPoint[] = useMemo(() => {
    if (interval === "D") {
      return stock.technical.history;
    }
    if (intervalCache[cacheKey] && intervalCache[cacheKey].length > 0) {
      return intervalCache[cacheKey];
    }
    return resampleBarsForInterval(stock.technical.history, interval);
  }, [stock.technical.history, interval, intervalCache, cacheKey]);

  const effectiveWindowSize = Math.min(
    Math.max(15, windowSize),
    Math.max(15, fullData.length)
  );
  const maxPanOffset = Math.max(0, fullData.length - effectiveWindowSize);
  const clampedPanOffset = Math.min(Math.max(0, Math.round(panOffset)), maxPanOffset);

  const visibleData: OHLCVPoint[] = useMemo(() => {
    if (fullData.length <= effectiveWindowSize) {
      return fullData;
    }
    const endIdx = fullData.length - clampedPanOffset;
    const startIdx = Math.max(0, endIdx - effectiveWindowSize);
    return fullData.slice(startIdx, endIdx);
  }, [fullData, effectiveWindowSize, clampedPanOffset]);

  const vpvr = useMemo(() => {
    return computeVolumeProfileAndLevels(visibleData, stock.price, 20);
  }, [visibleData, stock.price]);

  const activePoint =
    hoverIndex !== null && visibleData[hoverIndex]
      ? visibleData[hoverIndex]
      : visibleData[visibleData.length - 1];

  const { baseMinPrice, baseMaxPrice, minPrice, maxPrice } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const d of visibleData) {
      if (d.low < min) min = d.low;
      if (d.high > max) max = d.high;
      if (showSMA50 && d.sma50 < min) min = d.sma50;
      if (showSMA50 && d.sma50 > max) max = d.sma50;
      if (showSMA200 && d.sma200 < min) min = d.sma200;
      if (showSMA200 && d.sma200 > max) max = d.sma200;
    }
    if (showLevels) {
      min = Math.min(min, vpvr.s2 * 0.99);
      max = Math.max(max, vpvr.r2 * 1.01);
    }
    const pad = (max - min) * 0.07 || 1;
    const bMin = min - pad;
    const bMax = max + pad;
    return {
      baseMinPrice: bMin,
      baseMaxPrice: bMax,
      minPrice: bMin + priceOffset,
      maxPrice: bMax + priceOffset,
    };
  }, [visibleData, showSMA50, showSMA200, showLevels, vpvr, priceOffset]);

  const width = 880;
  const height = 340;
  const padLeft = 14;
  const padRight = 78;
  const padTop = 18;
  const padBottom = 28;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Reserve right 22% of plotW visually for VPVR overlay bars (drawn behind candles from right edge of plotW)
  const vpvrMaxBarW = plotW * 0.24;

  const xForIndex = (i: number) =>
    padLeft +
    (visibleData.length <= 1
      ? plotW / 2
      : (i / (visibleData.length - 1)) * plotW);

  const yForPrice = (p: number) =>
    padTop + plotH - ((p - minPrice) / (maxPrice - minPrice || 1)) * plotH;

  const priceForY = useCallback(
    (svgY: number) => {
      const ratio = (padTop + plotH - svgY) / (plotH || 1);
      return minPrice + ratio * (maxPrice - minPrice);
    },
    [minPrice, maxPrice, plotH]
  );

  const cursorPrice = useMemo(() => {
    if (!cursorSvgPos) return null;
    return priceForY(cursorSvgPos.y);
  }, [cursorSvgPos, priceForY]);

  const isCursorOnCandle = useMemo(() => {
    if (!cursorSvgPos || hoverIndex === null || !visibleData[hoverIndex]) {
      return false;
    }
    const d = visibleData[hoverIndex];
    const candleX = xForIndex(hoverIndex);
    const candleW = Math.max(4, Math.min(10, plotW / visibleData.length));
    const highY = yForPrice(d.high);
    const lowY = yForPrice(d.low);
    const withinX = Math.abs(cursorSvgPos.x - candleX) <= candleW;
    const withinY =
      cursorSvgPos.y >= Math.min(highY, lowY) - 4 &&
      cursorSvgPos.y <= Math.max(highY, lowY) + 4;
    return withinX && withinY;
  }, [cursorSvgPos, hoverIndex, visibleData, plotW, minPrice, maxPrice]);

  const isPannedOrZoomed =
    clampedPanOffset !== 0 ||
    Math.abs(priceOffset) > 0.001 ||
    effectiveWindowSize !== Math.min(75, Math.max(15, fullData.length));

  const resetView = useCallback(() => {
    setPanOffset(0);
    setPriceOffset(0);
    setWindowSize(75);
  }, []);

  const handleZoom = useCallback(
    (direction: "in" | "out") => {
      setWindowSize((prev) => {
        const step = Math.max(8, Math.round(prev * 0.22));
        const next = direction === "in" ? prev - step : prev + step;
        return Math.min(Math.max(15, next), Math.max(15, fullData.length));
      });
    },
    [fullData.length]
  );

  const updateCursorFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg || visibleData.length === 0) return;
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const rawSvgX = ((clientX - rect.left) / rect.width) * width;
      const rawSvgY = ((clientY - rect.top) / rect.height) * height;

      const clampedX = Math.min(Math.max(padLeft, rawSvgX), width - padRight);
      const clampedY = Math.min(Math.max(padTop, rawSvgY), height - padBottom);

      setCursorSvgPos({ x: clampedX, y: clampedY });

      const relX = (clampedX - padLeft) / (plotW || 1);
      const idx =
        visibleData.length <= 1
          ? 0
          : Math.min(
              visibleData.length - 1,
              Math.max(0, Math.round(relX * (visibleData.length - 1)))
            );
      setHoverIndex(idx);
    },
    [visibleData.length, plotW, width, height, padLeft, padRight, padTop, padBottom]
  );

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const plotPxWidth = rect.width * (plotW / width);
    const plotPxHeight = rect.height * (plotH / height);

    dragRef.current = {
      active: true,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPanOffset: clampedPanOffset,
      startPriceOffset: priceOffset,
      plotPxWidth: Math.max(1, plotPxWidth),
      plotPxHeight: Math.max(1, plotPxHeight),
      priceSpan: Math.max(0.01, baseMaxPrice - baseMinPrice),
    };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateCursorFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    updateCursorFromPointer(e.clientX, e.clientY);

    const drag = dragRef.current;
    if (!drag || !drag.active) return;

    const dx = e.clientX - drag.startClientX;
    const dy = e.clientY - drag.startClientY;

    const pxPerBar = drag.plotPxWidth / Math.max(1, effectiveWindowSize);
    const deltaBars = dx / Math.max(1, pxPerBar);
    const nextPan = Math.min(
      maxPanOffset,
      Math.max(0, drag.startPanOffset + deltaBars)
    );
    setPanOffset(nextPan);

    const deltaPrice = (dy / drag.plotPxHeight) * drag.priceSpan;
    setPriceOffset(drag.startPriceOffset + deltaPrice);
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.active) {
      dragRef.current.active = false;
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if not captured
      }
    }
  };

  const sma50Path = useMemo(() => {
    return visibleData
      .map(
        (d, i) =>
          `${i === 0 ? "M" : "L"}${xForIndex(i).toFixed(1)},${yForPrice(
            d.sma50
          ).toFixed(1)}`
      )
      .join(" ");
  }, [visibleData, minPrice, maxPrice]);

  const sma200Path = useMemo(() => {
    return visibleData
      .map(
        (d, i) =>
          `${i === 0 ? "M" : "L"}${xForIndex(i).toFixed(1)},${yForPrice(
            d.sma200
          ).toFixed(1)}`
      )
      .join(" ");
  }, [visibleData, minPrice, maxPrice]);

  const closeLinePath = useMemo(() => {
    return visibleData
      .map(
        (d, i) =>
          `${i === 0 ? "M" : "L"}${xForIndex(i).toFixed(1)},${yForPrice(
            d.close
          ).toFixed(1)}`
      )
      .join(" ");
  }, [visibleData, minPrice, maxPrice]);

  const closeAreaPath = useMemo(() => {
    if (visibleData.length === 0) return "";
    const firstX = xForIndex(0).toFixed(1);
    const lastX = xForIndex(visibleData.length - 1).toFixed(1);
    const bottomY = (padTop + plotH).toFixed(1);
    return `${closeLinePath} L${lastX},${bottomY} L${firstX},${bottomY} Z`;
  }, [closeLinePath, visibleData.length, plotH]);

  // Sub-indicator geometry
  const subH = 120;
  const subPadTop = 12;
  const subPadBottom = 20;
  const subPlotH = subH - subPadTop - subPadBottom;

  const yForRSI = (rsi: number) =>
    subPadTop + subPlotH - (Math.min(100, Math.max(0, rsi)) / 100) * subPlotH;

  const rsiPath = useMemo(() => {
    return visibleData
      .map(
        (d, i) =>
          `${i === 0 ? "M" : "L"}${xForIndex(i).toFixed(1)},${yForRSI(
            d.rsi14
          ).toFixed(1)}`
      )
      .join(" ");
  }, [visibleData]);

  const { maxAbsMacd, maxVol } = useMemo(() => {
    let m = 0.5;
    let v = 1;
    for (const d of visibleData) {
      m = Math.max(
        m,
        Math.abs(d.macd),
        Math.abs(d.macdSignal),
        Math.abs(d.macdHist)
      );
      v = Math.max(v, d.volume);
    }
    return { maxAbsMacd: m * 1.15, maxVol: v * 1.1 };
  }, [visibleData]);

  const yForMacd = (val: number) =>
    subPadTop + subPlotH / 2 - (val / (maxAbsMacd || 1)) * (subPlotH / 2);

  const macdLinePath = useMemo(() => {
    return visibleData
      .map(
        (d, i) =>
          `${i === 0 ? "M" : "L"}${xForIndex(i).toFixed(1)},${yForMacd(
            d.macd
          ).toFixed(1)}`
      )
      .join(" ");
  }, [visibleData, maxAbsMacd]);

  const macdSignalPath = useMemo(() => {
    return visibleData
      .map(
        (d, i) =>
          `${i === 0 ? "M" : "L"}${xForIndex(i).toFixed(1)},${yForMacd(
            d.macdSignal
          ).toFixed(1)}`
      )
      .join(" ");
  }, [visibleData, maxAbsMacd]);

  const currentRsi = activePoint?.rsi14 ?? stock.technical.rsi14;
  const rsiInfo = interpretRSI(currentRsi);
  const sym = stock.currencySymbol;
  const range52Pct = Math.min(
    100,
    Math.max(
      0,
      ((stock.price - stock.technical.low52Week) /
        (stock.technical.high52Week - stock.technical.low52Week || 1)) *
        100
    )
  );

  const priceTicks = useMemo(() => {
    const count = 6;
    const step = (maxPrice - minPrice) / (count - 1);
    return Array.from({ length: count }, (_, i) => minPrice + step * i);
  }, [minPrice, maxPrice]);

  return (
    <div className="space-y-5">
      {/* Top Technical Summary Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Trend Signal (50/200 MA)</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-lg font-semibold text-slate-100">
              {stock.technical.trendSignal}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400 tabular-nums">
            50-MA: {sym}
            {(activePoint?.sma50 ?? stock.technical.sma50).toFixed(2)} · 200-MA:{" "}
            {sym}
            {(activePoint?.sma200 ?? stock.technical.sma200).toFixed(2)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Volume Profile POC &amp; Value Area</span>
            <Layers className="h-4 w-4 text-amber-400" aria-hidden="true" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2 tabular-nums">
            <span className="text-lg font-semibold text-amber-300">
              POC: {sym}
              {vpvr.poc.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">
              ({vpvr.buyVolumePct.toFixed(0)}% Buy Vol)
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400 tabular-nums">
            70% VA: {sym}
            {vpvr.val.toFixed(2)} – {sym}
            {vpvr.vah.toFixed(2)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Key Support &amp; Resistance</span>
            <ShieldAlert className="h-4 w-4 text-indigo-400" aria-hidden="true" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between text-sm font-semibold tabular-nums">
            <span className="text-emerald-400" title="Immediate Support S1">
              S1: {sym}
              {vpvr.s1.toFixed(2)}
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-rose-400" title="Immediate Resistance R1">
              R1: {sym}
              {vpvr.r1.toFixed(2)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400 tabular-nums">
            Major S2: {sym}
            {vpvr.s2.toFixed(2)} · Major R2: {sym}
            {vpvr.r2.toFixed(2)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>52-Week Price Range</span>
            <BarChart2 className="h-4 w-4 text-violet-400" aria-hidden="true" />
          </div>
          <div className="mt-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400"
                style={{ width: `${range52Pct}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-slate-400 tabular-nums">
              <span>
                L: {sym}
                {stock.technical.low52Week.toFixed(2)}
              </span>
              <span className="font-medium text-slate-200">
                {range52Pct.toFixed(0)}% of range
              </span>
              <span>
                H: {sym}
                {stock.technical.high52Week.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Chart Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Interval Selector: 1hr, 4hr, D, 2D, W, M */}
            <div
              className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-950 p-0.5"
              role="group"
              aria-label="Chart candle interval"
            >
              {INTERVAL_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  title={opt.title}
                  onClick={() => {
                    setIntervalState(opt.id);
                    setHoverIndex(null);
                  }}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    interval === opt.id
                      ? "bg-emerald-500 text-slate-950"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {isLoadingInterval && (
              <span className="text-[11px] text-amber-300 animate-pulse">
                Loading {interval} bars…
              </span>
            )}

            <div
              className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-0.5"
              role="group"
              aria-label="Chart visual style"
            >
              <button
                type="button"
                onClick={() => setChartStyle("candles")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  chartStyle === "candles"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Candles
              </button>
              <button
                type="button"
                onClick={() => setChartStyle("area")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  chartStyle === "area"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Area
              </button>
            </div>

            {/* Drag / Zoom / Reset Controls */}
            <div
              className="inline-flex items-center gap-0.5 rounded-lg border border-slate-800 bg-slate-950 p-0.5"
              role="group"
              aria-label="Chart zoom and pan controls"
            >
              <button
                type="button"
                onClick={() => handleZoom("in")}
                title="Zoom In (fewer candles)"
                aria-label="Zoom In"
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleZoom("out")}
                title="Zoom Out (more candles)"
                aria-label="Zoom Out"
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              {isPannedOrZoomed && (
                <button
                  type="button"
                  onClick={resetView}
                  title="Reset pan and zoom (or double-click chart)"
                  className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-emerald-300 transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  Reset
                </button>
              )}
            </div>

            <span className="hidden xl:inline-flex items-center gap-1 text-[11px] text-slate-400">
              <Move className="h-3 w-3 text-slate-500" aria-hidden="true" />
              Drag chart to pan · Scroll to zoom
            </span>
          </div>

          {/* Overlay toggles */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setShowVPVR((v) => !v)}
              aria-pressed={showVPVR}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                showVPVR
                  ? "border-sky-500/40 bg-sky-500/15 text-sky-300"
                  : "border-slate-800 bg-slate-950 text-slate-500"
              }`}
            >
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              Volume Profile (VPVR)
            </button>

            <button
              type="button"
              onClick={() => setShowLevels((v) => !v)}
              aria-pressed={showLevels}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                showLevels
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                  : "border-slate-800 bg-slate-950 text-slate-500"
              }`}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              S/R Levels (S1/S2/R1/R2)
            </button>

            <button
              type="button"
              onClick={() => setShowSMA50((v) => !v)}
              aria-pressed={showSMA50}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                showSMA50
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                  : "border-slate-800 bg-slate-950 text-slate-500"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              50-MA
            </button>

            <button
              type="button"
              onClick={() => setShowSMA200((v) => !v)}
              aria-pressed={showSMA200}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                showSMA200
                  ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
                  : "border-slate-800 bg-slate-950 text-slate-500"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-violet-400" />
              200-MA
            </button>
          </div>
        </div>

        {/* Live OHLCV & Cursor Crosshair Readout */}
        {activePoint && (
          <div
            className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums text-slate-300"
            aria-live="polite"
          >
            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-300">
              {interval}
            </span>
            <span className="font-semibold text-white">{activePoint.date}</span>
            {cursorPrice !== null && (
              <span className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-300">
                Cursor: {sym}
                {cursorPrice.toFixed(2)} · {activePoint.date}
              </span>
            )}
            <span>
              O:{" "}
              <strong className="text-slate-100">
                {sym}
                {activePoint.open.toFixed(2)}
              </strong>
            </span>
            <span>
              H:{" "}
              <strong className="text-slate-100">
                {sym}
                {activePoint.high.toFixed(2)}
              </strong>
            </span>
            <span>
              L:{" "}
              <strong className="text-slate-100">
                {sym}
                {activePoint.low.toFixed(2)}
              </strong>
            </span>
            <span>
              C:{" "}
              <strong
                className={
                  activePoint.close >= activePoint.open
                    ? "text-emerald-400"
                    : "text-rose-400"
                }
              >
                {sym}
                {activePoint.close.toFixed(2)}
              </strong>
            </span>
            <span className="text-amber-300">
              POC: {sym}
              {vpvr.poc.toFixed(2)}
            </span>
            <span className="text-sky-300">
              RSI(14): {activePoint.rsi14.toFixed(1)}
            </span>
            <span className="text-slate-400">
              Vol: {(activePoint.volume / 1_000_000).toFixed(2)}M
            </span>
          </div>
        )}

        {/* Main SVG Price Chart with Draggable Pan/Zoom, VPVR, S/R Levels & 2D Crosshair */}
        <div className="relative mt-2 select-none">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className={`w-full overflow-visible touch-none ${
              isDragging ? "cursor-grabbing" : "cursor-crosshair"
            }`}
            role="img"
            aria-label={`${stock.ticker} ${interval} draggable price chart with Volume Profile and Support/Resistance levels`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUpOrCancel}
            onPointerCancel={handlePointerUpOrCancel}
            onDoubleClick={resetView}
            onWheel={(e) => {
              e.preventDefault();
              handleZoom(e.deltaY < 0 ? "in" : "out");
            }}
            onMouseLeave={() => {
              if (!isDragging) {
                setHoverIndex(null);
                setCursorSvgPos(null);
              }
            }}
          >
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
              <clipPath id="pricePlotClip">
                <rect x={padLeft} y={padTop} width={plotW} height={plotH} />
              </clipPath>
            </defs>

            {/* Horizontal grid lines + price axis labels */}
            {priceTicks.map((tick, idx) => {
              const y = yForPrice(tick);
              return (
                <g key={idx}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={width - padRight + 8}
                    y={y + 4}
                    fill="#94a3b8"
                    fontSize="10"
                    className="tabular-nums"
                  >
                    {sym}
                    {tick.toFixed(tick >= 100 ? 0 : 2)}
                  </text>
                </g>
              );
            })}

            {/* Clipped Plot Area for VPVR, S/R Levels, Candlesticks & Moving Averages */}
            <g clipPath="url(#pricePlotClip)">
              {/* Volume Profile Visible Range (VPVR) Overlay */}
              {showVPVR && (
                <g aria-label="Volume Profile Range Indicator">
                  {/* 70% Value Area background band (VAH to VAL) */}
                  <rect
                    x={padLeft}
                    y={yForPrice(vpvr.vah)}
                    width={plotW}
                    height={Math.max(
                      2,
                      yForPrice(vpvr.val) - yForPrice(vpvr.vah)
                    )}
                    fill="#0ea5e9"
                    opacity="0.05"
                  />

                  {/* Horizontal Volume Profile Histogram Bars (Anchored to Right Edge of Plot) */}
                  {vpvr.bins.map((bin, idx) => {
                    const yTop = yForPrice(bin.priceHigh);
                    const yBot = yForPrice(bin.priceLow);
                    const barH = Math.max(2, Math.abs(yBot - yTop) - 1.2);
                    const totalW = (bin.volumePct / 100) * vpvrMaxBarW;
                    const buyRatio =
                      bin.totalVolume > 0 ? bin.upVolume / bin.totalVolume : 0.5;
                    const buyW = totalW * buyRatio;
                    const sellW = totalW - buyW;
                    const rightEdge = width - padRight;
                    const opacity = bin.isPOC
                      ? 0.65
                      : bin.inValueArea
                      ? 0.38
                      : 0.18;

                    return (
                      <g key={idx}>
                        {/* Buy Volume segment */}
                        <rect
                          x={rightEdge - totalW}
                          y={Math.min(yTop, yBot)}
                          width={buyW}
                          height={barH}
                          fill="#10b981"
                          opacity={opacity}
                        />
                        {/* Sell Volume segment */}
                        <rect
                          x={rightEdge - sellW}
                          y={Math.min(yTop, yBot)}
                          width={sellW}
                          height={barH}
                          fill="#f43f5e"
                          opacity={opacity}
                        />
                        {/* Highlight border on Point of Control (POC) bar */}
                        {bin.isPOC && (
                          <rect
                            x={rightEdge - totalW}
                            y={Math.min(yTop, yBot)}
                            width={totalW}
                            height={barH}
                            fill="none"
                            stroke="#fbbf24"
                            strokeWidth="1.2"
                          />
                        )}
                      </g>
                    );
                  })}

                  {/* Point of Control (POC) Horizontal Magnet Line */}
                  <line
                    x1={padLeft}
                    y1={yForPrice(vpvr.poc)}
                    x2={width - padRight}
                    y2={yForPrice(vpvr.poc)}
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="6 3"
                  />
                  <text
                    x={width - padRight - 6}
                    y={yForPrice(vpvr.poc) - 5}
                    textAnchor="end"
                    fill="#fbbf24"
                    fontSize="10"
                    fontWeight="700"
                  >
                    POC {sym}
                    {vpvr.poc.toFixed(2)}
                  </text>
                </g>
              )}

              {/* Key Support & Resistance Horizontal Lines (R2, R1, S1, S2) */}
              {showLevels && (
                <g aria-label="Support and Resistance Levels">
                  {/* R2 Major Resistance */}
                  <line
                    x1={padLeft}
                    y1={yForPrice(vpvr.r2)}
                    x2={width - padRight}
                    y2={yForPrice(vpvr.r2)}
                    stroke="#e11d48"
                    strokeWidth="1.1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padLeft + 6}
                    y={yForPrice(vpvr.r2) - 4}
                    fill="#fda4af"
                    fontSize="9.5"
                    fontWeight="600"
                  >
                    R2 (Major) {sym}
                    {vpvr.r2.toFixed(2)}
                  </text>

                  {/* R1 Immediate Resistance */}
                  <line
                    x1={padLeft}
                    y1={yForPrice(vpvr.r1)}
                    x2={width - padRight}
                    y2={yForPrice(vpvr.r1)}
                    stroke="#f43f5e"
                    strokeWidth="1.3"
                    strokeDasharray="5 4"
                  />
                  <text
                    x={padLeft + 6}
                    y={yForPrice(vpvr.r1) - 4}
                    fill="#fb7185"
                    fontSize="10"
                    fontWeight="700"
                  >
                    R1 (Resistance) {sym}
                    {vpvr.r1.toFixed(2)}
                  </text>

                  {/* S1 Immediate Support */}
                  <line
                    x1={padLeft}
                    y1={yForPrice(vpvr.s1)}
                    x2={width - padRight}
                    y2={yForPrice(vpvr.s1)}
                    stroke="#10b981"
                    strokeWidth="1.3"
                    strokeDasharray="5 4"
                  />
                  <text
                    x={padLeft + 6}
                    y={yForPrice(vpvr.s1) - 4}
                    fill="#34d399"
                    fontSize="10"
                    fontWeight="700"
                  >
                    S1 (Support) {sym}
                    {vpvr.s1.toFixed(2)}
                  </text>

                  {/* S2 Major Support */}
                  <line
                    x1={padLeft}
                    y1={yForPrice(vpvr.s2)}
                    x2={width - padRight}
                    y2={yForPrice(vpvr.s2)}
                    stroke="#059669"
                    strokeWidth="1.1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padLeft + 6}
                    y={yForPrice(vpvr.s2) - 4}
                    fill="#6ee7b7"
                    fontSize="9.5"
                    fontWeight="600"
                  >
                    S2 (Major) {sym}
                    {vpvr.s2.toFixed(2)}
                  </text>
                </g>
              )}

              {/* Area or Candlesticks */}
              {chartStyle === "area" ? (
                <>
                  <path d={closeAreaPath} fill="url(#areaGrad)" />
                  <path
                    d={closeLinePath}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                  />
                </>
              ) : (
                visibleData.map((d, i) => {
                  const x = xForIndex(i);
                  const isUp = d.close >= d.open;
                  const color = isUp ? "#10b981" : "#f43f5e";
                  const highY = yForPrice(d.high);
                  const lowY = yForPrice(d.low);
                  const openY = yForPrice(d.open);
                  const closeY = yForPrice(d.close);
                  const bodyTop = Math.min(openY, closeY);
                  const bodyH = Math.max(2, Math.abs(closeY - openY));
                  const candleW = Math.max(
                    2.5,
                    Math.min(10, plotW / visibleData.length - 2.2)
                  );

                  return (
                    <g key={`${d.date}-${i}`}>
                      <line
                        x1={x}
                        y1={highY}
                        x2={x}
                        y2={lowY}
                        stroke={color}
                        strokeWidth="1.2"
                      />
                      <rect
                        x={x - candleW / 2}
                        y={bodyTop}
                        width={candleW}
                        height={bodyH}
                        fill={color}
                        rx="0.5"
                      />
                    </g>
                  );
                })
              )}

              {/* 200-MA & 50-MA Overlays */}
              {showSMA200 && (
                <path
                  d={sma200Path}
                  fill="none"
                  stroke="#a78bfa"
                  strokeWidth="1.8"
                />
              )}
              {showSMA50 && (
                <path
                  d={sma50Path}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.8"
                />
              )}
            </g>

            {/* Date Labels along X-Axis */}
            {[0, Math.floor(visibleData.length / 2), visibleData.length - 1].map(
              (idx) => {
                const pt = visibleData[idx];
                if (!pt) return null;
                return (
                  <text
                    key={idx}
                    x={xForIndex(idx)}
                    y={height - 6}
                    textAnchor={
                      idx === 0
                        ? "start"
                        : idx === visibleData.length - 1
                        ? "end"
                        : "middle"
                    }
                    fill="#64748b"
                    fontSize="10"
                    className="tabular-nums"
                  >
                    {pt.date}
                  </text>
                );
              }
            )}

            {/* 2D Cursor Crosshair Lines + Axis Badges + Floating Price/Date Readout */}
            {cursorSvgPos && hoverIndex !== null && visibleData[hoverIndex] && (
              <g pointerEvents="none">
                {/* Vertical crosshair line */}
                <line
                  x1={xForIndex(hoverIndex)}
                  y1={padTop}
                  x2={xForIndex(hoverIndex)}
                  y2={height - padBottom}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />

                {/* Horizontal crosshair line */}
                <line
                  x1={padLeft}
                  y1={cursorSvgPos.y}
                  x2={width - padRight}
                  y2={cursorSvgPos.y}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />

                {/* Crosshair intersection dot */}
                <circle
                  cx={xForIndex(hoverIndex)}
                  cy={cursorSvgPos.y}
                  r="3"
                  fill="#10b981"
                  stroke="#020617"
                  strokeWidth="1.5"
                />

                {/* Right Y-Axis Floating Price Badge at Cursor Y */}
                {cursorPrice !== null && (
                  <g
                    transform={`translate(${width - padRight + 2}, ${Math.min(
                      height - padBottom - 10,
                      Math.max(padTop + 10, cursorSvgPos.y)
                    )})`}
                  >
                    <rect
                      x="0"
                      y="-9"
                      width={padRight - 4}
                      height="18"
                      rx="4"
                      fill="#10b981"
                    />
                    <text
                      x={(padRight - 4) / 2}
                      y="3.5"
                      textAnchor="middle"
                      fill="#020617"
                      fontSize="10"
                      fontWeight="700"
                      className="tabular-nums"
                    >
                      {sym}
                      {cursorPrice.toFixed(2)}
                    </text>
                  </g>
                )}

                {/* Bottom X-Axis Floating Date/Time Badge at Cursor X */}
                <g
                  transform={`translate(${Math.min(
                    width - padRight - 48,
                    Math.max(padLeft + 48, xForIndex(hoverIndex))
                  )}, ${height - padBottom + 3})`}
                >
                  <rect
                    x="-48"
                    y="0"
                    width="96"
                    height="18"
                    rx="4"
                    fill="#1e293b"
                    stroke="#475569"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="12.5"
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="10"
                    fontWeight="600"
                    className="tabular-nums"
                  >
                    {visibleData[hoverIndex].date}
                  </text>
                </g>

                {/* Floating Tooltip near Cursor when not directly on a candle (or anywhere on plot) */}
                {cursorPrice !== null && !isCursorOnCandle && (
                  <g
                    transform={`translate(${
                      cursorSvgPos.x > width - padRight - 165
                        ? cursorSvgPos.x - 154
                        : cursorSvgPos.x + 12
                    }, ${
                      cursorSvgPos.y < padTop + 44
                        ? cursorSvgPos.y + 10
                        : cursorSvgPos.y - 42
                    })`}
                  >
                    <rect
                      x="0"
                      y="0"
                      width="144"
                      height="34"
                      rx="6"
                      fill="#0f172a"
                      fillOpacity="0.92"
                      stroke="#334155"
                      strokeWidth="1"
                    />
                    <text
                      x="8"
                      y="13"
                      fill="#34d399"
                      fontSize="10"
                      fontWeight="700"
                      className="tabular-nums"
                    >
                      Price: {sym}
                      {cursorPrice.toFixed(2)}
                    </text>
                    <text
                      x="8"
                      y="26"
                      fill="#cbd5e1"
                      fontSize="9.5"
                      className="tabular-nums"
                    >
                      {visibleData[hoverIndex].date} (C: {sym}
                      {visibleData[hoverIndex].close.toFixed(2)})
                    </text>
                  </g>
                )}
              </g>
            )}
          </svg>
        </div>

        {/* Sub-Indicator Selector & Panel (RSI / MACD / Volume) */}
        <div className="mt-4 border-t border-slate-800/80 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-0.5"
              role="group"
              aria-label="Momentum oscillator indicator"
            >
              {(["RSI", "MACD", "VOLUME"] as SubIndicator[]).map((ind) => (
                <button
                  key={ind}
                  type="button"
                  onClick={() => setSubIndicator(ind)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    subIndicator === ind
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {ind === "RSI"
                    ? "RSI (14)"
                    : ind === "MACD"
                    ? "MACD (12, 26, 9)"
                    : "Volume"}
                </button>
              ))}
            </div>

            {activePoint && (
              <div className="text-xs text-slate-400 tabular-nums">
                {subIndicator === "RSI" && (
                  <span>
                    RSI(14):{" "}
                    <strong className="text-sky-300">
                      {activePoint.rsi14.toFixed(1)}
                    </strong>{" "}
                    (Overbought 70 / Oversold 30)
                  </span>
                )}
                {subIndicator === "MACD" && (
                  <span>
                    MACD:{" "}
                    <strong className="text-sky-300">
                      {activePoint.macd.toFixed(2)}
                    </strong>{" "}
                    · Signal:{" "}
                    <strong className="text-amber-300">
                      {activePoint.macdSignal.toFixed(2)}
                    </strong>{" "}
                    · Hist:{" "}
                    <strong
                      className={
                        activePoint.macdHist >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }
                    >
                      {activePoint.macdHist >= 0 ? "+" : ""}
                      {activePoint.macdHist.toFixed(2)}
                    </strong>
                  </span>
                )}
                {subIndicator === "VOLUME" && (
                  <span>
                    Bar Volume:{" "}
                    <strong className="text-slate-200">
                      {(activePoint.volume / 1_000_000).toFixed(2)}M shares
                    </strong>
                  </span>
                )}
              </div>
            )}
          </div>

          <svg
            viewBox={`0 0 ${width} ${subH}`}
            className="mt-2 w-full overflow-visible"
            role="img"
            aria-label={`${stock.ticker} ${subIndicator} oscillator sub-chart`}
          >
            {subIndicator === "RSI" && (
              <>
                <rect
                  x={padLeft}
                  y={yForRSI(70)}
                  width={plotW}
                  height={yForRSI(30) - yForRSI(70)}
                  fill="#0f172a"
                  opacity="0.5"
                />
                <line
                  x1={padLeft}
                  y1={yForRSI(70)}
                  x2={width - padRight}
                  y2={yForRSI(70)}
                  stroke="#f59e0b"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={width - padRight + 8}
                  y={yForRSI(70) + 3}
                  fill="#f59e0b"
                  fontSize="10"
                >
                  70
                </text>
                <line
                  x1={padLeft}
                  y1={yForRSI(50)}
                  x2={width - padRight}
                  y2={yForRSI(50)}
                  stroke="#334155"
                  strokeDasharray="2 2"
                  strokeWidth="1"
                />
                <line
                  x1={padLeft}
                  y1={yForRSI(30)}
                  x2={width - padRight}
                  y2={yForRSI(30)}
                  stroke="#10b981"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={width - padRight + 8}
                  y={yForRSI(30) + 3}
                  fill="#10b981"
                  fontSize="10"
                >
                  30
                </text>
                <path
                  d={rsiPath}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.8"
                />
              </>
            )}

            {subIndicator === "MACD" && (
              <>
                <line
                  x1={padLeft}
                  y1={yForMacd(0)}
                  x2={width - padRight}
                  y2={yForMacd(0)}
                  stroke="#334155"
                  strokeWidth="1"
                />
                {visibleData.map((d, i) => {
                  const x = xForIndex(i);
                  const zeroY = yForMacd(0);
                  const valY = yForMacd(d.macdHist);
                  const barW = Math.max(
                    2,
                    Math.min(7, plotW / visibleData.length - 2)
                  );
                  return (
                    <rect
                      key={`${d.date}-macd-${i}`}
                      x={x - barW / 2}
                      y={Math.min(zeroY, valY)}
                      width={barW}
                      height={Math.max(1.5, Math.abs(valY - zeroY))}
                      fill={d.macdHist >= 0 ? "#10b981" : "#f43f5e"}
                      opacity="0.75"
                    />
                  );
                })}
                <path
                  d={macdLinePath}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.6"
                />
                <path
                  d={macdSignalPath}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.4"
                />
              </>
            )}

            {subIndicator === "VOLUME" &&
              visibleData.map((d, i) => {
                const x = xForIndex(i);
                const barH = (d.volume / maxVol) * subPlotH;
                const barW = Math.max(
                  2,
                  Math.min(7, plotW / visibleData.length - 2)
                );
                const isUp = d.close >= d.open;
                return (
                  <rect
                    key={`${d.date}-vol-${i}`}
                    x={x - barW / 2}
                    y={subPadTop + subPlotH - barH}
                    width={barW}
                    height={barH}
                    fill={isUp ? "#10b981" : "#f43f5e"}
                    opacity="0.7"
                  />
                );
              })}
          </svg>
        </div>
      </div>

      {/* Key Support, Resistance & Volume Profile Levels Table + Patterns */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Key Support, Resistance & Volume Profile Matrix */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
                Key Support, Resistance &amp; Volume Profile Levels ({interval})
              </h3>
              <p className="text-xs text-slate-400">
                Derived from swing pivots and Volume Profile Visible Range (VPVR)
              </p>
            </div>
            <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300 tabular-nums">
              POC: {sym}
              {vpvr.poc.toFixed(2)}
            </span>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs tabular-nums">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-3">Level</th>
                  <th className="py-2 px-3">Role / Zone</th>
                  <th className="py-2 px-3 text-right">Price</th>
                  <th className="py-2 pl-3 text-right">vs Last Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {vpvr.keyLevels.map((lvl) => (
                  <tr key={lvl.code} className="hover:bg-slate-800/30">
                    <td className="py-2 pr-3 font-bold">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[11px] ${
                          lvl.type === "Resistance"
                            ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                            : lvl.type === "Support"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : lvl.code === "POC"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                        }`}
                      >
                        {lvl.code}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-300">{lvl.label}</td>
                    <td className="py-2 px-3 text-right font-semibold text-white">
                      {sym}
                      {lvl.price.toFixed(2)}
                    </td>
                    <td
                      className={`py-2 pl-3 text-right font-medium ${
                        lvl.distancePct >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {lvl.distancePct >= 0 ? "+" : ""}
                      {lvl.distancePct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Buy vs Sell Volume Profile Balance Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-400 tabular-nums">
              <span className="text-emerald-400 font-medium">
                Buy / Up Volume: {vpvr.buyVolumePct.toFixed(1)}%
              </span>
              <span className="text-rose-400 font-medium">
                Sell / Down Volume: {(100 - vpvr.buyVolumePct).toFixed(1)}%
              </span>
            </div>
            <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-rose-500/60">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${vpvr.buyVolumePct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Pattern Recognition & Momentum Commentary */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
              Technical Pattern Recognition
            </h3>
            <div className="mt-3 space-y-3">
              {stock.technical.patterns.map((pat) => (
                <div
                  key={pat.name}
                  className="rounded-lg border border-slate-800/90 bg-slate-950/60 p-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-100">
                      {pat.name}
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      {pat.priceLevel && (
                        <span className="text-slate-400 tabular-nums">
                          Level: {sym}
                          {pat.priceLevel.toFixed(2)}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${
                          pat.type === "Bullish"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : pat.type === "Bearish"
                            ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                            : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {pat.type === "Bullish"
                          ? "▲ Bullish"
                          : pat.type === "Bearish"
                          ? "▼ Bearish"
                          : "• Neutral"}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                    {pat.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
              Momentum &amp; Volume Profile Synthesis
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
              {stock.priceTrendSummary}
            </p>
            <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400 space-y-1.5 tabular-nums">
              <div className="flex justify-between">
                <span>Volume Profile Positioning:</span>
                <span className="font-medium text-slate-200">
                  {stock.price >= vpvr.poc
                    ? `Trading above POC (${sym}${vpvr.poc.toFixed(2)}) — buyers in control`
                    : `Trading below POC (${sym}${vpvr.poc.toFixed(2)}) — overhead supply zone`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>RSI(14) Status:</span>
                <span className="font-medium text-slate-200">
                  {rsiInfo.zone} ({currentRsi.toFixed(1)})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
