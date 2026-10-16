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
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium",
              collapsed && "justify-center px-2",
              active
                ? "bg-blue-50 text-blue-800"
                : "text-zinc-700 hover:bg-zinc-100",
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
          <div className="flex min-h-dvh flex-col bg-zinc-100 text-zinc-900">
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
    <div className="app-shell flex h-dvh overflow-hidden bg-zinc-100 text-zinc-900">
      {/* Desktop sidebar: collapses to an icon rail; preference persists. */}
      <aside className={cn("no-print hidden h-full shrink-0 flex-col gap-4 overflow-y-auto overflow-x-hidden border-r border-zinc-200 bg-white p-3 transition-[width] duration-200 md:flex", collapsed ? "w-16 items-center" : "w-60")}>
        <div className={cn("flex w-full items-center gap-2", collapsed ? "flex-col" : "px-1")}>
          {collapsed ? (
            <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-white">
              <BookOpen size={17} />
            </span>
          ) : (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold tracking-tight">Literature Inventory</p>
              <p className="truncate text-xs text-zinc-500">Monthly Movement tracker</p>
            </div>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-2 focus-visible:outline-blue-700"
          >
            {collapsed ? <ChevronsRight size={16} aria-hidden /> : <ChevronsLeft size={16} aria-hidden />}
          </button>
        </div>
        <NavLinks admin={isAdmin} collapsed={collapsed} />
        <div className={cn("mt-auto flex flex-col gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-600", collapsed && "items-center border-0 bg-transparent p-0")}>
          {collapsed ? (
            <span title={`${user.displayName} · Sign out`}>
              <SignOutButton compact />
            </span>
          ) : (
            <>
              <p className="truncate font-semibold text-zinc-800" title={user.displayName}>{user.displayName}</p>
              <p>{roleLabel(user.role)}</p>
              <SignOutButton compact />
            </>
          )}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Mobile top bar (fixed h-14: the sticky filter bar offsets from it) */}
        <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-zinc-200 bg-white px-3 md:hidden">
          <button
            type="button"
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpen((v) => !v)}
            className="rounded-md p-2 text-zinc-700 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-blue-700"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <p className="text-sm font-bold">Literature Inventory</p>
          <span className="ml-auto">{user ? <SignOutButton compact /> : null}</span>
        </header>
        {open ? (
          <div className="no-print border-b border-zinc-200 bg-white p-3 md:hidden">
            <NavLinks onNavigate={() => setOpen(false)} admin={isAdmin} />
          </div>
        ) : null}

        <main className="app-main min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain px-3 sm:px-5 md:px-8">{children}</main>
      </div>
    </div>
    </ConfirmProvider>
    </SessionProvider>
  );
}
