import { BUILDING_ART, TREE_ART } from "./assets";
import { drawCharacter, type Dir } from "./character";
import { BUILDINGS, GATE, PATHS, PLOTS, WORLD_H, WORLD_W, YARD, distToPaths, rng, type Building } from "./map";
import { NPCS, type NpcDef } from "./npcs";
import { SPRITES, type SpriteKey } from "./config/sprites";
import { FIREFLIES, GLOW_BUSH_COUNT, GLOW_COLORS, SCATTER_COUNTS, SCENERY, SPECIAL_TREES, type SceneryDef } from "./config/scenery";
import { BENCHES, BOAT, BOAT_GROUP, DOCK, FISH_GROUP, LAMPS, LANE_Y, PIER, PROMPTS, SEAT_GROUPS, SHORE_Y, shoreY, type SeatGroup } from "./config/world";
import { lightingAt } from "./config/time";

interface Rect { x: number; y: number; w: number; h: number }
interface Placed { def: SceneryDef | null; sprite: SpriteKey | string; x: number; y: number; w: number; glow?: string | undefined; phase: number; lanterns?: boolean | undefined }
interface Lamp { x: number; y: number; on: number; th: number; ph: number }
export interface PlayerState { x: number; y: number; dir: Dir }
export interface FishVis { x: number; y: number; phase: string; t: number }
export interface RemoteState { id: string; name: string; sprite: number; x: number; y: number; dir: Dir; seat: string | null; fish: FishVis | null; moving: boolean; rx: number; ry: number; seen: number }
export type Nearby =
  | { kind: "npc"; npc: NpcDef }
  | { kind: "gate" }
  | { kind: "seat"; group: SeatGroup; prompt: string; full: boolean }
  | null;

const SPEED = 70;

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = () => res(i);
    i.src = src;
  });
}
const hash = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const inRect = (x: number, y: number, r: Rect) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
export const groupOfSeat = (seat: string | null) => (seat ? SEAT_GROUPS.find((g) => seat.startsWith(g.id + ":")) ?? null : null);

