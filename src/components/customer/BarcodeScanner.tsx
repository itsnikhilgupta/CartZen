"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, Sparkles, AlertCircle, Barcode, Volume2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string) => void;
  isScanning?: boolean;
}

const SAMPLE_SEED_BARCODES = [
  { barcode: "8901030000012", name: "Organic Milk 1L", price: "$69.00" },
  { barcode: "8901234567890", name: "Wheat Bread 400g", price: "$45.00" },
  { barcode: "8901050000115", name: "Almond Milk 1L", price: "$240.00" },
  { barcode: "8901020000331", name: "Farm Eggs 12pk", price: "$90.00" },
  { barcode: "8901060000442", name: "Olive Oil 500ml", price: "$650.00" },
  { barcode: "8901080000553", name: "Dark Chocolate 100g", price: "$150.00" },
];

export function BarcodeScanner({ onScanSuccess, isScanning = false }: BarcodeScannerProps) {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState<string>("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedBarcodeRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const readerElementId = "cartzen-barcode-reader";

  // Play audio beep tone on scan
  const triggerScanAudioBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // ignore audio errors if blocked by browser policy
    }
  };

  // Trigger haptic vibration on mobile
  const triggerHapticVibration = () => {
    if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
      try {
        navigator.vibrate(100);
      } catch {
        // ignore vibration errors
      }
    }
  };

  const handleBarcodeDetected = (decodedText: string) => {
    const now = Date.now();
    // Duplicate Scan Protection: Prevent scanning same barcode within 2000ms buffer
    if (
      lastScannedBarcodeRef.current === decodedText &&
      now - lastScannedTimeRef.current < 2000
    ) {
      console.log(`[Duplicate Scan Ignored]: ${decodedText}`);
      return;
    }

    lastScannedBarcodeRef.current = decodedText;
    lastScannedTimeRef.current = now;

    triggerScanAudioBeep();
    triggerHapticVibration();
    onScanSuccess(decodedText);
  };

  const startCamera = async () => {
    setCameraError(null);
    setCameraPermissionDenied(false);

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(readerElementId);
      }

      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 280, height: 180 },
        },
        (decodedText) => {
          handleBarcodeDetected(decodedText);
        },
        () => {
          // Frame scan miss handler ignored
        }
      );

      setCameraActive(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not access browser camera";
      console.warn("Camera start failed:", msg);
      if (msg.includes("Permission") || msg.includes("NotAllowedError") || msg.includes("denied")) {
        setCameraPermissionDenied(true);
      }
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && cameraActive) {
      try {
        await scannerRef.current.stop();
        setCameraActive(false);
      } catch (e) {
        console.error("Error stopping camera:", e);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && cameraActive) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [cameraActive]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      handleBarcodeDetected(manualBarcode.trim());
      setManualBarcode("");
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Viewport Scanner Card */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-dashed border-emerald-500 bg-slate-950 p-4 text-center text-white shadow-2xl">
        <div id={readerElementId} className="w-full overflow-hidden rounded-2xl min-h-[220px]" />

        {!cameraActive && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40">
              <Camera className="h-8 w-8 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Browser Camera Barcode Scanner</h3>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Point smartphone camera at product barcode in store
              </p>
            </div>
            <Button
              onClick={startCamera}
              disabled={isScanning}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl gap-2 font-bold px-6"
            >
              <Camera className="h-4 w-4" />
              Start Camera Scanner
            </Button>
          </div>
        )}

        {cameraActive && (
          <div className="mt-3 flex items-center justify-between px-2">
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              Camera Active - Align barcode in frame
            </span>
            <Button size="sm" variant="destructive" onClick={stopCamera} className="text-xs h-8">
              Stop Camera
            </Button>
          </div>
        )}

        {cameraPermissionDenied && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-950/90 p-3 text-xs text-amber-300 border border-amber-800 text-left">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Camera Access Blocked</span>
              Camera permission was denied in your browser. Please enable camera access in browser site settings or use manual entry / simulator buttons below.
            </div>
          </div>
        )}

        {cameraError && !cameraPermissionDenied && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-950/80 p-3 text-xs text-red-300 border border-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{cameraError}</span>
          </div>
        )}
      </div>

      {/* Manual Barcode & Quick Scan Barcode Simulator */}
      <div className="rounded-2xl border border-emerald-200 dark:border-slate-700 bg-emerald-50/60 dark:bg-slate-800/60 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
              Manual Entry & Web Barcode Simulator
            </h4>
          </div>
          <Badge variant="default" className="text-[10px]">Instant Scan</Badge>
        </div>

        {/* Manual Input Form */}
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <Input
            placeholder="Enter barcode number (e.g. 8901030000012)"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            className="h-10 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          <Button type="submit" size="sm" className="h-10 px-5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs">
            <Barcode className="w-4 h-4 mr-1" /> Lookup
          </Button>
        </form>

        {/* Quick Sample Barcodes */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Tap sample product to simulate scan:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SAMPLE_SEED_BARCODES.map((item) => (
              <button
                key={item.barcode}
                onClick={() => handleBarcodeDetected(item.barcode)}
                disabled={isScanning}
                className="flex flex-col items-start p-2.5 rounded-xl border border-emerald-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-emerald-100/60 dark:hover:bg-slate-800 text-left transition-all active:scale-95 shadow-xs"
              >
                <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{item.name}</span>
                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold">{item.price}</span>
                <span className="text-[9px] text-slate-400 font-mono mt-0.5">{item.barcode}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
