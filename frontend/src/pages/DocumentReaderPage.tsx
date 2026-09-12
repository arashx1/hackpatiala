import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Lightbulb,
  FileCheck,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { DocumentSummaryResult } from '../types';
import { summarizeDocument } from '../lib/api';

const SAMPLE_DOCUMENTS = [
  {
    name: 'apple_q1_2025_earnings_excerpt.txt',
    label: 'Apple Q1 2025 Earnings Excerpt',
    content: `APPLE REPORTS FIRST QUARTER RESULTS
CUPERTINO, CALIFORNIA — January 30, 2025 — Apple today announced financial results for its fiscal 2025 first quarter ended December 28, 2024. The Company posted quarterly revenue of $124.3 billion, up 4 percent year-over-year, and quarterly diluted earnings per share of $2.40, up 10 percent year-over-year.
"Today Apple is reporting an all-time revenue record of $124.3 billion, driven by double-digit growth in Services and iPhone 16 demand," said Tim Cook, Apple's CEO.
"Our active installed base of devices has reached a new all-time high of over 2.35 billion active devices across all products and all geographic segments."
The Company generated operating cash flow of $39.9 billion and returned over $30 billion to shareholders through dividend payouts and share repurchases. The Board of Directors declared a cash dividend of $0.25 per share of the Company’s common stock. Gross margin for the quarter was 46.2 percent, compared to 45.9 percent in the year-ago quarter. Operating expenses totaled $15.3 billion.
iPhone revenue was $69.7 billion, Services revenue set an all-time record of $26.3 billion (up 14% year-over-year), while Mac revenue reached $8.2 billion and Wearables, Home and Accessories was $10.1 billion. Foreign exchange headwinds accounted for approximately 180 basis points of drag on net year-over-year comparisons.`,
  },
  {
    name: 'vanguard_s_and_p_500_factsheet.txt',
    label: 'Vanguard 500 Index Fund (VOO) Fact Sheet',
    content: `VANGUARD S&P 500 ETF (VOO) — FUND SUMMARY & FACT SHEET
Investment Objective:
Vanguard 500 Index Fund seeks to track the investment performance of the S&P 500 Index, an unmanaged benchmark representing 500 of the largest U.S. publicly traded corporations across 11 sectors.

Key Fund Metrics:
- Ticker: VOO
- Expense Ratio: 0.03% (industry average for comparable funds is 0.78%)
- Total Fund Assets: $1.15 Trillion
- Portfolio Turnover Rate: 2.1% per year
- 10-Year Annualized Return: 12.85%
- 30-Day SEC Dividend Yield: 1.48%
- Number of Stocks Held: 504

Top 10 Holdings (% of total net assets):
1. Microsoft Corp (6.9%)
2. Apple Inc (6.3%)
3. NVIDIA Corp (6.1%)
4. Amazon.com Inc (3.8%)
5. Alphabet Inc Class A & C (3.7%)
6. Meta Platforms Inc (2.5%)
7. Berkshire Hathaway Inc (1.7%)
8. Eli Lilly & Co (1.5%)
9. Broadcom Inc (1.4%)
10. JPMorgan Chase & Co (1.3%)

Risk Profile:
Equity market risk is moderate to high over short durations. The fund is subject to wide price swings depending on macroeconomic conditions. However, broad diversification across 500 market leaders substantially reduces single-company failure risk. An ultra-low 0.03% expense ratio means investors pay just $3 per year for every $10,000 invested.`,
  },
  {
    name: 'brokerage_monthly_statement.txt',
    label: 'Apex Brokerage Statement Excerpt',
    content: `APEX CLEARING & BROKERAGE MONTHLY CLIENT STATEMENT
Statement Period: February 1, 2025 - February 28, 2025
Account Holder: Alex Morgan | Account Type: Individual Cash Brokerage (Non-Margin)

PORTFOLIO OVERVIEW:
Starting Net Liquidation Value: $14,250.00
Ending Net Liquidation Value: $15,120.40
Net Account Change: +$870.40 (+6.11%)
Net Deposits / Withdrawals: $0.00

ASSET ALLOCATION SUMMARY:
- Cash & Money Market (Yielding 4.85% APY): $2,100.00 (13.9%)
- Broad Market Index ETFs (VOO, VTI): $9,800.00 (64.8%)
- Individual Tech Equities (AAPL, NVDA): $2,420.40 (16.0%)
- Crypto Assets (BTC Cold Custody Proxy): $800.00 (5.3%)

FEES & COMMISSIONS PAID THIS PERIOD:
- Trading commissions: $0.00
- Regulatory SEC/FINRA transaction fees: $0.22
- Margin interest charged: $0.00
- Dividends received and auto-reinvested: $42.50

IMPORTANT NOTICES:
Your portfolio remains within healthy diversification boundaries. Cash allocation provides buffer for emergency withdrawals without liquidating long-term equity positions. Total fees incurred year-to-date total less than $1.50.`,
  },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const DocumentReaderPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentSummaryResult | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    setResult(null);

    // Validate size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(
        `File is too large (${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB). The maximum allowed size is 5.0MB.`
      );
      return;
    }

    // Validate extension
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'txt') {
      setError('Unsupported file format. Please upload a PDF (.pdf) or text (.txt) document.');
      return;
    }

    setFile(selectedFile);
    processFile(selectedFile);
  };

  const processFile = async (targetFile: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      const summary = await summarizeDocument(targetFile);
      setResult(summary);
    } catch (err: any) {
      console.error('Document analysis error:', err);
      const msg = err.message || 'Failed to analyze document. Please check the file and try again.';
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      validateAndSetFile(droppedFiles[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleLoadSample = (sample: (typeof SAMPLE_DOCUMENTS)[0]) => {
    const blob = new Blob([sample.content], { type: 'text/plain' });
    const sampleFile = new File([blob], sample.name, { type: 'text/plain' });
    validateAndSetFile(sampleFile);
  };

  const handleCopySummary = () => {
    if (!result) return;
    const textToCopy = `FundBee Document Summary: ${result.filename}
    
SUMMARY:
${result.summary}

KEY FACT / NUMBER:
${result.key_fact}

TAKEAWAY FOR FIRST-TIME INVESTORS:
${result.takeaway}

(AI-generated summary — always verify against original document)`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-teal-100 text-teal-700 shadow-sm">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                  Document Reader
                </h2>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  AI Summarizer
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Upload real financial disclosures, earnings reports, or fund fact sheets for an instant, jargon-free breakdown.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>Powered by Gemini 1.5</span>
          </div>
        </div>
      </div>

      {/* Upload Zone & Samples */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-teal-500 bg-teal-50/50 scale-[0.99]'
              : 'border-gray-200 hover:border-teal-400 hover:bg-gray-50/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,application/pdf,text/plain"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="max-w-md mx-auto flex flex-col items-center gap-3">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                isDragging
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-200'
                  : 'bg-teal-50 text-teal-600 group-hover:bg-teal-100'
              }`}
            >
              <Upload className="w-7 h-7" />
            </div>

            <div>
              <p className="text-sm font-bold text-gray-800">
                {file ? (
                  <span className="text-teal-700 flex items-center justify-center gap-1.5">
                    <FileCheck className="w-4 h-4" /> Selected: {file.name}
                  </span>
                ) : (
                  <span>Click to browse or drag and drop your document here</span>
                )}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Supports PDF (.pdf) or plain text (.txt) &bull; Max file size 5MB
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors shadow-sm shadow-teal-200"
            >
              Choose File
            </button>
          </div>
        </div>

        {/* Quick Sample Documents */}
        <div className="border-t border-gray-100 pt-5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
            <Info className="w-3.5 h-3.5 text-teal-600" />
            <span>Don&apos;t have a document on hand? Try a quick sample:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_DOCUMENTS.map((sample) => (
              <button
                key={sample.name}
                type="button"
                onClick={() => handleLoadSample(sample)}
                disabled={isProcessing}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-800 transition-colors disabled:opacity-50"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isProcessing && (
        <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm text-center space-y-4">
          <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-800">Analyzing Financial Document</h3>
            <p className="text-xs text-gray-500">
              Extracting text layer and querying Gemini 1.5 to translate complex disclosures into plain English...
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isProcessing && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start justify-between gap-3 text-red-800 animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-900">
                Document Read Error
              </h4>
              <p className="text-xs text-red-700 leading-relaxed">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => file && processFile(file)}
            className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {/* Result Cards Display */}
      {result && !isProcessing && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* File Meta Header Bar */}
          <div className="bg-white rounded-2xl p-4 sm:px-6 border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs uppercase">
                {result.file_type}
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-900 leading-tight">
                  {result.filename}
                </h3>
                <span className="text-[11px] text-gray-400 font-medium">
                  {result.word_count.toLocaleString()} words analyzed &bull; Source:{' '}
                  {result.source}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySummary}
                className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-gray-500" />
                    <span>Copy Summary</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors"
              >
                Upload New
              </button>
            </div>
          </div>

          {/* Truncation Notice */}
          {result.truncated && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-2.5 text-amber-800 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Document truncated:</strong> This document was longer than the single-pass limit.
                Analysis was performed on the first ~8,000 words.
              </span>
            </div>
          )}

          {/* 3 Core Output Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Plain English Summary */}
            <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                      Core Summary
                    </span>
                    <h4 className="text-base font-black text-gray-900 leading-tight">
                      What It Actually Says
                    </h4>
                  </div>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed font-normal">
                  {result.summary}
                </p>
              </div>
              <div className="pt-3 border-t border-gray-100 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
                <span>Plain English &bull; 0% jargon</span>
              </div>
            </div>

            {/* Card 2: Single Key Fact or Number */}
            <div className="bg-white rounded-3xl p-6 border border-blue-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 block">
                      Key Metric
                    </span>
                    <h4 className="text-base font-black text-gray-900 leading-tight">
                      The Number That Matters
                    </h4>
                  </div>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed font-normal">
                  {result.key_fact}
                </p>
              </div>
              <div className="pt-3 border-t border-gray-100 flex items-center gap-1.5 text-[11px] text-blue-700 font-semibold">
                <span>Signal extracted from the noise</span>
              </div>
            </div>

            {/* Card 3: Should You Care? Beginner Takeaway */}
            <div className="bg-white rounded-3xl p-6 border border-teal-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700 block">
                      Bottom Line
                    </span>
                    <h4 className="text-base font-black text-gray-900 leading-tight">
                      Should You Care?
                    </h4>
                  </div>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed font-normal">
                  {result.takeaway}
                </p>
              </div>
              <div className="pt-3 border-t border-gray-100 flex items-center gap-1.5 text-[11px] text-teal-700 font-semibold">
                <span>Tailored to beginner investors</span>
              </div>
            </div>
          </div>

          {/* Mandatory Disclaimer */}
          <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 text-center">
            <p className="text-xs text-gray-500 font-medium">
              ⚠️ AI-generated summary — always verify against the original document before making decisions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentReaderPage;
