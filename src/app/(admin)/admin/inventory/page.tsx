"use client";

import React, { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Boxes, AlertTriangle } from "lucide-react";

export default function AdminInventoryPage() {
  const [inventories, setInventories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch("/api/admin/inventory")
      .then((res) => res.json())
      .then((d) => {
        if (d.inventories) {
          setInventories(d.inventories);
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
            <h1 className="text-2xl font-black text-white">Supermarket Inventory & Stock Levels</h1>
            <p className="text-xs text-slate-400">Monitor stock levels, aisle locations, and shelf allocations</p>
          </div>

          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader>
              <CardTitle className="text-base">Store Stock Locations</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-500">Loading stock records...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="py-3 px-3">Product Name</th>
                        <th className="py-3 px-3">Store</th>
                        <th className="py-3 px-3">Aisle / Shelf</th>
                        <th className="py-3 px-3">In Stock Qty</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {inventories.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-800/50">
                          <td className="py-3 px-3 font-bold text-white">{inv.product?.name}</td>
                          <td className="py-3 px-3 text-slate-400">{inv.store?.name}</td>
                          <td className="py-3 px-3 font-mono text-emerald-400">
                            {inv.aisle} / {inv.shelf}
                          </td>
                          <td className="py-3 px-3 font-bold text-lg text-white">{inv.quantity}</td>
                          <td className="py-3 px-3">
                            {inv.quantity <= 10 ? (
                              <Badge variant="warning" className="text-[9px]">Low Stock Alert</Badge>
                            ) : (
                              <Badge variant="default" className="text-[9px]">Optimal Stock</Badge>
                            )}
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
