"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [demoToken, setDemoToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(data.message);
        if (data.token) {
          setDemoToken(data.token);
        }
      } else {
        setError(data.error || "Failed to request password reset");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 font-black text-2xl shadow-lg">
            CZ
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">CartZen Supermarket</h1>
        </div>

        <Card className="border-slate-800 bg-slate-950 text-white shadow-2xl">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400">
              <KeyRound className="h-5 w-5" />
              <CardTitle className="text-lg text-white">Reset Your Password</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Enter your email address to receive password reset instructions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-950/80 p-3 text-xs text-red-300 border border-red-800">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl bg-emerald-950/80 p-4 text-xs text-emerald-300 border border-emerald-800 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{message}</span>
                </div>
                {demoToken && (
                  <div className="pt-2 border-t border-emerald-800/60">
                    <span className="text-[10px] text-slate-300 font-bold block uppercase">Development Reset Link</span>
                    <Link href={`/reset-password?token=${demoToken}`}>
                      <Button size="sm" className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-500 mt-1">
                        Proceed with Token Link
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Registered Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@cartzen.com"
                  className="bg-slate-900 border-slate-800 text-white h-11"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-11 font-bold rounded-xl gap-2 mt-2"
              >
                {loading ? "Generating Reset Token..." : "Send Reset Token"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="text-center pt-2 text-xs text-slate-400">
              Remember your password?{" "}
              <Link href="/login" className="text-emerald-400 font-bold hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
