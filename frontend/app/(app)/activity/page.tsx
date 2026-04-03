"use client";
import { useEffect, useState } from "react";
import { Activity, Shield, User, FileText, Clock } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { dashboardApi } from "@/lib/api";
import { fmtDate, fmtRelative } from "@/lib/utils";
import toast from "react-hot-toast";

function methodBadge(method: string) {
  const cls = {
    GET: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400",
    POST: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400",
    PATCH: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400",
    DELETE: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400",
  }[method] ?? "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${cls}`}>
      {method}
    </span>
  );
}

function statusClass(code: string) {
  const n = parseInt(code);
  if (n >= 500) return "text-red-600 dark:text-red-400";
  if (n >= 400) return "text-orange-600 dark:text-orange-400";
  if (n >= 300) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
}

export default function ActivityPage() {
  const [audit, setAudit]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setAudit(await dashboardApi.getAuditTrail(200)); }
    catch { toast.error("Failed to load audit trail"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-full">
      <Navbar
        title="Activity Feed"
        subtitle="Full system audit trail"
        onRefresh={load}
        refreshing={loading}
      />

      <div className="p-6">
        <div className="bg-card border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-5 py-3.5 border-b">
            <Activity size={14} className="text-primary" />
            <h3 className="text-sm font-semibold">Audit Log</h3>
            <span className="text-xs text-muted-foreground ml-auto">{audit.length} events</span>
          </div>

          <table className="data-table w-full text-xs">
            <thead className="bg-muted/30">
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Method</th>
                <th>Path</th>
                <th>Resource</th>
                <th>IP Address</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 15 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j}>
                      <div className="h-3 bg-muted animate-pulse rounded w-full max-w-[80px]" />
                    </td>
                  ))}
                </tr>
              ))}
              {!loading && audit.map((a, i) => (
                <tr key={a.id ?? i}>
                  <td>
                    <div>
                      <p className="font-mono">{fmtDate(a.time)}</p>
                      <p className="text-muted-foreground text-[10px]">{fmtRelative(a.time)}</p>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <User size={11} className="text-muted-foreground shrink-0" />
                      <span>{a.user ?? "system"}</span>
                    </div>
                  </td>
                  <td>{a.action?.split(" ")[0] ? methodBadge(a.action.split(" ")[0]) : "—"}</td>
                  <td>
                    <span className="font-mono text-muted-foreground truncate max-w-[200px] block">
                      {a.action?.split(" ").slice(1).join(" ") ?? a.action}
                    </span>
                  </td>
                  <td>
                    <span className="text-muted-foreground capitalize">{a.resource_type ?? "—"}</span>
                  </td>
                  <td>
                    <span className="font-mono text-muted-foreground">{a.ip_address ?? "—"}</span>
                  </td>
                  <td>
                    <span className={`font-mono font-semibold ${statusClass(a.status_code ?? "200")}`}>
                      {a.status_code ?? "—"}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && !audit.length && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-muted-foreground font-sans">
                    No audit records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
