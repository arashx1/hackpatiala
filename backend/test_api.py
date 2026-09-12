"""
test_api.py - Quick smoke test of MoneyMind FastAPI backend.
"""
import sys
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def run_tests():
    print("Testing /health...")
    r = client.get("/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print("Health response:", r.json())

    print("\nTesting /explain?term=Beta...")
    r = client.get("/explain?term=Beta")
    assert r.status_code == 200, f"Explain failed: {r.text}"
    print("Explain response:", r.json())

    print("\nTesting /risk-score?ticker=AAPL...")
    r = client.get("/risk-score?ticker=AAPL")
    assert r.status_code == 200, f"Risk score failed: {r.text}"
    print("Risk score response:", r.json())

    print("\nTesting /hype-score?ticker=GME...")
    r = client.get("/hype-score?ticker=GME")
    assert r.status_code == 200, f"Hype score failed: {r.text}"
    hype_data = r.json()
    print("Hype score response: score=", hype_data["hype_score"], "label=", hype_data["label"], "source=", hype_data["source"])

    print("\nTesting /coach/evaluate...")
    r = client.post("/coach/evaluate", json={
        "ticker": "TSLA",
        "asset_name": "Tesla Inc.",
        "amount": 1000.0,
        "user_risk_tolerance": "Moderate",
        "risk_score": 68.0,
        "risk_label": "High",
        "hype_score": 75.0,
        "hype_label": "Hype-driven",
    })
    assert r.status_code == 200, f"Coach evaluate failed: {r.text}"
    coach_data = r.json()
    print("Coach response: status=", coach_data["status"], "num_questions=", len(coach_data["socratic_questions"]))

    print("\nTesting /price/AAPL...")
    r = client.get("/price/AAPL")
    assert r.status_code == 200, f"Price failed: {r.text}"
    print("Price response:", r.json())

    print("\n[ALL TESTS PASSED SUCCESSFULLY!]")

if __name__ == "__main__":
    run_tests()
