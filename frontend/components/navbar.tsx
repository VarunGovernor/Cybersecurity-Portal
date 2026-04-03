"use client";
import { Bell, Search, Moon, Sun, RefreshCw } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface NavbarProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  actions?: React.ReactNode;
}

export function Navbar({ title, subtitle, onRefresh, refreshing, actions }: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="h-14 border-b bg-card/80 backdrop-blur-sm flex items-center px-6 gap-4 shrink-0 sticky top-0 z-30">
      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold leading-none">{title}</h1>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {actions}

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
            title="Refresh"
          >
            <RefreshCw size={13} className={cn(refreshing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}

        {/* Clock */}
        <div className="hidden md:flex items-center px-2.5 py-1.5 text-[11px] font-mono text-muted-foreground bg-muted/50 rounded-md tabular-nums">
          {mounted ? time.toLocaleTimeString("en-US", { hour12: false }) : "00:00:00"}
        </div>

        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        )}
      </div>
    </header>
  );
}
