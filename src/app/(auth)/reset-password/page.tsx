"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Lock } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(data.message);
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setError(data.error || "Password reset failed");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-950 text-white shadow-2xl">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2 text-emerald-400">
          <Lock className="h-5 w-5" />
          <CardTitle className="text-lg text-white">Set New Password</CardTitle>
        </div>
        <CardDescription className="text-xs text-slate-400">
          Enter your reset token and new account password
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-xl bg-red-950/80 p-3 text-xs text-red-300 border border-red-800">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-xl bg-emerald-950/80 p-4 text-xs text-emerald-300 border border-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{message} Redirecting to login...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Reset Token</label>
            <Input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste reset token"
              className="bg-slate-900 border-slate-800 text-white h-11 font-mono text-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">New Password (Min 8 chars)</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="bg-slate-900 border-slate-800 text-white h-11"
              required
              minLength={8}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-11 font-bold rounded-xl gap-2 mt-2"
          >
            {loading ? "Updating Password..." : "Confirm Password Reset"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="text-center pt-2 text-xs text-slate-400">
          Back to{" "}
          <Link href="/login" className="text-emerald-400 font-bold hover:underline">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 font-black text-2xl shadow-lg">
            CZ
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">CartZen Supermarket</h1>
        </div>

        <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading password reset form...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
