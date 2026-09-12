import React from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';

interface SparklineChartProps {
  data: number[];
  isPositive?: boolean;
  height?: number;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  isPositive,
  height = 54,
}) => {
  if (!data || data.length === 0) {
    return <div className="h-12 flex items-center justify-center text-xs text-gray-300">No chart data</div>;
  }

  // Determine positive/negative from first and last data point if not explicitly passed
  const positive =
    isPositive !== undefined ? isPositive : data[data.length - 1] >= data[0];

  const strokeColor = positive ? '#10b981' : '#f43f5e';
  const fillColor = positive ? 'url(#sparkline-pos)' : 'url(#sparkline-neg)';

  const chartData = data.map((val, idx) => ({
    day: `Day ${idx + 1}`,
    price: val,
  }));

  return (
    <div className="w-full relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id="sparkline-pos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="sparkline-neg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const p = payload[0].value as number;
                return (
                  <div className="px-2 py-1 bg-gray-900 text-white text-[11px] rounded-md font-mono shadow-md">
                    ${p.toFixed(2)}
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={strokeColor}
            strokeWidth={2}
            fill={fillColor}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
