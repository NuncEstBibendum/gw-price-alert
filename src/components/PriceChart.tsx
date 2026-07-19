"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Period = "week" | "month" | "year" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  week: "Semaine",
  month: "Mois",
  year: "Année",
  all: "Tout",
};

const PERIODS: Period[] = ["week", "month", "year", "all"];

interface PricePoint {
  ts: number;
  buy: number | null;
  sell: number | null;
}

function formatAxisDate(ts: number, period: Period): string {
  const date = new Date(ts);
  if (period === "week") {
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) +
      " " +
      date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  if (period === "month") {
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  }
  return date.toLocaleDateString("fr-FR", { month: "2-digit", year: "2-digit" });
}

function formatTooltipDate(ts: number): string {
  return new Date(ts).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function PriceChart({ itemId }: { itemId: string }) {
  const [period, setPeriod] = useState<Period>("month");
  const [points, setPoints] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/price-history?item=${encodeURIComponent(itemId)}&period=${period}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { points: PricePoint[] }) => {
        if (!cancelled) setPoints(data.points);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [itemId, period]);

  return (
    <div className="chart-block">
      <div className="period-selector">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            className={p === period ? "period-btn active" : "period-btn"}
            onClick={() => setPeriod(p)}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {loading && <p className="muted">Chargement…</p>}
      {error && <p className="muted">Erreur : {error}</p>}
      {!loading && !error && points.length === 0 && (
        <p className="muted">Pas encore de données pour cette période.</p>
      )}

      {!loading && !error && points.length > 0 && (
        <ResponsiveContainer width="100%" height={220} minWidth={280}>
          <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="ts"
              tickFormatter={(ts: number) => formatAxisDate(ts, period)}
              stroke="var(--text-muted)"
              fontSize={12}
              minTickGap={40}
            />
            <YAxis
              stroke="var(--text-muted)"
              fontSize={12}
              width={56}
              tickFormatter={(v: number) => `${v}g`}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 13,
              }}
              labelFormatter={(label) => formatTooltipDate(Number(label))}
              formatter={(value, name) => [
                `${value}g`,
                name === "buy" ? "Achat" : "Vente",
              ]}
            />
            <Legend
              formatter={(value: string) => (value === "buy" ? "Achat" : "Vente")}
            />
            <Line
              type="monotone"
              dataKey="buy"
              stroke="var(--green)"
              dot={false}
              connectNulls
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="sell"
              stroke="var(--accent)"
              dot={false}
              connectNulls
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
