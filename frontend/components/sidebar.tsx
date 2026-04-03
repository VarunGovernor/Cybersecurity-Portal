"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ShieldAlert, FileText, Users,
  LogOut, Settings, ChevronRight, Activity,
  Database, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";
import { authApi } from "@/lib/api";
import toast from "react-hot-toast";

const NAV_ITEMS = [
  {
    group: "OVERVIEW",
    items: [
      { label: "Dashboard",  href: "/dashboard", icon: LayoutDashboard },
      { label: "Alerts",     href: "/alerts",    icon: ShieldAlert },
    ],
  },
  {
    group: "DATA",
    items: [
      { label: "Log Explorer",  href: "/logs",  icon: FileText },
      { label: "Activity Feed", href: "/activity", icon: Activity },
    ],
  },
  {
    group: "ADMIN",
    items: [
      { label: "Users",    href: "/users",    icon: Users },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    clearAuth();
    router.push("/login");
    toast.success("Logged out");
  };

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex flex-col bg-card border-r"
      style={{ width: "var(--sidebar-width)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 h-14 px-4 border-b shrink-0">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <Lock size={14} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight leading-none">CyberSec</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono tracking-widest uppercase">
            Portal
          </p>
        </div>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-green-50/50 dark:bg-green-950/20">
        <span className="status-dot live" />
        <span className="text-[11px] font-medium text-green-700 dark:text-green-400">
          System Operational
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin space-y-4">
        {NAV_ITEMS.map((group) => {
          // Hide admin group for non-admins
          if (group.group === "ADMIN" && user?.role !== "admin") return null;
          return (
            <div key={group.group}>
              <p className="px-3 mb-1 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">
                {group.group}
              </p>
              <ul className="space-y-0.5">
                {group.items.map(({ label, href, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(href + "/");
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        className={cn("sidebar-nav-item", active && "active")}
                      >
                        <Icon size={16} className="shrink-0" />
                        <span>{label}</span>
                        {active && (
                          <ChevronRight size={14} className="ml-auto text-primary/60" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* User info & logout */}
      <div className="border-t p-3 space-y-1">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-primary">
              {user?.full_name?.[0]?.toUpperCase() ?? "?"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.full_name ?? "—"}</p>
            <p className="text-[11px] text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-nav-item w-full text-destructive hover:text-destructive hover:bg-destructive/8"
        >
          <LogOut size={15} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
