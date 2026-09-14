"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Store, QrCode, ShoppingBag, ShieldCheck, ArrowRight, Sparkles, MapPin, Search, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";

interface StoreItem {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  status: string;
  isMarketActive: boolean;
}

export default function HomePage() {
  const router = useRouter();
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [startingSession, setStartingSession] = useState<boolean>(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async (query: string = "") => {
    try {
      const url = query ? `/api/stores/search?query=${encodeURIComponent(query)}` : "/api/stores";
      const res = await fetch(url);
      const data = await res.json();
      if (data.stores && data.stores.length > 0) {
        setStores(data.stores);
        if (!selectedStoreId) {
          const firstActive = data.stores.find((s: StoreItem) => s.status === "ACTIVE") || data.stores[0];
          setSelectedStoreId(firstActive.id);
        }
      } else {
        setStores([]);
      }
    } catch {
      console.error("Failed to fetch stores");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    fetchStores(searchQuery);
  };

  const handleStartShopping = async () => {
    if (!selectedStoreId) return;
    setStartingSession(true);
    setSessionError(null);

    try {
      const res = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId: selectedStoreId }),
      });

      const data = await res.json();
      if (res.ok && data.session) {
        router.push("/scan");
      } else {
        setSessionError(data.error || "Please sign in to start a shopping session");
        if (res.status === 401) {
          setTimeout(() => router.push("/login"), 1500);
        }
      }
    } catch {
      setSessionError("Failed to start session. Please sign in.");
    } finally {
      setStartingSession(false);
    }
  };

  const selectedStore = stores.find((s) => s.id === selectedStoreId);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-6 sm:p-10 text-white shadow-xl">
          <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative z-10 space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
              <Sparkles className="h-3.5 w-3.5" />
              Smart Scan-and-Go Supermarket
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Scan, Pay, Go with <span className="text-emerald-400">CartZen</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300">
              Skip supermarket checkout lines forever. Select an active supermarket location, scan product barcodes, receive AI Smart Picks, pay securely, and get your verified Exit QR Code.
            </p>
          </div>
        </div>

        {/* Store Selection & Multi-Store Search Card */}
        <Card className="border-emerald-100 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-emerald-600">
              <Store className="h-5 w-5" />
              <CardTitle>Select Participating Supermarket Store</CardTitle>
            </div>
            <CardDescription>
              Search by store name, store code, or city to begin an active shopping session.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Store Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search stores by city, code (e.g. STORE-101)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 text-xs"
                />
              </div>
              <Button type="submit" size="sm" className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 font-bold">
                Search
              </Button>
            </form>

            {sessionError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-xs text-red-800 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{sessionError}</span>
              </div>
            )}

            {loading ? (
              <div className="py-8 text-center text-sm text-slate-400">Searching store locations...</div>
            ) : stores.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">No matching store locations found.</div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {stores.map((s) => {
                  const isActive = s.status === "ACTIVE" && s.isMarketActive;
                  return (
                    <label
                      key={s.id}
                      onClick={() => setSelectedStoreId(s.id)}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        selectedStoreId === s.id
                          ? "border-emerald-600 bg-emerald-50/60 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      } ${!isActive ? "opacity-75 bg-slate-50" : ""}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{s.name}</span>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-600">
                            {s.code}
                          </span>
                          <Badge
                            variant={isActive ? "default" : "destructive"}
                            className="text-[9px] uppercase font-bold"
                          >
                            {s.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>{s.address}, {s.city}, {s.state}</span>
                        </div>
                      </div>

                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                        selectedStoreId === s.id ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"
                      }`}>
                        {selectedStoreId === s.id && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <Button
              id="start-shopping-session-btn"
              onClick={handleStartShopping}
              disabled={startingSession || !selectedStoreId || (selectedStore?.status ? selectedStore.status !== "ACTIVE" : false)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 h-13 text-base font-bold rounded-2xl gap-2 shadow-md mt-4"
            >
              {startingSession
                ? "Starting Shopping Session..."
                : selectedStore && selectedStore.status !== "ACTIVE"
                ? `Store ${selectedStore.status} - Session Blocked`
                : "Start Shopping Session"}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </main>

      <MobileNav />
    </div>
  );
}
