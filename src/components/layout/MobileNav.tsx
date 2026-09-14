"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Home, QrCode, ShoppingCart, Sparkles, Receipt, User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  cartItemCount?: number;
}

export function MobileNav({ cartItemCount = 0 }: MobileNavProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Hide mobile nav on admin routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/login") || pathname.startsWith("/register")) {
    return null;
  }

  const isAdmin = session?.user?.role === "STORE_ADMIN" || session?.user?.role === "SUPER_ADMIN";

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Scan", href: "/scan", icon: QrCode, highlight: true },
    { label: "Cart", href: "/cart", icon: ShoppingCart, badge: cartItemCount },
    ...(isAdmin ? [{ label: "Admin", href: "/admin", icon: Shield }] : [{ label: "Smart Picks", href: "/smart-picks", icon: Sparkles }]),
    { label: "Orders", href: "/orders", icon: Receipt },
    { label: "Profile", href: "/profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-md px-3 py-2 shadow-lg md:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          if (item.highlight) {
            return (
              <Link key={item.href} href={item.href} className="relative -top-4 flex flex-col items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg ring-4 ring-white transition-transform active:scale-95">
                  <Icon className="h-7 w-7" />
                </div>
                <span className="mt-1 text-[10px] font-bold text-emerald-700">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center px-2 py-1 transition-colors",
                isActive ? "text-emerald-600 font-semibold" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="mt-1 text-[10px]">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
