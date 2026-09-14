"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Receipt, QrCode, ArrowRight, ShoppingBag } from "lucide-react";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch("/api/purchases")
      .then((res) => res.json())
      .then((data) => {
        if (data.purchases) {
          setOrders(data.purchases);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center text-xs text-slate-500">Loading your purchase receipts...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Header />

      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-2 text-emerald-600">
          <Receipt className="h-6 w-6" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Your Purchased E-Bills</h1>
        </div>

        {orders.length === 0 ? (
          <Card className="p-8 text-center space-y-3 border-slate-200">
            <p className="text-sm text-slate-500 font-medium">No completed purchases found.</p>
            <Link href="/">
              <Button size="sm" className="bg-emerald-600 font-bold">Start Shopping</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="p-4 border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-900">#{order.orderNumber}</span>
                    <p className="text-[11px] text-slate-500">{order.store?.name}</p>
                  </div>
                  <Badge variant={order.paymentStatus === "SUCCESS" ? "default" : "secondary"} className="text-[10px]">
                    {order.paymentStatus}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span className="text-slate-500">{formatDate(order.createdAt)}</span>
                  <span className="font-black text-slate-900 text-sm">{formatCurrency(order.grandTotal)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link href={`/orders/${order.id}`}>
                    <Button variant="outline" size="sm" className="w-full text-xs font-bold gap-1">
                      Order Details
                    </Button>
                  </Link>
                  <Link href={`/receipt/${order.id}`}>
                    <Button size="sm" className="w-full text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Receipt className="h-3.5 w-3.5" />
                      E-Bill & Exit QR
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}
