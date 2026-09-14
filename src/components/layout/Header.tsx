"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { ShoppingBag, Shield, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-lg shadow-sm">
            CZ
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              Cart<span className="text-emerald-600">Zen</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold text-slate-500">
              • Scan, Pay, Go.
            </span>
          </div>
        </Link>

        {/* User Account Controls */}
        <div className="flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-3">
              {(session.user.role === "STORE_ADMIN" || session.user.role === "SUPER_ADMIN") && (
                <Link href="/admin">
                  <Button variant="outline" size="sm" className="flex gap-1.5 text-xs border-emerald-300 text-emerald-700 bg-emerald-50 font-bold">
                    <Shield className="h-3.5 w-3.5" />
                    Admin Portal
                  </Button>
                </Link>
              )}

              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  {session.user.name?.[0] || "U"}
                </div>
                <span className="hidden md:inline">{session.user.name}</span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut({ callbackUrl: "/login" })}
                title="Sign Out"
                className="text-slate-500 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
