"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated, hydrate } = useAuthStore();
  const [email, setEmail]         = useState("admin@cybersec.local");
  const [password, setPassword]   = useState("Admin@123456");
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => {
    hydrate();
    if (useAuthStore.getState().isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [hydrate, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      setAuth(data.user, data.access_token);
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Login failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <Lock size={16} className="text-white" />
          </div>
          <div>
            <p className="text-base font-semibold">CyberSec Portal</p>
            <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-widest">
              Security Platform
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border rounded-xl p-7 shadow-sm">
          <h1 className="text-lg font-semibold mb-1">Sign in</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Authorized personnel only
          </p>

          {error && (
            <div className="flex items-start gap-2 bg-destructive/8 border border-destructive/20 rounded-md px-3 py-2.5 mb-4">
              <AlertCircle size={14} className="text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Authenticating...
                </span>
              ) : "Sign In"}
            </button>
          </form>
        </div>

        {/* Demo hint */}
        <p className="text-center text-[11px] text-muted-foreground mt-4">
          Default: admin@cybersec.local / Admin@123456
        </p>

        <p className="text-center text-[11px] text-muted-foreground/50 mt-6">
          CyberSec Portal v1.0 · Internal Use Only
        </p>
      </div>
    </div>
  );
}
