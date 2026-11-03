import type { SpriteKey } from "./sprites";

export type SceneryKind = "tree" | "bush" | "flower" | "prop" | "log";

export interface SceneryDef {
  sprite: SpriteKey;
  kind: SceneryKind;
  /** draw width in world px (height keeps the art aspect) */
  w: number;
  /** collision footprint at the base; omit = walk-through */
  solid?: { w: number; h: number };
  /** relative frequency in the random scatter */
  weight: number;
}

const tree = (sprite: SpriteKey, w = 40, weight = 3): SceneryDef => ({ sprite, kind: "tree", w, solid: { w: 8, h: 5 }, weight });
const bush = (sprite: SpriteKey, w = 24, weight = 3): SceneryDef => ({ sprite, kind: "bush", w, solid: { w: Math.round(w * 0.5), h: 4 }, weight });

/** Every uploaded tree/bush/flower/log sprite is placed at least once, then scattered by weight. */
export const SCENERY: SceneryDef[] = [
  tree("trees3_0", 44), tree("trees3_1", 50, 2),
  ...(["trees12_0", "trees12_1", "trees12_2", "trees12_3", "trees12_4", "trees12_5", "trees12_6", "trees12_7", "trees12_8", "trees12_9", "trees12_10", "trees12_11"] as const).map((k) => tree(k, 36)),
  ...(["bushes_0", "bushes_1", "bushes_2", "bushes_3", "bushes_4", "bushes_5", "bushes_6", "bushes_7"] as const).map((k) => bush(k, 22 + (Number(k.slice(-1)) % 3) * 4)),
  { sprite: "roses_0", kind: "flower", w: 42, solid: { w: 24, h: 6 }, weight: 1 },
  { sprite: "roses_1", kind: "flower", w: 9, weight: 3 },
  { sprite: "trees3_2", kind: "log", w: 22, solid: { w: 14, h: 5 }, weight: 2 },
  { sprite: "props_15", kind: "flower", w: 30, solid: { w: 26, h: 5 }, weight: 1 },
  { sprite: "props_4", kind: "flower", w: 9, solid: { w: 6, h: 3 }, weight: 1 },
  { sprite: "props_13", kind: "prop", w: 10, solid: { w: 6, h: 3 }, weight: 1 },
  { sprite: "props_8", kind: "prop", w: 13, solid: { w: 6, h: 3 }, weight: 1 },
  { sprite: "props_3", kind: "prop", w: 13, solid: { w: 8, h: 3 }, weight: 1 },
  { sprite: "props_12", kind: "prop", w: 14, solid: { w: 10, h: 3 }, weight: 1 },
  { sprite: "props_11", kind: "prop", w: 11, solid: { w: 6, h: 3 }, weight: 1 },
  { sprite: "props_7", kind: "prop", w: 10, solid: { w: 6, h: 3 }, weight: 1 },
  { sprite: "props_6", kind: "prop", w: 10, weight: 1 },
  { sprite: "props_0", kind: "prop", w: 7, weight: 1 },
  { sprite: "props_2", kind: "prop", w: 7, weight: 1 },
];

export const SCATTER_COUNTS = { total: 150, seed: 1337 } as const;

/** Night-glowing bushes */
export const GLOW_BUSH_COUNT = 10;
export const GLOW_COLORS = ["#6ff0e0", "#ff9ed0", "#c8a8ff"];

/** Unique recolored trees. glow = night halo color. */
export const SPECIAL_TREES: { id: string; sprite: SpriteKey; x: number; y: number; w: number; glow: string; lanterns?: boolean }[] = [
  { id: "blossom", sprite: "special_blossom", x: 690, y: 470, w: 64, glow: "#ffb8de" },
  { id: "bluegl", sprite: "special_blue", x: 1010, y: 700, w: 54, glow: "#7fd8ff" },
  { id: "golden", sprite: "special_gold", x: 150, y: 640, w: 54, glow: "#ffd27a" },
  { id: "lantern", sprite: "special_lantern", x: 1000, y: 470, w: 56, glow: "#ffe0a0", lanterns: true },
];

export const FIREFLIES = { count: 84, pondShare: 0.4 } as const;
