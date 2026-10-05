import type { MicroEntityKind, MicroSnapshot } from "@/types/game";

/**
 * Lab Büyüteci'nin mikro dünyası: MicroSnapshot'tan hedef yoğunlukları çıkarır, varlıkları yavaşça o hedefe
 * taşır (bölünerek doğar, solarak ölür) ve canvas'a çizer. React'ten bağımsızdır.
 *
 * Ölçekler gerçekçi orandadır: maya ~5–8 µm oval, laktik bakteri ~1 × 3 µm çubuk, nişasta A-tanesi 15–35 µm.
 * Kabarcıklar yoktan var olmaz: başta yoğurmadan kalan birkaç "hava çekirdeği" vardır, yalnız onlar büyür.
 */

export const MICRO_COLORS = {
  bg: "#F3E6CC",
  bgWet: "#EED9B4",
  ink: "#3B1E1A",
  yeast: "#D9A441",
  lab: "#B4532A",
  pioneer: "#7A8450",
  enzyme: "#7B4B6A",
  starch: "#FBF6EC",
  gluten: "#8A5A3C",
  bubble: "#FFFDF7",
  acid: "#C0583A",
  co2: "#6E5148",
  salt: "#5B7A8C",
  carotene: "#F1D48A",
};

export type Magnification = "x100" | "x400" | "x1000";

/** Görünen boyut çarpanı (x400 = 1) */
export const MAG_SCALE: Record<Magnification, number> = { x100: 0.42, x400: 1, x1000: 2.1 };
/** Ölçek çubuğu: px başına µm yaklaşık; çubuğun temsil ettiği uzunluk */
export const SCALE_BAR: Record<Magnification, { um: number; px: number }> = {
  x100: { um: 50, px: 52 },
  x400: { um: 10, px: 25 },
  x1000: { um: 5, px: 26 },
};

type Mob = "yst" | "lacS" | "lacP" | "ent" | "amilaz" | "proteaz" | "fitaz" | "co2" | "maltoz" | "asit" | "tuz";

interface Entity {
  kind: Mob;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  /** doğum (0→1) ve ölüm (1→0) için görünürlük */
  life: number;
  dying: boolean;
  /** maya tomurcuğu / bakteri bölünme ilerlemesi */
  bud: number;
  seed: number;
}

interface Granule {
  x: number;
  y: number;
  r: number;
  big: boolean;
  rot: number;
  damaged: boolean;
  seed: number;
}

interface Node {
  x: number;
  y: number;
}

interface Bubble {
  x: number;
  y: number;
  r: number;
  seed: number;
}

interface Pop {
  x: number;
  y: number;
  t: number;
  color: string;
}

const rand = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** log10 KOB/g → ekranda kaç birey (log ölçek; görsel temsil, bire bir değil) */
function countFor(log: number, lo: number, hi: number, max: number) {
  return Math.round(clamp((log - lo) / (hi - lo)) * max);
}

export interface Targets {
  yst: number;
  lacS: number;
  lacP: number;
  ent: number;
  amilaz: number;
  proteaz: number;
  fitaz: number;
  co2: number;
  maltoz: number;
  asit: number;
  tuz: number;
}

export function targetsFor(s: MicroSnapshot, mag: Magnification, quality: number): Targets {
  const k = (mag === "x1000" ? 0.35 : mag === "x100" ? 0.6 : 1) * quality;
  const heat = s.heat;
  const alive = heat ? heat.yeastAlive : 1;
  const labAlive = heat ? heat.labAlive : 1;
  const mol = mag === "x1000" ? 1.4 : mag === "x100" ? 0.35 : 1;
  return {
    yst: Math.round(countFor(s.pop.yst, 4.5, 8, 13) * k * alive),
    lacS: Math.round(countFor(s.pop.lacS, 5.5, 9.6, 46) * k * labAlive),
    lacP: Math.round(countFor(s.pop.lacP, 5.5, 9.4, 30) * k * labAlive),
    ent: Math.round(countFor(s.pop.ent, 4.5, 9.2, 26) * k * labAlive),
    amilaz: Math.round(clamp(s.amylase * 1.4) * 9 * mol * quality),
    proteaz: Math.round(clamp(s.protease * 2.2) * 8 * mol * quality),
    fitaz: Math.round(clamp(s.phytase * 1.5) * 3 * mol * quality),
    co2: Math.round(clamp(s.dissolvedCO2) * 46 * mol * quality * (heat ? 0.3 : 1)),
    maltoz: Math.round(clamp(s.sugar) * 30 * mol * quality),
    asit: Math.round(clamp((6.2 - s.pH) / 2.6) * 40 * mol * quality),
    tuz: Math.round(clamp(s.salt / 1.2) * 18 * mol * quality),
  };
}

