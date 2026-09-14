"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { CheckCircle2, ShieldCheck, Home, QrCode, Printer, Share2 } from "lucide-react";

export default function ReceiptPage({ params }: { params: { id: string } }) {
  const [receiptData, setReceiptData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch(`/api/checkout/receipt/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.receipt) {
          setReceiptData(data.receipt);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share && receiptData) {
      try {
        await navigator.share({
          title: `CartZen E-Bill ${receiptData.receiptNumber}`,
          text: `CartZen Supermarket E-Bill Receipt for Order #${receiptData.purchase?.orderNumber}`,
          url: window.location.href,
        });
      } catch {
        // User cancelled share
      }
    } else {
      // Fallback: Copy link
      navigator.clipboard.writeText(window.location.href);
      alert("Receipt link copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm font-semibold text-slate-500">Retrieving E-Bill & Exit QR Code...</div>
      </div>
    );
  }

  if (!receiptData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-slate-900">Receipt Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">Unable to locate the requested receipt.</p>
        <Link href="/" className="mt-4">
          <Button size="sm">Return Home</Button>
        </Link>
      </div>
    );
  }

  const purchase = receiptData.purchase;
  const exitCode = purchase.exitVerification?.verificationCode || "EXIT-DEFAULT";
  const exitStatus = purchase.exitVerification?.status || "PENDING";
  const items = purchase.items || [];
  const payment = purchase.payment;

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <Header />

      <main className="mx-auto max-w-md px-4 py-6 space-y-6">
        {/* Payment Success Alert */}
        <div className="rounded-3xl bg-emerald-600 p-6 text-white text-center space-y-2 shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-emerald-600 shadow-md">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black">Payment Verified!</h1>
          <p className="text-xs text-emerald-100 font-mono">Order: #{purchase.orderNumber}</p>
        </div>

        {/* SECURE EXIT QR CODE CARD */}
        <Card className="border-2 border-emerald-500 bg-white p-6 text-center space-y-4 shadow-xl">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              <ShieldCheck className="h-4 w-4" />
              Cryptographic Exit Pass
            </div>
            <h2 className="text-base font-bold text-slate-900">Store Exit Gatekeeper QR</h2>
            <p className="text-xs text-slate-500">Show this QR to store staff or scan at exit gate</p>
          </div>

          <div className="mx-auto inline-block p-4 rounded-2xl bg-white border-2 border-slate-900 shadow-md">
            <QRCodeSVG
              value={receiptData.qrCodeData || exitCode}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>

          <div className="rounded-xl bg-slate-100 p-3 font-mono text-center">
            <span className="text-[10px] uppercase text-slate-400 block font-sans font-bold">Exit Pass Status & Code</span>
            <div className="flex items-center justify-center gap-2 mt-0.5">
              <Badge className={exitStatus === "VERIFIED" ? "bg-blue-600" : "bg-emerald-600"}>
                {exitStatus}
              </Badge>
              <span className="text-lg font-black text-slate-900 tracking-wider">{exitCode}</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-900">
            Single-use verification QR code. Valid for 4 hours from payment confirmation.
          </div>
        </Card>

        {/* E-BILL ITEMIZED RECEIPT */}
        <Card className="border-slate-200 bg-white p-6 space-y-4 shadow-sm print:shadow-none print:border-none">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-start">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">CartZen E-Bill Receipt</h3>
              <p className="text-xs text-slate-500">{purchase.store?.name}</p>
              <p className="text-[11px] text-slate-400">{purchase.store?.address}</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                {formatDateTime(purchase.createdAt)}
              </p>
            </div>
            <Badge variant="outline" className="font-mono text-[10px]">{receiptData.receiptNumber}</Badge>
          </div>

          {/* Itemized Table */}
          <div className="space-y-2 text-xs">
            <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px] pb-1 border-b border-slate-100 flex justify-between">
              <span>Item Description</span>
              <span>Total</span>
            </div>
            {items.map((item: any) => (
              <div key={item.id} className="flex justify-between text-slate-800 py-1 border-b border-slate-50">
                <div>
                  <span className="font-bold text-slate-900">{item.name}</span>
                  <div className="text-[10px] text-slate-400">{item.quantity} x {formatCurrency(item.unitPrice)}</div>
                </div>
                <span className="font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</span>
              </div>
            ))}
          </div>

          {/* Totals Breakdown */}
          <div className="pt-3 border-t border-slate-200 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatCurrency(purchase.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>GST Tax (5%)</span>
              <span>{formatCurrency(purchase.taxTotal)}</span>
            </div>
            {purchase.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span>-{formatCurrency(purchase.discountTotal)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-black text-slate-900">
              <span>Paid Total</span>
              <span className="text-emerald-600">{formatCurrency(purchase.grandTotal)}</span>
            </div>
          </div>

          {/* Payment Method & Transaction Reference */}
          {payment && (
            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-0.5 font-mono">
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="font-bold text-slate-700">{payment.method} ({payment.provider})</span>
              </div>
              <div className="flex justify-between truncate">
                <span>Txn Ref:</span>
                <span className="font-bold text-slate-700 truncate max-w-[180px]">{payment.transactionRef}</span>
              </div>
            </div>
          )}

          {/* Receipt Action Buttons */}
          <div className="flex gap-2 pt-2 print:hidden">
            <Button onClick={handlePrint} variant="outline" size="sm" className="flex-1 text-xs gap-1.5">
              <Printer className="h-3.5 w-3.5" />
              Print Receipt
            </Button>
            <Button onClick={handleShare} variant="outline" size="sm" className="flex-1 text-xs gap-1.5">
              <Share2 className="h-3.5 w-3.5" />
              Share / Download
            </Button>
          </div>
        </Card>

        <div className="flex gap-3 print:hidden">
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full h-11 text-xs font-bold rounded-xl gap-2">
              <Home className="h-4 w-4" />
              Return Home
            </Button>
          </Link>
          <Link href="/scan" className="flex-1">
            <Button className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold rounded-xl gap-2">
              <QrCode className="h-4 w-4" />
              New Session
            </Button>
          </Link>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
