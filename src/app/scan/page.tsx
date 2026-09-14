"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { BarcodeScanner } from "@/components/customer/BarcodeScanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Plus, Minus, ShoppingCart, AlertTriangle, CheckCircle, ArrowRight, RefreshCw, Eye, X } from "lucide-react";

export default function ScanPage() {
  const router = useRouter();
  const [sessionData, setSessionData] = useState<any>(null);
  const [cartCount, setCartCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [networkError, setNetworkError] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [addingToCart, setAddingToCart] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchCartAndSession = async () => {
    setNetworkError(false);
    try {
      const res = await fetch("/api/cart");
      if (!res.ok) {
        throw new Error("Failed to connect");
      }
      const data = await res.json();
      if (data.session) {
        setSessionData(data.session);
        if (data.cart && data.cart.items) {
          const totalQty = data.cart.items.reduce((acc: number, item: any) => acc + item.quantity, 0);
          setCartCount(totalQty);
        } else {
          setCartCount(0);
        }
      } else {
        router.push("/");
      }
    } catch {
      setNetworkError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCartAndSession();
  }, [router]);

  const handleScanBarcode = async (barcode: string) => {
    if (!sessionData) return;
    setIsScanning(true);
    setScannedProduct(null);
    setToastMessage(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shoppingSessionId: sessionData.id,
          barcode,
        }),
      });

      const data = await res.json();
      if (res.ok && data.found) {
        setScannedProduct(data.product);
        setQuantity(1);
      } else {
        setToastMessage(data.message || `Barcode "${barcode}" not found in current store catalog.`);
      }
    } catch {
      setToastMessage("Network error during barcode lookup. Please check internet connection.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddToCart = async () => {
    if (!scannedProduct || !sessionData) return;
    setAddingToCart(true);

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shoppingSessionId: sessionData.id,
          barcode: scannedProduct.barcode,
          quantity,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToastMessage(`Added ${quantity}x ${scannedProduct.name} to cart!`);
        setCartCount((prev) => prev + quantity);
        setScannedProduct(null);
      } else {
        alert(data.error || "Failed to add product to cart");
      }
    } catch {
      alert("Failed to update cart due to network error.");
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center space-y-3">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent"></div>
        <div className="text-xs font-semibold text-slate-500">Initializing Scan-and-Go Session...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28">
      <Header />

      <main className="mx-auto max-w-xl px-4 py-6 space-y-6">
        {/* Network Error Recovery Banner */}
        {networkError && (
          <div className="flex items-center justify-between rounded-xl bg-rose-900/90 text-white p-3 text-xs font-semibold border border-rose-700">
            <span>⚠️ Network connection error. Could not sync session.</span>
            <Button size="sm" onClick={fetchCartAndSession} className="h-7 text-[10px] bg-white text-rose-900 font-bold hover:bg-slate-100">
              <RefreshCw className="w-3 h-3 mr-1" /> Retry
            </Button>
          </div>
        )}

        {/* Store & Cart Badge Header Card */}
        <div className="flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs">
              STORE
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">{sessionData?.store?.name || "CartZen Supermarket"}</p>
              <p className="text-[10px] text-slate-500 font-mono">Active Session • {sessionData?.store?.code}</p>
            </div>
          </div>
          <Link href="/cart">
            <Button size="sm" variant="outline" className="relative text-xs gap-1.5 border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-slate-800 dark:text-emerald-300">
              <ShoppingCart className="h-4 w-4" />
              <span>Cart</span>
              {cartCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white">
                  {cartCount}
                </span>
              )}
            </Button>
          </Link>
        </div>

        {/* Camera & Barcode Scanner Viewport */}
        <BarcodeScanner onScanSuccess={handleScanBarcode} isScanning={isScanning} />

        {/* Notification Toast */}
        {toastMessage && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-900 dark:bg-slate-800 p-4 text-xs font-semibold text-white shadow-lg border border-slate-700 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scan Result Bottom Sheet / Modal Card */}
        {scannedProduct && (
          <Card className="border-2 border-emerald-500 bg-white dark:bg-slate-900 shadow-2xl animate-in slide-in-from-bottom-6">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default" className="text-[10px] uppercase font-bold">
                      {scannedProduct.category}
                    </Badge>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        scannedProduct.inStock
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      }`}
                    >
                      {scannedProduct.inStock ? `In Stock (${scannedProduct.stockQty})` : "Out of Stock"}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{scannedProduct.name}</h2>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Brand: {scannedProduct.brand} • SKU: {scannedProduct.sku}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(scannedProduct.unitPrice)}
                  </div>
                  {scannedProduct.listPrice > scannedProduct.unitPrice && (
                    <div className="text-xs text-slate-400 line-through">
                      {formatCurrency(scannedProduct.listPrice)}
                    </div>
                  )}
                </div>
              </div>

              {/* Age Restriction Alert */}
              {scannedProduct.isAgeRestricted && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 p-3 text-xs font-semibold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>Age Restriction: 18+ ID verification required at exit gate.</span>
                </div>
              )}

              {/* Dynamic Health & Nutrition Classification Badges */}
              {scannedProduct.nutritionTags && scannedProduct.nutritionTags.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Health Highlights</span>
                  <div className="flex flex-wrap gap-1.5">
                    {scannedProduct.nutritionTags.map((tag: string) => (
                      <span
                        key={tag}
                        className="rounded-lg bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      >
                        {tag.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons: Add to Cart, View Details, Continue Scanning */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="h-8 w-8 rounded-lg"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-8 text-center text-sm font-bold text-slate-900 dark:text-white">{quantity}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setQuantity(quantity + 1)}
                      className="h-8 w-8 rounded-lg"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <Button
                    onClick={handleAddToCart}
                    disabled={addingToCart || !scannedProduct.inStock}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 font-bold gap-2 text-xs"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {addingToCart ? "Adding..." : `Add to Cart (${formatCurrency(scannedProduct.unitPrice * quantity)})`}
                  </Button>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <Link
                    href={`/products/${scannedProduct.id}`}
                    className="inline-flex items-center font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> View Full Nutrition Details
                  </Link>

                  <button
                    onClick={() => setScannedProduct(null)}
                    className="text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    Continue Scanning →
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <MobileNav />
    </div>
  );
}
