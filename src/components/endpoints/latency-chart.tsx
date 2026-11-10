"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export interface LatencyDataPoint {
  time: string;
  latency?: number;
  latencyMs?: number;
}

interface LatencyChartProps {
  data: LatencyDataPoint[];
  height?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: LatencyDataPoint }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const value = data.latencyMs !== undefined ? data.latencyMs : data.latency ?? 0;
    return (
      <div className="rounded-lg border border-border bg-popover px-3 py-2.5 shadow-lg text-sm">
        <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
        <p className="font-semibold text-foreground tabular-nums">
          {value} <span className="font-medium text-muted-foreground">ms</span>
        </p>
      </div>
    );
  }
  return null;
}

function subscribe() {
  return () => {};
}

export function LatencyChart({ data, height = 260 }: LatencyChartProps) {
  // Safe client hydration check without triggering react-hooks/set-state-in-effect
  const isMounted = React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const formattedData = React.useMemo(() => {
    return data.map((d) => ({
      ...d,
      value: d.latencyMs !== undefined ? d.latencyMs : d.latency ?? 0,
    }));
  }, [data]);

  if (!isMounted) {
    return (
      <div
        className="w-full rounded-xl bg-muted/40 animate-pulse flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        Loading chart...
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={formattedData}
          margin={{ top: 10, right: 8, left: -8, bottom: 0 }}
        >
          <defs>
            <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary, #3b82f6)" stopOpacity={0.22} />
              <stop offset="95%" stopColor="var(--color-primary, #3b82f6)" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-border"
            vertical={false}
          />
          <XAxis
            dataKey="time"
            stroke="currentColor"
            className="text-muted-foreground"
            tick={{ fontSize: 12, fill: "currentColor" }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tickMargin={8}
          />
          <YAxis
            stroke="currentColor"
            className="text-muted-foreground"
            tick={{ fontSize: 12, fill: "currentColor" }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(val) => `${val}ms`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--color-primary, #3b82f6)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#latencyGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
