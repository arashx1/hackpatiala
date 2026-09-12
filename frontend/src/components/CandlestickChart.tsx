import React, { useState, useMemo } from 'react';

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  isBullish: boolean;
  changePct: number;
}

interface CandlestickChartProps {
  data: number[];
  currentPrice?: number;
  height?: number;
  isPositive?: boolean;
}

export function generateCandles(data: number[], currentPrice?: number): Candle[] {
  if (!data || data.length < 2) return [];

  // Create 8 to 10 balanced candlestick periods
  const targetCandles = Math.min(10, Math.max(7, Math.floor(data.length / 2)));
  const chunkSize = Math.max(1, Math.floor(data.length / targetCandles));

  const candles: Candle[] = [];

  for (let i = 0; i < targetCandles; i++) {
    const startIdx = i * chunkSize;
    const endIdx = i === targetCandles - 1 ? data.length : (i + 1) * chunkSize;
    const chunk = data.slice(startIdx, endIdx);

    if (chunk.length === 0) continue;

    const open = chunk[0];
    let close = chunk[chunk.length - 1];

    // Ensure final candle closes at currentPrice if provided
    if (i === targetCandles - 1 && currentPrice && currentPrice > 0) {
      close = currentPrice;
    }

    const chunkMin = Math.min(...chunk);
    const chunkMax = Math.max(...chunk);

    // Natural wick variance modeling
    const bodySpread = Math.abs(close - open);
    const baseWickPadding = Math.max(bodySpread * 0.35, open * 0.003);

    // Deterministic pseudo-random spread based on index and price
    const seed = Math.sin((open + i * 13) * 100);
    const highWick = Math.abs(seed) * baseWickPadding;
    const lowWick = Math.abs(Math.cos((close + i * 17) * 100)) * baseWickPadding;

    const high = Math.max(chunkMax, Math.max(open, close) + highWick);
    const low = Math.min(chunkMin, Math.min(open, close) - lowWick);

    const changePct = open > 0 ? ((close - open) / open) * 100 : 0;

    candles.push({
      time: `D-${targetCandles - i}`,
      open,
      high,
      low,
      close,
      isBullish: close >= open,
      changePct,
    });
  }

  return candles;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  data,
  currentPrice,
  height = 54,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const candles = useMemo(
    () => generateCandles(data, currentPrice),
    [data, currentPrice]
  );

  if (!candles || candles.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-gray-300 italic"
        style={{ height }}
      >
        No candle data
      </div>
    );
  }

  // Calculate scales
  const allLows = candles.map((c) => c.low);
  const allHighs = candles.map((c) => c.high);
  const minPrice = Math.min(...allLows);
  const maxPrice = Math.max(...allHighs);
  const priceRange = maxPrice - minPrice || 1;

  // ViewBox layout metrics
  const vbWidth = 280;
  const vbHeight = height;
  const padTop = 6;
  const padBottom = 6;
  const padLeft = 8;
  const padRight = 8;
  const innerW = vbWidth - padLeft - padRight;
  const innerH = vbHeight - padTop - padBottom;

  const slotW = innerW / candles.length;
  const candleW = Math.max(8, Math.min(16, slotW * 0.65));

  const getY = (price: number) => {
    const norm = (price - minPrice) / priceRange;
    return padTop + innerH - norm * innerH;
  };

  const activeCandle = hoveredIndex !== null ? candles[hoveredIndex] : null;

  return (
    <div className="w-full relative select-none" style={{ height }}>
      {/* Dynamic Hover Details Pill */}
      {activeCandle && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-20 bg-gray-900 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow-lg flex items-center gap-2 whitespace-nowrap pointer-events-none animate-in fade-in duration-150">
          <span>
            O: <strong className="font-semibold">${activeCandle.open.toFixed(1)}</strong>
          </span>
          <span>
            H: <strong className="font-semibold">${activeCandle.high.toFixed(1)}</strong>
          </span>
          <span>
            L: <strong className="font-semibold">${activeCandle.low.toFixed(1)}</strong>
          </span>
          <span>
            C:{' '}
            <strong
              className={`font-semibold ${
                activeCandle.isBullish ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              ${activeCandle.close.toFixed(1)}
            </strong>
          </span>
          <span
            className={`font-bold ${
              activeCandle.isBullish ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            ({activeCandle.changePct >= 0 ? '+' : ''}
            {activeCandle.changePct.toFixed(2)}%)
          </span>
        </div>
      )}

      <svg
        viewBox={`0 0 ${vbWidth} ${vbHeight}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <filter id="candle-glow-green" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#10b981" floodOpacity="0.3" />
          </filter>
          <filter id="candle-glow-red" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#f43f5e" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Subtle Horizontal Midline / Grid */}
        <line
          x1={padLeft}
          y1={padTop + innerH / 2}
          x2={vbWidth - padRight}
          y2={padTop + innerH / 2}
          stroke="#e5e7eb"
          strokeWidth="0.75"
          strokeDasharray="2 3"
        />

        {/* Render Each Candlestick Bar */}
        {candles.map((candle, idx) => {
          const candleX = padLeft + idx * slotW + (slotW - candleW) / 2;
          const wickX = candleX + candleW / 2;

          const wickY1 = getY(candle.high);
          const wickY2 = getY(candle.low);

          const openY = getY(candle.open);
          const closeY = getY(candle.close);

          const bodyTop = Math.min(openY, closeY);
          const bodyHeight = Math.max(3, Math.abs(closeY - openY));

          const isHovered = hoveredIndex === idx;
          const color = candle.isBullish ? '#10b981' : '#f43f5e';
          const strokeColor = candle.isBullish ? '#059669' : '#e11d48';

          return (
            <g
              key={idx}
              className="cursor-pointer transition-opacity duration-150"
              opacity={hoveredIndex !== null && !isHovered ? 0.45 : 1}
              onMouseEnter={() => setHoveredIndex(idx)}
            >
              {/* Invisible touch/click hit area for easy hover */}
              <rect
                x={padLeft + idx * slotW}
                y={0}
                width={slotW}
                height={vbHeight}
                fill="transparent"
              />

              {/* High-Low Wick */}
              <line
                x1={wickX}
                y1={wickY1}
                x2={wickX}
                y2={wickY2}
                stroke={color}
                strokeWidth={isHovered ? 2 : 1.5}
                strokeLinecap="round"
              />

              {/* Open-Close Candle Body */}
              <rect
                x={candleX}
                y={bodyTop}
                width={candleW}
                height={bodyHeight}
                rx={1.75}
                fill={color}
                stroke={strokeColor}
                strokeWidth={isHovered ? 1.5 : 1}
                filter={isHovered ? (candle.isBullish ? 'url(#candle-glow-green)' : 'url(#candle-glow-red)') : undefined}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default CandlestickChart;
