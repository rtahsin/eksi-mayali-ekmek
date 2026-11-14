"use client";

import React from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import {
  getFoodComplianceSummary,
  type FoodComplianceProductInput,
} from "@/lib/products/foodCompliance";

export interface FoodComplianceNoticeProps {
  product: FoodComplianceProductInput;
  variant?: "full" | "compact";
  className?: string;
}

export function FoodComplianceNotice({
  product,
  variant = "full",
  className = "",
}: FoodComplianceNoticeProps) {
  const summary = getFoodComplianceSummary(product);

  if (!summary.isRawMilk && summary.allergens.length === 0) {
    return null;
  }

  if (variant === "compact") {
    return (
      <div className={`space-y-1.5 font-sans ${className}`.trim()}>
        {summary.isRawMilk && summary.rawMilkHeadline && summary.rawMilkDetail && (
          <div
            role="note"
            className="rounded-xl border border-bad/50 bg-bad/10 px-2.5 py-2 text-xs text-ink space-y-0.5"
          >
            <div className="flex items-center gap-1.5 font-bold tracking-tight text-ink">
              <AlertTriangle
                aria-hidden="true"
                className="w-3.5 h-3.5 text-bad shrink-0"
              />
              <span>{summary.rawMilkHeadline}</span>
            </div>
            <div className="text-[11px] leading-snug text-ink-muted font-medium pl-5">
              {summary.rawMilkDetail}
            </div>
          </div>
        )}

        {summary.allergens.length > 0 && (
          <div className="flex items-start gap-1.5 text-xs leading-snug text-ink-muted">
            <ShieldAlert
              aria-hidden="true"
              className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5"
            />
            <span>
              <strong className="font-semibold text-ink">Alerjen:</strong>{" "}
              {summary.allergens.join(", ")}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2.5 font-sans ${className}`.trim()}>
      {summary.isRawMilk && summary.rawMilkHeadline && summary.rawMilkDetail && (
        <div
          role="note"
          className="rounded-2xl border-2 border-bad/50 bg-bad/10 p-3.5 space-y-1.5 shadow-2xs"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-bad text-white text-[11px] font-mono font-bold uppercase tracking-wider">
              <AlertTriangle aria-hidden="true" className="w-3 h-3 shrink-0" />
              <span>TGK Tebliğ No: 2017/20</span>
            </span>
          </div>
          <div className="font-serif text-xs sm:text-sm font-bold text-ink leading-snug">
            {summary.rawMilkHeadline}
          </div>
          <p className="text-xs font-semibold text-ink-muted leading-snug">
            {summary.rawMilkDetail}
          </p>
        </div>
      )}

      {summary.allergens.length > 0 && (
        <div
          role="note"
          className="rounded-2xl bg-bg border border-line p-3.5 space-y-2 shadow-2xs"
        >
          <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-ink">
            <ShieldAlert
              aria-hidden="true"
              className="w-4 h-4 text-accent shrink-0"
            />
            <span>Alerjen Bildirimi (TGK Ek-1)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {summary.allergens.map((allergen) => (
              <span
                key={allergen}
                className="inline-flex items-center px-2.5 py-1 rounded-lg bg-cream-surface border border-line text-xs font-semibold text-ink"
              >
                {allergen}
              </span>
            ))}
          </div>
          <p className="text-xs text-ink-muted leading-relaxed">
            {summary.crossContactNote}
          </p>
        </div>
      )}
    </div>
  );
}
