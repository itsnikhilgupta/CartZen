"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { ShieldCheck, CreditCard, Smartphone, Lock, ArrowRight, ShoppingBag } from "lucide-react";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseId = searchParams.get("purchaseId");

  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "CARD">("UPI");
  const [upiId, setUpiId] = useState<string>("customer@upi");
  const [cardNumber, setCardNumber] = useState<string>("4532 •••• •••• 8892");
  const [processing, setProcessing] = useState<boolean>(false);
  const [purchase, setPurchase] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (purchaseId) {
      fetch(`/api/orders/${purchaseId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.purchase) {
            setPurchase(data.purchase);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      // Fallback: fetch current active cart
      fetch("/api/cart")
        .then((res) => res.json())
        .then((data) => {
          if (data.cart) {
            setPurchase({
              id: data.cart.id,
              grandTotal: data.cart.totalAmount,
              subtotal: data.cart.totalAmount - data.cart.totalTax,
              taxTotal: data.cart.totalTax,
              discountTotal: 0,
              items: data.cart.items.map((i: any) => ({
                name: i.product?.name || "Item",
                quantity: i.quantity,
                lineTotal: i.lineTotal,
              })),
            });
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [purchaseId]);

  const handlePayNow = async () => {
    setProcessing(true);

    const clientRef = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    try {
      // 1. Create Payment Intent
      let targetPurchaseId = purchaseId;
      if (!targetPurchaseId && purchase?.id) {
        targetPurchaseId = purchase.id;
      }

      if (!targetPurchaseId) {
        alert("Invalid purchase checkout reference");
        setProcessing(false);
        return;
      }

      // 2. Process Payment & Authorize
      const res = await fetch("/api/checkout/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseId: targetPurchaseId,
          paymentMethod,
          provider: "MOCK",
          clientTransactionRef: clientRef,
          amountPaid: purchase?.grandTotal,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.receiptId) {
        router.push(`/receipt/${data.receiptId}`);
      } else {
        alert(data.error || "Payment verification failed");
      }
    } catch (_e) {
      alert("Payment processing error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider">
          <Lock className="h-4 w-4" />
          256-Bit Encrypted Checkout
        </div>
        <h1 className="text-2xl font-black text-slate-900">Complete Payment</h1>
        <p className="text-xs text-slate-500">Server-authoritative payment verification & instant exit QR issuance</p>
      </div>

      {/* Order Summary Snapshot Card */}
      {loading ? (
        <div className="p-4 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
          Loading order totals...
        </div>
      ) : purchase ? (
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-emerald-600" />
                Order Summary
              </CardTitle>
              {purchase.orderNumber && (
                <span className="text-[11px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                  #{purchase.orderNumber}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {purchase.items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-slate-700">
                  <span className="truncate max-w-[200px]">
                    {item.quantity}x {item.name || item.product?.name}
                  </span>
                  <span className="font-semibold">{formatCurrency(item.lineTotal)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-slate-200 pt-3 space-y-1 text-slate-500">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(purchase.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST Tax (5%)</span>
                <span>{formatCurrency(purchase.taxTotal || 0)}</span>
              </div>
              {purchase.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(purchase.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-black text-sm pt-1 border-t border-slate-200">
                <span>Grand Total</span>
                <span className="text-emerald-600">{formatCurrency(purchase.grandTotal || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Payment Method</CardTitle>
          <CardDescription className="text-xs">Choose how you wish to pay for your supermarket items</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod("UPI")}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                paymentMethod === "UPI"
                  ? "border-emerald-600 bg-emerald-50/60 text-emerald-900 font-bold"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <Smartphone className="h-6 w-6 text-emerald-600" />
              <span className="text-xs">Instant UPI Pay</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("CARD")}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                paymentMethod === "CARD"
                  ? "border-emerald-600 bg-emerald-50/60 text-emerald-900 font-bold"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <CreditCard className="h-6 w-6 text-emerald-600" />
              <span className="text-xs">Credit / Debit Card</span>
            </button>
          </div>

          {paymentMethod === "UPI" ? (
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-700">UPI ID / Virtual Payment Address</label>
              <Input
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="name@upi / GPay / PhonePe"
                className="h-11"
              />
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-700">Card Information</label>
              <Input
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="Card Number"
                className="h-11 font-mono text-xs"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-2xl bg-emerald-900 p-4 text-white flex items-start gap-3 shadow-md">
        <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold">Authoritative Gateway Security Check</h4>
          <p className="text-[11px] text-emerald-200">
            Payment total and inventory integrity are strictly verified by the server. Your exit QR will be generated upon confirmation.
          </p>
        </div>
      </div>

      <Button
        onClick={handlePayNow}
        disabled={processing || loading}
        className="w-full bg-emerald-600 hover:bg-emerald-700 h-13 text-base font-bold rounded-2xl gap-2 shadow-lg"
      >
        {processing ? "Authorizing Payment & Generating Exit QR..." : "Pay Now & Get Exit QR"}
        <ArrowRight className="h-5 w-5" />
      </Button>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header />
      <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading checkout...</div>}>
        <CheckoutContent />
      </Suspense>
      <MobileNav />
    </div>
  );
}
