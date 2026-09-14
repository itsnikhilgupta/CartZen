"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Lock, Trash2, CheckCircle2, User, Sparkles } from "lucide-react";

export default function ProfilePage() {
  const [consent, setConsent] = useState<{
    personalizationOptIn: boolean;
    behaviouralTrackingOptIn: boolean;
    marketingOptIn: boolean;
  }>({
    personalizationOptIn: true,
    behaviouralTrackingOptIn: true,
    marketingOptIn: false,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [anonymizing, setAnonymizing] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/privacy/consent")
      .then((res) => res.json())
      .then((data) => {
        if (data.consent) {
          setConsent(data.consent);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleConsentToggle = async (key: keyof typeof consent) => {
    const updated = { ...consent, [key]: !consent[key] };
    setConsent(updated);
    setUpdating(true);

    try {
      await fetch("/api/privacy/consent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      setMessage("Privacy preferences updated.");
    } catch (e) {
      alert("Failed to update consent preferences");
    } finally {
      setUpdating(false);
    }
  };

  const handleAnonymizeData = async () => {
    if (!confirm("Are you sure you want to permanently delete and anonymize your shopping behavioral tracking history? This action cannot be undone.")) {
      return;
    }
    setAnonymizing(true);

    try {
      const res = await fetch("/api/privacy/anonymize", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(data.message || "Behavioral history anonymized successfully.");
      } else {
        alert(data.error || "Anonymization failed");
      }
    } catch (e) {
      alert("Error anonymizing data");
    } finally {
      setAnonymizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header />

      <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-900">Account & Privacy Controls</h1>
          <p className="text-xs text-slate-500">Manage consent choices, personalization, and data subject rights</p>
        </div>

        {message && (
          <div className="flex items-center gap-2 rounded-xl bg-slate-900 p-4 text-xs font-semibold text-white shadow-lg">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* PRIVACY CONSENT CHOICES */}
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-center gap-2 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
              <CardTitle className="text-base">Privacy Consent Controls</CardTitle>
            </div>
            <CardDescription className="text-xs">
              CartZen respects your privacy. Customize your personalization preferences below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <div>
                <h4 className="text-xs font-bold text-slate-900">AI Product Personalization</h4>
                <p className="text-[10px] text-slate-500 max-w-xs mt-0.5">
                  Receive personalized Smart Picks recommendations based on items in your basket.
                </p>
              </div>
              <input
                type="checkbox"
                checked={consent.personalizationOptIn}
                onChange={() => handleConsentToggle("personalizationOptIn")}
                className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Behavioral Shopping Analytics</h4>
                <p className="text-[10px] text-slate-500 max-w-xs mt-0.5">
                  Allow aggregate shopping basket event logs to optimize store inventory layout.
                </p>
              </div>
              <input
                type="checkbox"
                checked={consent.behaviouralTrackingOptIn}
                onChange={() => handleConsentToggle("behaviouralTrackingOptIn")}
                className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Promotional & Store Discounts</h4>
                <p className="text-[10px] text-slate-500 max-w-xs mt-0.5">
                  Receive notifications regarding store deals and discounts.
                </p>
              </div>
              <input
                type="checkbox"
                checked={consent.marketingOptIn}
                onChange={() => handleConsentToggle("marketingOptIn")}
                className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* RIGHT TO ANONYMIZE / DELETE DATA */}
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-700">
              <Trash2 className="h-5 w-5" />
              <CardTitle className="text-base">Anonymize Behavioral History</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Permanently purge all past scan events, dwell times, and recommendation history associated with your user ID.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleAnonymizeData}
              disabled={anonymizing}
              className="w-full text-xs font-bold gap-2 rounded-xl"
            >
              <Trash2 className="h-4 w-4" />
              {anonymizing ? "Anonymizing Data..." : "Purge & Anonymize My Data"}
            </Button>
          </CardContent>
        </Card>
      </main>

      <MobileNav />
    </div>
  );
}
