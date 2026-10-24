import { describe, expect, it } from "vitest";
import { getAn, resolveAtif } from "@/lib/bilim/server";
import { DERGI_AN, SOGUMA as S, tr } from "./veri";

// Grafiklerdeki her sayı, bağlı olduğu bilginin metninde aynen geçer; bilgi anın metninde atıflıdır.
function metin(id: string): string {
  const a = resolveAtif(id);
  if (!a || a.tur !== "bilgi") throw new Error(`bilgi yok: ${id}`);
  return a.bilgi.metin;
}

const BEKLENEN: [string, string[]][] = [
  [S.taze.bilgi, [tr(S.taze.ic), tr(S.taze.kabuk, 1)]],
  [S.sogumus.bilgi, [`%${S.sogumus.ic.join("–")}`, `%${S.sogumus.kabuk.join("–")}`]],
  [S.firin.bilgi, [`${S.firin.sicaklik[0]}, ${S.firin.sicaklik[1]} ve ${S.firin.sicaklik[2]} °C`, `%${S.firin.kayip[0]}, ${S.firin.kayip[1]} ve ${S.firin.kayip[2]}'`]],
  [S.merkez.bilgi, [`${S.merkez.sicaklik} °C`, `%${tr(S.merkez.artis)}`]],
  [S.kaynama.bilgi, [`${S.kaynama.sicaklik} °C`]],
  [S.esik.erken.bilgi, [`${S.esik.erken.sicaklik} °C`, S.esik.erken.kim]],
  [S.esik.gec.bilgi, [`${S.esik.gec.sicaklik} ± ${S.esik.gec.pay} °C`, S.esik.gec.kim]],
  [S.torba.bilgi, [`${S.torba.sicaklik} °C`, `%${S.torba.bagilNem}`, ...S.torba.olcum.flatMap(([g, k]) => [`${g}. günde`, `%${tr(k)}`])]],
  [S.nmr.bilgi, [`${S.nmr.gun} gün`, `%${S.nmr.suProtein.once.join("–")}`, `%${S.nmr.suProtein.sonra.map((x) => tr(x)).join("–")}`, `%${S.nmr.nisasta.once.join("–")}`, `%${S.nmr.nisasta.sonra.join("–")}`]],
  [S.sogutma.bilgi, [`yüzde ${S.sogutma.konvansiyonel.join("–")}`, `yüzde ${S.sogutma.vakum}`]],
];

describe("dergi taslağı: soğuma anı grafikleri", () => {
  it("her sayı bilginin metninde geçer", () => {
    const eksik = BEKLENEN.flatMap(([id, parcalar]) => parcalar.filter((p) => !metin(id).includes(p)).map((p) => `${id}: ${p}`));
    expect(eksik).toEqual([]);
  });

  it("grafiklerin bilgileri anın metninde atıflı", () => {
    const an = getAn(DERGI_AN);
    const govde = JSON.stringify([an.gor, an.anla, an.yuzlesme]);
    expect(BEKLENEN.map(([id]) => id).filter((id) => !govde.includes(`[[${id}]]`))).toEqual([]);
  });
});
