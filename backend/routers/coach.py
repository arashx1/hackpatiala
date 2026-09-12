"""
routers/coach.py - Socratic Decision Coach API.

Guides beginner investors before they confirm paper trades. Challenges FOMO,
chasing hype spikes, and taking uncalculated risks through Socratic questions.
Uses Google Gemini API when configured, and falls back to structured pedagogical
question trees.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

logger = logging.getLogger("moneymind.coach")
router = APIRouter()


class CoachEvaluateRequest(BaseModel):
    ticker: str
    asset_name: Optional[str] = None
    amount: float = Field(..., gt=0, description="Hypothetical investment amount ($)")
    user_risk_tolerance: str = Field("Moderate", description="Conservative | Moderate | Aggressive")
    risk_score: float = Field(..., ge=0, le=100)
    risk_label: str = Field("Medium", description="Low | Medium | High")
    hype_score: float = Field(..., ge=0, le=100)
    hype_label: str = Field("Fundamentals-driven")


class SocraticQuestion(BaseModel):
    id: str
    question: str
    why_it_matters: str
    options: list[str] = []


class CoachEvaluateResponse(BaseModel):
    ticker: str
    asset_name: str
    amount: float
    risk_match: bool
    hype_warning: bool
    status: str  # "sound_decision" | "hype_warning" | "risk_mismatch" | "high_risk_gamble"
    coach_headline: str
    socratic_questions: list[SocraticQuestion]
    fitness_impact_preview: int  # projected delta to Financial Fitness Score (-10 to +10)
    source: str


async def _ask_gemini_coach(req: CoachEvaluateRequest) -> Optional[dict[str, Any]]:
    """Generate dynamic Socratic questions using Gemini API."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = (
            f"You are the 'FundBee Decision Coach' — an empathetic, wise investing tutor helping a first-time investor.\n"
            f"Asset: {req.ticker} ({req.asset_name or req.ticker})\n"
            f"Intended Paper Investment: ${req.amount:,.2f}\n"
            f"User Stated Risk Tolerance: {req.user_risk_tolerance}\n"
            f"Asset Risk Radar Score: {req.risk_score:.0f}/100 ({req.risk_label} risk)\n"
            f"Asset Hype Detector Score: {req.hype_score:.0f}/100 ({req.hype_label})\n\n"
            "Task: Formulate exactly 2 or 3 thought-provoking Socratic questions that encourage mindfulness without being preachy.\n"
            "If the asset is hype-driven, challenge why they want in right now.\n"
            "If the risk is higher than their stated tolerance, challenge their drawdown preparedness.\n"
            "Return valid JSON matching this schema:\n"
            "{\n"
            '  "coach_headline": "Short 1-sentence coach observation",\n'
            '  "questions": [\n'
            '    {\n'
            '      "id": "q1",\n'
            '      "question": "Clear question?",\n'
            '      "why_it_matters": "Plain-English explanation of why this question saves money.",\n'
            '      "options": ["Option A", "Option B", "Option C"]\n'
            "    }\n"
            "  ]\n"
            "}"
        )

        response = await model.generate_content_async(prompt)
        text = response.text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        return json.loads(text)
    except Exception as exc:
        logger.warning("Gemini coach invocation failed: %s", exc)
        return None


