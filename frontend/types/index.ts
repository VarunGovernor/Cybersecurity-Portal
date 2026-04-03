// ─── Auth ────────────────────────────────────────────────────────────────────
export type UserRole = "admin" | "analyst" | "viewer";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
export type AlertSeverity = "critical" | "high" | "medium" | "low" | "info";
export type AlertStatus = "open" | "investigating" | "resolved" | "false_positive" | "suppressed";
export type AlertCategory =
  | "intrusion" | "malware" | "data_exfiltration" | "brute_force"
  | "anomaly" | "policy_violation" | "fraud" | "reconnaissance";

export interface Alert {
  id: string;
  title: string;
  description: string | null;
  severity: AlertSeverity;
  status: AlertStatus;
  category: AlertCategory;
  source_ip: string | null;
  destination_ip: string | null;
  source_port: number | null;
  destination_port: number | null;
  rule_id: string | null;
  rule_name: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertListResponse {
  items: Alert[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface AlertStats {
  total: number;
  open: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  resolved_today: number;
  by_category: Record<string, number>;
}

// ─── Logs ─────────────────────────────────────────────────────────────────────
export type LogLevel = "debug" | "info" | "warning" | "error" | "critical";
export type LogSource =
  | "firewall" | "ids" | "siem" | "application"
  | "system" | "network" | "endpoint" | "api";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: LogSource;
  source_ip: string | null;
  destination_ip: string | null;
  protocol: string | null;
  message: string;
  event_type: string | null;
  action: string | null;
  host: string | null;
  service: string | null;
  ingested_at: string;
}

export interface LogListResponse {
  items: LogEntry[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface LogStats {
  total_24h: number;
  by_level: Record<string, number>;
  by_source: Record<string, number>;
  events_per_hour: Array<{ hour: string; count: number }>;
  top_source_ips: Array<{ ip: string; count: number }>;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardSummary {
  alerts: {
    total: number;
    open: number;
    critical: number;
    new_24h: number;
  };
  logs: {
    total_24h: number;
    errors_24h: number;
  };
  alert_trend: Array<{ date: string; count: number }>;
  severity_breakdown: Record<string, number>;
  log_volume: Array<{ hour: string; total: number; errors: number; warnings: number }>;
  top_categories: Array<{ category: string; count: number }>;
  recent_activity: Array<{ action: string; user: string; ip: string; time: string }>;
}

// ─── API ──────────────────────────────────────────────────────────────────────
export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export interface ApiError {
  detail: string;
}
