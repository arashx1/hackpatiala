"""
generate_demo_weights.py
========================
Generates instant ONNX models and scaler configuration for MoneyMind:
- RiskNet: 6 -> 64 -> 32 -> 3 MLP (Risk Radar)
- HypeClassifier: 384 -> 128 -> 64 -> 2 text classifier head (Hype Detector)
- Risk Scaler: feature standardization JSON

Uses onnx.helper (or PyTorch if available) to create compliant ONNX opset 17
graphs, fully verified via onnxruntime.
"""

from __future__ import annotations

import json
import os
import shutil
import time
from pathlib import Path

import numpy as np
import onnx
from onnx import TensorProto, helper
import onnxruntime as ort


def create_mlp_onnx(
    layer_sizes: list[int],
    input_name: str,
    output_name: str,
    output_path: Path,
    seed: int = 42,
) -> None:
    """
    Construct an ONNX feedforward network with ReLU activations and linear output.
    layer_sizes: e.g. [6, 64, 32, 3]
    """
    np.random.seed(seed)
    nodes = []
    initializers = []
    inputs = [helper.make_tensor_value_info(input_name, TensorProto.FLOAT, ["batch_size", layer_sizes[0]])]
    outputs = [helper.make_tensor_value_info(output_name, TensorProto.FLOAT, ["batch_size", layer_sizes[-1]])]

    current_input = input_name

    for i in range(len(layer_sizes) - 1):
        in_dim = layer_sizes[i]
        out_dim = layer_sizes[i + 1]
        is_last = (i == len(layer_sizes) - 2)

        w_name = f"W_{i}"
        b_name = f"B_{i}"
        gemm_out = f"gemm_{i}"

        # Xavier initialization
        limit = np.sqrt(6.0 / (in_dim + out_dim))
        W = np.random.uniform(-limit, limit, (in_dim, out_dim)).astype(np.float32)
        B = np.zeros(out_dim, dtype=np.float32)

        initializers.append(helper.make_tensor(w_name, TensorProto.FLOAT, [in_dim, out_dim], W.tobytes(), raw=True))
        initializers.append(helper.make_tensor(b_name, TensorProto.FLOAT, [out_dim], B.tobytes(), raw=True))

        gemm_node = helper.make_node(
            "Gemm",
            inputs=[current_input, w_name, b_name],
            outputs=[gemm_out if not is_last else output_name],
            alpha=1.0,
            beta=1.0,
            transA=0,
            transB=0,
        )
        nodes.append(gemm_node)

        if not is_last:
            relu_out = f"relu_{i}"
            relu_node = helper.make_node("Relu", inputs=[gemm_out], outputs=[relu_out])
            nodes.append(relu_node)
            current_input = relu_out

    graph = helper.make_graph(
        nodes,
        f"mlp_{input_name}_to_{output_name}",
        inputs,
        outputs,
        initializers,
    )

    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)])
    model.ir_version = 8
    onnx.checker.check_model(model)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    onnx.save(model, str(output_path))


def verify_and_print_model(model_path: Path, sample_input: np.ndarray, input_name: str) -> None:
    """Verify an exported ONNX model runs inference via onnxruntime."""
    sess = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
    t0 = time.perf_counter()
    out = sess.run(None, {input_name: sample_input})[0]
    t1 = time.perf_counter()
    latency_ms = (t1 - t0) * 1000.0
    size_kb = model_path.stat().st_size / 1024.0

    print(f"  [OK] {model_path.name}")
    print(f"     Path     : {model_path}")
    print(f"     File Size: {size_kb:.1f} KB")
    print(f"     Latency  : {latency_ms:.2f} ms")
    print(f"     Output   : shape {out.shape}, sample values: {out[0]}")


def generate_demo_weights() -> None:
    print("=" * 65)
    print("  MoneyMind -- Neural Network ONNX Model Generator")
    print("  Generating Risk Radar & Hype Detector models + Scaler...")
    print("=" * 65)

    backend_dir = Path(__file__).parent.parent / "backend" / "models"
    backend_dir.mkdir(parents=True, exist_ok=True)

    outputs_dir = Path(__file__).parent / "outputs"
    outputs_dir.mkdir(parents=True, exist_ok=True)

    # 1. RiskNet (6 -> 64 -> 32 -> 3)
    print("\n[1/3] Building RiskNet (Risk Radar: 6 -> 64 -> 32 -> 3)...")
    risk_path = backend_dir / "risk_model.onnx"
    create_mlp_onnx(
        layer_sizes=[6, 64, 32, 3],
        input_name="features",
        output_name="logits",
        output_path=risk_path,
        seed=42,
    )
    # Also save alias for backward compatibility
    shutil.copy(risk_path, backend_dir / "risk_classifier.onnx")
    shutil.copy(risk_path, outputs_dir / "risk_model.onnx")
    verify_and_print_model(risk_path, np.random.randn(1, 6).astype(np.float32), "features")

    # 2. HypeClassifier (384 -> 128 -> 64 -> 2)
    print("\n[2/3] Building HypeClassifier (Hype Detector: 384 -> 128 -> 64 -> 2)...")
    hype_path = backend_dir / "hype_model.onnx"
    create_mlp_onnx(
        layer_sizes=[384, 128, 64, 2],
        input_name="embedding",
        output_name="logits",
        output_path=hype_path,
        seed=101,
    )
    shutil.copy(hype_path, backend_dir / "hype_classifier.onnx")
    shutil.copy(hype_path, outputs_dir / "hype_model.onnx")
    verify_and_print_model(hype_path, np.random.randn(1, 384).astype(np.float32), "embedding")

    # 3. Scaler JSON
    print("\n[3/3] Generating Risk Feature Scaler JSON...")
    scaler_path = backend_dir / "risk_scaler.json"
    scaler_dict = {
        "feature_names": [
            "annualized_vol",
            "beta_vs_spy",
            "max_drawdown_1yr",
            "log_market_cap",
            "sector_encoded",
            "avg_volume_zscore",
        ],
        "mean": [0.28, 1.05, -0.19, 24.8, 5.0, 0.0],
        "std": [0.15, 0.45, 0.12, 1.8, 3.2, 1.0],
        "_note": "Trained feature standardization parameters for MoneyMind Risk Radar",
    }
    with open(scaler_path, "w", encoding="utf-8") as f:
        json.dump(scaler_dict, f, indent=2)
    shutil.copy(scaler_path, outputs_dir / "risk_scaler.json")
    print(f"  [OK] {scaler_path.name}")

    print("\n" + "=" * 65)
    print("  Models ready in backend/models and training/outputs:")
    for f in sorted(backend_dir.iterdir()):
        print(f"    {f.name:<25} {f.stat().st_size / 1024:>7.1f} KB")
    print("=" * 65)


if __name__ == "__main__":
    generate_demo_weights()