def _build_rule_based_coaching(req: CoachEvaluateRequest) -> dict[str, Any]:
    """Deterministic, pedagogical Socratic questions tailored to risk and hype signals."""
    is_high_hype = req.hype_score >= 50.0
    is_high_risk = req.risk_label == "High" or req.risk_score >= 65.0
    is_conservative = req.user_risk_tolerance.lower() == "conservative"
    risk_mismatch = is_conservative and is_high_risk

    questions: list[SocraticQuestion] = []

    if is_high_hype and is_high_risk:
        headline = f"⚠️ Caution: {req.ticker} is currently experiencing intense social hype and elevated volatility."
        questions.append(
            SocraticQuestion(
                id="hype_1",
                question=f"If social media buzz around {req.ticker} suddenly fades next week, why are you holding this?",
                why_it_matters="Assets driven by social momentum often drop violently once trading volume rotates elsewhere.",
                options=[
                    "I believe in the company's long-term business model",
                    "I saw people making quick gains on social media",
                    "I haven't researched their actual financials yet",
                ],
            )
        )
        questions.append(
            SocraticQuestion(
                id="loss_1",
                question=f"If your ${req.amount:,.0f} drops by 35% to ${req.amount * 0.65:,.0f} tomorrow morning, what is your move?",
                why_it_matters="Having a predetermined exit plan prevents panic-selling at the very bottom.",
                options=[
                    "I would panic and sell immediately to stop losses",
                    "I have a written stop-loss and position sizing plan",
                    "I'd buy more because I'm investing for 5+ years",
                ],
            )
        )
        status = "high_risk_gamble"
        fitness_delta = -8

    elif is_high_hype:
        headline = f"📢 Hype Alert: Sentiment for {req.ticker} is running unusually hot ({req.hype_score:.0f}/100)."
        questions.append(
            SocraticQuestion(
                id="hype_timing",
                question="Are you buying because of solid financial progress, or because the price is moving fast right now?",
                why_it_matters="Buying into a steep vertical green candle is known as FOMO (Fear Of Missing Out) and often leads to holding the top.",
                options=[
                    "I verified their revenue and earnings growth",
                    "The price chart looks like it's going straight up",
                    "A trusted friend or influencer mentioned it",
                ],
            )
        )
        questions.append(
            SocraticQuestion(
                id="time_horizon",
                question=f"How long do you intend to hold this ${req.amount:,.0f} position?",
                why_it_matters="Short-term hype trades require constant monitoring; long-term investing focuses on durable cash flows.",
                options=[
                    "A few days or weeks to catch momentum",
                    "Several months to a year",
                    "3 to 10+ years without checking daily prices",
                ],
            )
        )
        status = "hype_warning"
        fitness_delta = -4

    elif risk_mismatch:
        headline = f"⚖️ Risk Mismatch: Your profile is Conservative, but {req.ticker} has a High Risk score ({req.risk_score:.0f}/100)."
        questions.append(
            SocraticQuestion(
                id="mismatch_1",
                question=f"This asset swings significantly more than average. Would this keep you up at night?",
                why_it_matters="When an asset is too volatile for your temperament, you are far more likely to abandon your investment plan.",
                options=[
                    "Yes, large price swings make me stressed",
                    "No, I can stomach 40% drops without worry",
                    "I should consider a broader, lower-risk index fund instead",
                ],
            )
        )
        status = "risk_mismatch"
        fitness_delta = -5

    else:
        headline = f"✅ Grounded Decision: {req.ticker} shows fundamentals-driven metrics aligned with patient investing."
        questions.append(
            SocraticQuestion(
                id="thesis_1",
                question=f"What is the single core reason you selected {req.ticker} for this ${req.amount:,.0f} allocation?",
                why_it_matters="Writing down your investment thesis clarifies whether you truly understand the asset.",
                options=[
                    "Consistent revenue growth and reasonable valuation",
                    "Broad diversification across hundreds of companies",
                    "Competitive moat and essential everyday products",
                ],
            )
        )
        questions.append(
            SocraticQuestion(
                id="patience_1",
                question="If the overall market enters a 1-year downturn, are you prepared to leave this money untouched?",
                why_it_matters="Compound interest requires uninterrupted time in the market.",
                options=[
                    "Yes, this is long-term capital I do not need soon",
                    "No, I might need these funds for living expenses within months",
                ],
            )
        )
        status = "sound_decision"
        fitness_delta = +6

    return {
        "coach_headline": headline,
        "questions": questions,
        "status": status,
        "fitness_impact_preview": fitness_delta,
    }


@router.post("/evaluate", response_model=CoachEvaluateResponse)
async def evaluate_simulation_decision(req: CoachEvaluateRequest):
    """Evaluate an intended paper trade and generate Socratic decision questions."""
    name = req.asset_name or req.ticker

    # 1. Try Gemini
    gemini_data = await _ask_gemini_coach(req)
    if gemini_data and "questions" in gemini_data and len(gemini_data["questions"]) >= 2:
        rule_meta = _build_rule_based_coaching(req)
        questions = [
            SocraticQuestion(
                id=q.get("id", f"gemini_{idx}"),
                question=q.get("question", ""),
                why_it_matters=q.get("why_it_matters", ""),
                options=q.get("options", ["Yes", "No", "Reconsidering"]),
            )
            for idx, q in enumerate(gemini_data["questions"])
        ]
        return CoachEvaluateResponse(
            ticker=req.ticker,
            asset_name=name,
            amount=req.amount,
            risk_match=req.risk_score < 65.0 or req.user_risk_tolerance.lower() == "aggressive",
            hype_warning=req.hype_score >= 50.0,
            status=rule_meta["status"],
            coach_headline=gemini_data.get("coach_headline", rule_meta["coach_headline"]),
            socratic_questions=questions,
            fitness_impact_preview=rule_meta["fitness_impact_preview"],
            source="gemini",
        )

    # 2. Rule-based structured pedagogy
    rule_data = _build_rule_based_coaching(req)
    return CoachEvaluateResponse(
        ticker=req.ticker,
        asset_name=name,
        amount=req.amount,
        risk_match=req.risk_score < 65.0 or req.user_risk_tolerance.lower() == "aggressive",
        hype_warning=req.hype_score >= 50.0,
        status=rule_data["status"],
        coach_headline=rule_data["coach_headline"],
        socratic_questions=rule_data["questions"],
        fitness_impact_preview=rule_data["fitness_impact_preview"],
        source="rule_based",
    )
