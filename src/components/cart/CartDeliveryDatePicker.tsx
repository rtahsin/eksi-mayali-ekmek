"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { storefrontAction } from "@/lib/design/storefront";
import type { CartDateOption } from "@/types/settings";

export interface CartDeliveryDatePickerProps {
  dates: CartDateOption[];
  datesLoaded: boolean;
  datesError: string | null;
  selectedDate: string;
  unavailableReasons: string[];
  orderingBlockedReason: string | null;
  dateChange: string | null;
  onSelectDate: (date: string) => void;
  onReloadDates: () => void;
}

export function CartDeliveryDatePicker({
  dates,
  datesLoaded,
  datesError,
  selectedDate,
  unavailableReasons,
  orderingBlockedReason,
  dateChange,
  onSelectDate,
  onReloadDates,
}: CartDeliveryDatePickerProps) {
  const selectedOption = dates.find((d) => d.date === selectedDate);

  return (
    <>
      <div className="space-y-2">
        <div className="text-xs font-sans font-semibold text-ink uppercase tracking-wider flex items-center justify-between">
          <span>Teslim Günü</span>
        </div>

        {!datesLoaded ? (
          <div className="text-xs text-ink-muted flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uygun günler yükleniyor…
          </div>
        ) : datesError ? null : dates.length === 0 ? (
          <div className="sf-notice sf-warning">{orderingBlockedReason}</div>
        ) : (
          <>
            <fieldset id="checkout-dates" className="flex flex-wrap gap-1.5" aria-label="Teslim günü">
              <legend className="sr-only">Teslim günü</legend>
              {dates.map((d) => {
                const selected = d.available && selectedDate === d.date;
                return (
                  <label
                    key={d.date}
                    title={d.reason ?? undefined}
                    className={`sf-choice ${selected ? "sf-choice--selected" : ""} ${!d.available ? "sf-choice--disabled line-through" : ""}`}
                  >
                    <input
                      type="radio"
                      name="deliveryDate"
                      value={d.date}
                      checked={selected}
                      disabled={!d.available}
                      className="sr-only"
                      onChange={() => onSelectDate(d.date)}
                    />
                    {d.label}
                  </label>
                );
              })}
            </fieldset>
            {unavailableReasons.length > 0 && (
              <ul className="text-xs text-ink-muted space-y-0.5">
                {unavailableReasons.slice(0, 3).map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            )}
            {selectedOption &&
              selectedOption.remainingCapacity !== null &&
              selectedOption.remainingCapacity <= 10 && (
                <div className="text-xs text-ink font-semibold">
                  Bu gün için son {selectedOption.remainingCapacity} ekmeklik yer kaldı
                </div>
              )}
          </>
        )}
      </div>

      {dateChange && (
        <p role="status" className="sf-copy rounded-xl border border-line bg-cream-surface p-3 text-sm leading-relaxed text-ink">
          {dateChange}
        </p>
      )}
      {datesError && (
        <div role="alert" className="space-y-2 text-sm text-ink">
          <p>{datesError}</p>
          <button
            type="button"
            onClick={onReloadDates}
            className={storefrontAction({ variant: "secondary", size: "default", className: "" })}
          >
            Teslim günlerini yeniden yükle
          </button>
        </div>
      )}
    </>
  );
}
