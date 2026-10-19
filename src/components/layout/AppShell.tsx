"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { SignOutButton } from "@/src/components/auth/SignOutButton";
import { ConfirmProvider } from "@/src/components/ui/confirm";
import { SessionProvider, type ShellUser } from "@/src/components/auth/session";

const SIDEBAR_KEY = "litinv:sidebar-collapsed";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: ClipboardList },
  { href: "/publications", label: "Publications", icon: BookOpen },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/activity", label: "Activity History", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

const ADMIN_NAV = [{ href: "/users", label: "Users", icon: Users }];

function roleLabel(role: ShellUser["role"]): string {
  if (role === "administrator") return "Administrator";
  if (role === "literature_servant") return "Literature servant";
  return "Account";
}

function NavLinks({ onNavigate, admin, collapsed }: { onNavigate?: () => void; admin: boolean; collapsed?: boolean }) {
  const pathname = usePathname();
  const items = admin ? [...NAV, ...ADMIN_NAV] : NAV;
  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            aria-label={collapsed ? label : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              collapsed && "justify-center px-2",
              active
                ? "bg-accent-soft text-zinc-800"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
            )}
          >
            <Icon size={17} strokeWidth={2} aria-hidden />
            {!collapsed && label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children, user }: { children: ReactNode; user: ShellUser | null }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = user?.role === "administrator";

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        if (window.localStorage.getItem(SIDEBAR_KEY) === "1") setCollapsed(true);
      } catch {
        /* preference only */
      }
    });
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      try {
        window.localStorage.setItem(SIDEBAR_KEY, v ? "0" : "1");
      } catch {
        /* preference only */
      }
      return !v;
    });
  };
  // Logged-out visitors only ever see public pages (sign-in, register,
  // pending) — full-width with no sidebar or navigation. Pages center
  // their own cards; the frame stays out of the way.
  if (!user) {
    return (
      <SessionProvider value={null}>
        <ConfirmProvider>
          <div className="flex min-h-dvh flex-col bg-[#f5f7f4] text-zinc-900">
            <main className="flex w-full flex-1 items-center px-3 py-6 sm:px-5 md:px-8">{children}</main>
          </div>
        </ConfirmProvider>
      </SessionProvider>
    );
  }
  return (
    /* Viewport-locked frame: the page itself never scrolls — only the main
       column does — so no outer area is ever visible past the content. */
    <SessionProvider value={user}>
    <ConfirmProvider>
    <div className="app-shell flex h-dvh overflow-hidden bg-[#f5f7f4] text-zinc-900">
      {/* Desktop sidebar: collapses to an icon rail; preference persists. */}
      <aside className={cn("no-print hidden h-full shrink-0 flex-col gap-6 overflow-y-auto overflow-x-hidden border-r border-zinc-200 bg-white px-3 py-5 transition-[width] duration-200 md:flex", collapsed ? "w-[4.5rem] items-center" : "w-64")}>
        <div className={cn("flex w-full items-center gap-3", collapsed ? "flex-col" : "px-1")}>
          {collapsed ? (
            <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white shadow-sm">
              <BookOpen size={17} />
            </span>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-sm"><BookOpen size={18} /></span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold tracking-tight">Literature Inventory</p>
                <p className="truncate text-xs text-zinc-500">Monthly movement</p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-2 focus-visible:outline-accent"
          >
            {collapsed ? <ChevronsRight size={16} aria-hidden /> : <ChevronsLeft size={16} aria-hidden />}
          </button>
        </div>
        <div className="w-full">
          {!collapsed && <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[.12em] text-zinc-400">Workspace</p>}
          <NavLinks admin={isAdmin} collapsed={collapsed} />
        </div>
        <div className={cn("mt-auto flex min-h-[4.5rem] flex-row items-center justify-between gap-2 rounded-xl border border-[#dfe5df] bg-[#f7f9f6] p-3 text-xs text-zinc-600", collapsed && "min-h-0 flex-col justify-start border-0 bg-transparent p-0")}>
          {collapsed ? (
            <span title={`${user.displayName} · Sign out`}>
              <SignOutButton compact />
            </span>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-5 text-zinc-800" title={user.displayName}>{user.displayName}</p>
                <p className="truncate text-xs leading-4 text-zinc-500">{roleLabel(user.role)}</p>
              </div>
              <SignOutButton compact />
            </>
          )}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Mobile top bar (fixed h-14: the sticky filter bar offsets from it) */}
        <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-zinc-200 bg-white px-3 shadow-sm shadow-zinc-900/[0.02] md:hidden">
          <button
            type="button"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-accent"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <BookOpen size={18} className="text-accent" aria-hidden />
          <p className="text-sm font-bold tracking-tight">Literature Inventory</p>
          <span className="ml-auto">{user ? <SignOutButton compact /> : null}</span>
        </header>
        {open ? (
          <div className="no-print border-b border-zinc-200 bg-white p-3 md:hidden">
            <NavLinks onNavigate={() => setOpen(false)} admin={isAdmin} />
          </div>
        ) : null}

        <main className="app-main min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain px-3 sm:px-6 md:px-8">{children}</main>
      </div>
    </div>
    </ConfirmProvider>
    </SessionProvider>
  );
}
