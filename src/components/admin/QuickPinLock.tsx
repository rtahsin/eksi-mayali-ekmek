"use client";

import React, { useState, useEffect } from "react";
import { Lock, Delete, KeyRound, ShieldAlert } from "lucide-react";

interface QuickPinLockProps {
  isLocked: boolean;
  onUnlock: () => void;
}

export function QuickPinLock({ isLocked, onUnlock }: QuickPinLockProps) {
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<boolean>(false);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  // Retrieve or set default PIN
  const getSavedPin = () => {
    if (typeof window === "undefined") return "1453";
    return localStorage.getItem("ekmeklab_admin_pin") || "1453";
  };

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === getSavedPin()) {
        setError(false);
        setPin("");
        setFailedAttempts(0);
        setLockoutSeconds(0);
        onUnlock();
      } else {
        setError(true);
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);

        if (nextAttempts >= 5) {
          setLockoutSeconds(60); // 60-second brute-force lockout
        }

        setTimeout(() => {
          setPin("");
          setError(false);
        }, 700);
      }
    }
  }, [pin, onUnlock, failedAttempts]);

  if (!isLocked) return null;

  const isLockedOut = lockoutSeconds > 0;

  const handleDigit = (digit: string) => {
    if (isLockedOut) return;
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (isLockedOut) return;
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isLockedOut) return;
    setPin("");
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#120E0B]/95 backdrop-blur-xl">
      <div className="max-w-xs w-full bg-[#1A1410] border border-[#2F241D] rounded-3xl p-7 text-center space-y-6 shadow-2xl">
        {/* Header */}
        <div className="space-y-2">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto text-amber-500">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-lg font-bold text-stone-100">
            Fırıncı Hızlı Ekran Kilidi
          </h2>
          <p className="text-[11px] text-stone-400">
            Devam etmek için 4 haneli güvenlik PIN kodunuzu girin
          </p>
        </div>

        {/* 4 Digit Indicators */}
        <div className="flex justify-center items-center gap-3 py-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                error
                  ? "border-red-500 bg-red-500 animate-bounce"
                  : pin.length > idx
                  ? "border-amber-500 bg-amber-500"
                  : "border-stone-700 bg-stone-900"
              }`}
            />
          ))}
        </div>

        {isLockedOut ? (
          <div className="text-xs text-amber-400 font-semibold bg-amber-950/40 border border-amber-500/40 p-3 rounded-xl flex items-center justify-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Çok fazla hatalı deneme! {lockoutSeconds} sn bekleyin.</span>
          </div>
        ) : error ? (
          <div className="text-xs text-red-400 font-semibold animate-shake">
            Hatalı PIN! Kalan deneme: {Math.max(0, 5 - failedAttempts)}
          </div>
        ) : null}

        {/* Big Touch Keypad for Flour-Dusted Hands */}
        <div className="grid grid-cols-3 gap-2.5 pt-2 font-mono">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-2xl bg-stone-900 hover:bg-stone-800 text-stone-200 text-xl font-bold border border-stone-800 transition-all active:scale-95 shadow"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-2xl bg-stone-950 text-stone-500 hover:text-stone-300 text-xs font-bold border border-stone-800/60 transition-all active:scale-95"
          >
            Temizle
          </button>
          <button
            type="button"
            onClick={() => handleDigit("0")}
            className="h-14 rounded-2xl bg-stone-900 hover:bg-stone-800 text-stone-200 text-xl font-bold border border-stone-800 transition-all active:scale-95 shadow"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-stone-950 text-stone-400 hover:text-stone-200 flex items-center justify-center border border-stone-800/60 transition-all active:scale-95"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div className="text-[10px] text-stone-600">
          Varsayılan PIN: <code>1453</code>
        </div>
      </div>
    </div>
  );
}
