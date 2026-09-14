"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface ProductDetail {
  id: string;
  sku: string;
  name: string;
  brand: string;
  description: string;
  unit: string;
  status: string;
  isAgeRestricted: boolean;
  imageUrl?: string;
  category: { id: string; name: string };
  barcodes: { id: string; barcode: string; isPrimary: boolean }[];
  unitPrice: number;
  listPrice: number;
  salePrice: number;
  inStock: boolean;
  stockQty: number;
  nutritionTags: string[];
  disclaimer: string;
  nutrition?: {
    calories?: number;
    protein?: number;
    carbohydrates?: number;
    totalSugar?: number;
    addedSugar?: number;
    fat?: number;
    saturatedFat?: number;
    fibre?: number;
    sodium?: number;
    servingSize?: number;
    servingUnit?: string;
    allergens?: string;
    organic?: boolean;
    vegan?: boolean;
    glutenFree?: boolean;
  };
}

export default function ProductDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) {
      fetch(`/api/products/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error("Product not found");
          return res.json();
        })
        .then((data) => {
          setProduct(data.product);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent"></div>
          <p className="mt-2 text-sm text-slate-500">Loading product detail...</p>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4">
        <div className="max-w-xl mx-auto bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
          <h2 className="text-xl font-bold text-rose-600 dark:text-rose-400">Product Not Found</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{error || "The requested item does not exist or has been removed."}</p>
          <Link
            href="/products"
            className="mt-6 inline-block px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
          >
            ← Back to Catalog
          </Link>
        </div>
      </main>
    );
  }

  const n = product.nutrition;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation back */}
        <Link
          href="/products"
          className="inline-flex items-center text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          ← Back to Catalog
        </Link>

        {/* Top Product Summary Box */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {product.category?.name || "General"}
              </span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${product.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                {product.status}
              </span>
              {product.isAgeRestricted && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-amber-100 text-amber-800">
                  🔞 18+ Age Restricted
                </span>
              )}
            </div>

            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {product.name}
            </h1>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Brand: <span className="text-slate-800 dark:text-slate-200">{product.brand}</span> | SKU: <span className="text-slate-800 dark:text-slate-200">{product.sku}</span> | Unit: <span className="text-slate-800 dark:text-slate-200">{product.unit}</span>
            </p>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">
              {product.description}
            </p>

            {/* Nutrition Badges */}
            {product.nutritionTags.length > 0 && (
              <div className="pt-2">
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Health Highlights
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.nutritionTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                    >
                      {tag.replace("_", " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pricing & Stock Card */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unit Price</span>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                ${product.unitPrice.toFixed(2)}
              </div>
              {product.listPrice > product.salePrice && product.salePrice > 0 && (
                <div className="text-xs text-slate-400 line-through">
                  List Price: ${product.listPrice.toFixed(2)}
                </div>
              )}
              <div className="mt-3">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                    product.inStock
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                  }`}
                >
                  {product.inStock ? `In Stock (${product.stockQty} available)` : "Out of Stock"}
                </span>
              </div>
            </div>

            {/* Barcode section */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Scannable Barcodes ({product.barcodes.length})
              </span>
              <div className="space-y-1">
                {product.barcodes.map((b) => (
                  <div key={b.id} className="flex items-center justify-between text-xs font-mono text-slate-700 dark:text-slate-300">
                    <span>{b.barcode}</span>
                    {b.isPrimary && (
                      <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-sans font-semibold text-slate-600 dark:text-slate-300">
                        Primary
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Nutrition Panel */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Nutrition Facts Table
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Serving Size: {n?.servingSize || 100}{n?.servingUnit || "g"}
            </p>
          </div>

          {/* Dietary Badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${n?.organic ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
              {n?.organic ? "✓ Organic" : "✗ Non-Organic"}
            </span>
            <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${n?.vegan ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
              {n?.vegan ? "🌱 Vegan" : "Non-Vegan"}
            </span>
            <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${n?.glutenFree ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
              {n?.glutenFree ? "🌾 Gluten Free" : "Contains Gluten"}
            </span>
          </div>

          {/* Nutrition Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300 border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 dark:border-white">
                  <th className="py-2 text-base font-extrabold text-slate-900 dark:text-white">Amount Per Serving</th>
                  <th className="py-2 text-right font-extrabold text-slate-900 dark:text-white">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                <tr>
                  <td className="py-2.5 font-bold text-slate-900 dark:text-white">Calories</td>
                  <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white">{n?.calories ?? "--"} kcal</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-semibold">Total Fat</td>
                  <td className="py-2.5 text-right">{n?.fat ?? "--"} g</td>
                </tr>
                <tr>
                  <td className="py-2.5 pl-4 text-xs text-slate-500 dark:text-slate-400">Saturated Fat</td>
                  <td className="py-2.5 text-right text-xs">{n?.saturatedFat ?? "--"} g</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-semibold">Carbohydrates</td>
                  <td className="py-2.5 text-right">{n?.carbohydrates ?? "--"} g</td>
                </tr>
                <tr>
                  <td className="py-2.5 pl-4 text-xs text-slate-500 dark:text-slate-400">Total Sugars</td>
                  <td className="py-2.5 text-right text-xs">{n?.totalSugar ?? "--"} g</td>
                </tr>
                <tr>
                  <td className="py-2.5 pl-8 text-xs text-slate-500 dark:text-slate-400">Added Sugars</td>
                  <td className="py-2.5 text-right text-xs">{n?.addedSugar ?? "--"} g</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-semibold">Dietary Fibre</td>
                  <td className="py-2.5 text-right">{n?.fibre ?? "--"} g</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-semibold">Protein</td>
                  <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white">{n?.protein ?? "--"} g</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-semibold">Sodium</td>
                  <td className="py-2.5 text-right">{n?.sodium ?? "--"} mg</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Allergens */}
          {n?.allergens && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
              <span className="font-bold">⚠️ Allergen Warning: </span>
              {n.allergens}
            </div>
          )}

          {/* Business & Medical Disclaimer */}
          <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 leading-normal italic">
            {product.disclaimer}
          </div>
        </div>
      </div>
    </main>
  );
}
