"use client";

import React, { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatTime, formatDateTime } from "@/lib/utils";
import { ShieldCheck, CheckCircle2, AlertOctagon, RefreshCw, Store } from "lucide-react";

export default function ExitVerifyPage() {
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");

  useEffect(() => {
    fetch("/api/stores")
      .then((res) => res.json())
      .then((data) => {
        if (data.stores && data.stores.length > 0) {
          setStores(data.stores);
          setSelectedStoreId(data.stores[0].id);
        }
      })
      .catch((err) => console.error("Failed to load stores:", err));
  }, []);

  const handleVerify = async (codeToVerify: string) => {
    if (!codeToVerify.trim()) return;
    setLoading(true);
    setVerificationResult(null);

    try {
      const res = await fetch("/api/exit/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationCode: codeToVerify.trim(),
          storeId: selectedStoreId,
        }),
      });

      const data = await res.json();
      setVerificationResult(data);
    } catch {
      setVerificationResult({
        valid: false,
        reason: "NETWORK_ERROR",
        message: "Failed to connect to exit verification server",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      <AdminSidebar />

      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        <Header />

        <main className="p-6 space-y-6 max-w-2xl w-full mx-auto">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="h-4 w-4" />
              Store Security Gatekeeper Portal
            </div>
            <h1 className="text-2xl font-black text-white">Supermarket Exit Verification</h1>
            <p className="text-xs text-slate-400">Scan customer QR pass or enter Exit Code to verify paid supermarket purchases</p>
          </div>

          {/* Active Store Selector */}
          {stores.length > 0 && (
            <Card className="bg-slate-900 border-slate-800 p-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-bold">
                <Store className="h-4 w-4 text-emerald-400" />
                <span>Verification Store Location:</span>
              </div>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-emerald-400 font-bold text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </Card>
          )}

          {/* Verification Code Form Card */}
          <Card className="bg-slate-900 border-slate-800 text-white shadow-2xl">
            <CardHeader>
              <CardTitle className="text-base text-white">Scan or Enter Exit Pass Code</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Type exit verification code (e.g. EXIT-XXXXXXXX) or order number
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerify(verificationCode);
                }}
                className="flex gap-2"
              >
                <Input
                  placeholder="Enter Exit Code (e.g. EXIT-101-ABCD)"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white h-12 text-sm font-mono"
                  required
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold h-12 px-6 rounded-xl shrink-0"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Verify Exit Pass"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* VERIFICATION RESULT DISPLAY */}
          {verificationResult && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              {verificationResult.valid ? (
                <Card className="bg-emerald-950 border-2 border-emerald-500 text-white p-6 space-y-4 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 font-black shrink-0">
                      <CheckCircle2 className="h-9 w-9" />
                    </div>
                    <div>
                      <Badge variant="default" className="bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider mb-1">
                        🟢 ORDER VERIFIED • CUSTOMER MAY EXIT
                      </Badge>
                      <h2 className="text-xl font-black text-white">{verificationResult.customerExitText || "CUSTOMER MAY EXIT"}</h2>
                      <p className="text-xs text-emerald-200">{verificationResult.message}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-emerald-800/80 text-xs">
                    <div>
                      <span className="text-emerald-400 font-bold block">Customer Name</span>
                      <span className="text-white font-semibold text-sm">{verificationResult.customerName}</span>
                    </div>
                    <div>
                      <span className="text-emerald-400 font-bold block">Order Number</span>
                      <span className="text-white font-mono text-sm">#{verificationResult.orderNumber}</span>
                    </div>
                    <div>
                      <span className="text-emerald-400 font-bold block">Purchased Items</span>
                      <span className="text-white font-bold text-sm">{verificationResult.itemCount} Items</span>
                    </div>
                    <div>
                      <span className="text-emerald-400 font-bold block">Total Amount Paid</span>
                      <span className="text-white font-extrabold text-sm text-emerald-300">
                        {formatCurrency(verificationResult.grandTotal || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-emerald-900/60 p-3 text-[11px] text-emerald-200 font-mono flex justify-between">
                    <span>Payment Status: CONFIRMED</span>
                    <span>Verified: {formatTime(verificationResult.verifiedAt)}</span>
                  </div>
                </Card>
              ) : (
                <Card className="bg-red-950 border-2 border-red-500 text-white p-6 space-y-4 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 text-white font-black shrink-0">
                      <AlertOctagon className="h-9 w-9" />
                    </div>
                    <div>
                      <Badge variant="destructive" className="bg-red-600 text-white font-black text-xs uppercase tracking-wider mb-1">
                        🔴 DENY EXIT • INVALID / REPLAYED PASS
                      </Badge>
                      <h2 className="text-xl font-black text-white">{verificationResult.message}</h2>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-red-900 text-xs space-y-1 text-red-200 font-medium">
                    <div>
                      Reason Code: <span className="font-mono font-bold text-white bg-red-900 px-2 py-0.5 rounded">{verificationResult.reason}</span>
                    </div>
                    {verificationResult.verifiedAt && (
                      <div className="text-[11px] text-red-300">
                        Originally verified at: {formatDateTime(verificationResult.verifiedAt)}
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
