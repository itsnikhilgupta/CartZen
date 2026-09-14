"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ProductItem {
  id: string;
  sku: string;
  name: string;
  brand: string;
  description: string;
  unit: string;
  status: string;
  category: string;
  categoryId: string;
  barcode: string;
  price: number;
  listPrice: number;
  salePrice: number;
  inStock: boolean;
  stockQty: number;
  nutritionTags: string[];
  disclaimer: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export default function CustomerProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 9,
    totalPages: 1,
    hasMore: false,
  });
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedClassification, setSelectedClassification] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    // Fetch categories
    fetch("/api/admin/products")
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [searchQuery, selectedCategory, selectedClassification, sortBy, page]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("query", searchQuery);
      if (selectedCategory) params.set("categoryId", selectedCategory);
      if (selectedClassification) params.set("classification", selectedClassification);
      if (sortBy) params.set("sortBy", sortBy);
      params.set("page", page.toString());
      params.set("limit", "9");

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setProducts(data.products || []);
        if (data.pagination) setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Failed to load catalog products:", err);
    } finally {
      setLoading(false);
    }
  };

  const getNutritionBadgeClass = (tag: string) => {
    switch (tag) {
      case "HIGH_PROTEIN":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300";
      case "LOW_SUGAR":
        return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300";
      case "HIGH_FIBRE":
        return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300";
      case "LOW_CALORIE":
        return "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Supermarket Product Catalog
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Explore thousands of items, check live stock, and review nutrition facts.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors"
          >
            ← Back to Store Home
          </Link>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Search Products
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, brand, SKU or barcode..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="newest">Newest Arrivals</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="name_asc">Name: A to Z</option>
              </select>
            </div>
          </div>

          {/* Nutrition Tag Filter Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Filter by Health & Nutrition Highlights
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { tag: "", label: "All Items" },
                { tag: "HIGH_PROTEIN", label: "💪 High Protein" },
                { tag: "LOW_SUGAR", label: "🌿 Low Sugar" },
                { tag: "HIGH_FIBRE", label: "🌾 High Fibre" },
                { tag: "LOW_CALORIE", label: "⚡ Low Calorie" },
              ].map((item) => (
                <button
                  key={item.tag}
                  onClick={() => {
                    setSelectedClassification(item.tag);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    selectedClassification === item.tag
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-400"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Product Grid / Loading / Empty */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent"></div>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading catalog items...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-700">
            <svg
              className="mx-auto h-12 w-12 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">No products found</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Try adjusting your search criteria or nutrition filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {p.category}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        p.inStock
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      }`}
                    >
                      {p.inStock ? `In Stock (${p.stockQty})` : "Out of Stock"}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">
                    Brand: {p.brand} | SKU: {p.sku} | Unit: {p.unit}
                  </p>

                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-4">
                    {p.description}
                  </p>

                  {/* Nutrition Tags */}
                  {p.nutritionTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {p.nutritionTags.map((tag) => (
                        <span
                          key={tag}
                          className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${getNutritionBadgeClass(
                            tag
                          )}`}
                        >
                          {tag.replace("_", " ")}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Barcode code */}
                  <div className="text-xs text-slate-400 dark:text-slate-500 font-mono mb-4">
                    Barcode: {p.barcode}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                      ${p.price.toFixed(2)}
                    </span>
                    {p.listPrice > p.salePrice && p.salePrice > 0 && (
                      <span className="ml-2 text-xs text-slate-400 line-through">
                        ${p.listPrice.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/products/${p.id}`}
                    className="inline-flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                  >
                    View Nutrition & Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Server-Side Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <button
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              ← Previous
            </button>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Page <span className="font-bold text-slate-900 dark:text-white">{pagination.page}</span> of{" "}
              <span className="font-bold text-slate-900 dark:text-white">{pagination.totalPages}</span> ({pagination.total} Total Products)
            </span>
            <button
              disabled={!pagination.hasMore}
              onClick={() => setPage((prev) => prev + 1)}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
