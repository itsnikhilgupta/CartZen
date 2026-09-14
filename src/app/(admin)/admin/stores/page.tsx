"use client";

import React, { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Store, Plus, MapPin, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

export default function AdminStoresPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string | null>(null);

  // New Store Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Maharashtra");
  const [status, setStatus] = useState("ACTIVE");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAdminStores();
  }, []);

  const fetchAdminStores = async () => {
    try {
      const res = await fetch("/api/admin/stores");
      const data = await res.json();
      if (data.stores) {
        setStores(data.stores);
      }
    } catch {
      console.error("Failed to load admin store list");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code,
          address,
          city,
          state,
          country: "India",
          timezone: "Asia/Kolkata",
          currency: "INR",
          status,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(`Store "${name}" (${code}) saved successfully.`);
        setName("");
        setCode("");
        setAddress("");
        setCity("");
        fetchAdminStores();
      } else {
        alert(data.error || "Failed to save store");
      }
    } catch {
      alert("Error submitting store form");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      <AdminSidebar />

      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        <Header />

        <main className="p-6 space-y-6 max-w-7xl w-full mx-auto">
          <div className="border-b border-slate-800 pb-5">
            <h1 className="text-2xl font-black text-white">Multi-Store Location Management</h1>
            <p className="text-xs text-slate-400">Manage store entities, operating statuses, and cross-store admin isolation</p>
          </div>

          {message && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-950/80 p-4 text-xs font-semibold text-white shadow-lg border border-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {/* Add / Update Store Form */}
          <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
            <CardHeader>
              <div className="flex items-center gap-2 text-emerald-400">
                <Store className="h-5 w-5" />
                <CardTitle className="text-base text-white">Add New Store Location</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Create or configure supermarket store boundaries and status parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateStore} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Store Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="CartZen Sunset Market #104"
                    className="bg-slate-950 border-slate-800 text-white h-10 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Store Code</label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="STORE-104"
                    className="bg-slate-950 border-slate-800 text-white h-10 text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Operating Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full h-10 rounded-xl bg-slate-950 border border-slate-800 text-white px-3 text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                  </select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-300">Street Address</label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="750 Sunset Boulevard"
                    className="bg-slate-950 border-slate-800 text-white h-10 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">City</label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="San Francisco"
                    className="bg-slate-950 border-slate-800 text-white h-10 text-xs"
                    required
                  />
                </div>

                <div className="md:col-span-3 pt-2">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs gap-1.5 rounded-xl px-6"
                  >
                    <Plus className="h-4 w-4" />
                    {submitting ? "Saving..." : "Save Store Location"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Stores List Table */}
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader>
              <CardTitle className="text-base">Accessible Store Locations ({stores.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-500">Loading store list...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="py-3 px-3">Store Name / Code</th>
                        <th className="py-3 px-3">Location</th>
                        <th className="py-3 px-3">Timezone / Currency</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Market Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {stores.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-800/50">
                          <td className="py-3 px-3">
                            <span className="font-bold text-white block">{s.name}</span>
                            <span className="text-[10px] text-emerald-400 font-mono">{s.code}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-400">
                            {s.address}, {s.city}, {s.state}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px]">
                            {s.timezone} ({s.currency})
                          </td>
                          <td className="py-3 px-3">
                            <Badge
                              variant={s.status === "ACTIVE" ? "default" : "destructive"}
                              className="text-[9px]"
                            >
                              {s.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 font-semibold">
                            {s.isMarketActive ? "YES" : "NO"}
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
