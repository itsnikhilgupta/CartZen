"use client";

import React, { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function AdminOrdersPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch("/api/admin/orders")
      .then((res) => res.json())
      .then((d) => {
        if (d.purchases) {
          setPurchases(d.purchases);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      <AdminSidebar />

      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        <Header />

        <main className="p-6 space-y-6 max-w-7xl w-full mx-auto">
          <div className="border-b border-slate-800 pb-5">
            <h1 className="text-2xl font-black text-white">All Store Orders & Receipts</h1>
            <p className="text-xs text-slate-400">Complete audit history of customer purchases and exit verification status</p>
          </div>

          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader>
              <CardTitle className="text-base">Order Records ({purchases.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-500">Loading order history...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="py-3 px-3">Order Number</th>
                        <th className="py-3 px-3">Customer</th>
                        <th className="py-3 px-3">Items Qty</th>
                        <th className="py-3 px-3">Paid Total</th>
                        <th className="py-3 px-3">Payment Method</th>
                        <th className="py-3 px-3">Exit Gate Status</th>
                        <th className="py-3 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {purchases.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/50">
                          <td className="py-3 px-3 font-mono font-bold text-emerald-400">{p.orderNumber}</td>
                          <td className="py-3 px-3">{p.user?.name || p.userId}</td>
                          <td className="py-3 px-3 font-bold">{p.items?.length || 0}</td>
                          <td className="py-3 px-3 font-black text-white">{formatCurrency(p.grandTotal)}</td>
                          <td className="py-3 px-3 font-mono text-[11px]">{p.payment?.method || "UPI"}</td>
                          <td className="py-3 px-3">
                            <Badge variant={p.exitVerification?.status === "VERIFIED" ? "default" : "secondary"}>
                              {p.exitVerification?.status || "PENDING"}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-slate-400">
                            {formatDateTime(p.createdAt)}
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
