# MoneyMind — ML Training Scripts

> Training pipeline for **Risk Radar** (asset risk classification) and  
> **Hype Detector** (financial headline text classification).

---

## Directory Structure

```
training/
├── risk_model_train.py        # Risk Radar training pipeline
├── hype_model_train.py        # Hype Detector training pipeline
├── generate_demo_weights.py   # Instant demo weights (no training required)
├── requirements.txt
├── data/                      # Auto-created: raw features + cached embeddings
└── outputs/                   # Auto-created: checkpoints, ONNX files, plots
```

---

## Installation

```bash
pip install -r requirements.txt
```

> [!NOTE]
> `sentence-transformers` will download the `all-MiniLM-L6-v2` model (~90 MB)
> on first use. See **Pre-download Models** section below to cache it before demo day.

---

## Quick Start — Demo Weights (No Training Required)

Run this **first** so the backend can start immediately:

```bash
python generate_demo_weights.py
```

This writes random-weight ONNX files to `../backend/models/`. The backend
will serve plausible-shaped (but not meaningful) predictions. Replace with
real weights by running the training scripts below.

---

## Running the Training Scripts

### Risk Radar

```bash
# Option A — full pipeline with live yfinance data (~150 tickers, 2yr history)
python risk_model_train.py

# Option B — offline / CI mode (synthetic data, always runs to completion)
python risk_model_train.py --generate-seed

# Custom options
python risk_model_train.py \
  --tickers-file my_tickers.txt \
  --epochs 80 \
  --output-dir outputs/

# Help
python risk_model_train.py --help
```

### Hype Detector

```bash
# Option A — synthetic headlines (default, offline-safe)
python hype_model_train.py

# Option B — Kaggle financial news CSV with weak-supervision labeling
python hype_model_train.py --dataset kaggle --kaggle-path /path/to/news.csv

# Custom epochs
python hype_model_train.py --epochs 30

# Help
python hype_model_train.py --help
```

---

## Expected Runtime

| Script | CPU (8-core) | GPU (e.g. T4) |
|--------|-------------|---------------|
| `risk_model_train.py` (live yfinance) | ~10 min | ~2 min |
| `risk_model_train.py --generate-seed` | ~30 sec | ~10 sec |
| `hype_model_train.py` (synthetic) | ~5 min | ~1 min |
| `generate_demo_weights.py` | ~5 sec | ~5 sec |

> [!TIP]
> The sentence-transformer encoding step in `hype_model_train.py` runs once and
> is cached to `data/hype_embeddings.npy`. Subsequent runs skip it entirely.

---

## Outputs Generated

### Risk Radar (`outputs/`)
| File | Description |
|------|-------------|
| `risk_best.pt` | PyTorch checkpoint (best val accuracy) |
| `risk_model.onnx` | ONNX model, opset 17 (also copied to `../backend/models/`) |
| `risk_scaler.json` | StandardScaler mean + std for 6 features (also copied to backend) |
| `risk_confusion_matrix.png` | Seaborn heatmap, 3×3 (Low / Medium / High) |

`data/risk_features.csv` — raw per-ticker features before normalization.

### Hype Detector (`outputs/`)
| File | Description |
|------|-------------|
| `hype_best.pt` | PyTorch checkpoint (best val accuracy) |
| `hype_model.onnx` | ONNX classifier head only, opset 17 (copied to backend) |
| `hype_confusion_matrix.png` | 2×2 seaborn heatmap |
| `hype_roc_curve.png` | ROC curve with AUC label |

`data/hype_embeddings.npy` — cached 384-dim sentence-transformer embeddings.

---

## Pre-download Models (Do Before Demo)

Run this **once** on a machine with internet so the embedding model is cached
locally. It will then load instantly during the demo even without Wi-Fi:

```bash
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
```

The model (~90 MB) is saved to `~/.cache/huggingface/`. After this,
`hype_model_train.py` and backend inference both work fully offline.

---

## Demo Weights vs. Trained Weights

| | Demo weights | Trained weights |
|---|---|---|
| **Source** | `generate_demo_weights.py` | `risk_model_train.py` / `hype_model_train.py` |
| **Accuracy** | Random (meaningless) | Real (see table below) |
| **Backend starts?** | ✅ Yes | ✅ Yes |
| **Predictions correct?** | ❌ No | ✅ Yes |
| **Use case** | First boot / integration test | Demo + production |

> [!WARNING]
> Never present demo-weight predictions to judges or users as real risk scores.
> The scaler JSON shipped with demo weights is an identity transform (mean=0, std=1).
> After a real training run, the backend automatically picks up the new files.

---

## Model Architectures

### RiskNet (6 → 64 → 32 → 3)

