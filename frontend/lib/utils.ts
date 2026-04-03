import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { AlertSeverity, AlertStatus, LogLevel } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
export function fmtDate(iso: string) {
  return format(parseISO(iso), "MMM d, yyyy HH:mm");
}

export function fmtRelative(iso: string) {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true });
}

export function fmtDateShort(iso: string) {
  return format(parseISO(iso), "MMM d");
}

// ─── Severity ─────────────────────────────────────────────────────────────────
export const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  critical: 5, high: 4, medium: 3, low: 2, info: 1,
};

export function severityClass(s: AlertSeverity): string {
  return {
    critical: "badge-critical",
    high: "badge-high",
    medium: "badge-medium",
    low: "badge-low",
    info: "badge-info",
  }[s] ?? "badge-info";
}

export function severityDot(s: AlertSeverity): string {
  return {
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-yellow-500",
    low: "bg-green-500",
    info: "bg-blue-500",
  }[s] ?? "bg-slate-400";
}

// ─── Status ───────────────────────────────────────────────────────────────────
export function statusLabel(s: AlertStatus): string {
  return {
    open: "Open",
    investigating: "Investigating",
    resolved: "Resolved",
    false_positive: "False Positive",
    suppressed: "Suppressed",
  }[s] ?? s;
}

export function statusClass(s: AlertStatus): string {
  return {
    open: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
    investigating: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
    resolved: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
    false_positive: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
    suppressed: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700",
  }[s] ?? "";
}

// ─── Log level ────────────────────────────────────────────────────────────────
export function logLevelClass(l: LogLevel): string {
  return {
    debug: "text-slate-400",
    info: "text-blue-600 dark:text-blue-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    error: "text-red-600 dark:text-red-400",
    critical: "text-red-700 font-semibold dark:text-red-300",
  }[l] ?? "text-slate-500";
}

// ─── Category ─────────────────────────────────────────────────────────────────
export function categoryLabel(c: string): string {
  return c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

// ─── Numbers ─────────────────────────────────────────────────────────────────
export function fmtNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

// ─── Auth storage ─────────────────────────────────────────────────────────────
export const authStorage = {
  setToken: (token: string) => localStorage.setItem("access_token", token),
  getToken: () => localStorage.getItem("access_token"),
  clearToken: () => localStorage.removeItem("access_token"),
  setUser: (user: any) => localStorage.setItem("user", JSON.stringify(user)),
  getUser: () => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  clearUser: () => localStorage.removeItem("user"),
  clear: () => { authStorage.clearToken(); authStorage.clearUser(); },
};
