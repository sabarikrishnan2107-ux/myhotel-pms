"use client";
import * as React from "react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";

interface Props {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
}

/** Tiny inline trend chart for use inside KPI cards. */
export function Sparkline({ data, color = "var(--color-brand)", height = 36, className }: Props) {
  const series = React.useMemo(() => data.map((v, i) => ({ x: i, y: v })), [data]);
  const id = React.useId().replace(/:/g, "");
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="y" stroke={color} strokeWidth={1.6} fill={`url(#spark-${id})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
