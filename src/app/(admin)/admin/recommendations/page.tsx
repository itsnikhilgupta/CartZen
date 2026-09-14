"use client";

import React, { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  ShieldCheck,
  Cpu,
  RefreshCw,
  Eye,
  MousePointer,
  ShoppingBag,
  CheckCircle2,
  TrendingUp,
  Percent,
  Layers,
} from "lucide-react";

export default function AdminRecommendationsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [period, setPeriod] = useState<"today" | "7d" | "30d" | "all">("7d");

  const fetchAIAnalytics = () => {
    setLoading(true);
    fetch(`/api/admin/analytics/ai?period=${period}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchAIAnalytics();
  }, [period]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      <AdminSidebar />

      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        <Header />

        <main className="p-6 space-y-6 max-w-7xl w-full mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-black text-white">AI Recommendation Analytics & Engine</h1>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                  {data?.algorithmVersion || "RecommendationEngineV1"}
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Aggregated performance metrics, CTR, conversion rates, and algorithm breakdowns
              </p>
            </div>

            <div className="flex items-center gap-2">
              {(["today", "7d", "30d", "all"] as const).map((p) => (
                <Button
                  key={p}
                  variant={period === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPeriod(p)}
                  className={`text-xs rounded-xl ${
                    period === p
                      ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                      : "border-slate-800 bg-slate-900 text-slate-300"
                  }`}
                >
                  {p === "today" ? "Today" : p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "All Time"}
                </Button>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={fetchAIAnalytics}
                className="border-slate-800 bg-slate-900 text-slate-300 text-xs rounded-xl"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* AI Performance Funnel Top Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase">Recommendations Shown</p>
                  <h3 className="text-2xl font-black text-blue-400">
                    {data?.recommendationsShown || 0}
                  </h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Eye className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase">Recommendation Clicks</p>
                  <h3 className="text-2xl font-black text-teal-400">
                    {data?.recommendationClicks || 0}
                  </h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <MousePointer className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase">Click-Through Rate (CTR)</p>
                  <h3 className="text-2xl font-black text-emerald-400">
                    {data?.ctr || 0}%
                  </h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase">Conversion Rate</p>
                  <h3 className="text-2xl font-black text-purple-400">
                    {data?.conversionRate || 0}%
                  </h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Percent className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Breakdown by Recommendation Type */}
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader>
                <div className="flex items-center gap-2 text-emerald-400">
                  <Layers className="h-5 w-5" />
                  <CardTitle className="text-base">Breakdown by Recommendation Type</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="py-6 text-center text-xs text-slate-500">Loading recommendation types...</div>
                ) : !data?.breakdownByType || data.breakdownByType.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No recommendation events recorded for this period.
                  </div>
                ) : (
                  data.breakdownByType.map((item: any) => (
                    <div
                      key={item.type}
                      className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase">{item.type}</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-teal-400 font-bold">CTR {item.ctr}%</span>
                          <span className="text-purple-400 font-bold">Conv {item.conversion}%</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Shown: {item.shown}</span>
                        <span>Clicks: {item.clicks}</span>
                        <span>Purchases: {item.purchases}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Top Recommended Products */}
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader>
                <div className="flex items-center gap-2 text-teal-400">
                  <Sparkles className="h-5 w-5" />
                  <CardTitle className="text-base">Top Recommended Products</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="py-6 text-center text-xs text-slate-500">Loading top recommended products...</div>
                ) : !data?.topRecommendedProducts || data.topRecommendedProducts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No product recommendation conversions logged yet.
                  </div>
                ) : (
                  data.topRecommendedProducts.map((prod: any) => (
                    <div
                      key={prod.productId}
                      className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-200">{prod.name}</p>
                        <p className="text-[10px] text-slate-400">{prod.clicks} clicks recorded</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                          {prod.purchases} purchases
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Engine Rules & Privacy Protocol Documentation */}
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader>
              <div className="flex items-center gap-2 text-emerald-400">
                <Cpu className="h-5 w-5" />
                <CardTitle className="text-base">Active Engine Governance & Privacy Safeguards</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-1">
                <div className="flex justify-between font-bold text-white">
                  <span>Rule 1: Frequently Bought Together (Co-occurrence Matrix)</span>
                  <span className="text-emerald-400">Active • Min Confidence 0.65</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Matches items appearing together in historical completed checkout transactions.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-1">
                <div className="flex justify-between font-bold text-white">
                  <span>Rule 2: Nutrition & Health Goal Classification Override</span>
                  <span className="text-emerald-400">Active • Boost Weight +0.15</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Filters and prioritizes items matching non-sensitive nutrition characteristics (High Protein, Low Sugar, Low Calorie).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-1">
                <div className="flex justify-between font-bold text-white">
                  <span>Rule 3: Privacy Opt-Out Enforcement Guard</span>
                  <span className="text-emerald-400">Strict Enforcement</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  If customer turns off personalization consent, system falls back to store top bestsellers with zero user tracking.
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