export class MicroWorld {
  w = 300;
  h = 300;
  mag: Magnification = "x400";
  granules: Granule[] = [];
  nodes: Node[] = [];
  edges: [number, number, number][] = [];
  bubbles: Bubble[] = [];
  ents: Entity[] = [];
  pops: Pop[] = [];
  /** gösterilen (yumuşatılmış) durum */
  view = {
    glutenDev: 0,
    glutenDamage: 0,
    glutenAlign: 0,
    gas: 0,
    water: 1,
    damaged: 0,
    gel: 0,
    set: 0,
    retro: 0,
    salt: 0,
    pH: 6.2,
  };
  matrix: MicroSnapshot["matrix"] = "bugday";
  snap: MicroSnapshot | null = null;
  quality = 1;
  t = 0;
  private seedCounter = 1;

  constructor(seed = 7) {
    this.seedCounter = seed;
  }

  resize(w: number, h: number, mag: Magnification) {
    const changed = Math.abs(w - this.w) > 2 || mag !== this.mag || this.granules.length === 0;
    this.w = w;
    this.h = h;
    this.mag = mag;
    if (changed) this.layout();
  }

  /** Sabit yapı: nişasta taneleri, ağ düğümleri, hava çekirdekleri */
  layout() {
    const r = rand(42);
    const s = MAG_SCALE[this.mag];
    const { w, h } = this;
    this.granules = [];
    const nBig = this.mag === "x100" ? 16 : this.mag === "x400" ? 5 : 2;
    const nSmall = this.mag === "x100" ? 30 : this.mag === "x400" ? 13 : 5;
    for (let i = 0; i < nBig; i++)
      this.granules.push({ x: r() * w, y: r() * h, r: (20 + r() * 14) * s, big: true, rot: r() * Math.PI, damaged: r() < 0.35, seed: i });
    for (let i = 0; i < nSmall; i++)
      this.granules.push({ x: r() * w, y: r() * h, r: (4 + r() * 4) * s, big: false, rot: 0, damaged: false, seed: 100 + i });
    // Ağ düğümleri: kafes + sapma
    this.nodes = [];
    const step = this.mag === "x100" ? 34 : this.mag === "x400" ? 46 : 70;
    for (let y = -step / 2; y < h + step; y += step * 0.86)
      for (let x = -step / 2; x < w + step; x += step) this.nodes.push({ x: x + (r() - 0.5) * step * 0.7, y: y + (r() - 0.5) * step * 0.6 });
    this.edges = [];
    for (let i = 0; i < this.nodes.length; i++)
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < step * 1.25) this.edges.push([i, j, r()]);
      }
    // Hava çekirdekleri (yoğurmadan)
    this.bubbles = [];
    const nb = this.mag === "x100" ? 9 : this.mag === "x400" ? 5 : 2;
    for (let i = 0; i < nb; i++) this.bubbles.push({ x: 20 + r() * (w - 40), y: 20 + r() * (h - 40), r: 2, seed: i });
  }

  setSnapshot(s: MicroSnapshot) {
    this.snap = s;
    this.matrix = s.matrix;
  }

  private spawn(kind: Mob, near?: Entity): Entity {
    const r = rand(this.seedCounter++ * 7919);
    const ang = r() * Math.PI * 2;
    const x = near ? near.x + Math.cos(ang) * 9 : r() * this.w;
    const y = near ? near.y + Math.sin(ang) * 9 : r() * this.h;
    const push = near ? 14 : 3;
    return { kind, x, y, vx: Math.cos(ang) * push, vy: Math.sin(ang) * push, rot: r() * Math.PI * 2, life: 0, dying: false, bud: near ? 0 : r(), seed: r() * 1000 };
  }

  step(dt: number, reduced: boolean) {
    const s = this.snap;
    if (!s) return;
    this.t += dt;
    const v = this.view;
    const ease = 1 - Math.exp(-dt * 2.2);
    v.glutenDev = lerp(v.glutenDev, s.glutenDev, ease);
    v.glutenDamage = lerp(v.glutenDamage, s.glutenDamage, ease);
    v.glutenAlign = lerp(v.glutenAlign, s.glutenAlign, ease);
    v.gas = lerp(v.gas, s.gas, ease);
    v.water = lerp(v.water, s.water, ease);
    v.damaged = lerp(v.damaged, s.damagedStarch, ease);
    v.gel = lerp(v.gel, s.heat?.starchGel ?? 0, ease);
    v.set = lerp(v.set, s.heat?.glutenSet ?? 0, ease);
    v.retro = lerp(v.retro, s.heat?.retro ?? 0, ease);
    v.salt = lerp(v.salt, s.salt, ease);
    v.pH = lerp(v.pH, s.pH, ease);

    // Hedef sayılara doğru doğum/ölüm (kare başına sınırlı → yumuşak)
    const tg = targetsFor(s, this.mag, this.quality);
    const kinds = Object.keys(tg) as Mob[];
    for (const k of kinds) {
      const live = this.ents.filter((e) => e.kind === k && !e.dying);
      const diff = tg[k] - live.length;
      if (diff > 0) {
        const n = Math.min(diff, k === "yst" || k === "lacS" || k === "lacP" || k === "ent" ? 1 : 3);
        for (let i = 0; i < n; i++) {
          // Canlılar bölünerek doğar: mevcut bir bireyin yanında
          // Bazıları bir bireyin yanında bölünerek doğar (görünür bölünme), çoğu ekrana dağılır
          const isCell = k === "yst" || k === "lacS" || k === "lacP" || k === "ent";
          const parent = isCell && live.length > 0 && this.seedCounter % 4 === 0 ? live[(this.seedCounter * 13) % live.length] : undefined;
          if (parent) parent.bud = 0;
          this.ents.push(this.spawn(k, parent));
        }
      } else if (diff < 0) {
        for (let i = 0; i < Math.min(-diff, 2); i++) {
          const e = live[i];
          e.dying = true;
          if (s.heat && (k === "yst" || k === "lacS" || k === "lacP" || k === "ent") && !reduced)
            this.pops.push({ x: e.x, y: e.y, t: 0, color: k === "yst" ? MICRO_COLORS.yeast : MICRO_COLORS.lab });
        }
      }
    }

    // Hareket: Brown hareketi; ağ donunca ve fırında yavaşlar
    const calm = (reduced ? 0.35 : 1) * (1 - 0.85 * v.set);
    const dissolvedHigh = s.dissolvedCO2 > 0.85;
    for (const e of this.ents) {
      const r = Math.sin(this.t * 1.3 + e.seed) * 0.5 + Math.cos(this.t * 0.7 + e.seed * 1.7) * 0.5;
      e.vx += (Math.sin(this.t * 2 + e.seed) * 8 - e.vx * 0.8) * dt;
      e.vy += (Math.cos(this.t * 1.7 + e.seed * 0.3) * 8 - e.vy * 0.8) * dt;
      if (e.kind === "co2" && dissolvedHigh && this.bubbles.length) {
        const b = this.bubbles[Math.floor(e.seed) % this.bubbles.length];
        e.vx += (b.x - e.x) * 0.6 * dt;
        e.vy += (b.y - e.y) * 0.6 * dt;
        if (Math.hypot(b.x - e.x, b.y - e.y) < b.r) e.dying = true;
      }
      const speed = e.kind === "yst" ? 0.35 : e.kind === "maltoz" || e.kind === "co2" || e.kind === "asit" || e.kind === "tuz" ? 1.6 : 0.8;
      e.x += e.vx * dt * speed * calm;
      e.y += e.vy * dt * speed * calm;
      e.rot += r * dt * 0.4 * calm;
      if (e.x < -10) e.x += this.w + 20;
      if (e.x > this.w + 10) e.x -= this.w + 20;
      if (e.y < -10) e.y += this.h + 20;
      if (e.y > this.h + 10) e.y -= this.h + 20;
      e.life = clamp(e.life + (e.dying ? -dt * 1.6 : dt * 1.2));
      e.bud = Math.min(1, e.bud + dt * 0.25);
    }
    this.ents = this.ents.filter((e) => !(e.dying && e.life <= 0));
    for (const p of this.pops) p.t += dt;
    this.pops = this.pops.filter((p) => p.t < 0.8);

    // Kabarcıklar: hava çekirdekleri gazla büyür
    const sc = MAG_SCALE[this.mag];
    for (const b of this.bubbles) {
      const target = (2 + clamp(v.gas, 0, 2.5) * (10 + (b.seed % 3) * 6)) * sc * (1 + 0.25 * v.gel);
      b.r = lerp(b.r, target, ease);
    }
  }

  /** Dokunulan noktadaki varlık */
  hit(x: number, y: number): MicroEntityKind | null {
    let best: { k: MicroEntityKind; d: number } | null = null;
    const consider = (k: MicroEntityKind, d: number, rad: number) => {
      if (d < rad && (!best || d < best.d)) best = { k, d };
    };
    for (const e of this.ents) {
      if (e.life < 0.3) continue;
      const k: MicroEntityKind = e.kind === "co2" ? "co2" : e.kind === "maltoz" ? "maltoz" : e.kind === "asit" ? "asit" : e.kind;
      consider(k, Math.hypot(e.x - x, e.y - y), e.kind === "yst" ? 16 : 12);
    }
    for (const b of this.bubbles) consider("kabarcik", Math.max(0, Math.hypot(b.x - x, b.y - y) - b.r), 8);
    for (const g of this.granules) consider("nisasta", Math.max(0, Math.hypot(g.x - x, g.y - y) - g.r * 0.9), 6);
    if (!best) {
      // Ağ (ya da çavdarda pentozan) zemin gibi her yerde
      if (this.matrix === "cavdar") return "pentozan";
      if (this.view.glutenDev > 0.15) return "gluten";
      return null;
    }
    return (best as { k: MicroEntityKind }).k;
  }

  draw(ctx: CanvasRenderingContext2D, focus: MicroEntityKind[] | undefined) {
    const { w, h } = this;
    const v = this.view;
    const C = MICRO_COLORS;
    const sc = MAG_SCALE[this.mag];
    const dim = (k: MicroEntityKind) => (focus && focus.length && !focus.includes(k) ? 0.25 : 1);

    // Zemin: su arttıkça yumuşak, ıslak ton; siyez karotenoid sarısı
    ctx.fillStyle = this.matrix === "siyez" ? "#F2DFAE" : v.water < 0.6 ? C.bg : C.bgWet;
    ctx.fillRect(0, 0, w, h);
    if (v.gel > 0.05) {
      ctx.fillStyle = `rgba(250, 240, 215, ${0.5 * v.gel})`;
      ctx.fillRect(0, 0, w, h);
    }

    // 1) Nişasta taneleri
    for (const g of this.granules) {
      ctx.save();
      ctx.globalAlpha = dim("nisasta");
      ctx.translate(g.x, g.y);
      ctx.rotate(g.rot);
      const swell = 1 + 0.35 * v.gel;
      const rx = g.r * swell;
      const ry = (g.big ? g.r * 0.72 : g.r) * swell;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = v.gel > 0.5 ? "rgba(251,246,236,0.75)" : C.starch;
      ctx.fill();
      ctx.lineWidth = Math.max(0.8, 1.3 * sc);
      ctx.strokeStyle = C.ink;
      ctx.globalAlpha *= 1 - 0.6 * v.gel;
      if (g.damaged && v.damaged > 0.05) ctx.setLineDash([3 * sc, 2 * sc]);
      ctx.stroke();
      ctx.setLineDash([]);
      // Büyüme halkaları (jelleşince kaybolur)
      if (g.big && v.gel < 0.8) {
        ctx.globalAlpha = dim("nisasta") * 0.45 * (1 - v.gel);
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.ellipse(-rx * 0.08, 0, rx * (i / 4), ry * (i / 4), 0, 0, Math.PI * 2);
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
      // Hasarlı tane: çatlak
      if (g.damaged && v.damaged > 0.05 && v.gel < 0.5) {
        ctx.globalAlpha = dim("nisasta") * 0.8;
        ctx.beginPath();
        ctx.moveTo(-rx * 0.5, -ry * 0.1);
        ctx.lineTo(-rx * 0.1, ry * 0.15);
        ctx.lineTo(rx * 0.3, -ry * 0.2);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // Retrogradasyon: ince kristal tarama
      if (v.retro > 0.05) {
        ctx.globalAlpha = 0.35 * v.retro;
        for (let i = -3; i <= 3; i++) {
          ctx.beginPath();
          ctx.moveTo(i * rx * 0.25, -ry * 0.7);
          ctx.lineTo(i * rx * 0.25 + rx * 0.2, ry * 0.7);
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 2) Ağ: buğday/siyezde gluten, çavdarda pentozan jeli
    const wob = (1 - v.set) * (1 - 0.6 * v.glutenAlign);
    if (this.matrix === "cavdar") {
      ctx.save();
      ctx.globalAlpha = dim("pentozan");
      for (let i = 0; i < this.nodes.length; i += 2) {
        const n = this.nodes[i];
        const len = 18 * Math.max(0.6, sc);
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.lineWidth = 7 * sc;
        ctx.beginPath();
        ctx.moveTo(n.x - len, n.y);
        ctx.lineTo(n.x + len, n.y);
        ctx.stroke();
        ctx.strokeStyle = C.gluten;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(n.x - len, n.y);
        ctx.lineTo(n.x + len, n.y);
        for (let b = -2; b <= 2; b++) {
          const bx = n.x + (b * len) / 2.5;
          const dir = b % 2 === 0 ? 1 : -1;
          ctx.moveTo(bx, n.y);
          ctx.lineTo(bx + 5 * sc, n.y + dir * 8 * sc);
        }
        ctx.stroke();
      }
      ctx.restore();
    } else {
      const shown = clamp(v.glutenDev) * (this.matrix === "siyez" ? 0.7 : 1);
      ctx.save();
      ctx.globalAlpha = dim("gluten");
      ctx.strokeStyle = v.set > 0.5 ? "#5C3A26" : C.gluten;
      ctx.lineCap = "round";
      for (const [i, j, r] of this.edges) {
        if (r > shown) continue;
        const a = this.nodes[i];
        const b = this.nodes[j];
        // Hizalanma: yatay bağlar öne çıkar, dikeyler incelir
        const horiz = Math.abs(a.x - b.x) / (Math.hypot(a.x - b.x, a.y - b.y) + 1e-6);
        const al = 0.4 + 0.6 * (v.glutenAlign * horiz + (1 - v.glutenAlign) * 0.7);
        const width = (0.6 + 1.6 * shown * al + 0.5 * v.salt) * Math.max(0.7, sc) * (this.matrix === "siyez" ? 0.7 : 1);
        const mx = (a.x + b.x) / 2 + Math.sin(this.t * 1.1 + r * 20) * 6 * wob;
        const my = (a.y + b.y) / 2 + Math.cos(this.t * 0.9 + r * 30) * 6 * wob;
        ctx.lineWidth = width;
        // Proteaz/asit hasarı: bağlar kırılır
        if (v.glutenDamage > 0.15 && r < v.glutenDamage * 0.8) ctx.setLineDash([4, 5 + 10 * v.glutenDamage]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(mx, my, b.x, b.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    // 3) Kabarcıklar
    for (const b of this.bubbles) {
      ctx.save();
      ctx.globalAlpha = dim("kabarcik");
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = C.bubble;
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fill();
      ctx.restore();
    }

    // 4) Moleküller ve enzimler, 5) canlılar
    const order: Mob[] = ["asit", "tuz", "co2", "maltoz", "fitaz", "amilaz", "proteaz", "ent", "lacP", "lacS", "yst"];
    for (const kind of order) {
      for (const e of this.ents) {
        if (e.kind !== kind) continue;
        ctx.save();
        ctx.globalAlpha = e.life * dim(kind as MicroEntityKind);
        ctx.translate(e.x, e.y);
        ctx.rotate(e.rot);
        drawEntity(ctx, e, sc, this.t);
        ctx.restore();
      }
    }

    // Fırında ölen canlıların "pat"ı
    for (const p of this.pops) {
      ctx.save();
      ctx.globalAlpha = 1 - p.t / 0.8;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const r0 = 3 + p.t * 18;
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(a) * r0, p.y + Math.sin(a) * r0);
        ctx.lineTo(p.x + Math.cos(a) * (r0 + 4), p.y + Math.sin(a) * (r0 + 4));
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

function drawEntity(ctx: CanvasRenderingContext2D, e: Entity, sc: number, t: number) {
  const C = MICRO_COLORS;
  const ink = C.ink;
  switch (e.kind) {
    case "yst": {
      // Maya: oval hücre, tomurcuk ve tomurcuk izi
      const rx = 7.5 * sc;
      const ry = 5.6 * sc;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.yeast;
      ctx.fill();
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = ink;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(-rx * 0.15, -ry * 0.1, rx * 0.35, ry * 0.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,240,200,0.6)";
      ctx.fill();
      if (e.bud < 1) {
        const br = rx * 0.55 * e.bud;
        ctx.beginPath();
        ctx.ellipse(rx + br * 0.6, 0, br, br * 0.8, 0, 0, Math.PI * 2);
        ctx.fillStyle = C.yeast;
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(rx * 0.55, ry * 0.35, 1.4 * sc, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case "lacS": {
      // Ekşi maya uzmanı LAB: zincir halinde çubuklar
      const L = 7 * sc;
      const W = 2.4 * sc;
      for (let i = -1; i <= (e.seed % 3 > 1 ? 1 : 0); i++) {
        ctx.beginPath();
        roundRect(ctx, i * (L + 1.5) - L / 2, -W / 2, L * (i === 1 ? 0.5 + 0.5 * e.bud : 1), W, W / 2);
        ctx.fillStyle = C.lab;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = ink;
        ctx.stroke();
      }
      break;
    }
    case "lacP": {
      // Öncü LAB (Leuconostoc/Weissella): kok çiftleri ve kısa zincirler
      const r = 2.2 * sc;
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.arc(i * r * 2.1 - r, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = "#C27A4E";
        ctx.fill();
        ctx.lineWidth = 0.9;
        ctx.strokeStyle = ink;
        ctx.stroke();
      }
      break;
    }
    case "ent": {
      // Enterobakteri: kısa çubuk + kamçılar
      const L = 5.5 * sc;
      const W = 2.6 * sc;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 0.6;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-L / 2, (i - 1) * W * 0.3);
        for (let s = 1; s <= 6; s++) ctx.lineTo(-L / 2 - s * 2 * sc, (i - 1) * W * 0.3 + Math.sin(t * 10 + s + e.seed) * 1.5 * sc);
        ctx.stroke();
      }
      ctx.beginPath();
      roundRect(ctx, -L / 2, -W / 2, L, W, W / 2);
      ctx.fillStyle = C.pioneer;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.stroke();
      break;
    }
    case "amilaz":
    case "proteaz":
    case "fitaz": {
      // Enzim: ağzı açılıp kapanan küçük makas (amilaz), dişli ağız (proteaz)
      const r = (e.kind === "fitaz" ? 3 : 3.8) * Math.max(0.8, sc);
      const open = 0.25 + 0.35 * Math.abs(Math.sin(t * 6 + e.seed));
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, open, Math.PI * 2 - open);
      ctx.closePath();
      ctx.fillStyle = e.kind === "fitaz" ? "#9A6C88" : C.enzyme;
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = ink;
      ctx.stroke();
      if (e.kind === "proteaz") {
        ctx.beginPath();
        ctx.moveTo(r * 0.6, -r * 0.3);
        ctx.lineTo(r * 0.9, 0);
        ctx.lineTo(r * 0.6, r * 0.3);
        ctx.stroke();
      }
      break;
    }
    case "maltoz": {
      // Maltoz: iki bağlı altıgen (iki glukoz)
      const r = 1.9 * Math.max(0.8, sc);
      ctx.strokeStyle = "#8A6A2E";
      ctx.lineWidth = 0.8;
      for (const dx of [-r * 1.05, r * 1.05]) {
        ctx.beginPath();
        for (let i = 0; i <= 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const x = dx + Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    }
    case "co2": {
      ctx.beginPath();
      ctx.arc(0, 0, 1.1 * Math.max(0.8, sc), 0, Math.PI * 2);
      ctx.fillStyle = C.co2;
      ctx.fill();
      break;
    }
    case "asit": {
      ctx.fillStyle = C.acid;
      ctx.font = `bold ${Math.round(6 * Math.max(0.9, sc))}px system-ui`;
      ctx.fillText("H⁺", -3, 2);
      break;
    }
    case "tuz": {
      ctx.beginPath();
      ctx.arc(0, 0, 1.4 * Math.max(0.8, sc), 0, Math.PI * 2);
      ctx.fillStyle = (e.seed | 0) % 2 ? C.salt : "#8FA9B5";
      ctx.fill();
      break;
    }
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
}

/** Varlıkların Türkçe adları (dokununca etiket) */
export const ENTITY_LABEL: Record<MicroEntityKind, string> = {
  ent: "Enterobakteri",
  lacP: "Öncü laktik bakteri",
  lacS: "Ekşi maya bakterisi",
  yst: "Maya hücresi",
  nisasta: "Nişasta tanesi",
  gluten: "Gluten ağı",
  amilaz: "Amilaz",
  proteaz: "Proteaz",
  fitaz: "Fitaz",
  kabarcik: "Gaz kabarcığı",
  co2: "Çözünmüş CO₂",
  maltoz: "Maltoz",
  asit: "Asit (H⁺)",
  tuz: "Tuz iyonu",
  pentozan: "Pentozan jeli",
};
