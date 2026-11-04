import type { Phase } from "./time";

export type Rarity = "common" | "uncommon" | "rare";

export interface FishDef {
  id: string;
  name: string;
  rarity: Rarity;
  /** size range in cm */
  size: [number, number];
  /** when it bites; omit = any time */
  phases?: Phase[];
  /** pixel icon colors: body, fin/belly */
  colors: [string, string];
  /** reel difficulty 0..1 (zone speed) */
  difficulty: number;
}

export const RARITY_XP: Record<Rarity, number> = { common: 5, uncommon: 10, rare: 25 };
export const RARITY_WEIGHT: Record<Rarity, number> = { common: 60, uncommon: 28, rare: 12 };

export const FISH: FishDef[] = [
  { id: "minnow", name: "Pond Minnow", rarity: "common", size: [4, 9], colors: ["#a8b8c8", "#e8eef4"], difficulty: 0.15 },
  { id: "bluegill", name: "Bluegill", rarity: "common", size: [10, 22], colors: ["#6a8ec8", "#f2c46a"], difficulty: 0.25 },
  { id: "carp", name: "Pink Carp", rarity: "common", size: [25, 60], colors: ["#e89aa8", "#f8d8de"], difficulty: 0.3 },
  { id: "perch", name: "Sunny Perch", rarity: "uncommon", size: [15, 35], phases: ["dawn", "day"], colors: ["#d8b04a", "#6a8a3a"], difficulty: 0.45 },
  { id: "koi", name: "Petal Koi", rarity: "uncommon", size: [30, 70], colors: ["#f4f0e4", "#e8603a"], difficulty: 0.5 },
  { id: "duskeel", name: "Dusk Eel", rarity: "uncommon", size: [40, 90], phases: ["dusk", "night"], colors: ["#7a5a9a", "#c8a8e0"], difficulty: 0.55 },
  { id: "moonfish", name: "Moonfish", rarity: "rare", size: [20, 45], phases: ["night"], colors: ["#c8d8f8", "#fff4c0"], difficulty: 0.7 },
  { id: "goldkoi", name: "Golden Wedding Koi", rarity: "rare", size: [45, 95], phases: ["dusk"], colors: ["#f2c440", "#fff0a8"], difficulty: 0.8 },
];

export function availableFish(phase: Phase) {
  return FISH.filter((f) => !f.phases || f.phases.includes(phase));
}

export function rollFish(phase: Phase, rand: () => number = Math.random) {
  const pool = availableFish(phase);
  const total = pool.reduce((s, f) => s + RARITY_WEIGHT[f.rarity], 0);
  let r = rand() * total;
  for (const f of pool) { r -= RARITY_WEIGHT[f.rarity]; if (r <= 0) return f; }
  return pool[pool.length - 1]!;
}

export const FISHING = {
  waitMin: 3, waitMax: 10,
  biteWindow: 2,
  castMin: 22, castMax: 110,
  chargeSpeed: 0.85,
  /** reel minigame */
  zoneSize: 0.3, markerGravity: 1.7, markerLift: 2.4, fillRate: 0.42, drainRate: 0.2,
} as const;
