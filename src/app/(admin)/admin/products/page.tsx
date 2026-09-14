"use client";

import React, { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Package, Plus, Barcode, AlertTriangle, CheckCircle, XCircle, Tag } from "lucide-react";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState<any | null>(null);
  const [newBarcodeStr, setNewBarcodeStr] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  // Create Product Form State
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    brand: "",
    description: "",
    categoryId: "",
    unit: "pack",
    status: "ACTIVE",
    barcode: "",
    listPrice: 0,
    salePrice: 0,
    storeId: "",
    quantity: 100,
    isAgeRestricted: false,
    nutrition: {
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      totalSugar: 0,
      addedSugar: 0,
      fat: 0,
      saturatedFat: 0,
      fibre: 0,
      sodium: 0,
      servingSize: 100,
      servingUnit: "g",
      allergens: "",
      organic: false,
      vegan: false,
      glutenFree: false,
    },
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products");
      const d = await res.json();
      if (d.products) setProducts(d.products);
      if (d.categories) {
        setCategories(d.categories);
        if (d.categories.length > 0 && !formData.categoryId) {
          setFormData((prev) => ({ ...prev, categoryId: d.categories[0].id }));
        }
      }
      // Also fetch stores to get storeId if needed
      const storesRes = await fetch("/api/admin/stores");
      const storesData = await storesRes.json();
      if (storesData.stores && storesData.stores.length > 0) {
        setFormData((prev) => ({ ...prev, storeId: storesData.stores[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");
    setModalSuccess("");

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to create product");
      }

      setModalSuccess("Product created successfully with EAN-13 barcode & store inventory!");
      setTimeout(() => {
        setShowCreateModal(false);
        setModalSuccess("");
        loadData();
      }, 1200);
    } catch (err: any) {
      setModalError(err.message);
    }
  };

  const handleAddSecondaryBarcode = async () => {
    if (!selectedProductForBarcode || !newBarcodeStr) return;
    setModalError("");
    setModalSuccess("");

    try {
      const res = await fetch(`/api/admin/products/${selectedProductForBarcode.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newBarcode: {
            barcode: newBarcodeStr,
            isPrimary: false,
          },
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to add barcode");
      }

      setModalSuccess(`Barcode ${newBarcodeStr} assigned to product!`);
      setNewBarcodeStr("");
      setTimeout(() => {
        setSelectedProductForBarcode(null);
        setModalSuccess("");
        loadData();
      }, 1200);
    } catch (err: any) {
      setModalError(err.message);
    }
  };

  const handleToggleStatus = async (productId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) loadData();
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  };

  const handleSoftDelete = async (productId: string) => {
    if (!confirm("Are you sure you want to deactivate and mark this product as discontinued?")) return;
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
      });
      if (res.ok) loadData();
    } catch (err) {
      console.error("Failed to deactivate product:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      <AdminSidebar />

      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        <Header />

        <main className="p-6 space-y-6 max-w-7xl w-full mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h1 className="text-2xl font-black text-white">Supermarket Product Catalog</h1>
              <p className="text-xs text-slate-400">Manage products, multi-barcodes, store pricing, nutrition facts, and stock</p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add New Product
            </Button>
          </div>

          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader>
              <CardTitle className="text-base">Catalog Items ({products.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-500">Loading product catalog...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="py-3 px-3">SKU / Product</th>
                        <th className="py-3 px-3">Brand</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Barcodes</th>
                        <th className="py-3 px-3">Unit Price</th>
                        <th className="py-3 px-3">Stock Qty</th>
                        <th className="py-3 px-3">Nutrition Tags</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {products.map((p) => {
                        const price = p.price || p.unitPrice || (p.prices?.[0]?.salePrice);
                        const barcodesCount = p.barcodes?.length || 1;
                        const primaryBarcode = p.barcode || p.barcodes?.find((b: any) => b.isPrimary)?.barcode || p.barcodes?.[0]?.barcode;

                        return (
                          <tr key={p.id} className="hover:bg-slate-800/50">
                            <td className="py-3 px-3">
                              <span className="font-bold text-white block">{p.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{p.sku} ({p.unit})</span>
                            </td>
                            <td className="py-3 px-3">{p.brand}</td>
                            <td className="py-3 px-3">
                              <Badge variant="secondary" className="text-[9px]">
                                {p.category?.name || p.category}
                              </Badge>
                            </td>
                            <td className="py-3 px-3">
                              <button
                                onClick={() => handleToggleStatus(p.id, p.status)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                                  p.status === "ACTIVE"
                                    ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                    : "bg-rose-950 text-rose-300 border border-rose-800"
                                }`}
                              >
                                {p.status}
                              </button>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-mono text-emerald-400 font-bold text-[11px]">
                                {primaryBarcode}
                              </div>
                              <button
                                onClick={() => setSelectedProductForBarcode(p)}
                                className="text-[9px] text-slate-400 hover:text-emerald-400 underline flex items-center mt-0.5"
                              >
                                <Barcode className="w-3 h-3 mr-1" /> + Add Barcode ({barcodesCount})
                              </button>
                            </td>
                            <td className="py-3 px-3 font-bold text-white">
                              {formatCurrency(price || 0)}
                            </td>
                            <td className="py-3 px-3">
                              <span className={p.inStock || (p.stockQty > 0) ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                {p.stockQty ?? p.inventories?.[0]?.quantity ?? 0}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-wrap gap-1">
                                {(p.nutritionTags || []).map((tag: string) => (
                                  <span key={tag} className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                    {tag.replace("_", " ")}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right space-x-2">
                              <button
                                onClick={() => handleSoftDelete(p.id)}
                                className="text-[10px] font-semibold text-rose-400 hover:text-rose-300"
                              >
                                Deactivate
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Modal: Create Product */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl w-full text-white space-y-4 my-8">
            <h2 className="text-xl font-bold border-b border-slate-800 pb-3 flex items-center">
              <Package className="w-5 h-5 mr-2 text-emerald-400" /> Create New Supermarket Product
            </h2>

            {modalError && (
              <div className="p-3 bg-rose-950 border border-rose-800 rounded text-rose-300 text-xs flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" /> {modalError}
              </div>
            )}
            {modalSuccess && (
              <div className="p-3 bg-emerald-950 border border-emerald-800 rounded text-emerald-300 text-xs flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" /> {modalSuccess}
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="e.g. SKU-OAT-001"
                    className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rolled Oats 500g"
                    className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Brand *</label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g. Quaker"
                    className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Category *</label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Primary Barcode (EAN-13) *</label>
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="e.g. 8901040000999"
                    className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Packaging Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="pack">pack</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="L">L</option>
                    <option value="piece">piece</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">List Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.listPrice}
                    onChange={(e) => setFormData({ ...formData, listPrice: Number(e.target.value) })}
                    className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Sale Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.salePrice}
                    onChange={(e) => setFormData({ ...formData, salePrice: Number(e.target.value) })}
                    className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed product information..."
                  className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              {/* Nutrition inputs */}
              <div className="border-t border-slate-800 pt-3">
                <h3 className="font-bold text-slate-300 mb-2 flex items-center">
                  <Tag className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Nutrition Metrics (per 100g/ml)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400">Calories (kcal)</label>
                    <input
                      type="number"
                      value={formData.nutrition.calories}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nutrition: { ...formData.nutrition, calories: Number(e.target.value) },
                        })
                      }
                      className="w-full p-1.5 rounded bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Protein (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.nutrition.protein}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nutrition: { ...formData.nutrition, protein: Number(e.target.value) },
                        })
                      }
                      className="w-full p-1.5 rounded bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Carbs (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.nutrition.carbohydrates}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nutrition: { ...formData.nutrition, carbohydrates: Number(e.target.value) },
                        })
                      }
                      className="w-full p-1.5 rounded bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Total Sugar (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.nutrition.totalSugar}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nutrition: { ...formData.nutrition, totalSugar: Number(e.target.value) },
                        })
                      }
                      className="w-full p-1.5 rounded bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="border-slate-700 text-slate-300"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Save & Publish Product
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Secondary Barcode */}
      {selectedProductForBarcode && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full text-white space-y-4">
            <h3 className="text-lg font-bold flex items-center">
              <Barcode className="w-5 h-5 mr-2 text-emerald-400" /> Multi-Barcode Manager
            </h3>
            <p className="text-xs text-slate-400">
              Add a secondary EAN/UPC barcode for product:{" "}
              <span className="text-white font-bold">{selectedProductForBarcode.name}</span>
            </p>

            {modalError && (
              <div className="p-2.5 bg-rose-950 border border-rose-800 rounded text-rose-300 text-xs">
                {modalError}
              </div>
            )}
            {modalSuccess && (
              <div className="p-2.5 bg-emerald-950 border border-emerald-800 rounded text-emerald-300 text-xs">
                {modalSuccess}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">New Barcode String *</label>
              <input
                type="text"
                value={newBarcodeStr}
                onChange={(e) => setNewBarcodeStr(e.target.value)}
                placeholder="e.g. 8901040000888"
                className="w-full p-2.5 rounded bg-slate-950 border border-slate-700 text-white font-mono text-sm"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3">
              <Button
                variant="outline"
                onClick={() => setSelectedProductForBarcode(null)}
                className="border-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddSecondaryBarcode}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Add Barcode
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
