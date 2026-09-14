"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  QrCode,
  TrendingUp,
  Sparkles,
  Settings,
  LogOut,
  Store,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

export function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const menuItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    ...(isSuperAdmin ? [{ label: "Multi-Store Locations", href: "/admin/stores", icon: Store, badge: "Super Admin" }] : []),
    { label: "Exit QR Gatekeeper", href: "/admin/exit-verify", icon: QrCode, badge: "Live Gate" },
    { label: "Products Catalog", href: "/admin/products", icon: Package },
    { label: "Inventory & Stock", href: "/admin/inventory", icon: Boxes },
    { label: "Orders & Receipts", href: "/admin/orders", icon: ShoppingCart },
    { label: "Analytics & Affinity", href: "/admin/analytics", icon: TrendingUp },
    { label: "Recommendations AI", href: "/admin/recommendations", icon: Sparkles },
    { label: "Settings & Logs", href: "/admin/settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Top Scrollable Admin Nav (Visible on Smartphones < md) */}
      <div className="md:hidden sticky top-0 z-40 bg-slate-900 border-b border-slate-800 px-3 py-2 text-white">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 font-black text-sm">
              CZ
            </div>
            <span className="font-bold text-xs text-white">CartZen Admin</span>
            {isSuperAdmin && (
              <span className="bg-purple-500/20 text-purple-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-purple-500/30">
                SUPER ADMIN
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-[11px] text-emerald-400 font-semibold hover:underline">
              Customer App
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-[11px] text-red-400 font-semibold hover:underline"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Scrollable Horizontal Admin Links */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Desktop Fixed Left Sidebar (Visible on Screens >= md) */}
      <aside className="fixed bottom-0 left-0 top-0 hidden w-64 flex-col border-r border-slate-800 bg-slate-900 text-slate-100 md:flex z-40">
        {/* Brand Header */}
        <div className="flex h-16 items-center border-b border-slate-800 px-6 gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 font-black text-lg">
            CZ
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white">CartZen Admin</h1>
            <p className="text-[11px] text-emerald-400 font-mono">Scan, Pay, Go.</p>
          </div>
        </div>

        {/* Nav Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Supermarket Management
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer / Exit to Customer Web App */}
        <div className="border-t border-slate-800 p-4 space-y-2">
          <Link
            href="/"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <Store className="h-4 w-4 text-emerald-400" />
            <span>Switch to Customer Web App</span>
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/30 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out Admin</span>
          </button>
        </div>
      </aside>
    </>
  );
}
