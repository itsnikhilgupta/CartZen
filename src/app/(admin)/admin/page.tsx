"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatTime } from "@/lib/utils";
import { useSession } from "next-auth/react";
import {
  DollarSign,
  ShoppingBag,
  QrCode,
  AlertTriangle,
  Users,
  TrendingUp,
  Percent,
  RefreshCw,
  ShoppingBasket,
  PieChart,
  ShieldCheck,
  Package,
  Store,
  Shield,
  Building2,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("ALL");

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (isSuperAdmin) {
      fetch("/api/admin/stores")
        .then((res) => res.json())
        .then((d) => {
          if (d.stores) setStores(d.stores);
        })
        .catch(() => {});
    }
  }, [isSuperAdmin]);

  const fetchDashboard = (storeIdParam = selectedStoreId) => {
    setLoading(true);
    const url = storeIdParam && storeIdParam !== "ALL" ? `/api/admin/dashboard?storeId=${storeIdParam}` : "/api/admin/dashboard";
    fetch(url)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard(selectedStoreId);
  }, [selectedStoreId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      <AdminSidebar />

      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        <Header />

        <main className="p-6 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header & Role Banner */}
          <div className="space-y-4 border-b border-slate-800 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-black text-white">
                    {isSuperAdmin ? "System-Wide Executive Dashboard" : "Store Admin Operational Dashboard"}
                  </h1>
                  <Badge
                    variant="outline"
                    className={
                      isSuperAdmin
                        ? "border-purple-500/50 bg-purple-500/10 text-purple-300 font-bold"
                        : "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 font-bold"
                    }
                  >
                    {isSuperAdmin ? "SUPER ADMIN" : "STORE ADMIN"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400">
                  {isSuperAdmin
                    ? "System-level aggregated metrics across all supermarket locations"
                    : "Isolated operational metrics scoped strictly to your assigned store location"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {isSuperAdmin && (
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                    <Building2 className="h-4 w-4 text-purple-400" />
                    <span className="font-bold text-slate-300">Scope:</span>
                    <select
                      value={selectedStoreId}
                      onChange={(e) => setSelectedStoreId(e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-white rounded-lg text-xs px-2 py-1 focus:ring-1 focus:ring-purple-500 font-mono"
                    >
                      <option value="ALL">🌐 All Stores (System-Wide)</option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          🏬 {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchDashboard(selectedStoreId)}
                  className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs gap-2 rounded-xl"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>

                <Link href="/admin/exit-verify">
                  <Button className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs gap-2 rounded-xl">
                    <QrCode className="h-4 w-4" />
                    Exit Scanner
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Metric Cards Grid - Top Tier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase">Total Store Revenue</p>
                  <h3 className="text-2xl font-black text-emerald-400">
                    {formatCurrency(data?.metrics?.totalRevenue || data?.metrics?.totalSales || 0)}
                  </h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <DollarSign className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase">Active Shopping Sessions</p>
                  <h3 className="text-2xl font-black text-teal-400">
                    {data?.metrics?.activeSessions || 0}
                  </h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <ShoppingBag className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase">Total Completed Orders</p>
                  <h3 className="text-2xl font-black text-blue-400">
                    {data?.metrics?.totalOrders || 0}
                  </h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase">Unique Customers</p>
                  <h3 className="text-2xl font-black text-purple-400">
                    {data?.metrics?.uniqueCustomers || 0}
                  </h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Users className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Metric Cards Grid - Secondary Tier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase">Avg Basket Value (ABV)</p>
                  <h3 className="text-xl font-black text-emerald-300">
                    {formatCurrency(data?.metrics?.averageBasketValue || 0)}
                  </h3>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase">Avg Basket Size</p>
                  <h3 className="text-xl font-black text-teal-300">
                    {data?.metrics?.averageBasketSize || 0} items
                  </h3>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <ShoppingBasket className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase">Repeat Purchase Rate</p>
                  <h3 className="text-xl font-black text-indigo-300">
                    {data?.metrics?.repeatPurchaseRate || 0}%
                  </h3>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Percent className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase">Low Stock Alerts</p>
                  <h3 className="text-xl font-black text-amber-400">
                    {data?.metrics?.lowStockCount || 0}
                  </h3>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Breakdown Grid: Popular Products & Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Products */}
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Package className="h-5 w-5" />
                  <CardTitle className="text-base">Top Performing Products</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {!data?.popularProducts || data.popularProducts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">No checkout items logged yet</div>
                ) : (
                  <div className="space-y-3">
                    {data.popularProducts.map((prod: any) => (
                      <div
                        key={prod.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/50"
                      >
                        <div>
                          <p className="text-xs font-bold text-white">{prod.name}</p>
                          <p className="text-[10px] font-mono text-slate-400">SKU: {prod.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-emerald-400">{formatCurrency(prod.revenue)}</p>
                          <p className="text-[10px] text-slate-400">{prod.quantity} units sold</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Revenue Share */}
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-teal-400">
                  <PieChart className="h-5 w-5" />
                  <CardTitle className="text-base">Category Revenue Share</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {!data?.popularCategories || data.popularCategories.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">No category sales recorded yet</div>
                ) : (
                  <div className="space-y-3">
                    {data.popularCategories.map((cat: any) => (
                      <div key={cat.categoryName} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 font-bold">{cat.categoryName}</span>
                          <span className="text-teal-400 font-bold">
                            {formatCurrency(cat.revenue)} ({cat.percentage}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-teal-500 rounded-full"
                            style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Supermarket Transactions Table */}
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">Recent Customer Checkout Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-500">Loading live supermarket transactions...</div>
              ) : !data?.recentPurchases || data.recentPurchases.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">No checkout transactions recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="py-3 px-3">Order #</th>
                        <th className="py-3 px-3">Customer</th>
                        <th className="py-3 px-3">Amount</th>
                        <th className="py-3 px-3">Payment</th>
                        <th className="py-3 px-3">Exit Pass</th>
                        <th className="py-3 px-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {data.recentPurchases.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-800/50">
                          <td className="py-3 px-3 font-mono font-bold text-white">{p.orderNumber}</td>
                          <td className="py-3 px-3">{p.user?.name || "Customer"}</td>
                          <td className="py-3 px-3 font-bold text-emerald-400">{formatCurrency(p.grandTotal)}</td>
                          <td className="py-3 px-3">
                            <Badge variant={p.paymentStatus === "SUCCESS" ? "default" : "secondary"}>
                              {p.paymentStatus}
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono text-[11px] text-slate-400">
                              {p.exitVerification?.status || "PENDING"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-400">
                            {formatTime(p.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
