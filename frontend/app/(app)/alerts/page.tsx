"use client";
import { useEffect, useState, useCallback } from "react";
import { Search, Filter, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { SeverityBadge, StatusBadge } from "@/components/badges";
import { alertsApi } from "@/lib/api";
import { Alert, AlertSeverity, AlertStatus, AlertCategory, AlertListResponse } from "@/types";
import { fmtDate, categoryLabel } from "@/lib/utils";
import toast from "react-hot-toast";

const SEVERITIES: AlertSeverity[] = ["critical","high","medium","low","info"];
const STATUSES: AlertStatus[]     = ["open","investigating","resolved","false_positive","suppressed"];

export default function AlertsPage() {
  const [data, setData] = useState<AlertListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<AlertSeverity | "">("");
  const [status, setStatus] = useState<AlertStatus | "">("");
  const [selected, setSelected] = useState<Alert | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: 20 };
      if (search)   params.search   = search;
      if (severity) params.severity = severity;
      if (status)   params.status   = status;
      setData(await alertsApi.list(params));
    } catch { toast.error("Failed to load alerts"); }
    finally { setLoading(false); }
  }, [page, search, severity, status]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id: string, newStatus: AlertStatus) => {
    try {
      await alertsApi.update(id, { status: newStatus });
      toast.success("Alert updated");
      load();
      if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status: newStatus } : null);
    } catch { toast.error("Update failed"); }
  };

  return (
    <div className="min-h-full flex flex-col">
      <Navbar
        title="Alert Management"
        subtitle={data ? `${data.total} total alerts` : ""}
        onRefresh={load}
        refreshing={loading}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Main panel */}
        <div className={`flex flex-col flex-1 overflow-hidden ${selected ? "border-r" : ""}`}>
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-5 py-3 border-b bg-card">
            <div className="relative flex-1 max-w-sm">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Search alerts..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <select
              className="text-xs border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              value={severity}
              onChange={(e) => { setSeverity(e.target.value as any); setPage(1); }}
            >
              <option value="">All Severities</option>
              {SEVERITIES.map((s) => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>
            <select
              className="text-xs border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              value={status}
              onChange={(e) => { setStatus(e.target.value as any); setPage(1); }}
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">{s.replace(/_/g," ")}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto scrollbar-thin">
            <table className="data-table w-full">
              <thead className="bg-muted/30 sticky top-0 z-10">
                <tr>
                  <th>Severity</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Source IP</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}>
                        <div className="h-4 bg-muted animate-pulse rounded w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))}
                {!loading && data?.items.map((alert) => (
                  <tr
                    key={alert.id}
                    className={`cursor-pointer ${selected?.id === alert.id ? "bg-primary/5" : ""}`}
                    onClick={() => setSelected(selected?.id === alert.id ? null : alert)}
                  >
                    <td><SeverityBadge severity={alert.severity} /></td>
                    <td>
                      <div className="max-w-xs">
                        <p className="text-sm font-medium truncate">{alert.title}</p>
                        {alert.rule_id && (
                          <p className="text-[11px] text-muted-foreground font-mono">{alert.rule_id}</p>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="text-xs text-muted-foreground">
                        {categoryLabel(alert.category)}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-xs">{alert.source_ip ?? "—"}</span>
                    </td>
                    <td><StatusBadge status={alert.status} /></td>
                    <td>
                      <span className="text-xs text-muted-foreground">
                        {fmtDate(alert.created_at)}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && !data?.items.length && (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-muted-foreground text-sm">
                      No alerts found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t bg-card text-xs text-muted-foreground">
            <span>
              {data ? `${(page - 1) * 20 + 1}–${Math.min(page * 20, data.total)} of ${data.total}` : ""}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1 rounded hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 font-medium text-foreground">{page} / {data?.pages ?? 1}</span>
              <button
                disabled={page >= (data?.pages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
                className="p-1 rounded hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-80 xl:w-96 shrink-0 overflow-y-auto scrollbar-thin bg-card">
            <div className="p-5 space-y-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-semibold leading-snug">{selected.title}</h2>
                <button
                  onClick={() => setSelected(null)}
                  className="text-muted-foreground hover:text-foreground text-xs shrink-0"
                >✕</button>
              </div>

              <div className="flex flex-wrap gap-2">
                <SeverityBadge severity={selected.severity} />
                <StatusBadge status={selected.status} />
              </div>

              {selected.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {selected.description}
                </p>
              )}

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Network Details
                </p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  {[
                    ["Source IP",    selected.source_ip      ?? "—"],
                    ["Destination",  selected.destination_ip ?? "—"],
                    ["Src Port",     selected.source_port?.toString()      ?? "—"],
                    ["Dst Port",     selected.destination_port?.toString() ?? "—"],
                    ["Rule ID",      selected.rule_id   ?? "—"],
                    ["Category",     categoryLabel(selected.category)],
                    ["Created",      fmtDate(selected.created_at)],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="font-medium font-mono truncate">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Status change */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Update Status
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {STATUSES.filter((s) => s !== selected.status).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(selected.id, s)}
                      className="text-xs px-2.5 py-1.5 rounded border hover:bg-accent transition-colors capitalize"
                    >
                      {s.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