export class GameEngine {
  private ctx: CanvasRenderingContext2D;
  private bg!: HTMLCanvasElement;
  private light = document.createElement("canvas");
  private lctx = this.light.getContext("2d")!;
  private glowCache = new Map<string, HTMLCanvasElement>();
  private imgs = new Map<string, HTMLImageElement>();
  private scenery: Placed[] = [];
  private lamps: Lamp[] = [];
  private flies: { ax: number; ay: number; p: number; r: number; f: number }[] = [];
  private fishShadows = Array.from({ length: 7 }, (_, i) => ({ cx: 120 + i * 140, cy: 1010 + (i % 3) * 50, r: 30 + (i % 4) * 12, p: i * 1.7, s: 0.15 + (i % 3) * 0.06 }));
  private ripples: { x: number; y: number; t: number; big?: boolean }[] = [];
  private lily: { x: number; y: number; r: number; flower: boolean }[] = [];
  private reeds: { x: number; y: number; h: number; p: number }[] = [];
  private solids: Rect[] = [];
  private keys = new Set<string>();
  private raf = 0;
  private last = 0;
  private t = 0;
  private walkT = 0;
  private moving = false;
  private scale = 3;
  private cam = { x: 0, y: 0 };
  private petals = Array.from({ length: 36 }, (_, i) => ({ x: Math.random(), y: Math.random(), s: 0.3 + Math.random() * 0.7, p: i }));
  private nearby: Nearby = null;
  private hearts = new Map<string, number>();
  private pairNotified = new Set<string>();
  paused = false;
  showPointers = true;
  player: PlayerState;
  seat: string | null = null;
  fish: FishVis | null = null;
  remotes = new Map<string, RemoteState>();
  minutes = 480;
  get night() { return lightingAt(this.minutes).night; }

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: {
      sprite: number; name: string; start: PlayerState;
      onNearby: (n: Nearby) => void;
      onSeat?: (seat: string | null, group: SeatGroup | null) => void;
      onPairSeated?: (group: SeatGroup) => void;
    },
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.player = { ...opts.start };
  }

  async start() {
    const srcs = [...Object.values(BUILDING_ART), ...TREE_ART, ...Object.values(SPRITES)];
    const loaded = await Promise.all(srcs.map(loadImg));
    srcs.forEach((s, i) => this.imgs.set(s, loaded[i]!));
    this.buildSolids();
    this.placeLamps();
    this.placeScenery();
    this.placePond();
    this.placeFlies();
    this.bg = this.buildBackground();
    if (this.isBlocked(this.player.x, this.player.y)) { this.player.x = 560; this.player.y = 560; }
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.update(dt);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() { cancelAnimationFrame(this.raf); }

  setKey(k: string, down: boolean) { if (down) this.keys.add(k); else this.keys.delete(k); }
  clearKeys() { this.keys.clear(); }

  // ---------- world setup ----------
  private bSize(b: Building) {
    if (!b.art) return { w: b.w, h: 0 };
    const img = this.imgs.get(BUILDING_ART[b.art]);
    const h = img && img.width ? (b.w * img.height) / img.width : b.w;
    return { w: b.w, h };
  }
  private spriteH(src: string, w: number) {
    const img = this.imgs.get(src);
    return img && img.width ? (w * img.height) / img.width : w;
  }

  private buildSolids() {
    const s: Rect[] = [];
    for (const b of BUILDINGS) {
      if (!b.art) continue;
      s.push({ x: b.x - b.w / 2 + 6, y: b.y - b.depth, w: b.w - 12, h: b.depth - 3 });
    }
    s.push({ x: -20, y: -20, w: WORLD_W + 40, h: 20 }, { x: -20, y: WORLD_H, w: WORLD_W + 40, h: 20 }, { x: -20, y: 0, w: 20, h: WORLD_H }, { x: WORLD_W, y: 0, w: 20, h: WORLD_H });
    const { x, y, w, h, gap } = YARD;
    s.push({ x, y, w, h: 4 }, { x, y, w: 4, h }, { x: x + w - 4, y, w: 4, h });
    s.push({ x, y: y + h - 4, w: w / 2 - gap / 2, h: 4 }, { x: x + w / 2 + gap / 2, y: y + h - 4, w: w / 2 - gap / 2, h: 4 });
    s.push({ x: GATE.x - 4, y: GATE.y, w: GATE.w + 4, h: GATE.h });
    for (const b of BENCHES) s.push({ x: b.x - 14, y: b.y - 12, w: 28, h: 6 });
    s.push({ x: 614, y: 496, w: 6, h: 4 }); // mailbox
    for (const n of NPCS) { const p = this.npcPos(n); s.push({ x: p.x - 5, y: p.y - 4, w: 10, h: 5 }); }
    for (const t of SPECIAL_TREES) s.push({ x: t.x - 6, y: t.y - 5, w: 12, h: 6 });
    this.solids = s;
  }

  npcPos(n: NpcDef) {
    const b = BUILDINGS.find((b) => b.id === n.shop)!;
    return { x: b.door.x + n.offset.x, y: b.door.y + n.offset.y };
  }

  private nearBuilding(x: number, y: number, pad: number) {
    for (const b of BUILDINGS) {
      const { w, h } = this.bSize(b);
      if (b.id === "garden") { if (x > 520 && x < 810 && y > 630 && y < 790) return true; continue; }
      if (x > b.x - w / 2 - pad && x < b.x + w / 2 + pad && y > b.y - h * 0.65 && y < b.y + pad + 6) return true;
    }
    return false;
  }

  private placeLamps() {
    const lamps: { x: number; y: number }[] = [];
    const ok = (x: number, y: number) => {
      if (x < 8 || x > WORLD_W - 8 || y < 30) return false;
      if (y > shoreY(x) - 6 && !inRect(x, y, DOCK) && !inRect(x, y, PIER)) return false;
      if (this.nearBuilding(x, y, 2)) return false;
      if (x > YARD.x - 4 && x < YARD.x + YARD.w + 4 && y > YARD.y - 4 && y < YARD.y + YARD.h + 4) return false;
      if (distToPaths(x, y) < 1) return false;
      for (const g of SEAT_GROUPS) if (Math.hypot(g.x - x, g.y - y) < 22) return false;
      for (const n of NPCS) { const p = this.npcPos(n); if (Math.hypot(p.x - x, p.y - y) < 18) return false; }
      for (const l of lamps) if (Math.hypot(l.x - x, l.y - y) < LAMPS.minGap) return false;
      return true;
    };
    for (const [x, y] of LAMPS.extra) lamps.push({ x, y });
    let side = 1;
    for (const p of PATHS) for (let i = 0; i < p.pts.length - 1; i++) {
      const [ax, ay] = p.pts[i]!, [bx, by] = p.pts[i + 1]!;
      const len = Math.hypot(bx - ax, by - ay);
      const nx = -(by - ay) / len, ny = (bx - ax) / len;
      for (let d = 20; d < len; d += LAMPS.spacing) {
        side = -side;
        const cx = ax + ((bx - ax) * d) / len, cy = ay + ((by - ay) * d) / len;
        for (const sd of [side, -side]) {
          const x = Math.round(cx + nx * sd * (p.r + 7)), y = Math.round(cy + ny * sd * (p.r + 7));
          if (ok(x, y)) { lamps.push({ x, y }); break; }
        }
      }
    }
    this.lamps = lamps.map((l) => ({ ...l, on: 0, th: 0.12 + hash(l.x, l.y) * 0.3, ph: hash(l.y, l.x) * 10 }));
    for (const l of this.lamps) if (!inRect(l.x, l.y, DOCK)) this.solids.push({ x: l.x - 3, y: l.y - 3, w: 6, h: 4 });
  }

  private sceneryBlocked(x: number, y: number, rad: number) {
    if (distToPaths(x, y) < 10 + rad * 0.3) return true;
    if (y > shoreY(x) - 14 || (y > LANE_Y - 20 && y < LANE_Y + 26)) return true;
    if (this.nearBuilding(x, y, 14)) return true;
    if (x > YARD.x - 16 && x < YARD.x + YARD.w + 16 && y > YARD.y - 10 && y < YARD.y + YARD.h + 24) return true;
    if (x > 1020 && y > 200 && y < 330) return true;
    for (const b of BUILDINGS) if (Math.hypot(b.door.x - x, b.door.y - y) < 30) return true;
    for (const g of SEAT_GROUPS) if (Math.hypot(g.x - x, g.y - y) < 26) return true;
    for (const l of this.lamps) if (Math.hypot(l.x - x, l.y - y) < 14) return true;
    for (const n of NPCS) { const p = this.npcPos(n); if (Math.hypot(p.x - x, p.y - y) < 30) return true; }
    for (const t of SPECIAL_TREES) if (Math.hypot(t.x - x, t.y - y) < 40) return true;
    for (const s of this.scenery) if (Math.hypot(s.x - x, s.y - y) < (s.def?.kind === "tree" ? 26 : 14) + rad * 0.4) return true;
    return false;
  }

  private placeScenery() {
    const r = rng(SCATTER_COUNTS.seed);
    const total = SCENERY.reduce((s, d) => s + d.weight, 0);
    const pick = () => { let v = r() * total; for (const d of SCENERY) { v -= d.weight; if (v <= 0) return d; } return SCENERY[0]!; };
    // legacy tree art still mixed in
    const legacy = TREE_ART.map((src) => ({ src }));
    let glow = 0;
    const queue: SceneryDef[] = [...SCENERY];
    for (let i = 0; i < 6000 && this.scenery.length < SCATTER_COUNTS.total; i++) {
      const useLegacy = !queue.length && r() < 0.25;
      const def = queue.length ? queue[0]! : useLegacy ? null : pick();
      const w = def ? def.w * (0.9 + r() * 0.2) : 34 + r() * 12;
      const x = 12 + r() * (WORLD_W - 24), y = 40 + r() * (SHORE_Y - 60);
      if (this.sceneryBlocked(x, y, w)) continue;
      if (queue.length) queue.shift();
      const sprite = def ? SPRITES[def.sprite] : legacy[Math.floor(r() * legacy.length)]!.src;
      const p: Placed = { def, sprite, x, y, w, phase: r() * 6 };
      if (def?.kind === "bush" && glow < GLOW_BUSH_COUNT) { p.glow = GLOW_COLORS[glow % GLOW_COLORS.length]; glow++; }
      this.scenery.push(p);
      const sol = def ? def.solid : { w: 8, h: 5 };
      if (sol) this.solids.push({ x: x - sol.w / 2, y: y - sol.h + 1, w: sol.w, h: sol.h });
    }
    for (const t of SPECIAL_TREES) this.scenery.push({ def: null, sprite: SPRITES[t.sprite], x: t.x, y: t.y, w: t.w, glow: t.glow, phase: 0, lanterns: t.lanterns });
  }

  private placePond() {
    const r = rng(77);
    for (let i = 0; i < 26; i++) {
      const x = 30 + r() * (WORLD_W - 60), y = SHORE_Y + 40 + r() * 230;
      if (Math.abs(x - 600) < 50 && y < 1030) continue;
      if (Math.abs(x - 233) < 40 && y < 990) continue;
      this.lily.push({ x, y, r: 3 + r() * 3, flower: r() < 0.3 });
    }
    for (let x = 6; x < WORLD_W; x += 5 + r() * 9) {
      if (Math.abs(x - 600) < 20 || Math.abs(x - 233) < 30) continue;
      if (r() < 0.45) this.reeds.push({ x, y: shoreY(x) + 4 + r() * 6, h: 6 + r() * 7, p: r() * 6 });
    }
  }

  private placeFlies() {
    const r = rng(5);
    const bushes = this.scenery.filter((s) => s.def?.kind === "bush" || s.glow);
    for (let i = 0; i < FIREFLIES.count; i++) {
      let ax: number, ay: number;
      if (r() < FIREFLIES.pondShare || !bushes.length) { ax = 20 + r() * (WORLD_W - 40); ay = shoreY(ax) + 8 + r() * 40; }
      else { const b = bushes[Math.floor(r() * bushes.length)]!; ax = b.x + (r() - 0.5) * 30; ay = b.y - 6 + (r() - 0.5) * 16; }
      this.flies.push({ ax, ay, p: r() * 20, r: 6 + r() * 14, f: 0.4 + r() * 0.6 });
    }
  }

  private buildBackground() {
    const c = document.createElement("canvas");
    c.width = WORLD_W; c.height = WORLD_H;
    const g = c.getContext("2d")!;
    const m = document.createElement("canvas");
    m.width = WORLD_W; m.height = WORLD_H;
    const mg = m.getContext("2d")!;
    mg.fillStyle = mg.strokeStyle = "#fff";
    mg.lineCap = mg.lineJoin = "round";
    const r = rng(42);
    for (const p of PATHS) {
      mg.lineWidth = p.r * 2;
      mg.beginPath();
      p.pts.forEach(([x, y], i) => (i ? mg.lineTo(x, y) : mg.moveTo(x, y)));
      mg.stroke();
      for (let i = 0; i < p.pts.length - 1; i++) {
        const [ax, ay] = p.pts[i]!, [bx, by] = p.pts[i + 1]!;
        const len = Math.hypot(bx - ax, by - ay);
        for (let d = 0; d < len; d += 7) {
          const t = d / len, nx = -(by - ay) / len, ny = (bx - ax) / len, side = r() < 0.5 ? -1 : 1;
          mg.beginPath();
          mg.arc(ax + (bx - ax) * t + nx * side * p.r * 0.9, ay + (by - ay) * t + ny * side * p.r * 0.9, 2 + r() * 5, 0, Math.PI * 2);
          mg.fill();
        }
      }
    }
    const mask = mg.getImageData(0, 0, WORLD_W, WORLD_H).data;
    const isP = (x: number, y: number) => x >= 0 && y >= 0 && x < WORLD_W && y < WORLD_H && mask[(y * WORLD_W + x) * 4 + 3]! > 128;
    const img = g.createImageData(WORLD_W, WORLD_H);
    const d = img.data;
    const grass: number[][] = [[178, 212, 150], [168, 204, 144], [188, 218, 158], [156, 194, 140]];
    const stone: number[][] = [[214, 204, 214], [204, 194, 208], [224, 214, 220], [196, 188, 204]];
    const sand: number[][] = [[236, 216, 178], [228, 206, 168], [242, 224, 188]];
    const shore = new Float32Array(WORLD_W);
    for (let x = 0; x < WORLD_W; x++) shore[x] = shoreY(x);
    for (let y = 0; y < WORLD_H; y++) for (let x = 0; x < WORLD_W; x++) {
      const i = (y * WORLD_W + x) * 4;
      const sy = shore[x]!;
      let col: number[];
      if (y >= sy) {
        const depth = Math.min(1, (y - sy) / 160);
        const h = hash(x >> 3, y >> 2);
        col = [Math.round(150 - depth * 60 + h * 6), Math.round(206 - depth * 50 + h * 6), Math.round(222 - depth * 22 + h * 4)];
        if (y - sy < 3) col = [224, 240, 244];
        else if (y - sy < 6) col = [176, 220, 226];
      } else if (y > sy - 18 + hash(x >> 2, 3) * 6 && !isP(x, y)) {
        col = sand[Math.floor(hash(x >> 1, y >> 1) * 3)]!;
        if (y > sy - 3) col = [206, 184, 146];
      } else if (isP(x, y)) {
        const edge = !isP(x - 2, y) || !isP(x + 2, y) || !isP(x, y - 2) || !isP(x, y + 2);
        if (edge) col = [170, 150, 160];
        else {
          const row = Math.floor(y / 5), off = (row % 2) * 3, cx = Math.floor((x + off) / 6);
          if (y % 5 === 0 || (x + off) % 6 === 0) col = [176, 164, 182];
          else {
            col = stone[Math.floor(hash(cx, row) * 4)]!;
            if (hash(cx * 3, row * 7) > 0.93) col = [190, 206, 170];
          }
        }
      } else {
        const h = hash(x >> 2, y >> 2);
        col = grass[h < 0.55 ? 0 : h < 0.8 ? 1 : h < 0.95 ? 2 : 3]!;
        if (hash(x, y) > 0.995) col = [140, 180, 128];
      }
      d[i] = col[0]!; d[i + 1] = col[1]!; d[i + 2] = col[2]!; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // garden ground
    g.fillStyle = "#c9b48e";
    g.fillRect(534, 642, 256, 118);
    for (const p of PLOTS) {
      g.fillStyle = "#8a6042"; g.fillRect(p.x - 1, p.y - 1, p.w + 2, p.h + 3);
      g.fillStyle = "#6e4636"; g.fillRect(p.x, p.y, p.w, p.h);
      g.fillStyle = "#5a382c";
      for (let fy = p.y + 4; fy < p.y + p.h; fy += 6) g.fillRect(p.x + 2, fy, p.w - 4, 1);
      for (let k = 0; k < 5; k++) {
        const sx = p.x + 5 + ((k * 13 + p.x) % (p.w - 10)), sy = p.y + 6 + ((k * 11 + p.y) % (p.h - 10));
        g.fillStyle = "#86c47a"; g.fillRect(sx, sy, 1, 2); g.fillRect(sx - 1, sy, 1, 1); g.fillRect(sx + 1, sy - 1, 1, 1);
      }
    }
    // flower patches & mushrooms
    const fr = rng(99);
    const fcols = ["#f6c6d6", "#ffffff", "#f6e08c", "#d6c2f0", "#f29bb2"];
    for (let i = 0; i < 200; i++) {
      const x = Math.floor(fr() * WORLD_W), y = Math.floor(fr() * (SHORE_Y - 30));
      if (distToPaths(x, y) < 4 || (x > 530 && x < 795 && y > 638 && y < 765)) continue;
      const mush = fr() < 0.2;
      for (let k = 0; k < (mush ? 3 : 6); k++) {
        const fx = x + Math.floor(fr() * 12 - 6), fy = y + Math.floor(fr() * 8 - 4);
        if (mush) {
          g.fillStyle = "#f4ece0"; g.fillRect(fx, fy, 1, 2);
          g.fillStyle = "#d9534f"; g.fillRect(fx - 1, fy - 2, 3, 2);
          g.fillStyle = "#fff"; g.fillRect(fx, fy - 2, 1, 1);
        } else {
          g.fillStyle = "#7fb070"; g.fillRect(fx, fy + 1, 1, 1);
          g.fillStyle = fcols[Math.floor(fr() * fcols.length)]!; g.fillRect(fx, fy, 1, 1);
        }
      }
    }
    g.fillStyle = "rgba(255,240,250,0.18)";
    g.fillRect(YARD.x, YARD.y, YARD.w, YARD.h);
    for (const bx of [YARD.x + 10, YARD.x + YARD.w - 40]) {
      g.fillStyle = "#8a6042"; g.fillRect(bx - 1, YARD.y + YARD.h - 34, 32, 14);
      g.fillStyle = "#6e4636"; g.fillRect(bx, YARD.y + YARD.h - 33, 30, 12);
      for (let k = 0; k < 14; k++) {
        g.fillStyle = "#7fb070"; g.fillRect(bx + 2 + (k * 7) % 27, YARD.y + YARD.h - 31 + (k * 5) % 9, 1, 2);
        g.fillStyle = fcols[k % fcols.length]!; g.fillRect(bx + 2 + (k * 7) % 27, YARD.y + YARD.h - 32 + (k * 5) % 9, 2, 1);
      }
    }
    // dock + pier planks
    const planks = (R: Rect, vertical: boolean) => {
      g.fillStyle = "rgba(40,60,90,0.25)"; g.fillRect(R.x + 2, R.y + 3, R.w, R.h);
      g.fillStyle = "#a8785a"; g.fillRect(R.x, R.y, R.w, R.h);
      g.fillStyle = "#8a5e40";
      if (vertical) for (let yy = R.y; yy < R.y + R.h; yy += 4) g.fillRect(R.x, yy, R.w, 1);
      else for (let xx = R.x; xx < R.x + R.w; xx += 5) g.fillRect(xx, R.y, 1, R.h);
      g.fillStyle = "#6b4a3a";
      for (const [px, py] of [[R.x, R.y + R.h - 3], [R.x + R.w - 2, R.y + R.h - 3], [R.x, R.y + R.h / 2], [R.x + R.w - 2, R.y + R.h / 2]] as const) g.fillRect(px, py, 2, 5);
    };
    planks(DOCK, true);
    planks(PIER, false);
    return c;
  }

  private glow(color: string) {
    let c = this.glowCache.get(color);
    if (c) return c;
    c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, color); gr.addColorStop(0.35, color + "aa"); gr.addColorStop(1, color + "00");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    this.glowCache.set(color, c);
    return c;
  }

  // ---------- collision & interaction ----------
  private isWater(x: number, y: number) { return y > shoreY(x) - 2 && !inRect(x, y, DOCK) && !inRect(x, y, PIER); }
  private isBlocked(x: number, y: number) {
    if (this.isWater(x, y)) return true;
    const px = x - 5, py = y - 4, pw = 10, ph = 4;
    for (const s of this.solids) if (px < s.x + s.w && px + pw > s.x && py < s.y + s.h && py + ph > s.y) return true;
    return false;
  }

  private occupiedBy(seat: string) {
    for (const r of this.remotes.values()) if (r.seat === seat) return r;
    return null;
  }

  /** Sit on the first free seat of the group, or stand up if already seated. */
  toggleSeat(group?: SeatGroup) {
    if (this.seat) {
      const g = groupOfSeat(this.seat)!;
      this.seat = null;
      this.player.x = g.exit.x; this.player.y = g.exit.y; this.player.dir = "down";
      this.opts.onSeat?.(null, null);
      return;
    }
    if (!group) return;
    const idx = group.seats.findIndex((_, i) => !this.occupiedBy(`${group.id}:${i}`));
    if (idx < 0) return;
    this.seat = `${group.id}:${idx}`;
    const s = group.seats[idx]!;
    this.player.x = s.x; this.player.y = s.y; this.player.dir = "down";
    this.clearKeys();
    this.opts.onSeat?.(this.seat, group);
  }

  private update(dt: number) {
    this.t += dt;
    let dx = 0, dy = 0;
    if (!this.paused && !this.seat) {
      const k = this.keys;
      if (k.has("left")) dx -= 1;
      if (k.has("right")) dx += 1;
      if (k.has("up")) dy -= 1;
      if (k.has("down")) dy += 1;
      if (dx && dy) dy = 0;
    }
    this.moving = !!(dx || dy);
    if (this.moving) {
      this.player.dir = dx < 0 ? "left" : dx > 0 ? "right" : dy < 0 ? "up" : "down";
      this.walkT += dt;
      const nx = this.player.x + dx * SPEED * dt, ny = this.player.y + dy * SPEED * dt;
      if (!this.isBlocked(nx, this.player.y)) this.player.x = nx;
      if (!this.isBlocked(this.player.x, ny)) this.player.y = ny;
    }
    // remotes interpolate
    for (const r of this.remotes.values()) {
      const k = Math.min(1, dt * 12);
      r.rx += (r.x - r.rx) * k; r.ry += (r.y - r.ry) * k;
    }
    // lamps fade in at dusk with a flicker
    const n = this.night;
    for (const l of this.lamps) {
      const target = n > l.th ? 1 : 0;
      l.on += (target - l.on) * Math.min(1, dt * 0.8);
    }
    // pond ripples
    if (Math.random() < dt * 1.5 && this.ripples.length < 14) {
      const x = 20 + Math.random() * (WORLD_W - 40);
      this.ripples.push({ x, y: shoreY(x) + 20 + Math.random() * 260, t: 0 });
    }
    for (const r of this.ripples) r.t += dt;
    this.ripples = this.ripples.filter((r) => r.t < 2.4);
    if (this.fish?.phase === "waiting" && Math.random() < dt * 0.4) this.ripples.push({ x: this.fish.x, y: this.fish.y, t: 0 });

    // pair seated hearts
    const mineG = groupOfSeat(this.seat);
    for (const r of this.remotes.values()) {
      const g = groupOfSeat(r.seat);
      if (g && mineG && g.id === mineG.id) {
        if (!this.pairNotified.has(g.id)) { this.pairNotified.add(g.id); this.hearts.set(g.id, this.t); this.opts.onPairSeated?.(g); }
      } else if (mineG) this.pairNotified.delete(mineG.id);
    }
    if (!mineG) this.pairNotified.clear();

    // nearby
    let near: Nearby = null, best = 26;
    if (!this.seat) {
      for (const np of NPCS) {
        const p = this.npcPos(np);
        const dd = Math.hypot(p.x - this.player.x, p.y - this.player.y);
        if (dd < best) { best = dd; near = { kind: "npc", npc: np }; }
      }
      for (const g of SEAT_GROUPS) {
        const dd = Math.hypot(g.x - this.player.x, g.y - this.player.y);
        if (dd < best) { best = dd; near = { kind: "seat", group: g, prompt: PROMPTS[g.kind], full: g.seats.every((_, i) => this.occupiedBy(`${g.id}:${i}`)) }; }
      }
      if (!near && this.player.x > 1030 && Math.abs(this.player.y - 280) < 50) near = { kind: "gate" };
    }
    const key = (n: Nearby) => (n ? (n.kind === "npc" ? n.npc.id : n.kind === "seat" ? n.group.id + n.full : "gate") : "");
    if (key(near) !== key(this.nearby)) { this.nearby = near; this.opts.onNearby(near); }
  }

  npcAtScreen(sx: number, sy: number): NpcDef | null {
    const wx = sx / this.scale + this.cam.x, wy = sy / this.scale + this.cam.y;
    for (const n of NPCS) {
      const p = this.npcPos(n);
      if (Math.abs(wx - p.x) < 12 && wy > p.y - 26 && wy < p.y + 4 && Math.hypot(p.x - this.player.x, p.y - this.player.y) < 50) return n;
    }
    return null;
  }

  // ---------- render ----------
  private render() {
    const { ctx, canvas } = this;
    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    }
    this.scale = Math.max(2, Math.min(2.6, ch / 300, cw / 360));
    const S = this.scale;
    const vw = cw / S, vh = ch / S;
    const clamp = (v: number, max: number, view: number) => (view >= max ? (max - view) / 2 : Math.max(0, Math.min(max - view, v)));
    this.cam.x = Math.round(clamp(this.player.x - vw / 2, WORLD_W, vw) * S) / S;
    this.cam.y = Math.round(clamp(this.player.y - 12 - vh / 2, WORLD_H, vh) * S) / S;
    const cx0 = this.cam.x - 60, cx1 = this.cam.x + vw + 60, cy0 = this.cam.y - 20, cy1 = this.cam.y + vh + 120;
    const vis = (x: number, y: number) => x > cx0 && x < cx1 && y > cy0 && y < cy1;
    const L = lightingAt(this.minutes);
    const night = L.night;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#cbb7d9";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(S * dpr, 0, 0, S * dpr, -this.cam.x * S * dpr, -this.cam.y * S * dpr);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.bg, 0, 0);
    if (this.cam.y + vh > SHORE_Y - 20) this.drawWater(vis, night);

    type D = { y: number; draw: () => void };
    const list: D[] = [];
    for (const b of BUILDINGS) {
      if (!b.art) continue;
      const img = this.imgs.get(BUILDING_ART[b.art])!;
      const { w, h } = this.bSize(b);
      if (b.x + w / 2 < cx0 || b.x - w / 2 > cx1 || b.y - h > cy1 || b.y < cy0) continue;
      list.push({ y: b.y - b.depth / 2, draw: () => {
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, b.x - w / 2, b.y - h, w, h);
        ctx.imageSmoothingEnabled = false;
      } });
    }
    for (const s of this.scenery) {
      if (!vis(s.x, s.y)) continue;
      const img = this.imgs.get(s.sprite);
      if (!img || !img.width) continue;
      const h = (s.w * img.height) / img.width;
      const big = !s.def || s.def.kind === "tree";
      list.push({ y: s.y, draw: () => {
        if (big) { ctx.fillStyle = "rgba(60,40,90,0.18)"; ctx.beginPath(); ctx.ellipse(s.x, s.y, s.w * 0.3, 3.5, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(img, s.x - s.w / 2, s.y - h + 2, s.w, h);
        ctx.imageSmoothingEnabled = false;
        if (s.lanterns) this.drawLanterns(s.x, s.y - h + 2, s.w, h, night);
      } });
    }
    const benchImg = this.imgs.get(SPRITES.bench_0);
    for (const b of BENCHES) {
      if (!vis(b.x, b.y)) continue;
      list.push({ y: b.y - 8, draw: () => {
        ctx.fillStyle = "rgba(60,40,90,0.2)"; ctx.fillRect(b.x - 14, b.y - 7, 28, 2);
        if (benchImg?.width) { const h = this.spriteH(SPRITES.bench_0, 30); ctx.imageSmoothingEnabled = true; ctx.drawImage(benchImg, b.x - 15, b.y - 6 - h, 30, h); ctx.imageSmoothingEnabled = false; }
      } });
    }
    // pier chairs & boat
    if (vis(PIER.x, PIER.y)) {
      for (const [i, s] of FISH_GROUP.seats.entries()) {
        const k = i === 0 ? SPRITES.cafe_1 : SPRITES.cafe_2;
        const img = this.imgs.get(k);
        if (img?.width) list.push({ y: s.y - 2, draw: () => { const h = this.spriteH(k, 11); ctx.imageSmoothingEnabled = true; ctx.drawImage(img, s.x - 5.5, s.y - h + 2, 11, h); ctx.imageSmoothingEnabled = false; } });
      }
    }
    const boatBob = Math.sin(this.t * 1.6) * 1.2;
    if (vis(BOAT.x, BOAT.y)) {
      const img = this.imgs.get(SPRITES.boat_0);
      if (img?.width) list.push({ y: BOAT.y - 4, draw: () => {
        const h = this.spriteH(SPRITES.boat_0, BOAT.w);
        ctx.fillStyle = "rgba(30,60,90,0.22)"; ctx.beginPath(); ctx.ellipse(BOAT.x, BOAT.y + 4, BOAT.w * 0.45, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.imageSmoothingEnabled = true; ctx.drawImage(img, BOAT.x - BOAT.w / 2, BOAT.y - h + 6 + boatBob, BOAT.w, h); ctx.imageSmoothingEnabled = false;
      } });
    }
    for (const l of this.lamps) if (vis(l.x, l.y)) list.push({ y: l.y, draw: () => this.drawLamp(l) });
    this.pushFence(list);
    list.push({ y: 500, draw: () => this.drawMailbox(617, 500) });
    list.push({ y: GATE.y + GATE.h, draw: () => this.drawGate() });
    for (const b of BUILDINGS) if (b.id !== "home") list.push({ y: b.door.y + 18, draw: () => this.drawSign(b) });
    NPCS.forEach((n, i) => {
      const p = this.npcPos(n);
      if (!vis(p.x, p.y)) return;
      const bob = Math.round(Math.sin(this.t * 2.2 + i) * 0.6 - 0.4);
      list.push({ y: p.y, draw: () => drawCharacter(ctx, n.sprite, p.x, p.y, "down", 0, bob) });
    });
    const seatY = (seat: string | null, y: number) => (groupOfSeat(seat)?.kind === "boat" ? y + boatBob : y);
    for (const r of this.remotes.values()) {
      const y = seatY(r.seat, r.ry);
      list.push({ y: r.seat ? r.ry + 1 : r.ry, draw: () => drawCharacter(ctx, r.sprite, r.rx, y, r.dir, r.moving ? Math.floor(this.t * 7) % 2 + 1 : 0) });
    }
    const frame = this.moving ? Math.floor(this.walkT * 7) % 2 + 1 : 0;
    list.push({ y: this.seat ? this.player.y + 1 : this.player.y, draw: () => drawCharacter(ctx, this.opts.sprite, this.player.x, seatY(this.seat, this.player.y), this.player.dir, frame) });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) it.draw();

    // bobbers
    const bobber = (f: FishVis | null, ox: number, oy: number) => {
      if (!f || !["casting", "waiting", "bite", "reeling"].includes(f.phase)) return;
      let bx = f.x, by = f.y;
      if (f.phase === "casting") { const k = Math.min(1, f.t); bx = ox + (f.x - ox) * k; by = oy - 10 + (f.y - oy + 10) * k - Math.sin(k * Math.PI) * 26; }
      ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(ox + 4, oy - 14); ctx.quadraticCurveTo((ox + bx) / 2, Math.min(oy, by) - 8, bx, by); ctx.stroke();
      const dip = f.phase === "bite" ? 2 + Math.sin(this.t * 30) : f.phase === "reeling" ? Math.sin(this.t * 20) : Math.sin(this.t * 3) * 0.6;
      ctx.fillStyle = "#fff"; ctx.fillRect(bx - 1.5, by - 3 + dip, 3, 2);
      ctx.fillStyle = "#e8503a"; ctx.fillRect(bx - 1.5, by - 1 + dip, 3, 2);
      if (f.phase === "bite") { ctx.fillStyle = "#ffe060"; ctx.font = '700 9px "Pixelify Sans", monospace'; ctx.textAlign = "center"; ctx.fillText("!", bx, by - 8); }
      if (f.phase === "waiting" && Math.floor(this.t * 2) % 4 !== 0) { ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.font = '600 6px "Pixelify Sans", monospace'; ctx.textAlign = "center"; ctx.fillText(".".repeat(1 + (Math.floor(this.t * 2) % 3)), ox, oy - 30); }
    };
    bobber(this.fish, this.player.x, this.player.y);
    for (const r of this.remotes.values()) bobber(r.fish, r.rx, r.ry);

    this.renderLights(vw, vh, L, dpr, S);

    // world-space night glows (additive)
    ctx.setTransform(S * dpr, 0, 0, S * dpr, -this.cam.x * S * dpr, -this.cam.y * S * dpr);
    ctx.globalCompositeOperation = "lighter";
    for (const l of this.lamps) {
      if (l.on < 0.02 || !vis(l.x, l.y)) continue;
      const fl = 0.9 + Math.sin(this.t * 13 + l.ph) * 0.05 + (hash(Math.floor(this.t * 8), l.x) > 0.97 ? -0.25 : 0);
      ctx.globalAlpha = l.on * fl * 0.55;
      const R = LAMPS.radius * 0.8;
      ctx.drawImage(this.glow("#ffc890"), l.x - R, l.y - 20 - R * 0.8, R * 2, R * 1.6);
      ctx.globalAlpha = l.on * fl;
      ctx.drawImage(this.glow("#fff0c8"), l.x - 7, l.y - 32, 14, 14);
      // reflection on water
      if (l.y > SHORE_Y - 40) {
        ctx.globalAlpha = l.on * 0.35;
        for (let k = 0; k < 6; k++) {
          const ry = shoreY(l.x) + 8 + k * 7, wob = Math.sin(this.t * 2 + k + l.ph) * 2;
          ctx.drawImage(this.glow("#ffd8a0"), l.x - 5 + wob, ry, 10, 4);
        }
      }
    }
    if (night > 0.05) {
      for (const s of this.scenery) {
        if (!s.glow || !vis(s.x, s.y)) continue;
        const pulse = 0.55 + Math.sin(this.t * 1.6 + s.phase) * 0.35;
        const big = !s.def;
        const R = big ? s.w * 0.85 : s.w * 0.9;
        ctx.globalAlpha = night * pulse * (big ? 0.45 : 0.6);
        const h = this.spriteH(s.sprite, s.w);
        ctx.drawImage(this.glow(s.glow), s.x - R, s.y - h * (big ? 0.62 : 0.45) - R * 0.7, R * 2, R * 1.4);
      }
      // fireflies
      let n = 0;
      for (const f of this.flies) {
        const x = f.ax + Math.sin(this.t * f.f + f.p) * f.r, y = f.ay + Math.cos(this.t * f.f * 1.3 + f.p) * f.r * 0.5 - 6;
        if (!vis(x, y)) continue;
        const blink = Math.max(0, Math.sin(this.t * 1.7 + f.p * 3));
        if (blink < 0.05) continue;
        ctx.globalAlpha = night * blink;
        ctx.drawImage(this.glow("#d8ff80"), x - 4, y - 4, 8, 8);
        ctx.fillStyle = "#f4ffb0"; ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
        if (++n > 100) break;
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // hearts above paired seats
    for (const [gid, start] of this.hearts) {
      const age = this.t - start;
      if (age > 2.5) { this.hearts.delete(gid); continue; }
      const g = SEAT_GROUPS.find((x) => x.id === gid)!;
      this.drawHeart(g.seats[0]!.x / 2 + g.seats[1]!.x / 2, g.seats[0]!.y - 34 - age * 8, 1 - age / 2.5);
    }

    // labels & pointers
    ctx.textAlign = "center";
    ctx.font = '600 6px "Pixelify Sans", monospace';
    this.label(this.opts.name, this.player.x, seatY(this.seat, this.player.y) - 26, "#ffffff", "rgba(90,60,110,0.75)");
    for (const r of this.remotes.values()) this.label(r.name, r.rx, seatY(r.seat, r.ry) - 26, "#ffffff", "rgba(70,110,150,0.8)");
    for (const n of NPCS) {
      const p = this.npcPos(n);
      if (!vis(p.x, p.y)) continue;
      this.label(n.name, p.x, p.y - 26, "#fff4fa", "rgba(196,110,150,0.8)");
      if (this.nearby?.kind === "npc" && this.nearby.npc.id === n.id) this.bubble(p.x + 10, p.y - 36, "E");
    }
    if (this.nearby?.kind === "seat") this.bubble(this.nearby.group.x, this.nearby.group.y - 30, "E");
    if (this.showPointers) {
      for (const b of BUILDINGS) {
        if (b.id === "home") continue;
        const yy = (b.id === "garden" ? b.door.y : b.door.y - 36) + Math.sin(this.t * 3 + b.x) * 2;
        this.pointer(b.door.x, yy);
      }
      this.pointer(GATE.x + 8, GATE.y - 10 + Math.sin(this.t * 3) * 2);
    }

    // daytime petals (screen space)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const dayA = 1 - night;
    if (dayA > 0.05) for (const p of this.petals) {
      p.y += 0.00025 * p.s * 60;
      if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); }
      const x = (p.x + Math.sin(this.t * 0.6 + p.p) * 0.02) * cw;
      ctx.globalAlpha = dayA;
      ctx.fillStyle = p.p % 3 === 0 ? "rgba(255,255,255,0.75)" : "rgba(255,190,215,0.7)";
      const sz = Math.round(S * (p.p % 2 ? 1 : 1.5));
      ctx.fillRect(Math.round(x), Math.round(p.y * ch), sz, sz);
    }
    ctx.globalAlpha = 1;
  }

  /** Ambient tint drawn on a small offscreen canvas with light holes punched out, then scaled up. */
  private renderLights(vw: number, vh: number, L: ReturnType<typeof lightingAt>, dpr: number, S: number) {
    if (L.alpha < 0.01) return;
    const w = Math.ceil(vw / 2), h = Math.ceil(vh / 2);
    if (this.light.width !== w || this.light.height !== h) { this.light.width = w; this.light.height = h; }
    const g = this.lctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.clearRect(0, 0, w, h);
    g.fillStyle = `rgba(${L.rgb[0] | 0},${L.rgb[1] | 0},${L.rgb[2] | 0},${L.alpha})`;
    g.fillRect(0, 0, w, h);
    if (L.night > 0.05) {
      g.setTransform(0.5, 0, 0, 0.5, -this.cam.x / 2, -this.cam.y / 2);
      g.globalCompositeOperation = "destination-out";
      const hole = this.glow("#ffffff");
      const R = LAMPS.radius;
      for (const l of this.lamps) {
        if (l.on < 0.02) continue;
        if (l.x < this.cam.x - R || l.x > this.cam.x + vw + R || l.y < this.cam.y - R || l.y > this.cam.y + vh + R) continue;
        g.globalAlpha = l.on * 0.8;
        g.drawImage(hole, l.x - R, l.y - 14 - R * 0.8, R * 2, R * 1.6);
      }
      g.globalAlpha = 0.5;
      for (const s of this.scenery) if (s.glow && !s.def) g.drawImage(hole, s.x - 40, s.y - 60, 80, 70);
      g.globalAlpha = 0.35;
      const me = this.player; g.drawImage(hole, me.x - 24, me.y - 34, 48, 40);
      g.globalAlpha = 1;
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.light, 0, 0, w * 2 * S, h * 2 * S);
    ctx.imageSmoothingEnabled = false;
  }

  private drawWater(vis: (x: number, y: number) => boolean, night: number) {
    const { ctx } = this;
    const x0 = Math.max(0, Math.floor(this.cam.x)), x1 = Math.min(WORLD_W, x0 + 900);
    // fish shadows
    ctx.fillStyle = "rgba(40,70,100,0.18)";
    for (const f of this.fishShadows) {
      const a = this.t * f.s + f.p, x = f.cx + Math.cos(a) * f.r, y = f.cy + Math.sin(a * 1.3) * f.r * 0.4;
      if (!vis(x, y)) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(Math.cos(a * 1.3) * 0.52, -Math.sin(a)));
      ctx.beginPath(); ctx.ellipse(0, 0, 6, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(-9, -1.5, 3, 3); ctx.restore();
    }
    // shimmer dashes
    const ys = Math.max(SHORE_Y, Math.floor(this.cam.y)), ye = Math.min(WORLD_H, this.cam.y + 520);
    for (let y = ys - (ys % 7); y < ye; y += 7) {
      for (let x = x0 - (x0 % 23); x < x1; x += 23) {
        const hsh = hash(x, y);
        if (y < shoreY(x) + 8) continue;
        const ph = Math.sin(this.t * 1.4 + hsh * 12);
        if (ph < 0.2) continue;
        ctx.fillStyle = `rgba(255,255,255,${0.18 * ph + night * 0.04})`;
        ctx.fillRect(x + Math.sin(this.t * 0.8 + y) * 3 + hsh * 10, y, 4 + Math.round(hsh * 4), 1);
      }
    }
    // ripples
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 0.6;
    for (const r of this.ripples) {
      if (!vis(r.x, r.y)) continue;
      ctx.globalAlpha = 1 - r.t / 2.4;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, 2 + r.t * 7, 1 + r.t * 2.5, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // lily pads
    for (const l of this.lily) {
      if (!vis(l.x, l.y)) continue;
      const bob = Math.sin(this.t + l.x) * 0.4;
      ctx.fillStyle = "#5e9a5a"; ctx.beginPath(); ctx.ellipse(l.x, l.y + bob, l.r, l.r * 0.6, 0, 0.3, Math.PI * 2 - 0.1); ctx.lineTo(l.x, l.y + bob); ctx.fill();
      ctx.fillStyle = "#7cb874"; ctx.fillRect(l.x - l.r * 0.5, l.y + bob - 1, l.r * 0.6, 1);
      if (l.flower) { ctx.fillStyle = "#ffc8dc"; ctx.fillRect(l.x - 1, l.y + bob - 2, 3, 2); ctx.fillStyle = "#fff"; ctx.fillRect(l.x, l.y + bob - 2, 1, 1); }
    }
    // reeds
    for (const r of this.reeds) {
      if (!vis(r.x, r.y)) continue;
      const sway = Math.sin(this.t * 1.5 + r.p) * 1.2;
      ctx.strokeStyle = "#5f8a4a"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.quadraticCurveTo(r.x, r.y - r.h / 2, r.x + sway, r.y - r.h); ctx.stroke();
      ctx.fillStyle = "#8a5e40"; ctx.fillRect(r.x + sway - 0.5, r.y - r.h - 1, 1.5, 3);
    }
  }

  private drawLanterns(x: number, top: number, w: number, h: number, night: number) {
    const { ctx } = this;
    for (let i = 0; i < 6; i++) {
      const lx = x - w * 0.36 + (i * w * 0.72) / 5, ly = top + h * (0.5 + (i % 2) * 0.12);
      const sw = Math.sin(this.t * 1.5 + i) * 0.8;
      ctx.fillStyle = "#6b4a3a"; ctx.fillRect(lx + sw, ly - 5, 0.5, 5);
      ctx.fillStyle = night > 0.2 ? "#ffe8a0" : "#f2b66a"; ctx.fillRect(lx - 1 + sw, ly, 3, 3);
    }
  }

  private label(text: string, x: number, y: number, fg: string, bgc: string) {
    const { ctx } = this;
    const w = ctx.measureText(text).width + 6;
    ctx.fillStyle = bgc;
    ctx.fillRect(Math.round(x - w / 2), y - 6, Math.round(w), 8);
    ctx.fillStyle = fg;
    ctx.fillText(text, x, y);
  }
  private bubble(x: number, y: number, t: string) {
    const { ctx } = this;
    ctx.fillStyle = "#fff8fc"; ctx.fillRect(x - 5, y - 7, 10, 9);
    ctx.fillStyle = "#c46e96"; ctx.fillRect(x - 5, y + 2, 10, 1); ctx.fillRect(x - 1, y + 2, 2, 2);
    ctx.fillStyle = "#7a4a8a"; ctx.textAlign = "center"; ctx.font = '600 6px "Pixelify Sans", monospace'; ctx.fillText(t, x, y);
  }
  private drawHeart(x: number, y: number, a: number) {
    const { ctx } = this;
    ctx.globalAlpha = a;
    const px = [[1, 0], [2, 0], [4, 0], [5, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [2, 4], [3, 4], [4, 4], [3, 5]];
    ctx.fillStyle = "#ff6fa8";
    for (const [a1, b1] of px) ctx.fillRect(x - 3.5 + a1!, y + b1!, 1, 1);
    ctx.fillStyle = "#fff"; ctx.fillRect(x - 2.5, y + 1, 1, 1);
    ctx.globalAlpha = 1;
  }
  private pointer(x: number, y: number) {
    const { ctx } = this;
    ctx.fillStyle = "rgba(255,170,210,0.35)";
    ctx.beginPath(); ctx.arc(x, y - 3, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ff8fbf";
    ctx.beginPath(); ctx.moveTo(x - 5, y - 6); ctx.lineTo(x + 5, y - 6); ctx.lineTo(x, y + 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillRect(x - 1, y - 5, 2, 2);
  }
  private drawSign(b: Building) {
    const { ctx } = this;
    const x = b.id === "garden" ? b.door.x - 40 : b.door.x - 24, y = b.door.y + 18;
    ctx.font = '600 5px "Pixelify Sans", monospace';
    const w = Math.max(18, ctx.measureText(b.name).width + 6);
    ctx.fillStyle = "#6b4a3a"; ctx.fillRect(x - 1, y - 6, 2, 7);
    ctx.fillStyle = "#a8785a"; ctx.fillRect(x - w / 2, y - 14, w, 8);
    ctx.fillStyle = "#7a5442"; ctx.fillRect(x - w / 2, y - 7, w, 1);
    ctx.fillStyle = "#fff4e4"; ctx.textAlign = "center"; ctx.fillText(b.name, x, y - 8);
    ctx.font = '600 6px "Pixelify Sans", monospace';
  }
  private drawLamp(l: Lamp) {
    const { ctx } = this;
    const r = (c: string, a: number, b: number, w: number, h: number) => { ctx.fillStyle = c; ctx.fillRect(l.x + a, l.y + b, w, h); };
    r("rgba(60,40,90,0.2)", -4, -1, 8, 2);
    r("#3e3448", -1, -24, 2, 24); r("#3e3448", -3, -2, 6, 2);
    r("#3e3448", -4, -28, 8, 2); r(l.on > 0.5 ? "#fff4d0" : "#e8dcc0", -3, -26, 6, 4); r("#3e3448", -2, -30, 4, 2);
  }
  private drawMailbox(x: number, y: number) {
    const { ctx } = this;
    ctx.fillStyle = "#6b4a3a"; ctx.fillRect(x - 1, y - 10, 2, 10);
    ctx.fillStyle = "#e88aa8"; ctx.fillRect(x - 4, y - 15, 8, 6);
    ctx.fillStyle = "#c4607e"; ctx.fillRect(x - 4, y - 10, 8, 1);
    ctx.fillStyle = "#d9534f"; ctx.fillRect(x + 4, y - 15, 1, 4);
  }
  private pushFence(list: { y: number; draw: () => void }[]) {
    const { x, y, w, h, gap } = YARD;
    const ctx = this.ctx;
    const post = (px: number, py: number, rail: "h" | "v" | null) => () => {
      ctx.fillStyle = "#f4ece4"; ctx.fillRect(px - 1, py - 8, 3, 8);
      ctx.fillStyle = "#d8c8c8"; ctx.fillRect(px - 1, py - 1, 3, 1);
      if (rail === "h") { ctx.fillStyle = "#efe4dc"; ctx.fillRect(px, py - 6, 8, 1); ctx.fillRect(px, py - 3, 8, 1); }
      if (rail === "v") { ctx.fillStyle = "#efe4dc"; ctx.fillRect(px, py - 6, 1, 8); }
    };
    for (let px = x; px <= x + w; px += 8) {
      list.push({ y: y + 2, draw: post(px, y + 2, px + 8 <= x + w ? "h" : null) });
      const inGap = px > x + w / 2 - gap / 2 - 4 && px < x + w / 2 + gap / 2;
      if (!inGap) list.push({ y: y + h, draw: post(px, y + h, px + 8 <= x + w && !(px + 8 > x + w / 2 - gap / 2 && px + 8 < x + w / 2 + gap / 2) ? "h" : null) });
    }
    for (let py = y + 8; py < y + h; py += 8) {
      list.push({ y: py, draw: post(x, py, "v") });
      list.push({ y: py, draw: post(x + w, py, "v") });
    }
  }
  private drawGate() {
    const { ctx } = this;
    const { x, y, w, h } = GATE;
    ctx.fillStyle = "#b8aec4"; ctx.fillRect(x, y - 8, 10, h + 8); ctx.fillRect(x, y + h - 14, 10, 14);
    ctx.fillStyle = "#d6cce0"; ctx.fillRect(x, y - 10, 10, 3);
    ctx.fillStyle = "#3e3448";
    for (let yy = y; yy < y + h - 4; yy += 5) ctx.fillRect(x + 10, yy, w - 10, 1);
    for (let xx = x + 12; xx < x + w; xx += 4) ctx.fillRect(xx, y, 1, h - 4);
    ctx.fillStyle = "#f2d58c"; ctx.fillRect(x + 16, y + h / 2 - 3, 6, 5);
    ctx.fillStyle = "#3e3448"; ctx.fillRect(x + 18, y + h / 2 - 1, 2, 2);
  }

  lampCount() { return this.lamps.length; }
  sceneryCount() { return this.scenery.length; }
  /** splash at the bobber */
  splash(x: number, y: number) { this.ripples.push({ x, y, t: 0, big: true }, { x, y, t: 0.4 }); }
}
