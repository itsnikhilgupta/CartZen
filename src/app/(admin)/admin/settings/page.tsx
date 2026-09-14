"use client";

import React, { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, ShieldCheck, FileText } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      <AdminSidebar />

      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        <Header />

        <main className="p-6 space-y-6 max-w-7xl w-full mx-auto">
          <div className="border-b border-slate-800 pb-5">
            <h1 className="text-2xl font-black text-white">Supermarket System Settings & Audit Logs</h1>
            <p className="text-xs text-slate-400">Security configurations, HMAC secret verification, and audit logs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader>
                <div className="flex items-center gap-2 text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                  <CardTitle className="text-base">Security Configurations</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Server HMAC SHA-256 Payment Signing</span>
                  <span className="text-emerald-400 font-bold font-mono">ENABLED</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Exit QR Code Expiration Window</span>
                  <span className="text-white font-mono font-bold">4 Hours</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Rate Limiter Window</span>
                  <span className="text-white font-mono font-bold">60 seconds (100 req)</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Auth.js Strategy</span>
                  <span className="text-white font-mono font-bold">JWT (Argon2id / Bcrypt)</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader>
                <div className="flex items-center gap-2 text-teal-400">
                  <FileText className="h-5 w-5" />
                  <CardTitle className="text-base">Store Profile</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Primary Store Location</span>
                  <span className="text-white font-bold">CartZen Central Market #101</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Store Code</span>
                  <span className="text-emerald-400 font-bold font-mono">STORE-101</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Operating Status</span>
                  <span className="text-emerald-400 font-bold">ACTIVE & SCANNING</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
