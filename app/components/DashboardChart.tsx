"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: { mes: string; estudios: number }[];
}

export default function DashboardChart({ data }: Props) {
  return (
    <ResponsiveContainer
      width="100%"
      height={180}
      className="[--chart-grid:#f3f4f6] [--chart-tick:#9ca3af] [--chart-tooltip-cursor:#f9fafb] [--chart-tooltip-bg:#ffffff] [--chart-tooltip-border:#e5e7eb]
                 dark:[--chart-grid:#374151] dark:[--chart-tick:#6b7280] dark:[--chart-tooltip-cursor:#1f2937] dark:[--chart-tooltip-bg:#111827] dark:[--chart-tooltip-border:#374151]"
    >
      <BarChart data={data} barSize={24} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
        <XAxis
          dataKey="mes"
          tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--chart-tooltip-cursor)" }}
          contentStyle={{
            borderRadius: "10px",
            border: "1px solid var(--chart-tooltip-border)",
            background: "var(--chart-tooltip-bg)",
            fontSize: "12px",
            boxShadow: "0 1px 6px rgba(0,0,0,.06)",
          }}
          formatter={(value) => [value, "Estudios"]}
        />
        <Bar dataKey="estudios" fill="#2563eb" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
