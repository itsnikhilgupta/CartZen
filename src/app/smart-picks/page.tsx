"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Sparkles, Plus, CheckCircle, ShieldCheck } from "lucide-react";

export default function SmartPicksPage() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [session, setSession] = useState<any>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cart")
      .then((res) => res.json())
      .then((cartData) => {
        if (cartData.session) {
          setSession(cartData.session);
          const cartItemIds = cartData.cart?.items?.map((i: any) => i.product?.id || i.productId).join(",") || "";
          fetch(`/api/recommendations?storeId=${cartData.session.storeId}&cartItems=${cartItemIds}`)
            .then((r) => r.json())
            .then((recData) => {
              if (recData.recommendations) {
                setRecommendations(recData.recommendations);
              }
              setLoading(false);
            })
            .catch(() => setLoading(false));
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const handleAddRecommendedItem = async (rec: any) => {
    if (!session) return;
    setAddingId(rec.product.id);

    try {
      // Find item barcode
      const primaryBarcode = rec.product.barcode || rec.product.barcodes?.[0]?.barcode || "8901030000012";

      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shoppingSessionId: session.id,
          barcode: primaryBarcode,
          quantity: 1,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToastMessage(`Added ${rec.product.name} to your cart!`);
      } else {
        alert(data.error || "Failed to add recommended item to cart");
      }
    } catch {
      alert("Failed to update cart");
    } finally {
      setAddingId(null);
    }
  };

  // Group recommendations into sections
  const highProteinList = recommendations.filter((r) => r.recommendationType === "HIGH_PROTEIN" || r.product?.nutritionTags?.includes("HIGH_PROTEIN"));
  const highFibreList = recommendations.filter((r) => r.recommendationType === "HIGH_FIBRE" || r.product?.nutritionTags?.includes("HIGH_FIBRE"));
  const lowSugarList = recommendations.filter((r) => r.recommendationType === "LOW_SUGAR" || r.product?.nutritionTags?.includes("LOW_SUGAR"));
  const lowCalorieList = recommendations.filter((r) => r.recommendationType === "LOW_CALORIE" || r.product?.nutritionTags?.includes("LOW_CALORIE"));
  const buyAgainList = recommendations.filter((r) => r.recommendationType === "FREQUENTLY_BOUGHT");
  const personalizedList = recommendations.filter(
    (r) => !["HIGH_PROTEIN", "HIGH_FIBRE", "LOW_SUGAR", "LOW_CALORIE", "FREQUENTLY_BOUGHT"].includes(r.recommendationType)
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 p-6 text-white shadow-xl">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="h-4 w-4 animate-pulse" />
            CartZen AI Shopping Assistant
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">Smart Picks For You</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
            Data-backed supermarket product recommendations derived strictly from your active shopping history, category affinities, and dietary interests.
          </p>
        </div>

        {/* Privacy Notice Card */}
        <div className="flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300">
              Personalization Engine Active • Explanations are data-grounded and non-medical.
            </span>
          </div>
          <Link href="/profile" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline shrink-0">
            Privacy Settings →
          </Link>
        </div>

        {toastMessage && (
          <div className="flex items-center gap-2 rounded-xl bg-slate-900 p-4 text-xs font-semibold text-white shadow-lg border border-slate-800 animate-in fade-in">
            <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center space-y-2">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent"></div>
            <p className="text-xs text-slate-500">Analyzing supermarket affinity patterns...</p>
          </div>
        ) : recommendations.length === 0 ? (
          <Card className="p-8 text-center space-y-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <ShieldCheck className="h-10 w-10 text-emerald-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Smart Picks Ready</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Start scanning items in store to receive tailored supermarket recommendations.
            </p>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* 1. Buy Again Section */}
            {buyAgainList.length > 0 && (
              <RecommendationSection
                title="🔄 Buy Again / Frequent Reorders"
                items={buyAgainList}
                addingId={addingId}
                onAdd={handleAddRecommendedItem}
              />
            )}

            {/* 2. High Protein Section */}
            {highProteinList.length > 0 && (
              <RecommendationSection
                title="🥩 High Protein Selections"
                items={highProteinList}
                addingId={addingId}
                onAdd={handleAddRecommendedItem}
              />
            )}

            {/* 3. High Fibre Section */}
            {highFibreList.length > 0 && (
              <RecommendationSection
                title="🌾 High Fibre Choices"
                items={highFibreList}
                addingId={addingId}
                onAdd={handleAddRecommendedItem}
              />
            )}

            {/* 4. Lower Sugar Section */}
            {lowSugarList.length > 0 && (
              <RecommendationSection
                title="🌿 Lower Sugar Picks"
                items={lowSugarList}
                addingId={addingId}
                onAdd={handleAddRecommendedItem}
              />
            )}

            {/* 5. Lower Calorie Section */}
            {lowCalorieList.length > 0 && (
              <RecommendationSection
                title="⚡ Lower Calorie Options"
                items={lowCalorieList}
                addingId={addingId}
                onAdd={handleAddRecommendedItem}
              />
            )}

            {/* 6. General Personalised & Basket Associations Section */}
            {personalizedList.length > 0 && (
              <RecommendationSection
                title="✨ Based On Your Shopping & Basket Items"
                items={personalizedList}
                addingId={addingId}
                onAdd={handleAddRecommendedItem}
              />
            )}
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}

function RecommendationSection({
  title,
  items,
  addingId,
  onAdd,
}: {
  title: string;
  items: any[];
  addingId: string | null;
  onAdd: (rec: any) => void;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-extrabold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((rec) => (
          <Card
            key={rec.product.id}
            className="p-4 flex flex-col justify-between space-y-3 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 transition-all shadow-xs"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary" className="text-[9px] uppercase font-bold">
                  {rec.product.category}
                </Badge>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  {rec.reason}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{rec.product.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Brand: {rec.product.brand}</p>

              {rec.product.nutritionTags && rec.product.nutritionTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {rec.product.nutritionTags.map((tag: string) => (
                    <span
                      key={tag}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    >
                      {tag.replace("_", " ")}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-base font-black text-slate-900 dark:text-white">
                  {formatCurrency(rec.product.price)}
                </span>
              </div>
              <Button
                size="sm"
                onClick={() => onAdd(rec)}
                disabled={addingId === rec.product.id || !rec.product.inStock}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl gap-1 h-9 px-4"
              >
                <Plus className="h-3.5 w-3.5" />
                {addingId === rec.product.id ? "Adding..." : rec.product.inStock ? "Add Item" : "Out of Stock"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
