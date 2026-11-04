import type { BuildingArtKey } from "./assets";

export const WORLD_W = 1100;
export const WORLD_H = 1200;
export const TILE = 16;

export type ShopId =
  | "salon" | "flower" | "bar" | "cafe" | "cake" | "garden" | "seedshop"
  | "petdecor" | "gameroom" | "busstop" | "home";

export interface Building {
  id: ShopId;
  name: string;
  art: BuildingArtKey | null;
  x: number; // center
  y: number; // base (ground line)
  w: number; // draw width (height from art aspect)
  door: { x: number; y: number };
  /** collision depth above the base line */
  depth: number;
  enterable: boolean;
}

export const BUILDINGS: Building[] = [
  // top row
  { id: "petdecor", name: "Pet Decor", art: "petdecor", x: 330, y: 212, w: 120, door: { x: 312, y: 214 }, depth: 50, enterable: true },
  { id: "gameroom", name: "Game Room", art: "gameroom", x: 540, y: 212, w: 120, door: { x: 545, y: 214 }, depth: 50, enterable: true },
  { id: "busstop", name: "Bus Stop", art: "busstop", x: 900, y: 212, w: 105, door: { x: 895, y: 214 }, depth: 34, enterable: false },
  // left column
  { id: "salon", name: "Salon", art: "salon", x: 85, y: 300, w: 120, door: { x: 85, y: 302 }, depth: 46, enterable: true },
  { id: "flower", name: "Flower Shop", art: "flower", x: 85, y: 480, w: 86, door: { x: 72, y: 482 }, depth: 40, enterable: true },
  { id: "bar", name: "The Pub Freesia", art: "bar", x: 105, y: 785, w: 165, door: { x: 98, y: 787 }, depth: 60, enterable: true },
  // bottom row
  { id: "cafe", name: "Cafe", art: "cafe", x: 290, y: 780, w: 76, door: { x: 302, y: 782 }, depth: 40, enterable: true },
  { id: "cake", name: "Evening Cakery", art: "cake", x: 412, y: 785, w: 92, door: { x: 426, y: 787 }, depth: 54, enterable: true },
  { id: "garden", name: "Garden", art: null, x: 660, y: 790, w: 240, door: { x: 660, y: 640 }, depth: 0, enterable: false },
  { id: "seedshop", name: "Seed Shop", art: "seedshop", x: 895, y: 780, w: 104, door: { x: 895, y: 782 }, depth: 44, enterable: true },
  // center
  { id: "home", name: "Home", art: "home", x: 560, y: 470, w: 140, door: { x: 560, y: 472 }, depth: 54, enterable: false },
];

/** Garden soil plots (walkable, decorative) */
export const PLOTS = [
  { x: 548, y: 655, w: 52, h: 38 }, { x: 612, y: 655, w: 52, h: 38 }, { x: 676, y: 655, w: 52, h: 38 }, { x: 740, y: 655, w: 40, h: 38 },
  { x: 548, y: 710, w: 52, h: 38 }, { x: 612, y: 710, w: 52, h: 38 }, { x: 676, y: 710, w: 52, h: 38 }, { x: 740, y: 710, w: 40, h: 38 },
];

/** Home yard fence: rect with a gap at the bottom center */
export const YARD = { x: 470, y: 340, w: 180, h: 170, gap: 40 };

export const GATE = { x: 1068, y: 236, w: 32, h: 70 };

export const RING = { l: 200, r: 960, t: 262, b: 600 };
export const PATHS: { pts: [number, number][]; r: number }[] = [
  { pts: [[RING.l, RING.t], [RING.r, RING.t], [RING.r, RING.b], [RING.l, RING.b], [RING.l, RING.t]], r: 20 },
  { pts: [[RING.r, 272], [1060, 272]], r: 16 },
  // spurs to doors
  { pts: [[312, 214], [312, RING.t]], r: 12 },
  { pts: [[545, 214], [545, RING.t]], r: 12 },
  { pts: [[895, 214], [895, RING.t]], r: 13 },
  { pts: [[85, 310], [140, 312], [RING.l, 300]], r: 12 },
  { pts: [[72, 490], [140, 488], [RING.l, 480]], r: 12 },
  { pts: [[RING.l, RING.b], [150, 680], [98, 795]], r: 13 },
  { pts: [[302, 790], [302, RING.b]], r: 12 },
  { pts: [[426, 795], [426, RING.b]], r: 12 },
  { pts: [[660, 640], [660, RING.b]], r: 14 },
  { pts: [[895, 790], [895, RING.b]], r: 13 },
  { pts: [[560, 512], [560, 480]], r: 10 },
  { pts: [[560, 512], [560, RING.b]], r: 11 },
  // south lane + shore access (gap between cafe and cake leads down to the pond)
  { pts: [[40, 838], [1060, 838]], r: 12 },
  { pts: [[347, RING.b], [347, 838]], r: 10 },
  { pts: [[98, 795], [98, 838]], r: 10 },
  { pts: [[302, 790], [302, 838]], r: 9 },
  { pts: [[426, 795], [426, 838]], r: 9 },
  { pts: [[895, 790], [895, 838]], r: 10 },
  { pts: [[600, 838], [600, 884]], r: 10 },
  { pts: [[233, 838], [233, 886]], r: 10 },
];

export interface Decor { kind: "lamp" | "bench" | "log" | "sign"; x: number; y: number; label?: string }
export const DECOR: Decor[] = [];

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
export function distToPaths(x: number, y: number) {
  let best = Infinity;
  for (const p of PATHS) for (let i = 0; i < p.pts.length - 1; i++) {
    const a = p.pts[i]!, b = p.pts[i + 1]!;
    best = Math.min(best, distToSeg(x, y, a[0], a[1], b[0], b[1]) - p.r);
  }
  return best;
}

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export const SPAWN = { x: 560, y: 560 };
