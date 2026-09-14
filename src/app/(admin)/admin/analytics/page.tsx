"use client";

import React, { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  BarChart3,
  PieChart,
  RefreshCw,
  ShoppingBag,
  Percent,
  Layers,
  ShoppingBasket,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAnalytics = () => {
    setLoading(true);
    fetch("/api/admin/analytics/shopping")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      <AdminSidebar />

      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        <Header />

        <main className="p-6 space-y-6 max-w-7xl w-full mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h1 className="text-2xl font-black text-white">Supermarket Shopping & Basket Analytics</h1>
              <p className="text-xs text-slate-400">
                Privacy-compliant co-occurrence affinity patterns, abandonment rates, and repeat customer analytics
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnalytics}
              className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs gap-2 rounded-xl"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh Analytics
            </Button>
          </div>

          {/* Top Level Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase">Avg Basket Value</p>
                  <h3 className="text-2xl font-black text-emerald-400">
                    {formatCurrency(data?.averageBasketValue || 0)}
                  </h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShoppingBag className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase">Avg Basket Size</p>
                  <h3 className="text-2xl font-black text-teal-400">
                    {data?.averageBasketSize || 0} items
                  </h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <ShoppingBasket className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase">Repeat Purchase Rate</p>
                  <h3 className="text-2xl font-black text-indigo-400">
                    {data?.repeatPurchaseRate || 0}%
                  </h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Percent className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase">Cart Abandonment Rate</p>
                  <h3 className="text-2xl font-black text-rose-400">
                    {data?.cartAbandonmentRate || 0}%
                  </h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Zap className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Frequently Bought Together Combinations */}
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader>
                <div className="flex items-center gap-2 text-emerald-400">
                  <TrendingUp className="h-5 w-5" />
                  <CardTitle className="text-base">Frequently Purchased Item Pairs</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="py-6 text-center text-xs text-slate-500">Calculating item co-occurrences...</div>
                ) : !data?.frequentlyBoughtCombinations || data.frequentlyBoughtCombinations.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No multi-item purchase combinations recorded yet.
                  </div>
                ) : (
                  data.frequentlyBoughtCombinations.map((combo: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-200">
                          {combo.itemA} <span className="text-emerald-400">+</span> {combo.itemB}
                        </p>
                        <p className="text-[10px] text-slate-400">Co-purchased in checkout session</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                          {combo.count} co-orders
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Popular Supermarket Products */}
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader>
                <div className="flex items-center gap-2 text-teal-400">
                  <BarChart3 className="h-5 w-5" />
                  <CardTitle className="text-base">Most Popular Supermarket Products</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="py-6 text-center text-xs text-slate-500">Loading popular products...</div>
                ) : !data?.popularProducts || data.popularProducts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">No product sales logged yet.</div>
                ) : (
                  data.popularProducts.map((prod: any) => (
                    <div
                      key={prod.id}
                      className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-200">{prod.name}</p>
                        <p className="text-[10px] text-slate-400">{prod.quantity} total units purchased</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-teal-400">{formatCurrency(prod.revenue)}</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
