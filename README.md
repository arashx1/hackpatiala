# FundBee - AI-Powered Financial Literacy Platform

> **Mind Over Money** - Helping first-time investors make smarter decisions using neural networks, Socratic coaching, and real market data.

## Table of Contents
1. [What is FundBee?](#1-what-is-fundbee)
2. [Feature Overview](#2-feature-overview)
3. [System Architecture](#3-system-architecture)
4. [Directory Structure](#4-directory-structure)
5. [Data Flow - End to End](#5-data-flow--end-to-end)
6. [ML Model Details](#6-ml-model-details)
7. [Training Pipelines](#7-training-pipelines)
8. [Backend API Reference](#8-backend-api-reference)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Decision Coach Simulator Workflow](#10-decision-coach-simulator-workflow)
11. [Financial Fitness Score System](#11-financial-fitness-score-system)
12. [Document Summarizer Workflow](#12-document-summarizer-workflow)
13. [Jargon-Buster Workflow](#13-jargon-buster-glossary-workflow)
14. [Authentication (Supabase)](#14-authentication-supabase)
15. [Live Price Data Workflow](#15-live-price-data-workflow)
16. [Setup and Running Locally](#16-setup--running-locally)
17. [Environment Variables](#17-environment-variables)
18. [Inference Fallback Hierarchy](#18-inference-fallback-hierarchy)
19. [Commit History](#19-commit-history)

---

## 1. What is FundBee?

FundBee is a **financial literacy web application** built for first-time investors in India and globally. Rather than telling users what to buy, it teaches them **how to think** about investments through:

- **Real-time risk and hype scoring** using ONNX neural networks
- **Socratic coaching** powered by Google Gemini that challenges emotional buying
- **Paper trade simulation** - no real money ever at risk
- **Financial Fitness Score** - a gamified accountability metric
- **Candlestick charts** for every tracked asset
- **Document intelligence** - upload earnings reports and get plain-English summaries
- **Jargon-Buster** - explain any financial term in ELI5 language with analogies

---

## 2. Feature Overview

| Feature | Description | AI / ML Used |
|---------|-------------|--------------|
| Risk Radar | Scores each asset 0-100 on volatility, beta, drawdown | RiskNet ONNX (6->64->32->3) |
| Hype Detector | Scores headlines for FOMO vs. fundamentals content | HypeClassifier ONNX (384->128->64->2) |
| Decision Coach | 4-step Socratic simulator before every paper trade | Gemini 1.5 Flash + fallback trees |
| Financial Fitness | Gamified score updated after every coach interaction | Rule-based scoring engine |
| Candlestick Charts | Interactive OHLC charts with hover inspection | Vanilla Canvas / SVG |
| Document Summarizer | Upload PDF/TXT -> plain-English summary | Gemini 1.5 Flash + heuristic fallback |
| Jargon-Buster | ELI5 definitions + analogies for any financial term | Gemini + curated glossary (51 terms) |
| Live Prices | Real-time quotes for stocks and crypto | Finnhub API + yfinance fallback |
| Simulation History | Full log of all paper trades + fitness impact | localStorage |
| Auth | Sign up / log in / social OAuth | Supabase Auth |
| ML Model Lab | Inspect raw ONNX model architecture in-browser | In-app viewer |

---

## 3. System Architecture

```
BROWSER
  React 18 + TypeScript + Vite
  - Dashboard (AssetCards, CandlestickCharts)
  - Glossary (Jargon-Buster)
  - Document Summarizer (PDF/TXT upload)
  - Simulation History (Trade log, Fitness chart)
  - Decision Coach Modal (4-Step Wizard)
       Step 1: Allocation
       Step 2: NN Signals
       Step 3: Socratic Questions
       Step 4: Verdict + Counterfactual
       |
       | REST / multipart HTTP
       v
FastAPI Backend (port 8000)
  /price        - Finnhub API -> yfinance -> seed data
  /risk-score   - RiskNet ONNX inference
  /hype-score   - HypeClassifier ONNX inference
  /coach        - Gemini 1.5 Flash + question trees
  /explain      - Glossary JSON + Gemini fallback
  /api/document - pypdf -> Gemini 1.5 Flash
  app.state.models = { risk: OrtSession, hype: OrtSession }
       |
       +-------------+
       v             v
External APIs    Supabase (Auth)
- Finnhub        - PostgreSQL (hosted)
- yfinance       - OAuth providers
- Google Gemini  - JWT session mgmt
```

---

## 4. Directory Structure

```
fundbee/
+-- backend/
|   +-- main.py                  # FastAPI app factory, ONNX model loader
|   +-- requirements.txt         # Python dependencies
|   +-- .env                     # Secrets (GEMINI_API_KEY, STOCK_API_KEY)
|   +-- data/
|   |   +-- glossary.json        # 51 curated financial term definitions
|   +-- models/
|   |   +-- hype_model.onnx      # HypeClassifier head (231 KB, 384->128->64->2)
|   |   +-- risk_model.onnx      # RiskNet (11 KB, 6->64->32->3)
|   |   +-- risk_scaler.json     # StandardScaler mean/sigma for normalization
|   +-- routers/
|   |   +-- coach.py             # POST /coach/evaluate - Socratic coach
|   |   +-- document.py          # POST /api/document/summarize
|   |   +-- explain.py           # GET /explain?term=... - Jargon-Buster
|   |   +-- hype.py              # POST /hype-score - Hype Detector
|   |   +-- price.py             # GET /price/{ticker} - Live prices
|   |   +-- risk.py              # POST /risk-score - Risk Radar
|   +-- utils/
|       +-- cache.py             # TTL-based in-memory caches
|       +-- fallback.py          # rules_based_risk_score + rules_based_hype_score
|
+-- frontend/
|   +-- src/
|       +-- App.tsx              # Root component, hash-based routing
|       +-- types.ts             # TypeScript interfaces
|       +-- components/
|       |   +-- AssetCard.tsx    # Per-asset card with candlestick toggle
|       |   +-- CandlestickChart.tsx
|       |   +-- DecisionCoachModal.tsx # 4-step coach wizard
|       |   +-- FinancialFitnessCard.tsx
|       |   +-- HypeBadge.tsx
|       |   +-- JargonTooltip.tsx
|       |   +-- ModelLabModal.tsx # ONNX model inspector
|       |   +-- Navbar.tsx
|       |   +-- RiskGauge.tsx
|       |   +-- SparklineChart.tsx
|       +-- context/
|       |   +-- AuthContext.tsx  # Supabase session React context
|       +-- data/
|       |   +-- seed_assets.json # 8 seed assets with static OHLC history
|       +-- lib/
|       |   +-- api.ts           # All fetch() calls to backend
|       |   +-- fitnessScore.ts  # Fitness scoring engine + localStorage
|       |   +-- supabase.ts      # Supabase client singleton
|       +-- pages/
|           +-- AuthPage.tsx
|           +-- Dashboard.tsx
|           +-- DocumentReaderPage.tsx
|           +-- GlossaryPage.tsx
|           +-- SimulationHistoryPage.tsx
|
+-- training/
    +-- generate_demo_weights.py  # Fast ONNX weight generator (no torch needed)
    +-- risk_model_train.py       # Full RiskNet PyTorch training pipeline
    +-- hype_model_train.py       # Full HypeClassifier training pipeline
    +-- data/                     # Training datasets (CSV)
    +-- outputs/                  # Training artifacts, plots, model checkpoints
```

---

## 5. Data Flow - End to End

### Asset Loading on Page Open

```
Browser -> fetchAllAssets()
        -> GET /price/all
           -> For each seed ticker: Finnhub API (quote)
              +- success -> live price + 24h change%
              +- fail -> yfinance 7-day history -> last close
                   +- fail -> seed_assets.json static data
        <- [{ ticker, price, priceHistory, change24h, riskScore, hypeScore }]

Browser -> fetchRiskScore(ticker) -> POST /risk-score
        <- { score, label, confidence, source: "onnx" | "fallback" }

Browser -> fetchHypeScore(ticker) -> POST /hype-score
        <- { hype_score, label, breakdown, source: "onnx" | "fallback" }
```

### "Simulate Trade" Button Click

```
User clicks "Simulate" on an AssetCard
  -> DecisionCoachModal opens
    -> Step 1: User enters allocation amount ($)
    -> Step 2: NN Signals displayed
         asset.riskScore shown in RiskGauge
         asset.hypeScore shown in HypeBadge
         If hypeScore >= 50 -> FOMO Alert orange banner shown
         POST /coach/evaluate called in background
    -> Step 3: Socratic questions rendered
         If hypeScore >= 50 -> High Hype Warning banner shown
         User answers 2-3 Socratic questions
    -> Step 4: Verdict
         User clicks "Confirm Trade" or "Walk Away"
         calculateTradeImpact() computes fitness delta
         recordTradeAndScore() persists to localStorage
         6-Month Counterfactual card shows comparison vs S&P 500
```

---

## 6. ML Model Details

### 6.1 Risk Radar - RiskNet

**Purpose:** Score any asset from 0-100 (Low/Medium/High risk) based on quantitative financial features.

**Architecture:**
```
Input: (batch_size, 6)          6 standardized financial features
  -> Linear(6 -> 64) + ReLU
  -> Linear(64 -> 32) + ReLU
  -> Linear(32 -> 3)            logits for [Low, Medium, High]
Output: softmax probabilities
```

**Input Features (in order):**

| Feature | Description | Source |
|---------|-------------|--------|
| annualized_vol | Annualized price volatility (sigma x sqrt(252)) | yfinance 1yr daily close |
| beta_vs_spy | Beta relative to S&P 500 | yfinance regression vs SPY |
| max_drawdown_1yr | Maximum peak-to-trough drawdown | yfinance 1yr |
| log_market_cap | Natural log of market cap | yfinance .info |
| sector_encoded | Sector integer from SECTOR_MAP | yfinance .info |
| avg_volume_zscore | Z-score of 30-day avg volume vs 1yr avg | yfinance |

**Normalization:** Each feature is standardized using risk_scaler.json (mean and sigma fit on training data using sklearn StandardScaler).

**Model file:** backend/models/risk_model.onnx (11 KB)
**ONNX input name:** features
**ONNX output name:** logits

**Scoring formula:**
```python
score = prob_medium * 50 + prob_high * 100
# -> 0-100 scale, where 100 = highest risk
```

---

### 6.2 Hype Detector - HypeClassifier

**Purpose:** Classify financial headlines as "Hype-driven" (FOMO, social media, meme) vs "Fundamentals-driven" (earnings, guidance, valuation).

**Architecture:**
```
Input: (batch_size, 384)        text embedding vector
  -> Linear(384 -> 128) + ReLU
  -> Linear(128 -> 64) + ReLU
  -> Linear(64 -> 2)            logits for [Fundamentals, Hype]
Output: softmax probabilities
```

**Text Embedding Strategy (3-tier):**

The model was trained on sentence-transformers all-MiniLM-L6-v2 embeddings (384-d). At inference time, three paths are tried in order:

**Tier 1 - Full sentence-transformers** (ideal, requires torch + sentence_transformers)
```
headline text
  -> SentenceTransformer("all-MiniLM-L6-v2").encode()
  -> 384-d semantic embedding
  -> ONNX head
  -> hype probability
```

**Tier 2 - Deterministic Hash Encoder** (default when torch not installed)
```
headline text
  -> SHA-256 hash -> seeded numpy RNG -> 384-d random base vector
  -> Orthogonalized to ONNX model's hype decision axis
  -> Keyword signal (HYPE_KW hits minus FUND_KW hits + caps/exclamation bonus)
  -> Scaled along hype axis
  -> Composite 384-d embedding
  -> ONNX head (same weights)
  -> hype probability
```

The **hype decision axis** is derived once at startup from ONNX weight matrices:
```python
diff = W2[:, 1] - W2[:, 0]    # (64,) direction that maximises hype logit
axis = W0 @ (W1 @ diff)        # (384,) projected back to embedding space
axis = axis / norm(axis)        # unit vector
```

This aligns the keyword signal with exactly what the trained model's weights discriminate, producing coherent scores without the full transformers library.

**Tier 3 - Rules-based keyword fallback** (if ONNX session fails to load)
```
headline text -> count HYPE_KEYWORDS -> weighted score 0-100 -> source: "fallback"
```

**Model file:** backend/models/hype_model.onnx (231 KB)
**ONNX input name:** embedding
**ONNX output name:** output

---

## 7. Training Pipelines

### 7.1 RiskNet Training

**Script:** training/risk_model_train.py

**Full Pipeline:**

```
Step 1: Data Collection
  -> 150+ S&P 500 tickers from DEFAULT_TICKERS list
  -> yfinance downloads: 1yr of daily OHLCV for each ticker
  -> Computes 6 features per ticker
  -> Falls back to synthetic generation if network unavailable

Step 2: Label Generation (Weak Supervision)
  -> No manual labels needed
  -> Percentile-rank heuristics on feature set:
     Low risk  -> annualized_vol < 20th pct  AND  max_drawdown < 20th pct
     High risk -> annualized_vol > 80th pct  OR   max_drawdown > 80th pct
     Medium    -> everything else

Step 3: Feature Scaling
  -> sklearn StandardScaler fitted on training split
  -> mean and sigma exported to risk_scaler.json
  -> Applied to all features before model input

Step 4: Model Definition (PyTorch)
  class RiskNet(nn.Module):
    Linear(6 -> 64) -> ReLU -> Linear(64 -> 32) -> ReLU -> Linear(32 -> 3)

Step 5: Training
  Loss:       CrossEntropyLoss
  Optimizer:  Adam (lr=1e-3, weight_decay=1e-4)
  Split:      80/20 stratified (sklearn train_test_split)
  Epochs:     50 (configurable via --epochs)
  Batch size: 32
  Device:     CUDA if available, else CPU

Step 6: Evaluation
  -> sklearn classification_report (precision/recall/F1 per class)
  -> Confusion matrix heatmap (seaborn, saved to outputs/)

Step 7: ONNX Export
  -> torch.onnx.export (opset 17)
  -> Verified with onnxruntime.InferenceSession
  -> Copied to backend/models/risk_model.onnx
  -> risk_scaler.json written to backend/models/
```

Run it:
```bash
cd training
pip install -r requirements.txt
python risk_model_train.py --epochs 50 --output-dir outputs/
```

---

### 7.2 HypeClassifier Training

**Script:** training/hype_model_train.py

**Full Pipeline:**

```
Step 1: Data
  Option A - Synthetic (default):
    35 hype headline templates x tickers x hype keywords -> ~2,000 hype headlines
    35 fundamentals headline templates x financial language -> ~2,000 fund headlines
    Templates parameterized by ticker, market region, numeric values

  Option B - Kaggle (--dataset kaggle --kaggle-path PATH):
    Loads CSV with raw financial news
    Heuristic auto-labeling: count hype keyword hits
      score >= 2 -> Hype (1), score = 0 -> Fundamentals (0)
    Augments with synthetic data for balance

Step 2: Embeddings (frozen)
  sentence-transformers "all-MiniLM-L6-v2"
  encode() all headlines -> (N, 384) numpy array
  Embeddings are FROZEN - only classifier head trains

Step 3: Model Definition (PyTorch)
  class HypeClassifier(nn.Module):
    Linear(384 -> 128) -> ReLU -> Linear(128 -> 64) -> ReLU -> Linear(64 -> 2)

Step 4: Training
  Loss:       CrossEntropyLoss
  Optimizer:  Adam (lr=1e-3)
  Split:      80/20 stratified
  Epochs:     20 (configurable via --epochs)
  Batch size: 64

Step 5: Evaluation
  -> Classification report (Hype / Fundamentals precision/recall)
  -> AUC-ROC score
  -> ROC curve plot (outputs/roc_curve.png)
  -> Confusion matrix (outputs/confusion_matrix.png)

Step 6: ONNX Export
  Exports ONLY the classifier head (not the embedder)
  Input: "embedding" shape [batch, 384]
  Output: "output" shape [batch, 2]
  opset 17, verified via onnxruntime
  Copied to backend/models/hype_model.onnx
```

Run it:
```bash
cd training
python hype_model_train.py --dataset synthetic --epochs 20
# or with Kaggle data:
python hype_model_train.py --dataset kaggle --kaggle-path ./data/financial_news.csv
```

---

### 7.3 Demo Weights Generator

**Script:** training/generate_demo_weights.py

Used to regenerate clean ONNX weights instantly without PyTorch or training data - useful for CI, testing, and hackathon judges.

```
create_mlp_onnx([6, 64, 32, 3], "features", "logits", ...)   -> risk_model.onnx
create_mlp_onnx([384, 128, 64, 2], "embedding", "output", .) -> hype_model.onnx

Weight initialization: Xavier uniform
  limit = sqrt(6 / (fan_in + fan_out))
  W ~ Uniform(-limit, limit)
  B = 0

ONNX graph: feedforward MLP with ReLU activations, linear output
Verified with onnxruntime.InferenceSession before saving
```

```bash
cd training
python generate_demo_weights.py
```

---

## 8. Backend API Reference

All endpoints run at http://localhost:8000. Swagger docs at /docs.

### Health
```
GET /health
-> { status: "ok", models: { risk: "loaded"|"fallback", hype: "loaded"|"fallback" } }
```

### Prices
```
GET /price/{ticker}
-> { ticker, price, change24h, priceHistory, priceHistory7d, source }

GET /price/all
-> [PriceData, ...]   (all 8 seed tickers)
```

### Risk Radar
```
POST /risk-score
Body: { ticker?: str, annualized_vol?, beta_vs_spy?, max_drawdown_1yr?,
        log_market_cap?, sector_encoded?, avg_volume_zscore? }

GET /risk-score?ticker=AAPL    (auto-fetches live features via yfinance)

-> { ticker, score: 0-100, label: "Low"|"Medium"|"High",
     confidence, components, source: "onnx"|"fallback" }
```

### Hype Detector
```
POST /hype-score
Body: { ticker?: str, headlines?: str[] }

-> { ticker, hype_score: 0-100, label: "Hype-driven"|"Fundamentals-driven",
     breakdown: [{ headline, score }], headlines_analyzed, source: "onnx"|"fallback" }
```

### Decision Coach
```
POST /coach/evaluate
Body: { ticker, asset_name?, amount, user_risk_tolerance,
        risk_score, risk_label, hype_score, hype_label }

-> { ticker, asset_name, amount, risk_match, hype_warning,
     status: "sound_decision"|"hype_warning"|"risk_mismatch"|"high_risk_gamble",
     coach_headline, socratic_questions: [{ id, question, why_it_matters, options }],
     fitness_impact_preview, source: "gemini"|"fallback" }
```

### Jargon-Buster
```
GET /explain?term=P/E+Ratio
-> { term, slug, eli5, analogy, keywords?, source: "glossary"|"gemini"|"fallback" }

GET /explain/all
-> [GlossaryTerm, ...]   (all 51 terms)
```

### Document Summarizer
```
POST /api/document/summarize
Content-Type: multipart/form-data
Body: file (PDF or .txt, max 5MB)

-> { filename, file_type, word_count, truncated,
     summary, key_fact, takeaway, source: "gemini"|"heuristic" }
```

---

## 9. Frontend Architecture

**Stack:** React 18 + TypeScript + Vite + Vanilla CSS

**Routing:** Hash-based (no React Router dependency)
```
/#             -> Dashboard
/#glossary     -> Jargon-Buster Glossary
/#history      -> Simulation History
/#document     -> Document Summarizer
/#auth         -> Auth Page (Supabase)
```

**State Management:** React useState + useEffect + localStorage (no Redux)

**Key Data Flows:**
```
AuthContext (Supabase session) wraps entire App

App.tsx
  +-- fetchAllAssets() on mount -> assets[]
  +-- loadFitnessProfile() -> profile (localStorage)
  +-- hash-change listener -> currentTab

Dashboard
  +-- AssetCard[] (per asset)
  |     +-- CandlestickChart (toggle)
  |     +-- SparklineChart
  |     +-- "Simulate" -> setSelectedSimAsset
  +-- FinancialFitnessCard

DecisionCoachModal (when selectedSimAsset !== null)
  Step 1 -> user inputs amount
  Step 2 -> RiskGauge + HypeBadge + hype alert
  Step 3 -> Socratic questions from /coach/evaluate
  Step 4 -> Verdict + Counterfactual + recordTradeAndScore()
```

---

## 10. Decision Coach Simulator Workflow

The 4-step modal is the core educational experience:

```
STEP 1: ALLOCATION
  User enters dollar amount for simulated investment
  Asset info shown: name, ticker, current price

  -> "Continue"

STEP 2: NN SIGNALS
  RiskGauge: animated semicircle gauge (0-100)
  HypeBadge: color-coded hype score
  Inline chip: "X% hype-driven" (orange >=50%, blue <50%)
  FOMO Alert banner if hypeScore >= 50
  Coach Note from /coach/evaluate API
  POST /coach/evaluate called here in background

  -> "Continue"

STEP 3: SOCRATIC COACH
  If hypeScore >= 50: orange "High Hype Warning (X%)" banner
  Else: green "Answer honestly" Compass banner
  2-3 Socratic questions with multiple choice options
    (generated by Gemini or deterministic fallback trees)
  Each question shows "Why this matters" explanation

  -> "Continue"

STEP 4: VERDICT
  Two choices: [Confirm Paper Trade]  [Walk Away]

  After choice:
    calculateTradeImpact() -> fitness delta
    recordTradeAndScore() -> update localStorage
    Fitness score card (+/- pts, reason)
    6-Month Reality Check (Counterfactual Simulator):
      Shows: $invested in [TICKER] vs S&P 500 over 6 months
      Asset return vs Index return -> +/- $ difference
      Covers: GME, AAPL, MSFT, NVDA, TSLA, BTC, DOGE, ARKK, SPY, VTI
```

**Coach API source selection:**
1. Gemini 1.5 Flash - if GEMINI_API_KEY set, generates contextual personalized questions
2. Deterministic fallback trees - 4 branches based on status (sound_decision / hype_warning / risk_mismatch / high_risk_gamble)

---

## 11. Financial Fitness Score System

Stored in localStorage key: moneymind_user_fitness_profile

**Tiers:**

| Score Range | Tier |
|-------------|------|
| 85-100 | Zen Master Investor |
| 70-84  | Disciplined Investor |
| 50-69  | Mindful Saver |
| 0-49   | Impulsive Rookie |

**Scoring formula (fitnessScore.ts):**

```
Walk Away decision:
  hypeScore >= 50  ->  +4 pts  (Exercised emotional discipline)
  hypeScore < 50   ->  +1 pt   (Took time to deliberate)

Confirm Trade decision:
  hypeScore >= 70  ->  -8 pts  (extreme hype spike)
  hypeScore >= 50  ->  -4 pts  (elevated momentum)
  hypeScore <  50  ->  +4 pts  (fundamentals-driven)

  riskScore >= 65 AND tolerance = Conservative  ->  -5 pts
  riskScore <  65                               ->  +3 pts

  amount > $5,000 AND hypeScore >= 50  ->  -2 pts (oversized hype bet)

Final delta clamped to [-12, +10]
```

History: Last 30 log entries kept. Each stores: { id, timestamp, delta, reason, ticker, newScore }

---

## 12. Document Summarizer Workflow

```
User uploads file (PDF or .txt, max 5MB)
         |
         v
POST /api/document/summarize (multipart/form-data)
         |
         v
Content-type detection:
  PDF -> pypdf.PdfReader -> extract text from all pages
       -> if empty: fitz (PyMuPDF) fallback
  TXT -> decode UTF-8

Validation:
  File size <= 5MB
  Extracted text >= 30 chars, >= 15 alpha chars
  Text truncated to 8,000 words if too long

Gemini prompt:
  "You are a financial literacy tutor...
   Summarize in 2-3 plain-English sentences (no jargon).
   Pull out the single most important number or statistic.
   Give one plain-English takeaway for a first-time investor."

Response: { summary, key_fact, takeaway, source: "gemini" }

Heuristic fallback (if Gemini unavailable):
  Extracts sentences containing financial numbers (regex)
  { source: "heuristic" }
```

---

## 13. Jargon-Buster (Glossary) Workflow

```
User types term (e.g. "P/E Ratio", "Beta", "SIP")
         |
         v
GET /explain?term=...
         |
         v
1. Dynamic glossary load:
   Reads glossary.json (51 terms)
   Re-reads only if file mtime changed (hot-reload safe)

2. Fuzzy term matching:
   Exact term match (case-insensitive)
   Slug match (hyphenated lowercase)
   Keyword array match
   Substring match on keywords

3. If matched -> return { term, eli5, analogy, keywords }

4. If not matched -> Gemini 1.5 Flash:
   "Explain {term} to a first-time investor in India.
    Keep under 60 words, use a relatable analogy."

5. Smart heuristic fallback (if Gemini unavailable):
   Ratio/margin/yield -> generic comparative metric explanation
   SIP / DCA -> pre-written definitions
```

Current glossary covers: P/E Ratio, Beta, Market Cap, Dividend, ETF, Mutual Fund, IPO, Bull/Bear Market, Volatility, Drawdown, Alpha, Sharpe Ratio, NAV, SIP, DCA, CAGR, Portfolio, Diversification, Liquidity, Short Selling, and 31 more.

---

## 14. Authentication (Supabase)

FundBee uses Supabase Auth for optional account creation. All simulation features work without logging in (localStorage-based).

**Flows supported:**
- Email + Password signup / login
- Magic Link (passwordless email)
- OAuth (Google, GitHub - configurable in Supabase dashboard)

**Implementation:**
```typescript
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
})

// AuthContext.tsx - global session state
supabase.auth.getSession()         // initial load
supabase.auth.onAuthStateChange()  // reactive updates
```

Project: https://vamsjntjjaherzqoobsj.supabase.co

---

## 15. Live Price Data Workflow

```
GET /price/{ticker}
         |
         v
Cache check (TTL = 60 seconds, cachetools.TTLCache)
         |
         v
1. Finnhub API (if STOCK_API_KEY set in .env)
   GET https://finnhub.io/api/v1/quote?symbol={ticker}&token={key}
   -> { price, change24h% }

2. yfinance fallback (if Finnhub fails or no key)
   yf.Ticker(ticker).history(period="7d", interval="1d")
   -> last 7 closes + % change

3. Seed asset static data (if network unavailable)
   Reads seed_assets.json
   -> static priceHistory[] + is_fallback: true

Price history for charts:
  30-point OHLC array from 7-day close prices
  Synthetic O/H/L derived from close with +/-1-2% spread
  -> Used by CandlestickChart component
```

---

## 16. Setup & Running Locally

### Prerequisites
- Python 3.11+ (3.13 works)
- Node.js 18+
- Git

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# -> http://localhost:5173
```

### Regenerate ONNX Weights (optional)
```bash
cd training
pip install -r requirements.txt
python generate_demo_weights.py
```

### Full Training (optional, requires PyTorch)
```bash
cd training
pip install -r requirements.txt
python risk_model_train.py --epochs 50
python hype_model_train.py --dataset synthetic --epochs 20
```

---

## 17. Environment Variables

**backend/.env**
```
# Google Gemini - for Decision Coach, Jargon-Buster, Document Summarizer
GEMINI_API_KEY=your_gemini_api_key_here

# Finnhub - for live stock quotes (optional, yfinance used as fallback)
STOCK_API_KEY=your_finnhub_api_key_here
```

**frontend/.env** (optional - defaults are baked in)
```
VITE_SUPABASE_URL=https://vamsjntjjaherzqoobsj.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_API_BASE=http://localhost:8000
```

---

## 18. Inference Fallback Hierarchy

Every AI feature has graceful degradation. The app is fully functional offline:

```
Risk Radar:
  ONNX + live yfinance features  ->  ONNX + seed features  ->  rules_based_risk_score

Hype Detector:
  ONNX + sentence-transformers   ->  ONNX + hash encoder   ->  rules_based_hype_score

Decision Coach:
  Gemini 1.5 Flash               ->  deterministic question trees (4 branches)

Jargon-Buster:
  glossary.json match            ->  Gemini 1.5 Flash       ->  smart heuristics

Document Summarizer:
  Gemini 1.5 Flash               ->  regex heuristic extractor

Live Prices:
  Finnhub API                    ->  yfinance               ->  seed_assets.json
```

---

## 19. Commit History

| Commit | Description |
|--------|-------------|
| c1e4b30 | Fix Hype Detector ONNX fallback with hash encoder; wire hype score into Decision Coach; add Regret/Counterfactual Simulator |
| 34c9465 | Fix JargonTooltip sizing and horizontal overflow |
| c74da0f | Rebrand from MoneyMind to FundBee; add Supabase Login/Sign Up authentication |
| 1c3741d | Convert asset cards to interactive Candlestick charts with OHLC wicks, hover inspection, and view toggle |
| 88a7df0 | Add glossary expansion utility script |
| 3c34c55 | Fix Jargon-Buster repetitive answers: dynamic glossary reloading, expand SIP/DCA terms |
| 1c0b15b | Add Document Reader and Summarizer feature with Gemini 1.5 |
| a9bcf4d | Add real live price data, CoinGecko polling, backend stock quotes, and 7d sparklines |

---

## License

MIT (c) FundBee - Mind Over Money

> Disclaimer: FundBee is an educational simulation tool. No real money is ever invested. Nothing here constitutes financial advice.
