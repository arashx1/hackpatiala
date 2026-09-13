# 💚 MoneyMind — Mind Over Money

> A beginner-investor platform with two trained neural networks, an LLM-powered jargon explainer and decision coach, a paper-trading simulator, and a gamified Financial Fitness Score.
>
> Built for **Google Developer Groups "Bit N Build" — Punjab Round** · Theme: *Mind Over Money*

---

## Quick Start (Demo Mode — No API Keys Needed)

The app runs fully offline using seed data. Perfect for demos without wifi.

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt

# Generate demo ONNX weights (random, but correct architecture)
cd ../training && python generate_demo_weights.py && cd ../backend

# Start the API server
uvicorn main:app --reload --port 8000
```

API docs auto-available at: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:5173

---

## Full Setup (With Trained Models + Live Data)

### Step 1 — Pre-download the sentence-transformers model (do on good wifi)

```bash
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
```

This caches the model locally so it won't be fetched at demo time.

### Step 2 — Train the models

```bash
cd training
pip install -r requirements.txt

# Train Risk Radar (~10 min CPU / ~2 min GPU)
python risk_model_train.py

# Train Hype Detector (~5 min CPU)
python hype_model_train.py
```

See training/README.md for full details.

### Step 3 — Add Gemini API key (optional)

```bash
cp backend/.env.example backend/.env
# Edit .env and paste your GEMINI_API_KEY
```

> The Gemini key lives ONLY in backend/.env — never in the frontend.

---

## If We're Low on Time (Hackathon Triage)

| Feature | Cut? | Why safe to cut |
|---|---|---|
| Financial Fitness Score | First cut | Rules-based fallback fully demoable |
| Live Gemini coach | Second cut | Pre-written fallback questions cover all combos |
| Risk Radar gauge | Keep | Core demo moment |
| Hype Detector badge | Keep | Core technical differentiator |
| Jargon tooltips | Keep | Answers the beginner-friendly criterion |

---

## Fallback Behavior

| Component | Primary | Fallback |
|---|---|---|
| Risk score | ONNX model | z-scored volatility formula |
| Hype score | ONNX + sentence-transformers | keyword-count heuristic |
| Jargon explain | glossary.json | Gemini API → generic message |
| Coach questions | Gemini API | Pre-written question bank |
| Market data | yfinance | seed_assets.json |

---

## 60-Second Demo Script

1. Open with GME headline "TO THE MOON 🚀" → Hype Detector flags 78/100 Hype-driven
2. Compare GME Risk Gauge (High 🔴) vs SPY (Low 🟢)
3. Hover "beta" on a card → Jargon tooltip in plain English
4. Click "Simulate" on GME → Coach asks: "Do you know what's driving this price?"
5. Cancel trade → Fitness holds. Accept → score dips (chased hype)
6. Show confusion matrix from training notebook

---

*Built with heart for Bit N Build Punjab Round*
