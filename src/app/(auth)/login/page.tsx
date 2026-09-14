"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("customer@cartzen.com");
  const [password, setPassword] = useState("Password123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      try {
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        if (session?.user?.role === "STORE_ADMIN" || session?.user?.role === "SUPER_ADMIN") {
          router.push("/admin");
        } else {
          router.push("/");
        }
      } catch {
        router.push("/");
      }
      router.refresh();
    }
  };

  const setQuickRole = (userEmail: string) => {
    setEmail(userEmail);
    setPassword("Password123!");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 font-black text-2xl shadow-lg">
            CZ
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">CartZen Supermarket</h1>
          <p className="text-xs text-slate-400 font-mono">Scan, Pay, Go.</p>
        </div>

        <Card className="border-slate-800 bg-slate-950 text-white shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg text-white">Sign In to Your Account</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Enter your credentials to start your supermarket session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-950/80 p-3 text-xs text-red-300 border border-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-white h-11"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-white h-11"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-11 font-bold rounded-xl gap-2 mt-2"
              >
                {loading ? "Authenticating..." : "Sign In & Open Session"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            {/* QUICK SEED DEMO LOGIN ACCESSIBILITY BUTTONS */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Quick Demo Credentials
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickRole("customer@cartzen.com")}
                  className="text-[11px] h-8 border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
                >
                  🛒 Customer Demo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickRole("admin@cartzen.com")}
                  className="text-[11px] h-8 border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
                >
                  🛡️ Admin Demo
                </Button>
              </div>
            </div>

            <div className="text-center pt-2 text-xs text-slate-400">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-emerald-400 font-bold hover:underline">
                Register here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
