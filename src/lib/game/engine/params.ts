import type { FlourKind, Guild, Matrix, StarterSpot, Param } from "@/types/game";

/**
 * Simülasyon sabitleri (MIMARI §2.5 / P1-05).
 * Her sabit ya bir literatür iddiasına (`claim`) ya da kalibrasyon testine (`fitted`) bağlıdır.
 */

export const PARAMS: Record<string, Param> = {
  // ── Enterobakteriler ──
  ent_muOpt: { value: 1.1, fitted: "kinetics.ts" },
  ent_Tmin: { value: 5, fitted: "kinetics.ts" },
  ent_Topt: { value: 37, fitted: "kinetics.ts" },
  ent_Tmax: { value: 46, fitted: "kinetics.ts" },
  ent_pHmin: { value: 4.5, fitted: "starter.ts" },
  ent_pHopt: { value: 6.3, fitted: "starter.ts" },
  ent_maxLog: { value: 9.0, fitted: "starter.ts" },
  ent_gas: { value: 1.3, fitted: "starter.ts" },
  ent_acid: { value: 2.5, fitted: "starter.ts" },
  ent_aceticShare: { value: 0.45, fitted: "starter.ts" },
  ent_sugarUse: { value: 0.5, fitted: "starter.ts" },
  ent_acidDeath: { value: 0.55, fitted: "starter.ts" },

  // ── Öncü Laktik Asit Bakterileri (Leuconostoc, Weissella) ──
  lacP_muOpt: { value: 0.7, fitted: "kinetics.ts" },
  lacP_Tmin: { value: 2, fitted: "kinetics.ts" },
  lacP_Topt: { value: 28, fitted: "kinetics.ts" },
  lacP_Tmax: { value: 38, fitted: "kinetics.ts" },
  lacP_pHmin: { value: 4.1, fitted: "starter.ts" },
  lacP_pHopt: { value: 6.2, fitted: "starter.ts" },
  lacP_maxLog: { value: 9.2, fitted: "starter.ts" },
  lacP_gas: { value: 0.06, fitted: "starter.ts" },
  lacP_acid: { value: 3.0, fitted: "starter.ts" },
  lacP_aceticShare: { value: 0.3, fitted: "starter.ts" },
  lacP_sugarUse: { value: 0.5, fitted: "starter.ts" },
  lacP_acidDeath: { value: 0.3, fitted: "starter.ts" },

  // ── Fructilactobacillus sanfranciscensis ──
  lacS_muOpt: { value: 0.62, fitted: "kinetics.ts" },
  lacS_Tmin: { value: 3, fitted: "kinetics.ts" },
  lacS_Topt: { value: 33, claim: "claim_f_sanfran_growth" },
  lacS_Tmax: { value: 41, claim: "claim_f_sanfran_growth" },
  lacS_pHmin: { value: 3.55, fitted: "starter.ts" },
  lacS_pHopt: { value: 5.6, fitted: "starter.ts" },
  lacS_maxLog: { value: 9.5, fitted: "starter.ts" },
  lacS_gas: { value: 0.05, fitted: "starter.ts" },
  lacS_acid: { value: 1.5, fitted: "starter.ts" },
  lacS_aceticShare: { value: 0.22, fitted: "starter.ts" },
  lacS_sugarUse: { value: 0.27, fitted: "starter.ts" },
  lacS_acidDeath: { value: 0.08, fitted: "starter.ts" },

  // ── Maya (Kazachstania humilis / Saccharomyces cerevisiae) ──
  yst_muOpt: { value: 0.23, fitted: "kinetics.ts" },
  yst_Tmin: { value: 6, fitted: "kinetics.ts" },
  yst_Topt: { value: 27, fitted: "kinetics.ts" },
  yst_Tmax: { value: 36, fitted: "kinetics.ts" },
  yst_pHmin: { value: 2.8, fitted: "starter.ts" },
  yst_pHopt: { value: 4.5, fitted: "starter.ts" },
  yst_maxLog: { value: 7.8, fitted: "starter.ts" },
  yst_gas: { value: 3.2, fitted: "starter.ts" },
  yst_acid: { value: 0, fitted: "starter.ts" },
  yst_aceticShare: { value: 0, fitted: "starter.ts" },
  yst_sugarUse: { value: 0.45, fitted: "starter.ts" },
  yst_acidDeath: { value: 0.05, fitted: "starter.ts" },

  // ── Hamur Matrisi ve Nişasta Jelleşmesi ──
  bugday_gelStart: { value: 60, claim: "claim_starch_gelatinization" },
  bugday_gelEnd: { value: 80, claim: "claim_starch_gelatinization" },
  bugday_amylaseOff: { value: 84, claim: "claim_amylase_activity" },
  bugday_glutenCapacity: { value: 1, fitted: "bake.ts" },
  bugday_glutenRobust: { value: 1, fitted: "bake.ts" },
  bugday_ovenAmylase: { value: 0.35, fitted: "bake.ts" },
  bugday_fermentBoost: { value: 1, fitted: "bake.ts" },
  bugday_buffer: { value: 0.8, fitted: "bake.ts" },

  siyez_gelStart: { value: 60, claim: "claim_starch_gelatinization" },
  siyez_gelEnd: { value: 80, claim: "claim_starch_gelatinization" },
  siyez_amylaseOff: { value: 84, claim: "claim_amylase_activity" },
  siyez_glutenCapacity: { value: 0.66, fitted: "bake.ts" },
  siyez_glutenRobust: { value: 0.7, fitted: "bake.ts" },
  siyez_ovenAmylase: { value: 0.4, fitted: "bake.ts" },
  siyez_fermentBoost: { value: 1.12, fitted: "bake.ts" },
  siyez_buffer: { value: 0.85, fitted: "bake.ts" },

  cavdar_gelStart: { value: 52, fitted: "rye.ts" },
  cavdar_gelEnd: { value: 70, fitted: "rye.ts" },
  cavdar_amylaseOff: { value: 90, fitted: "rye.ts" },
  cavdar_glutenCapacity: { value: 0.12, fitted: "rye.ts" },
  cavdar_glutenRobust: { value: 0.5, fitted: "rye.ts" },
  cavdar_ovenAmylase: { value: 1, fitted: "rye.ts" },
  cavdar_fermentBoost: { value: 1.1, fitted: "rye.ts" },
  cavdar_buffer: { value: 0.8, fitted: "rye.ts" },

  // ── Asit ve Tampon Sabitleri ──
  pka_lactic: { value: 3.86, fitted: "kinetics.ts" },
  pka_acetic: { value: 4.76, fitted: "kinetics.ts" },
  ph_flour: { value: 6.2, fitted: "kinetics.ts" },
  ph_floor: { value: 3.35, fitted: "kinetics.ts" },
};

