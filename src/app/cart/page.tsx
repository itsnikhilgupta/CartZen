"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { ShoppingBag, Plus, Minus, Trash2, ArrowRight, QrCode, ShieldAlert, Sparkles } from "lucide-react";

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [initiating, setInitiating] = useState<boolean>(false);

  const fetchCart = async () => {
    try {
      const res = await fetch("/api/cart");
      const data = await res.json();
      if (data.cart) {
        setCart(data.cart);
        setSession(data.session);
      }
    } catch (e) {
      console.error("Failed to load cart:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const handleUpdateQuantity = async (cartItemId: string, newQuantity: number) => {
    setUpdatingItemId(cartItemId);
    try {
      const res = await fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItemId, quantity: newQuantity }),
      });
      const data = await res.json();
      if (res.ok && data.cart) {
        setCart(data.cart);
      }
    } catch (e) {
      alert("Failed to update item quantity");
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (cartItemId: string) => {
    setUpdatingItemId(cartItemId);
    try {
      const res = await fetch(`/api/cart?cartItemId=${cartItemId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.cart) {
        setCart(data.cart);
      }
    } catch (e) {
      alert("Failed to remove item");
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleProceedToCheckout = async () => {
    if (!session || !cart || cart.items.length === 0) return;
    setInitiating(true);
    try {
      const res = await fetch("/api/checkout/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shoppingSessionId: session.id }),
      });
      const data = await res.json();
      if (res.ok && data.purchase) {
        router.push(`/checkout?purchaseId=${data.purchase.id}`);
      } else {
        alert(data.error || "Failed to initiate checkout");
      }
    } catch (e) {
      alert("Checkout error. Please try again.");
    } finally {
      setInitiating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm font-semibold text-slate-500">Loading your CartZen basket...</div>
      </div>
    );
  }

  const items = cart?.items || [];
  const hasAgeRestrictedItem = items.some((i: any) => i.product?.isAgeRestricted);
  const cartItemCount = items.reduce((acc: number, item: any) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <Header />

      <main className="mx-auto max-w-xl px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Your Shopping Cart</h1>
            <p className="text-xs text-slate-500">{cartItemCount} items • Server-authoritative calculation</p>
          </div>
          <Link href="/scan">
            <Button variant="outline" size="sm" className="gap-1.5 border-emerald-300 text-emerald-700 bg-emerald-50">
              <QrCode className="h-4 w-4" />
              Scan More
            </Button>
          </Link>
        </div>

        {items.length === 0 ? (
          <Card className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Your cart is empty</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                Start scanning product barcodes in the store to add items to your basket.
              </p>
            </div>
            <Link href="/scan" className="inline-block">
              <Button className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-2">
                <QrCode className="h-4 w-4" />
                Open Scanner
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Cart Items List */}
            <div className="space-y-3">
              {items.map((item: any) => (
                <Card key={item.id} className="p-4 flex items-center justify-between gap-4 border-slate-200">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{item.product.name}</span>
                      {item.product.isAgeRestricted && (
                        <Badge variant="warning" className="text-[9px]">18+</Badge>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-500">
                      {formatCurrency(item.unitPrice)} each
                    </p>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-xl border border-slate-200 p-1 bg-slate-50">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={updatingItemId === item.id}
                        className="h-7 w-7 rounded-lg"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-xs font-bold text-slate-900">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        disabled={updatingItemId === item.id}
                        className="h-7 w-7 rounded-lg"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="text-right min-w-[70px]">
                      <div className="text-sm font-bold text-slate-900">{formatCurrency(item.lineTotal)}</div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={updatingItemId === item.id}
                        className="text-[11px] text-red-500 hover:underline flex items-center gap-0.5 ml-auto mt-0.5"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remove
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Smart Picks Recommendation Prompt */}
            <Link href="/smart-picks">
              <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-teal-900 to-emerald-900 p-4 text-white shadow-md">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-emerald-400" />
                  <div>
                    <h4 className="text-xs font-bold">Frequently Bought Together</h4>
                    <p className="text-[10px] text-slate-300">View personalized AI Smart Picks for your cart</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-emerald-400" />
              </div>
            </Link>

            {/* Age restriction alert */}
            {hasAgeRestrictedItem && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3.5 text-xs text-amber-800 border border-amber-200">
                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Notice: Cart contains age-restricted items. Store staff will inspect physical ID upon exit scanning.</span>
              </div>
            )}

            {/* Authoritative Order Summary Card */}
            <Card className="border-emerald-200 bg-emerald-50/40 p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Authoritative Server Summary</h3>
              
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(cart.totalAmount - cart.totalTax)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Sales Tax & GST (5%)</span>
                  <span>{formatCurrency(cart.totalTax)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-base text-slate-900">
                  <span>Total Amount</span>
                  <span className="text-emerald-700">{formatCurrency(cart.totalAmount)}</span>
                </div>
              </div>

              <Button
                onClick={handleProceedToCheckout}
                disabled={initiating}
                className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 rounded-xl font-bold gap-2 text-base shadow-md mt-2"
              >
                {initiating ? "Preparing Order..." : `Proceed to Pay ${formatCurrency(cart.totalAmount)}`}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Card>
          </div>
        )}
      </main>

      <MobileNav cartItemCount={cartItemCount} />
    </div>
  );
}
