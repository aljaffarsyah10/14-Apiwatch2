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
      <div className="rounded-lg border border-border/80 bg-popover p-2.5 shadow-md text-xs font-mono">
        <p className="text-muted-foreground mb-1">{label}</p>
        <p className="font-semibold text-foreground">
          Latency: <span className="text-primary">{value} ms</span>
        </p>
        <p className="text-[11px] text-emerald-500 mt-0.5">
          Health Status: Operational
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
        className="w-full rounded-xl bg-muted/20 animate-pulse flex items-center justify-center text-xs font-mono text-muted-foreground"
        style={{ height }}
      >
        Initializing real-time metric stream...
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={formattedData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary, #3b82f6)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-primary, #3b82f6)" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-border/40"
            vertical={false}
          />
          <XAxis
            dataKey="time"
            stroke="currentColor"
            className="text-muted-foreground text-[10px] font-mono"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="currentColor"
            className="text-muted-foreground text-[10px] font-mono"
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${val}ms`}
          />
          <Tooltip content={<CustomTooltip />} />
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