export interface GuildParams {
  muOpt: number;
  Tmin: number;
  Topt: number;
  Tmax: number;
  pHmin: number;
  pHopt: number;
  maxLog: number;
  gas: number;
  acid: number;
  aceticShare: number;
  sugarUse: number;
  acidDeath: number;
}

export const GUILDS: Record<Guild, GuildParams> = {
  ent: {
    muOpt: PARAMS.ent_muOpt.value,
    Tmin: PARAMS.ent_Tmin.value,
    Topt: PARAMS.ent_Topt.value,
    Tmax: PARAMS.ent_Tmax.value,
    pHmin: PARAMS.ent_pHmin.value,
    pHopt: PARAMS.ent_pHopt.value,
    maxLog: PARAMS.ent_maxLog.value,
    gas: PARAMS.ent_gas.value,
    acid: PARAMS.ent_acid.value,
    aceticShare: PARAMS.ent_aceticShare.value,
    sugarUse: PARAMS.ent_sugarUse.value,
    acidDeath: PARAMS.ent_acidDeath.value,
  },
  lacP: {
    muOpt: PARAMS.lacP_muOpt.value,
    Tmin: PARAMS.lacP_Tmin.value,
    Topt: PARAMS.lacP_Topt.value,
    Tmax: PARAMS.lacP_Tmax.value,
    pHmin: PARAMS.lacP_pHmin.value,
    pHopt: PARAMS.lacP_pHopt.value,
    maxLog: PARAMS.lacP_maxLog.value,
    gas: PARAMS.lacP_gas.value,
    acid: PARAMS.lacP_acid.value,
    aceticShare: PARAMS.lacP_aceticShare.value,
    sugarUse: PARAMS.lacP_sugarUse.value,
    acidDeath: PARAMS.lacP_acidDeath.value,
  },
  lacS: {
    muOpt: PARAMS.lacS_muOpt.value,
    Tmin: PARAMS.lacS_Tmin.value,
    Topt: PARAMS.lacS_Topt.value,
    Tmax: PARAMS.lacS_Tmax.value,
    pHmin: PARAMS.lacS_pHmin.value,
    pHopt: PARAMS.lacS_pHopt.value,
    maxLog: PARAMS.lacS_maxLog.value,
    gas: PARAMS.lacS_gas.value,
    acid: PARAMS.lacS_acid.value,
    aceticShare: PARAMS.lacS_aceticShare.value,
    sugarUse: PARAMS.lacS_sugarUse.value,
    acidDeath: PARAMS.lacS_acidDeath.value,
  },
  yst: {
    muOpt: PARAMS.yst_muOpt.value,
    Tmin: PARAMS.yst_Tmin.value,
    Topt: PARAMS.yst_Topt.value,
    Tmax: PARAMS.yst_Tmax.value,
    pHmin: PARAMS.yst_pHmin.value,
    pHopt: PARAMS.yst_pHopt.value,
    maxLog: PARAMS.yst_maxLog.value,
    gas: PARAMS.yst_gas.value,
    acid: PARAMS.yst_acid.value,
    aceticShare: PARAMS.yst_aceticShare.value,
    sugarUse: PARAMS.yst_sugarUse.value,
    acidDeath: PARAMS.yst_acidDeath.value,
  },
};

