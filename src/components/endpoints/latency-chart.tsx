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
import { LatencyDataPoint } from "@/features/dashboard/mock/dashboard.data";

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
    return (
      <div className="rounded-lg border border-border/80 bg-popover p-2.5 shadow-md text-xs font-mono">
        <p className="text-muted-foreground mb-1">{label}</p>
        <p className="font-semibold text-foreground">
          Latency: <span className="text-primary">{data.latencyMs} ms</span>
        </p>
        <p className="text-[11px] text-emerald-500 mt-0.5">
          Status: {data.status} OK
        </p>
      </div>
    );
  }
  return null;
}

const emptySubscribe = () => () => {};

export function LatencyChart({ data, height = 240 }: LatencyChartProps) {
  const isMounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isMounted) {
    return <div style={{ height }} className="w-full bg-muted/20 animate-pulse rounded-lg" />;
  }

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary, #3b82f6)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-primary, #3b82f6)" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
          <XAxis
            dataKey="time"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            unit="ms"
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="latencyMs"
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
