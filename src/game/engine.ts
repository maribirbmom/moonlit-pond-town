import { BUILDING_ART, TREE_ART } from "./assets";
import { drawCharacter, type Dir } from "./character";
import { BUILDINGS, DECOR, GATE, PATHS, PLOTS, WORLD_H, WORLD_W, YARD, distToPaths, rng, type Building } from "./map";
import { NPCS, type NpcDef } from "./npcs";

interface Rect { x: number; y: number; w: number; h: number }
interface Tree { x: number; y: number; v: number; w: number }
export interface PlayerState { x: number; y: number; dir: Dir }
export type Nearby = { kind: "npc"; npc: NpcDef } | { kind: "gate" } | null;

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

export class GameEngine {
  private ctx: CanvasRenderingContext2D;
  private bg!: HTMLCanvasElement;
  private imgs = new Map<string, HTMLImageElement>();
  private trees: Tree[] = [];
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
  paused = false;
  showPointers = true;
  player: PlayerState;

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: { sprite: number; name: string; start: PlayerState; onNearby: (n: Nearby) => void },
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.player = { ...opts.start };
  }

  async start() {
    const srcs = [...Object.values(BUILDING_ART), ...TREE_ART];
    const loaded = await Promise.all(srcs.map(loadImg));
    srcs.forEach((s, i) => this.imgs.set(s, loaded[i]!));
    this.buildSolids();
    this.placeTrees();
    this.bg = this.buildBackground();
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

  private bSize(b: Building) {
    if (!b.art) return { w: b.w, h: 0 };
    const img = this.imgs.get(BUILDING_ART[b.art]);
    const h = img && img.width ? (b.w * img.height) / img.width : b.w;
    return { w: b.w, h };
  }

  private buildSolids() {
    const s: Rect[] = [];
    for (const b of BUILDINGS) {
      if (!b.art) continue;
      s.push({ x: b.x - b.w / 2 + 6, y: b.y - b.depth, w: b.w - 12, h: b.depth - 3 });
    }
    // world bounds
    s.push({ x: -20, y: -20, w: WORLD_W + 40, h: 20 }, { x: -20, y: WORLD_H, w: WORLD_W + 40, h: 20 }, { x: -20, y: 0, w: 20, h: WORLD_H }, { x: WORLD_W, y: 0, w: 20, h: WORLD_H });
    // yard fence
    const { x, y, w, h, gap } = YARD;
    s.push({ x, y, w, h: 4 }, { x, y, w: 4, h }, { x: x + w - 4, y, w: 4, h });
    s.push({ x, y: y + h - 4, w: w / 2 - gap / 2, h: 4 }, { x: x + w / 2 + gap / 2, y: y + h - 4, w: w / 2 - gap / 2, h: 4 });
    s.push({ x: GATE.x - 4, y: GATE.y, w: GATE.w + 4, h: GATE.h });
    for (const d of DECOR) {
      if (d.kind === "lamp") s.push({ x: d.x - 3, y: d.y - 3, w: 6, h: 4 });
      if (d.kind === "bench") s.push({ x: d.x - 12, y: d.y - 6, w: 24, h: 6 });
      if (d.kind === "log") s.push({ x: d.x - 10, y: d.y - 5, w: 20, h: 6 });
    }
    s.push({ x: 614, y: 496, w: 6, h: 4 }); // mailbox
    for (const n of NPCS) {
      const p = this.npcPos(n);
      s.push({ x: p.x - 5, y: p.y - 4, w: 10, h: 5 });
    }
    this.solids = s;
  }

  npcPos(n: NpcDef) {
    const b = BUILDINGS.find((b) => b.id === n.shop)!;
    return { x: b.door.x + n.offset.x, y: b.door.y + n.offset.y };
  }

  private placeTrees() {
    const r = rng(7);
    const blocked = (x: number, y: number) => {
      if (distToPaths(x, y) < 16) return true;
      for (const b of BUILDINGS) {
        const { w, h } = this.bSize(b);
        if (b.id === "garden") { if (x > 520 && x < 810 && y > 630 && y < 790) return true; continue; }
        if (x > b.x - w / 2 - 14 && x < b.x + w / 2 + 14 && y > b.y - h * 0.6 && y < b.y + 30) return true;
      }
      if (x > YARD.x - 16 && x < YARD.x + YARD.w + 16 && y > YARD.y - 10 && y < YARD.y + YARD.h + 24) return true;
      if (x > 1020 && y > 200 && y < 330) return true;
      for (const d of DECOR) if (Math.hypot(d.x - x, d.y - y) < 26) return true;
      for (const n of NPCS) { const p = this.npcPos(n); if (Math.hypot(p.x - x, p.y - y) < 30) return true; }
      for (const t of this.trees) if (Math.hypot(t.x - x, t.y - y) < 30) return true;
      return false;
    };
    for (let i = 0; i < 2500 && this.trees.length < 70; i++) {
      const x = 12 + r() * (WORLD_W - 24);
      const y = 40 + r() * (WORLD_H - 40);
      if (blocked(x, y)) continue;
      const w = 34 + r() * 12;
      this.trees.push({ x, y, v: Math.floor(r() * 6), w });
      this.solids.push({ x: x - 4, y: y - 4, w: 8, h: 5 });
    }
  }

  private buildBackground() {
    const c = document.createElement("canvas");
    c.width = WORLD_W; c.height = WORLD_H;
    const g = c.getContext("2d")!;
    // path mask
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
    for (let y = 0; y < WORLD_H; y++) for (let x = 0; x < WORLD_W; x++) {
      const i = (y * WORLD_W + x) * 4;
      let col: number[];
      if (isP(x, y)) {
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
    for (let i = 0; i < 160; i++) {
      const x = Math.floor(fr() * WORLD_W), y = Math.floor(fr() * WORLD_H);
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
    // yard: grass lighter + flower beds
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
    return c;
  }

  private collides(x: number, y: number) {
    const px = x - 5, py = y - 4, pw = 10, ph = 4;
    for (const s of this.solids) if (px < s.x + s.w && px + pw > s.x && py < s.y + s.h && py + ph > s.y) return true;
    return false;
  }

  private update(dt: number) {
    this.t += dt;
    let dx = 0, dy = 0;
    if (!this.paused) {
      const k = this.keys;
      if (k.has("left")) dx -= 1;
      if (k.has("right")) dx += 1;
      if (k.has("up")) dy -= 1;
      if (k.has("down")) dy += 1;
      if (dx && dy) dy = 0; // 4-direction movement
    }
    this.moving = !!(dx || dy);
    if (this.moving) {
      this.player.dir = dx < 0 ? "left" : dx > 0 ? "right" : dy < 0 ? "up" : "down";
      this.walkT += dt;
      const nx = this.player.x + dx * SPEED * dt, ny = this.player.y + dy * SPEED * dt;
      if (!this.collides(nx, this.player.y)) this.player.x = nx;
      if (!this.collides(this.player.x, ny)) this.player.y = ny;
    }
    // nearby check
    let near: Nearby = null, best = 28;
    for (const n of NPCS) {
      const p = this.npcPos(n);
      const dd = Math.hypot(p.x - this.player.x, p.y - this.player.y);
      if (dd < best) { best = dd; near = { kind: "npc", npc: n }; }
    }
    if (!near && this.player.x > 1030 && Math.abs(this.player.y - 280) < 50) near = { kind: "gate" };
    const key = (n: Nearby) => (n ? (n.kind === "npc" ? n.npc.id : "gate") : "");
    if (key(near) !== key(this.nearby)) { this.nearby = near; this.opts.onNearby(near); }
  }

  /** world coords -> nearest NPC within reach of a tap */
  npcAtScreen(sx: number, sy: number): NpcDef | null {
    const wx = sx / this.scale + this.cam.x, wy = sy / this.scale + this.cam.y;
    for (const n of NPCS) {
      const p = this.npcPos(n);
      if (Math.abs(wx - p.x) < 12 && wy > p.y - 26 && wy < p.y + 4 && Math.hypot(p.x - this.player.x, p.y - this.player.y) < 50) return n;
    }
    return null;
  }

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

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#cbb7d9";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(S * dpr, 0, 0, S * dpr, -this.cam.x * S * dpr, -this.cam.y * S * dpr);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.bg, 0, 0);

    type D = { y: number; draw: () => void };
    const list: D[] = [];
    for (const b of BUILDINGS) {
      if (!b.art) continue;
      const img = this.imgs.get(BUILDING_ART[b.art])!;
      const { w, h } = this.bSize(b);
      list.push({ y: b.y - b.depth / 2, draw: () => {
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, b.x - w / 2, b.y - h, w, h);
        ctx.imageSmoothingEnabled = false;
      } });
    }
    for (const t of this.trees) {
      const img = this.imgs.get(TREE_ART[t.v]!)!;
      const h = img.width ? (t.w * img.height) / img.width : t.w * 1.5;
      list.push({ y: t.y, draw: () => {
        ctx.fillStyle = "rgba(60,40,90,0.18)";
        ctx.beginPath(); ctx.ellipse(t.x, t.y, t.w * 0.32, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(img, t.x - t.w / 2, t.y - h + 2, t.w, h);
        ctx.imageSmoothingEnabled = false;
      } });
    }
    for (const dcr of DECOR) list.push({ y: dcr.y, draw: () => this.drawDecor(dcr.kind, dcr.x, dcr.y) });
    this.pushFence(list);
    list.push({ y: 500, draw: () => this.drawMailbox(617, 500) });
    list.push({ y: GATE.y + GATE.h, draw: () => this.drawGate() });
    for (const b of BUILDINGS) if (b.id !== "home") list.push({ y: b.door.y + 18, draw: () => this.drawSign(b) });
    NPCS.forEach((n, i) => {
      const p = this.npcPos(n);
      const bob = Math.round(Math.sin(this.t * 2.2 + i) * 0.6 - 0.4);
      list.push({ y: p.y, draw: () => drawCharacter(ctx, n.sprite, p.x, p.y, "down", 0, bob) });
    });
    const frame = this.moving ? Math.floor(this.walkT * 7) % 2 + 1 : 0;
    list.push({ y: this.player.y, draw: () => drawCharacter(ctx, this.opts.sprite, this.player.x, this.player.y, this.player.dir, frame) });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) it.draw();

    // lamp glows
    ctx.globalCompositeOperation = "lighter";
    for (const dcr of DECOR) if (dcr.kind === "lamp") {
      const gr = ctx.createRadialGradient(dcr.x, dcr.y - 20, 0, dcr.x, dcr.y - 20, 22);
      gr.addColorStop(0, "rgba(255,220,180,0.35)"); gr.addColorStop(1, "rgba(255,200,220,0)");
      ctx.fillStyle = gr; ctx.fillRect(dcr.x - 22, dcr.y - 42, 44, 44);
    }
    ctx.globalCompositeOperation = "source-over";

    // labels & pointers
    ctx.textAlign = "center";
    ctx.font = '600 6px "Pixelify Sans", monospace';
    this.label(this.opts.name, this.player.x, this.player.y - 26, "#ffffff", "rgba(90,60,110,0.75)");
    for (const n of NPCS) {
      const p = this.npcPos(n);
      this.label(n.name, p.x, p.y - 26, "#fff4fa", "rgba(196,110,150,0.8)");
      if (this.nearby?.kind === "npc" && this.nearby.npc.id === n.id) this.bubble(p.x + 10, p.y - 36);
    }
    if (this.showPointers) {
      for (const b of BUILDINGS) {
        if (b.id === "home") continue;
        const yy = (b.id === "garden" ? b.door.y : b.door.y - 36) + Math.sin(this.t * 3 + b.x) * 2;
        this.pointer(b.door.x, yy);
      }
      this.pointer(GATE.x + 8, GATE.y - 10 + Math.sin(this.t * 3) * 2);
    }

    // floating petals (screen space)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const p of this.petals) {
      p.y += 0.00025 * p.s * 60 * (1 / 60) * 60;
      if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); }
      const x = (p.x + Math.sin(this.t * 0.6 + p.p) * 0.02) * cw;
      ctx.fillStyle = p.p % 3 === 0 ? "rgba(255,255,255,0.75)" : "rgba(255,190,215,0.7)";
      const sz = Math.round(S * (p.p % 2 ? 1 : 1.5));
      ctx.fillRect(Math.round(x), Math.round(p.y * ch), sz, sz);
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
  private bubble(x: number, y: number) {
    const { ctx } = this;
    ctx.fillStyle = "#fff8fc"; ctx.fillRect(x - 5, y - 7, 10, 9);
    ctx.fillStyle = "#c46e96"; ctx.fillRect(x - 5, y + 2, 10, 1); ctx.fillRect(x - 1, y + 2, 2, 2);
    ctx.fillStyle = "#7a4a8a"; ctx.fillText("E", x, y);
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
  private drawDecor(kind: string, x: number, y: number) {
    const { ctx } = this;
    const r = (c: string, a: number, b: number, w: number, h: number) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
    if (kind === "lamp") {
      r("rgba(60,40,90,0.2)", -4, -1, 8, 2);
      r("#3e3448", -1, -24, 2, 24); r("#3e3448", -3, -2, 6, 2);
      r("#3e3448", -4, -28, 8, 2); r("#ffe6b8", -3, -26, 6, 4); r("#3e3448", -2, -30, 4, 2);
    } else if (kind === "bench") {
      r("rgba(60,40,90,0.2)", -13, -1, 26, 2);
      r("#7a5442", -12, -6, 2, 6); r("#7a5442", 10, -6, 2, 6);
      r("#b07e5c", -13, -8, 26, 3); r("#9a6a4c", -13, -13, 26, 3); r("#7a5442", -12, -10, 2, 2); r("#7a5442", 10, -10, 2, 2);
    } else if (kind === "log") {
      r("rgba(60,40,90,0.2)", -11, 0, 22, 2);
      r("#8a5e40", -10, -7, 20, 7); r("#a8785a", -10, -7, 20, 2);
      r("#d8b48a", 8, -7, 3, 7); r("#a8785a", 9, -5, 1, 3);
    }
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
}