export const DOUGH_YEAST: GuildParams = { ...GUILDS.yst, muOpt: 0.28, Topt: 34, Tmax: 42 };

export interface FlourParams {
  label: string;
  inoculum: Record<Guild, number>;
  sugar: number;
  damagedStarch: number;
  amylase: number;
  buffer: number;
  nutrients: number;
}

export const FLOURS: Record<FlourKind, FlourParams> = {
  beyaz: {
    label: "Beyaz un",
    inoculum: { ent: 3.6, lacP: 3.0, lacS: 0.3, yst: 1.6 },
    sugar: 12,
    damagedStarch: 55,
    amylase: 0.9,
    buffer: 1.0,
    nutrients: 0.9,
  },
  tam_bugday: {
    label: "Tam buğday",
    inoculum: { ent: 4.6, lacP: 4.0, lacS: 0.8, yst: 1.8 },
    sugar: 15,
    damagedStarch: 60,
    amylase: 1.0,
    buffer: 1.3,
    nutrients: 1.0,
  },
  tam_cavdar: {
    label: "Tam çavdar",
    inoculum: { ent: 5.0, lacP: 4.4, lacS: 1.2, yst: 2.2 },
    sugar: 22,
    damagedStarch: 60,
    amylase: 1.5,
    buffer: 1.45,
    nutrients: 1.15,
  },
};

export const SPOT_TEMP: Record<StarterSpot, number> = { serin: 18, tezgah: 24, ilik: 28 };

export interface MatrixParams {
  glutenCapacity: number;
  glutenRobust: number;
  gelStart: number;
  gelEnd: number;
  amylaseOff: number;
  ovenAmylase: number;
  fermentBoost: number;
  buffer: number;
}

export const MATRIX: Record<Matrix, MatrixParams> = {
  bugday: {
    glutenCapacity: PARAMS.bugday_glutenCapacity.value,
    glutenRobust: PARAMS.bugday_glutenRobust.value,
    gelStart: PARAMS.bugday_gelStart.value,
    gelEnd: PARAMS.bugday_gelEnd.value,
    amylaseOff: PARAMS.bugday_amylaseOff.value,
    ovenAmylase: PARAMS.bugday_ovenAmylase.value,
    fermentBoost: PARAMS.bugday_fermentBoost.value,
    buffer: PARAMS.bugday_buffer.value,
  },
  siyez: {
    glutenCapacity: PARAMS.siyez_glutenCapacity.value,
    glutenRobust: PARAMS.siyez_glutenRobust.value,
    gelStart: PARAMS.siyez_gelStart.value,
    gelEnd: PARAMS.siyez_gelEnd.value,
    amylaseOff: PARAMS.siyez_amylaseOff.value,
    ovenAmylase: PARAMS.siyez_ovenAmylase.value,
    fermentBoost: PARAMS.siyez_fermentBoost.value,
    buffer: PARAMS.siyez_buffer.value,
  },
  cavdar: {
    glutenCapacity: PARAMS.cavdar_glutenCapacity.value,
    glutenRobust: PARAMS.cavdar_glutenRobust.value,
    gelStart: PARAMS.cavdar_gelStart.value,
    gelEnd: PARAMS.cavdar_gelEnd.value,
    amylaseOff: PARAMS.cavdar_amylaseOff.value,
    ovenAmylase: PARAMS.cavdar_ovenAmylase.value,
    fermentBoost: PARAMS.cavdar_fermentBoost.value,
    buffer: PARAMS.cavdar_buffer.value,
  },
};

export const PKA_LACTIC = PARAMS.pka_lactic.value;
export const PKA_ACETIC = PARAMS.pka_acetic.value;
export const PH_FLOUR = PARAMS.ph_flour.value;
export const PH_FLOOR = PARAMS.ph_floor.value;

export const FLOUR_GRAMS = 4000;
export const ROOM_TEMP_C = 24;
export const FLOUR_TEMP_C = 22;
export const LEVAIN_TEMP_C = 24;
export const FRIDGE_C = 4;
export const FRIDGE_HOURS = 12;
