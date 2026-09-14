"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ArrowLeft, Receipt, ShieldCheck, ShoppingBag } from "lucide-react";

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/orders/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Order access forbidden or not found");
        return res.json();
      })
      .then((data) => {
        if (data.purchase) {
          setOrder(data.purchase);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm font-semibold text-slate-500">Loading order details...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-slate-900">Access Denied / Order Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">{error || "Unable to locate requested order."}</p>
        <Link href="/orders" className="mt-4">
          <Button size="sm">Back to My Orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header />

      <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/orders" className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>
          <Badge className={order.paymentStatus === "SUCCESS" ? "bg-emerald-600" : "bg-amber-600"}>
            {order.paymentStatus}
          </Badge>
        </div>

        <div className="space-y-1">
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            #{order.orderNumber}
          </span>
          <h1 className="text-2xl font-black text-slate-900">{order.store?.name}</h1>
          <p className="text-xs text-slate-500">{order.store?.address}</p>
          <p className="text-[11px] text-slate-400 font-mono">
            Purchased on {formatDateTime(order.createdAt)}
          </p>
        </div>

        {/* Order Items Breakdown */}
        <Card className="p-4 border-slate-200 space-y-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-emerald-600" />
            Purchased Items ({order.items?.length || 0})
          </h3>
          <div className="space-y-2 border-t border-slate-100 pt-2 text-xs">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center py-1 border-b border-slate-50">
                <div>
                  <span className="font-bold text-slate-900">{item.name}</span>
                  <div className="text-[10px] text-slate-400">
                    SKU: {item.sku} • {item.quantity} x {formatCurrency(item.unitPrice)}
                  </div>
                </div>
                <span className="font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-200 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>GST Tax (5%)</span>
              <span>{formatCurrency(order.taxTotal)}</span>
            </div>
            {order.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span>-{formatCurrency(order.discountTotal)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-black text-slate-900">
              <span>Grand Total</span>
              <span className="text-emerald-600">{formatCurrency(order.grandTotal)}</span>
            </div>
          </div>
        </Card>

        {/* Payment & Exit Verification Info */}
        <Card className="p-4 border-slate-200 space-y-3 text-xs">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Payment & Verification Status
          </h3>
          <div className="space-y-1.5 font-mono text-[11px] text-slate-600">
            <div className="flex justify-between">
              <span>Method:</span>
              <span className="font-bold text-slate-900">{order.payment?.method || "UPI/CARD"}</span>
            </div>
            <div className="flex justify-between">
              <span>Txn Ref:</span>
              <span className="font-bold text-slate-900 truncate max-w-[200px]">{order.payment?.transactionRef || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span>Exit Status:</span>
              <span className="font-bold text-emerald-700">{order.exitVerification?.status || "PENDING"}</span>
            </div>
          </div>
        </Card>

        <Link href={`/receipt/${order.id}`}>
          <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold rounded-2xl gap-2 shadow-lg">
            <Receipt className="h-4 w-4" />
            View Digital E-Bill & Exit QR Pass
          </Button>
        </Link>
      </main>

      <MobileNav />
    </div>
  );
}
