import axios, { AxiosError, AxiosInstance } from "axios";
import { TokenResponse, User, Alert, AlertListResponse, AlertStats,
         LogEntry, LogListResponse, LogStats, DashboardSummary } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// ─── Axios instance ───────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor — attach JWT
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (email: string, password: string): Promise<TokenResponse> => {
    const { data } = await api.post<TokenResponse>("/auth/login", { email, password });
    return data;
  },
  me: async (): Promise<User> => {
    const { data } = await api.get<User>("/auth/me");
    return data;
  },
  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
  },
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const { data } = await api.get<DashboardSummary>("/dashboard/summary");
    return data;
  },
  getAuditTrail: async (limit = 50): Promise<any[]> => {
    const { data } = await api.get(`/dashboard/audit-trail?limit=${limit}`);
    return data;
  },
};

// ─── Alerts ───────────────────────────────────────────────────────────────────
export const alertsApi = {
  list: async (params: Record<string, any> = {}): Promise<AlertListResponse> => {
    const { data } = await api.get<AlertListResponse>("/alerts", { params });
    return data;
  },
  get: async (id: string): Promise<Alert> => {
    const { data } = await api.get<Alert>(`/alerts/${id}`);
    return data;
  },
  create: async (body: Partial<Alert>): Promise<Alert> => {
    const { data } = await api.post<Alert>("/alerts", body);
    return data;
  },
  update: async (id: string, body: Partial<Alert>): Promise<Alert> => {
    const { data } = await api.patch<Alert>(`/alerts/${id}`, body);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/alerts/${id}`);
  },
  getStats: async (): Promise<AlertStats> => {
    const { data } = await api.get<AlertStats>("/alerts/stats");
    return data;
  },
};

// ─── Logs ─────────────────────────────────────────────────────────────────────
export const logsApi = {
  list: async (params: Record<string, any> = {}): Promise<LogListResponse> => {
    const { data } = await api.get<LogListResponse>("/logs", { params });
    return data;
  },
  getStats: async (): Promise<LogStats> => {
    const { data } = await api.get<LogStats>("/logs/stats");
    return data;
  },
  ingest: async (body: Partial<LogEntry>): Promise<any> => {
    const { data } = await api.post("/logs/ingest", body);
    return data;
  },
  ingestBatch: async (logs: Partial<LogEntry>[]): Promise<any> => {
    const { data } = await api.post("/logs/ingest/batch", { logs });
    return data;
  },
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: async (): Promise<User[]> => {
    const { data } = await api.get<User[]>("/users");
    return data;
  },
  get: async (id: string): Promise<User> => {
    const { data } = await api.get<User>(`/users/${id}`);
    return data;
  },
  create: async (body: Partial<User> & { password: string }): Promise<User> => {
    const { data } = await api.post<User>("/users", body);
    return data;
  },
  update: async (id: string, body: Partial<User>): Promise<User> => {
    const { data } = await api.patch<User>(`/users/${id}`, body);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};

export default api;
