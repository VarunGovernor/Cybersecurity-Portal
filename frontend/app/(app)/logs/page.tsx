"use client";
import { useEffect, useState, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, Upload, X } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Navbar } from "@/components/navbar";
import { ChartCard } from "@/components/chart-card";
import { logsApi } from "@/lib/api";
import { LogEntry, LogListResponse, LogStats, LogLevel, LogSource } from "@/types";
import { fmtDate, logLevelClass, cn } from "@/lib/utils";
import { UploadPanel } from "@/components/upload-panel";
import toast from "react-hot-toast";

const LEVELS:   LogLevel[]  = ["debug","info","warning","error","critical"];
const SOURCES:  LogSource[] = ["firewall","ids","siem","application","system","network","endpoint","api"];

export default function LogsPage() {
  const [data, setData]     = useState<LogListResponse | null>(null);
  const [stats, setStats]   = useState<LogStats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState("");
  const [level, setLevel]       = useState<LogLevel | "">("");
  const [source, setSource]     = useState<LogSource | "">("");
  const [showUpload, setShowUpload] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadStats = async () => {
    try { setStats(await logsApi.getStats()); } catch {}
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: 50 };
      if (search) params.search = search;
      if (level)  params.level  = level;
      if (source) params.source = source;
      setData(await logsApi.list(params));
    } catch { toast.error("Failed to load logs"); }
    finally { setLoading(false); }
  }, [page, search, level, source]);

  useEffect(() => { load(); loadStats(); }, [load]);

  // Hourly volume bar data
  const hourlyData = (stats?.events_per_hour ?? []).map((h) => ({
    hour: new Date(h.hour).getHours() + ":00",
    count: h.count,
  }));

  return (
    <div className="min-h-full">
      <Navbar
        title="Log Explorer"
        subtitle={data ? `${data.total.toLocaleString()} records` : ""}
        onRefresh={() => { load(); loadStats(); }}
        refreshing={loading}
        actions={
          <button
            onClick={() => setShowUpload((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            <Upload size={12} />
            Ingest Logs
          </button>
        }
      />

      <div className="p-6 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Events (24h)", value: stats?.total_24h?.toLocaleString() ?? "—" },
            { label: "Errors",       value: stats?.by_level?.error?.toLocaleString() ?? "0" },
            { label: "Warnings",     value: stats?.by_level?.warning?.toLocaleString() ?? "0" },
            { label: "Top Source",   value: stats?.top_source_ips?.[0]?.ip ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-card border rounded-lg px-4 py-3">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className="text-lg font-semibold mt-0.5 font-mono">{value}</p>
            </div>
          ))}
        </div>

        {/* Volume chart */}
        <ChartCard title="Event Volume" subtitle="Last 24 hours, by hour">
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="count" fill="#2563eb" radius={[2, 2, 0, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Upload Panel */}
        {showUpload && (
          <UploadPanel
            onClose={() => setShowUpload(false)}
            onIngest={async (logs) => {
              try {
                const result = await logsApi.ingestBatch(logs);
                toast.success(`Ingested ${result.ingested} logs, ${result.alerts_triggered} alerts triggered`);
                load(); loadStats();
                setShowUpload(false);
              } catch { toast.error("Ingestion failed"); }
            }}
          />
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="pl-8 pr-3 py-1.5 text-sm bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-ring w-64"
              placeholder="Search messages..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="text-xs border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={level}
            onChange={(e) => { setLevel(e.target.value as any); setPage(1); }}
          >
            <option value="">All Levels</option>
            {LEVELS.map((l) => <option key={l} value={l} className="capitalize">{l}</option>)}
          </select>
          <select
            className="text-xs border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={source}
            onChange={(e) => { setSource(e.target.value as any); setPage(1); }}
          >
            <option value="">All Sources</option>
            {SOURCES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
          {(search || level || source) && (
            <button
              onClick={() => { setSearch(""); setLevel(""); setSource(""); setPage(1); }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {/* Log table */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <table className="data-table w-full text-xs">
            <thead className="bg-muted/30">
              <tr>
                <th className="w-36">Timestamp</th>
                <th className="w-20">Level</th>
                <th className="w-24">Source</th>
                <th className="w-32">Source IP</th>
                <th className="w-28">Event Type</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {loading && Array.from({ length: 12 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j}>
                      <div className="h-3 bg-muted animate-pulse rounded w-full max-w-[100px]" />
                    </td>
                  ))}
                </tr>
              ))}
              {!loading && data?.items.map((log) => (
                <>
                  <tr
                    key={log.id}
                    className="cursor-pointer"
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  >
                    <td className="whitespace-nowrap text-muted-foreground">
                      {fmtDate(log.timestamp)}
                    </td>
                    <td>
                      <span className={cn("font-semibold uppercase text-[10px]", logLevelClass(log.level))}>
                        {log.level}
                      </span>
                    </td>
                    <td className="text-muted-foreground capitalize">{log.source}</td>
                    <td className="text-muted-foreground">{log.source_ip ?? "—"}</td>
                    <td className="text-muted-foreground truncate max-w-[112px]">
                      {log.event_type ?? "—"}
                    </td>
                    <td className="max-w-xs">
                      <p className={cn("truncate", expanded === log.id && "whitespace-normal")}>
                        {log.message}
                      </p>
                    </td>
                  </tr>
                  {expanded === log.id && (
                    <tr key={`${log.id}-detail`} className="bg-muted/20">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                          {[
                            ["Host",         log.host    ?? "—"],
                            ["Service",      log.service ?? "—"],
                            ["Action",       log.action  ?? "—"],
                            ["Protocol",     log.protocol ?? "—"],
                            ["Dst IP",       log.destination_ip ?? "—"],
                            ["Ingested",     fmtDate(log.ingested_at)],
                          ].map(([k, v]) => (
                            <div key={k}>
                              <span className="text-muted-foreground">{k}: </span>
                              <span className="font-medium">{v}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {!loading && !data?.items.length && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-muted-foreground font-sans">
                    No log entries found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t text-xs text-muted-foreground">
            <span>
              {data ? `${(page-1)*50+1}–${Math.min(page*50, data.total)} of ${data.total}` : ""}
            </span>
            <div className="flex items-center gap-1">
              <button disabled={page<=1} onClick={() => setPage(p=>p-1)}
                className="p-1 rounded hover:bg-accent disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 font-medium text-foreground">{page} / {data?.pages??1}</span>
              <button disabled={page>=(data?.pages??1)} onClick={() => setPage(p=>p+1)}
                className="p-1 rounded hover:bg-accent disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
