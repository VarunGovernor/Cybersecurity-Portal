"use client";
import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  ShieldAlert, FileWarning, Activity, AlertTriangle,
  TrendingUp, Clock, Network,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { StatCard } from "@/components/stat-card";
import { ChartCard } from "@/components/chart-card";
import { SeverityBadge } from "@/components/badges";
import { dashboardApi } from "@/lib/api";
import { DashboardSummary, Alert } from "@/types";
import { fmtDate, fmtDateShort, fmtRelative, categoryLabel } from "@/lib/utils";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high:     "#ea580c",
  medium:   "#ca8a04",
  low:      "#16a34a",
  info:     "#0284c7",
};

// Custom tooltip
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-medium text-foreground">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.dataKey}:</span>
          <span className="font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const d = await dashboardApi.getSummary();
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Severity pie data
  const pieData = data
    ? Object.entries(data.severity_breakdown)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
    : [];

  // Category bar data
  const catData = data?.top_categories.map((c) => ({
    name: categoryLabel(c.category),
    count: c.count,
  })) ?? [];

  return (
    <div className="min-h-full">
      <Navbar
        title="Security Dashboard"
        subtitle="Real-time threat monitoring and analytics"
        onRefresh={() => load(true)}
        refreshing={refreshing}
      />

      <div className="p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Open Alerts"
            value={data?.alerts.open ?? 0}
            subtitle="Requiring attention"
            icon={ShieldAlert}
            iconColor="text-red-600"
            iconBg="bg-red-50 dark:bg-red-950"
            alert={!!data && data.alerts.critical > 0}
            loading={loading}
          />
          <StatCard
            title="Critical"
            value={data?.alerts.critical ?? 0}
            subtitle="Open critical severity"
            icon={AlertTriangle}
            iconColor="text-red-600"
            iconBg="bg-red-50 dark:bg-red-950"
            loading={loading}
          />
          <StatCard
            title="New (24h)"
            value={data?.alerts.new_24h ?? 0}
            subtitle="Alerts today"
            icon={TrendingUp}
            iconColor="text-orange-600"
            iconBg="bg-orange-50 dark:bg-orange-950"
            loading={loading}
          />
          <StatCard
            title="Log Events (24h)"
            value={data?.logs.total_24h ?? 0}
            subtitle={`${data?.logs.errors_24h ?? 0} errors`}
            icon={FileWarning}
            iconColor="text-primary"
            iconBg="bg-primary/10"
            loading={loading}
          />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Alert trend area chart */}
          <ChartCard
            title="Alert Trend"
            subtitle="Last 7 days"
            className="lg:col-span-2"
            loading={loading}
          >
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data?.alert_trend ?? []}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="alertFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => {
                  const d = new Date(v); return `${d.getMonth()+1}/${d.getDate()}`;
                }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="count" name="alerts"
                  stroke="#2563eb" strokeWidth={2} fill="url(#alertFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Severity pie */}
          <ChartCard title="Open by Severity" loading={loading}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" innerRadius={52} outerRadius={78}
                    paddingAngle={3} dataKey="value">
                    {pieData.map((entry) => (
                      <Cell key={entry.name}
                        fill={SEVERITY_COLORS[entry.name] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, n) => [v, n]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend
                    formatter={(v) => <span style={{ fontSize: 11, textTransform: "capitalize" }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No open alerts
              </div>
            )}
          </ChartCard>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top threat categories */}
          <ChartCard title="Top Threat Categories" subtitle="Last 7 days" loading={loading}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={catData} layout="vertical"
                margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" fill="#2563eb" radius={[0, 3, 3, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Recent activity */}
          <ChartCard title="Recent Activity" subtitle="Latest system events">
            <div className="space-y-0 divide-y divide-border/60 -mx-4 -mb-4">
              {(data?.recent_activity ?? []).slice(0, 6).map((a, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{a.action}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {a.user ?? "system"} · {a.ip}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {fmtRelative(a.time)}
                  </span>
                </div>
              ))}
              {!data && <div className="px-4 py-6 text-xs text-muted-foreground text-center">Loading...</div>}
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
