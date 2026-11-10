# DayTrade — Stock Analysis Web Application

A comprehensive stock analysis web application covering **US Equities**, **China A-Shares**, and **Hong Kong Markets**. Designed to deliver institutional-grade fundamental and technical analysis, peer benchmarking, risk assessment, and structured investment reports with a clean, accessible user interface.

---

## Key Features

### 1. Multi-Market Coverage
- **United States**: NYSE, NASDAQ (e.g., `AAPL`, `MSFT`, `NVDA`)
- **China A-Shares**: SSE, SZSE (e.g., `600519.SH`, `000858.SZ`)
- **Hong Kong**: HKEX (e.g., `0700.HK`, `9988.HK`)

### 2. Analysis Modes
- **Quick Analysis**: Instant executive snapshot of valuation, profitability, and momentum metrics.
- **Deep Dive (Fundamental Analysis)**: Comprehensive evaluation of business moat, financial statements, valuation multiples, growth rates, and balance sheet health.
- **Intrinsic / Fair Value (Sector-Adaptive Valuation)**: Multi-model valuation engine combining **2-Stage Free Cash Flow DCF**, **Quality-Adjusted EV/EBITDA**, **Growth-Adjusted P/E (GARP/PEG)**, and **Justified P/B (ROE Excess Return)** weighted automatically by sector archetype, with an SVG Football-Field chart, interactive DCF sliders, and a 5×5 WACC vs. Terminal Growth sensitivity matrix.
- **Income & Balance Sheet Statements**: Interactive Annual (`FY`) and Quarterly (`Q`) charts & tables focused on essential metrics (**Total Revenue**, **Gross Profit**, **Operating Income**, **Net Income**, **Margin Trajectory %**, **Total Assets**, **Total Liabilities**, **Stockholders' Equity**, **Cash & Equivalents**, and **Total Debt**).
- **Technical Review**: Interactive price action charts (`1hr`, `4hr`, `D`, `2D`, `W`, `M`), Volume Profile Visible Range (`VPVR` / `POC`), trend indicators, multi-level support/resistance (`S1`/`S2`/`R1`/`R2`), and chart pattern detection.
- **Peer Comparison**: Side-by-side benchmarking against sector competitors and industry averages.

### 3. Fundamental Analysis Framework
| Category | Key Metrics Tracked | Benchmark / Target |
| :--- | :--- | :--- |
| **Valuation** | P/E, P/B, P/S, EV/EBITDA, PEG Ratio | P/E < 15 (value), PEG < 1.0, EV/EBITDA < 10 |
| **Profitability** | Gross Margin, Operating Margin, Net Margin, ROE, ROIC | Gross > 40%, Operating > 15%, ROE > 15%, ROIC > WACC |
| **Growth** | Revenue Growth (YoY), EPS Growth, FCF Growth | Revenue > 10% YoY, EPS outpacing Revenue |
| **Financial Health** | Debt/Equity, Current Ratio, Interest Coverage, FCF Yield | D/E < 1.0, Current Ratio > 1.5, Interest Coverage > 5x |

### 4. Technical Analysis Engine
- **Multi-Timeframe Interval Selector**:
  - Switch dynamically between **`1hr`**, **`4hr`**, **`D`** (1-Day), **`2D`** (2-Day), **`W`** (Weekly), and **`M`** (Monthly) candlestick & area charts powered by live Yahoo Finance market feeds.
- **Volume Profile Visible Range (VPVR)**:
  - Horizontal volume-at-price histogram split by **Buy / Up Volume** vs. **Sell / Down Volume**.
  - Automatic detection of the **Point of Control (POC)** magnet line and the **70% Value Area (`VAH` & `VAL`)**.
- **Trend & Momentum Indicators**:
  - 50-period & 200-period Simple/Exponential Moving Averages (Golden/Death Cross detection)
  - MACD (12, 26, 9) histogram and signal crossovers
  - RSI (14) overbought (> 70) and oversold (< 30) zones
- **Key Support & Resistance Levels**:
  - Multi-tier dynamic **Immediate & Major Support (`S1`, `S2`)** and **Immediate & Major Resistance (`R1`, `R2`)** plotted directly on the chart alongside a distance-to-price matrix and 52-week range tracker.

### 5. Structured Investment Reports
Generates exportable reports containing:
- **Executive Summary**: Bullish / Neutral / Bearish rating and Low / Medium / High risk score
- **Key Metrics at a Glance**: Value vs. industry delta and valuation assessment
- **Fundamental & Technical Breakdown**: Narrative and quantitative synthesis
- **Bull vs. Bear Thesis**: Balanced scenario modeling and key risk catalysts

---

## Architecture & Tech Stack

```
DayTrade/
├── .agents/
│   └── skills/
│       ├── stock-analysis/          # Domain framework for fundamental & technical equity research
│       └── web-design-guidelines/   # UI/UX, accessibility, and performance auditing rules
├── src/
│   ├── app/
│   │   ├── api/stock/route.ts       # Live Yahoo Finance market quote, OHLCV & fundamental API
│   │   ├── globals.css              # Dark terminal styles, tabular-nums & reduced-motion rules
│   │   ├── layout.tsx               # Accessible root layout with skip-link & viewport metadata
│   │   └── page.tsx                 # Main multi-market stock analysis terminal
│   ├── components/
│   │   ├── charts/                  # Interactive SVG candlestick, VPVR, S/R levels, SMA, MACD & RSI charts
│   │   ├── custom/                  # Custom stock ticker & financial ratio model input
│   │   ├── metrics/                 # 17-ratio fundamental breakdown & ROIC/WACC diagnostics
│   │   ├── peers/                   # Sortable competitor matrix with live peer quotes
│   │   ├── reports/                 # Structured investment report viewer & Markdown/CSV export
│   │   ├── statements/              # Annual & Quarterly Income Statement & Balance Sheet charts
│   │   └── valuation/               # Sector-Adaptive Intrinsic / Fair Value Football-Field & DCF engine
│   ├── lib/
│   │   ├── analysis/engine.ts       # Fundamental ratio evaluators & real OHLCV technical indicators
│   │   ├── api/yahooFinance.ts      # Live Yahoo Finance chart, quoteSummary & batch quote adapter
│   │   ├── data/stocks.ts           # Flagship multi-market catalog (US, China A-Shares, Hong Kong)
│   │   └── types/stock.ts           # TypeScript interfaces for tickers, financials, and reports
├── public/                          # Static assets
├── skills-lock.json                 # Installed agent skills lockfile
└── README.md
```

### Recommended Stack
- **Frontend Framework**: Next.js (App Router) + React + TypeScript
- **Styling & UI**: Tailwind CSS + Radix UI / shadcn/ui (compliant with [Web Interface Guidelines](.agents/skills/web-design-guidelines/SKILL.md))
- **Charting**: TradingView Lightweight Charts + Recharts for financial metrics
- **Data Layer**: Yahoo Finance / Alpha Vantage / Tushare / AkShare adapters with server-side caching

---

## UI/UX & Accessibility Standards

This project adheres to the installed `web-design-guidelines` skill:
- **Tabular Numerals**: All financial tables, tickers, and live price feeds use `font-variant-numeric: tabular-nums` to prevent layout jitter.
- **Keyboard-First Navigation**: Quick ticker search (`Cmd/Ctrl + K`), full focus-visible rings, and ARIA-labeled chart controls.
- **Color-Blind Safe Indicators**: Positive/negative price movements pair high-contrast colors with directional icons (`▲` / `▼`) and `+`/`-` prefixes rather than relying on color alone.
- **Responsive Dark/Light Themes**: High-contrast financial terminal aesthetic with `color-scheme: dark light` support.

---

## Getting Started

### Prerequisites
- **Node.js** >= 20.x
- **npm**, **pnpm**, or **bun**

### Installation

1. **Clone the repository and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env.local` file in the root directory:
   ```env
   MARKET_DATA_API_KEY=your_api_key_here
   NEXT_PUBLIC_DEFAULT_MARKET=US
   ```

3. **Run the development server**:
   - **Windows Quick-Start / Stop Scripts**:
     - Double-click or run `start.bat` to automatically install dependencies (if needed), start the server on port `3000`, and open `http://localhost:3000`.
     - Double-click or run `stop.bat` to cleanly terminate the server on port `3000`.
   - **Or via CLI**:
     ```bash
     npm run dev
     ```
     Open `http://localhost:3000` in your browser.

---

## Implementation Roadmap

- [x] **Phase 1 — Core Foundation & Data Pipeline**
  - Project scaffolding, TypeScript domain models (`src/lib/types/stock.ts`), and unified multi-market catalog (`US`, `CN`, `HK` in `src/lib/data/stocks.ts`).
  - Financial statement and historical OHLCV data generator (`generateSyntheticHistory`).
- [x] **Phase 2 — Fundamental & Technical Calculation Engine**
  - Automated evaluation of 17 Valuation, Profitability, Growth, and Financial Health ratios (`evaluateAllMetrics` in `src/lib/analysis/engine.ts`).
  - Technical indicator pipeline (SMA 50/200, RSI 14, MACD 12/26/9, Support/Resistance & Pattern Recognition).
- [x] **Phase 3 — Interactive Dashboard & Charting UI**
  - Ticker search (`⌘K` / `Ctrl+K`), interactive SVG candlestick/area charts (`src/components/charts/TechnicalChart.tsx`), and metric comparison tables with `tabular-nums`.
  - Sortable peer comparison matrix (`src/components/peers/PeerComparisonView.tsx`) and custom stock model builder (`src/components/custom/CustomStockAnalyzer.tsx`).
- [x] **Phase 4 — Automated Report Generator & Export**
  - Structured investment report generator (Executive Summary, Bull/Bear Case, Risk Factors in `src/components/reports/InvestmentReportView.tsx`).
  - Export to Markdown (`.md`) and Spreadsheet (`.csv`).

---

## Installed Agent Skills

This repository includes pre-configured agent skills in `.agents/skills/`:
- **[`stock-analysis`](.agents/skills/stock-analysis/SKILL.md)**: Standardized analytical framework for equity valuation, financial ratios, technical indicators, and report generation.
- **[`web-design-guidelines`](.agents/skills/web-design-guidelines/SKILL.md)**: UI/UX best practices and accessibility compliance auditing.

---

## Disclaimer

This application and its generated reports are for **informational and educational purposes only** and do not constitute financial advice or investment recommendations. Past performance does not guarantee future results. Always conduct your own due diligence before making investment decisions.