```
Input: [batch, 6]  ← annualized_vol, beta_vs_spy, max_drawdown_1yr,
                       log_market_cap, sector_encoded, avg_volume_zscore

Linear(6, 64) → BatchNorm1d(64) → ReLU → Dropout(0.30)
Linear(64, 32) → BatchNorm1d(32) → ReLU → Dropout(0.20)
Linear(32, 3)

Output: [batch, 3]  ← logits for Low (0), Medium (1), High (2)
```

**Total parameters:** 6,595

### HypeClassifier (384 → 128 → 64 → 2)

```
Input: [batch, 384]  ← frozen sentence-transformer embedding (all-MiniLM-L6-v2)

Linear(384, 128) → ReLU → Dropout(0.30)
Linear(128, 64)  → ReLU → Dropout(0.20)
Linear(64, 2)

Output: [batch, 2]  ← logits for Fundamentals (0), Hype (1)
```

**Total parameters:** 58,370  
**Note:** The embedding model is NOT part of the ONNX export. It runs separately
in Python at inference time. Only the classifier head is exported.

---

## Dataset Sources

| Model | Source | Size |
|-------|--------|------|
| Risk Radar | yfinance (2yr daily OHLCV + fast_info) | ~150 tickers |
| Risk Radar (fallback) | Synthetic (LogNormal/Normal distributions) | 300 samples |
| Hype Detector (default) | Synthetic headline templates | 2,000 samples |
| Hype Detector (optional) | Kaggle financial news CSV + heuristic labels | Variable |

---

## Weak Supervision Labeling

This is the most technically interesting part of the pipeline and the one most
likely to receive questions from judges. Here is the honest explanation:

### Risk Radar Labels

The risk labels (Low / Medium / High) are **not** hand-annotated by a financial
expert. Instead, they are derived from a **percentile-rank heuristic** applied
to three observed metrics:

| Metric | High Risk threshold | Low Risk threshold |
|--------|--------------------|--------------------|
| Annualized volatility | ≥ 70th percentile | ≤ 30th percentile |
| Beta vs. SPY | ≥ 65th percentile | ≤ 35th percentile |
| 1-year max drawdown | ≥ 70th percentile | ≤ 30th percentile |

- A ticker is **High** if it clears ALL three high-risk thresholds simultaneously.
- A ticker is **Low** if it is at or below ALL three low-risk thresholds simultaneously.
- Everything else is **Medium**.

This is **programmatic (weak) supervision** — the labels encode relative risk
rank within the dataset, not an absolute financial definition. The model then
generalises these patterns to unseen tickers.

**Why this is valid:** The heuristic encodes genuine financial intuition
(high volatility + high beta + large drawdown = risky asset). The NN learns a
smooth decision boundary over the feature space, generalising better than a
hard threshold rule.

### Hype Detector Labels (Kaggle path)

When using a Kaggle CSV, headlines are labelled using a three-factor weighted
scoring heuristic:

```
score = 0.4 × exclamation_density
      + 0.4 × hype_keyword_ratio    ← moon, squeeze, YOLO, diamond hands, etc.
      + 0.2 × ALL_CAPS_ratio

label = Hype (1)  if score > 0.30
        Fundamentals (0)  otherwise
```

This means the training signal is **intentionally noisy**. The model learns to
detect hype-like language surface patterns, not verified human-annotated hype.
Present this honestly: "We use weak supervision on a keyword/sentiment heuristic
because ground-truth hype annotations at scale don't exist publicly."

> [!NOTE]
> The synthetic dataset (default) uses curated templates and is clean by
> construction. The Kaggle path introduces controlled label noise, which often
> improves real-world robustness.

---

## Training Accuracy Numbers

*(Fill in after running the real training scripts)*

| Model | Train Acc | Val Acc | AUC-ROC |
|-------|-----------|---------|---------|
| RiskNet | — | — | — |
| HypeClassifier | — | — | — |

Both scripts assert `val_accuracy > 0.60` before exporting to ONNX. If the
assertion fails, the ONNX file is not written and the script exits with a clear
error message pointing to the likely cause.

---

## If We're Low on Time (Hackathon Triage)

The first two features to cut if time is short are:

1. **Financial Fitness Score** — already has a working rules-based fallback
   that is fully demoable without any model inference.
2. **Live Gemini coach dialogue** — already has pre-written fallback questions
   for every risk/hype combination that are fully demoable without an API key.

Both cuts leave the core demo (**dashboard + Risk Radar + Hype Detector**)
completely intact and impressive for judges.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `yfinance` rate-limited / offline | `python risk_model_train.py --generate-seed` |
| Sentence-transformer download fails | Run pre-download command above on Wi-Fi first |
| `assert val_accuracy > 0.6` fails | Try `--generate-seed`; check that ≥30 tickers succeeded |
| ONNX export fails | Ensure `torch==2.3.1` and `onnx==1.16.1` exactly as in requirements |
| Backend can't find model files | Run `python generate_demo_weights.py` first |
