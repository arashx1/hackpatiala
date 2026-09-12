"""
routers/document.py - Document Summarizer API for MoneyMind.

Allows users to upload financial documents (PDF or plain text: earnings reports,
brokerage statements, fund fact sheets) and receive a structured, jargon-free
summary powered by Gemini API (with smart heuristic fallback).
"""

from __future__ import annotations

import io
import json
import logging
import os
import re
from typing import Any, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel

logger = logging.getLogger("moneymind.document")
router = APIRouter()

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5MB limit
MAX_WORDS = 8000


class DocumentSummaryResponse(BaseModel):
    filename: str
    file_type: str
    word_count: int
    truncated: bool
    summary: str
    key_fact: str
    takeaway: str
    source: str  # "gemini" | "heuristic"


def _extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF using pypdf, falling back to PyMuPDF (fitz)."""
    text_chunks: list[str] = []

    # 1. Try pypdf
    try:
        import pypdf

        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text_chunks.append(t)
    except Exception as exc:
        logger.info("pypdf extraction failed, attempting fitz fallback: %s", exc)

    if not text_chunks:
        # 2. Try fitz (PyMuPDF) if pypdf returned empty
        try:
            import fitz

            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page in doc:
                t = page.get_text()
                if t:
                    text_chunks.append(t)
            doc.close()
        except Exception as exc:
            logger.warning("fitz extraction failed: %s", exc)

    return "\n\n".join(text_chunks).strip()


def _is_text_readable(text: str) -> bool:
    """Ensure document has meaningful textual content rather than scanned/garbled binary."""
    if len(text.strip()) < 30:
        return False
    # Check if there are at least 15 alphabetical characters
    alpha_chars = sum(1 for c in text if c.isalpha())
    return alpha_chars >= 15


async def _summarize_with_gemini(text: str, filename: str) -> Optional[dict[str, str]]:
    """Invoke Gemini API to summarize financial document into structured JSON."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = (
            "You are the MoneyMind Document Reader — a financial literacy assistant for beginner investors.\n"
            f"Analyze the following financial document ({filename}) and explain it clearly in plain English.\n\n"
            "Rules:\n"
            "1. summary: Exactly 2-3 plain-English sentences summarizing what this document says with zero financial jargon. Focus on what happened and why it matters.\n"
            "2. key_fact: Pull out the single most important number or fact (e.g. revenue, net profit, fee percentage, or quarterly change) and explain why it matters in one simple sentence.\n"
            "3. takeaway: A one-line 'should you care?' bottom-line takeaway tailored specifically for a first-time beginner investor.\n\n"
            "Return valid JSON ONLY in this exact schema without any markdown formatting outside the JSON:\n"
            "{\n"
            '  "summary": "...",\n'
            '  "key_fact": "...",\n'
            '  "takeaway": "..."\n'
            "}\n\n"
            f"Document Text:\n{text}"
        )

        response = await model.generate_content_async(prompt)
        raw_text = response.text.strip()

        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_text:
            raw_text = raw_text.split("```")[1].split("```")[0].strip()

        parsed = json.loads(raw_text)
        if "summary" in parsed and "key_fact" in parsed and "takeaway" in parsed:
            return {
                "summary": parsed["summary"].strip(),
                "key_fact": parsed["key_fact"].strip(),
                "takeaway": parsed["takeaway"].strip(),
            }
    except Exception as exc:
        logger.warning("Gemini document summarizer invocation failed: %s", exc)

    return None


def _heuristic_summary(text: str, filename: str) -> dict[str, str]:
    """Graceful fallback summary when Gemini is unavailable or rate-limited."""
    # Split into sentences
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if len(s.strip()) > 25]

    # Find sentences containing financial numbers ($ or % or billion or million)
    metric_sentences = [
        s for s in sentences if re.search(r"(\$|%|\bmillion\b|\bbillion\b|\bgrowth\b|\brevenue\b)", s, re.IGNORECASE)
    ]

    first_two = " ".join(sentences[:2]) if len(sentences) >= 2 else (sentences[0] if sentences else "Financial report detailing recent operational performance.")
    summary = f"This document provides operational updates and financial statements for {filename}. {first_two}"

    key_fact = (
        metric_sentences[0]
        if metric_sentences
        else "Key financial metrics were reported for the period, indicating stable underlying operational volume."
    )

    takeaway = (
        "As a first-time investor, compare these stated figures against previous periods to assess whether the core business continues to compound steadily."
    )

    return {
        "summary": summary,
        "key_fact": key_fact,
        "takeaway": takeaway,
    }


@router.post("/summarize", response_model=DocumentSummaryResponse)
async def summarize_document(file: UploadFile = File(...)):
    """
    Accepts a PDF or plain text file (up to 5MB) and produces an ELI5 summary,
    key fact, and beginner takeaway.
    """
    filename = file.filename or "document.txt"
    lower_name = filename.lower()

    # 1. Validate file extension
    is_pdf = lower_name.endswith(".pdf") or file.content_type == "application/pdf"
    is_txt = lower_name.endswith(".txt") or file.content_type in ("text/plain", "text/csv")

    if not (is_pdf or is_txt):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Please upload a PDF (.pdf) or plain text (.txt) document.",
        )

    # 2. Read file content and check size limit (5MB)
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File exceeds the 5MB size limit. Please upload a smaller document.",
        )

    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty. Please provide a document with text.",
        )

    # 3. Extract text
    if is_pdf:
        extracted_text = _extract_text_from_pdf(contents)
    else:
        try:
            extracted_text = contents.decode("utf-8")
        except UnicodeDecodeError:
            extracted_text = contents.decode("latin-1", errors="replace")

    # 4. Check readability / scanned image PDF detection
    if not _is_text_readable(extracted_text):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This document couldn't be read — try a text-based PDF instead",
        )

    # 5. Word count & truncation to first ~8000 words
    words = extracted_text.split()
    total_words = len(words)
    truncated = False

    if total_words > MAX_WORDS:
        analyzed_text = " ".join(words[:MAX_WORDS])
        truncated = True
    else:
        analyzed_text = extracted_text

    # 6. Generate summary using Gemini or heuristic fallback
    gemini_res = await _summarize_with_gemini(analyzed_text, filename)
    if gemini_res:
        return DocumentSummaryResponse(
            filename=filename,
            file_type="PDF" if is_pdf else "Text",
            word_count=total_words,
            truncated=truncated,
            summary=gemini_res["summary"],
            key_fact=gemini_res["key_fact"],
            takeaway=gemini_res["takeaway"],
            source="gemini",
        )

    # Fallback if Gemini is not configured or fails
    fallback_res = _heuristic_summary(analyzed_text, filename)
    return DocumentSummaryResponse(
        filename=filename,
        file_type="PDF" if is_pdf else "Text",
        word_count=total_words,
        truncated=truncated,
        summary=fallback_res["summary"],
        key_fact=fallback_res["key_fact"],
        takeaway=fallback_res["takeaway"],
        source="heuristic",
    )
