"use client";

import React, { useState } from "react";
import type { CardKind, CodexCard } from "@/types/game";
import { CARDS, KIND_LABEL } from "@/lib/game/content/cards";
import { CardArt } from "./CardArt";
import { CardSheet } from "./CardSheet";

const C = { paper: "#F6EEDF", card: "#FBF6EC", ink: "#3B1E1A", soft: "#6E5148", line: "#E2D3BD", accent: "#B4532A" };

/** Laboratuvar Defteri: canlılar, moleküller, olaylar, efsaneler, tarih */
export function Codex({ unlocked, sezgi, onClose }: { unlocked: Set<string>; sezgi: { right: number; total: number }; onClose: () => void }) {
  const [tab, setTab] = useState<CardKind>("canli");
  const [open, setOpen] = useState<CodexCard | null>(null);
  const kinds = Object.keys(KIND_LABEL) as CardKind[];
  const list = CARDS.filter((c) => c.kind === tab);
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto" style={{ background: C.paper, color: C.ink }}>
      <div className="max-w-md mx-auto px-5 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-fraunces)" }}>
            Laboratuvar defteri
          </h2>
          <button type="button" onClick={onClose} className="text-3xl px-3" aria-label="Kapat">
            ×
          </button>
        </div>
        <p className="text-sm" style={{ color: C.soft }}>
          {unlocked.size} / {CARDS.length} kart · Sezgi {sezgi.right}/{sezgi.total}. Kartlar büyüteçte canlılara dokununca, tahminlerle ve
          bölümlerle açılır; ★ olanları çoğu usta bile bilmez.
        </p>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {kinds.map((k) => {
            const n = CARDS.filter((c) => c.kind === k);
            const got = n.filter((c) => unlocked.has(c.id)).length;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className="shrink-0 px-3 py-1.5 rounded-full text-sm font-bold border"
                style={{ borderColor: C.ink, background: tab === k ? C.ink : "transparent", color: tab === k ? C.paper : C.ink }}
              >
                {KIND_LABEL[k]} {got}/{n.length}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {list.map((c) => {
            const has = unlocked.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                disabled={!has}
                onClick={() => setOpen(c)}
                className="rounded-2xl border p-3 text-left space-y-1.5 min-h-[132px]"
                style={{ borderColor: has ? C.ink : C.line, background: has ? C.card : "transparent", borderStyle: has ? "solid" : "dashed" }}
              >
                <CardArt art={c.art} size={48} locked={!has} />
                <div className="text-sm font-semibold leading-tight" style={{ color: has ? C.ink : C.soft }}>
                  {has ? (c.rare ? "★ " : "") + (c.nick ?? c.name) : "???"}
                </div>
                {has && c.latin && (
                  <div className="text-xs italic leading-tight" style={{ color: C.soft }}>
                    {c.latin}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {open && <CardSheet card={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
