import { DEFAULT_AVATAR, HAIR_COLORS, ITEMS, SKIN_TONES, type Avatar, type Category } from "./config/items";
import type { Dir } from "./character";

/**
 * Procedural avatar. Every garment is drawn from the same body grid (14 wide, feet at row 23),
 * so nothing can drift out of alignment:
 *   head   x2-11  y3-11      torso x2-11  y12-18      arms x0-1 / x12-13
 *   skirt/shorts/pants y18-22      legs x3-5 / x8-10      shoes y22-23
 */
export async function preloadAvatars() { /* nothing to load: all art is drawn in code */ }

type Rect = (c: string, x: number, y: number, w: number, h: number) => void;

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16), t = amt < 0 ? 0 : 255, k = Math.abs(amt);
  const f = (v: number) => Math.round(v + (t - v) * k);
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function colorOf(a: Avatar, cat: Category, id: string) {
  const it = ITEMS.find(i => i.id === id), idx = a.colors[cat];
  return (idx !== undefined ? it?.colorways[idx] : it?.base) ?? it?.colorways[0] ?? "#e89aa8";
}

function drawBottoms(r: Rect, shape: string, c: string, step: number) {
  const dk = shade(c, -0.22);
  r(dk, 2, 18, 10, 1); // waistband
  if (shape === "skirt") {
    r(c, 2, 19, 10, 1); r(c, 1, 20, 12, 1); r(c, 1, 21, 12, 1);
    r(dk, 1, 21, 12, 1);
    r(shade(c, 0.25), 4, 20, 1, 1); r(shade(c, 0.25), 9, 20, 1, 1);
    return;
  }
  const len = shape === "shorts" ? 20 : 22; // last row of fabric
  r(c, 2, 19, 10, len - 18);
  r(dk, 6, 19, 2, len - 18); // centre seam gap
  if (shape === "jeans") {
    r(shade(c, 0.3), 4, 20, 1, 1); r(shade(c, 0.3), 9, 21, 1, 1); // rips/fading
    r(dk, 3, 22, 3, 1); r(dk, 8, 22, 3, 1);
  } else if (shape === "pants") { r(dk, 3, 22, 3, 1); r(dk, 8, 22, 3, 1); }
  else { r(dk, 2, 20, 4, 1); r(dk, 8, 20, 4, 1); } // shorts hem
  void step;
}

function drawTop(r: Rect, id: string, c: string, front: boolean) {
  const dk = shade(c, -0.2), lt = shade(c, 0.35);
  r(c, 2, 12, 10, 7); // torso
  r(c, 0, 12, 2, 3); r(c, 12, 12, 2, 3); // sleeves
  r(dk, 0, 14, 2, 1); r(dk, 12, 14, 2, 1); // sleeve hems
  r(dk, 2, 18, 10, 1); // hem shadow
  const n = Number(id.slice(4));
  if (front) {
    r(dk, 5, 12, 4, 1); // neckline
    if (n === 1) { r("#fff2a8", 4, 14, 1, 1); r("#fff2a8", 9, 16, 1, 1); r("#fff2a8", 7, 15, 1, 1); }
    if (n === 2) { r(lt, 2, 15, 10, 1); r(lt, 2, 17, 10, 1); }
    if (n === 3) { r("#e8506a", 5, 14, 2, 1); r("#e8506a", 8, 14, 2, 1); r("#e8506a", 5, 15, 5, 1); r("#e8506a", 6, 16, 3, 1); r("#e8506a", 7, 17, 1, 1); }
    if (n === 4) { r(lt, 4, 12, 6, 1); r(dk, 8, 15, 3, 3); r(c, 9, 16, 1, 1); }
    if (n === 5) { r("#e8708f", 4, 12, 6, 1); r("#e8708f", 3, 13, 2, 2); r("#e8708f", 9, 13, 2, 2); r("#c0506f", 6, 13, 2, 2); }
    if (n === 6) { r("#fff6e6", 0, 12, 2, 1); r("#fff6e6", 12, 12, 2, 1); r("#fff6e6", 2, 12, 10, 1); r(dk, 5, 12, 4, 1); }
    if (n === 7) { r(lt, 2, 15, 3, 1); r(lt, 5, 16, 3, 1); r(lt, 8, 15, 3, 1); r(lt, 2, 17, 3, 1); r(lt, 8, 17, 3, 1); }
  } else if (n === 6) { r("#fff6e6", 0, 12, 2, 1); r("#fff6e6", 12, 12, 2, 1); }
}

type Hair = { cap: number; extra: [number, number, number, number][]; front: [number, number, number, number][] };
const HAIRS: Hair[] = [
  { cap: 1, front: [[2, 3, 10, 1], [2, 4, 3, 1], [9, 4, 3, 1]], extra: [[2, 5, 1, 3], [11, 5, 1, 3], [0, 4, 2, 7], [12, 4, 2, 7], [0, 5, 2, 1]] }, // twin tails
  { cap: 1, front: [[2, 3, 10, 1], [2, 4, 5, 1]], extra: [[2, 5, 1, 2], [11, 5, 1, 2]] }, // pixie
  { cap: 0, front: [[2, 3, 10, 1], [3, 4, 2, 1], [7, 4, 3, 1]], extra: [[1, 3, 2, 7], [11, 3, 2, 7], [1, 10, 1, 1], [12, 10, 1, 1]] }, // curls
  { cap: 1, front: [[2, 3, 10, 2]], extra: [[2, 5, 1, 4], [11, 5, 1, 4]] }, // fringe
  { cap: 1, front: [[2, 3, 10, 1], [2, 4, 4, 1], [8, 4, 4, 1]], extra: [[1, 4, 2, 13], [11, 4, 2, 13]] }, // long waves
  { cap: 1, front: [[2, 3, 10, 2]], extra: [[1, 4, 2, 7], [11, 4, 2, 7], [2, 11, 1, 1], [11, 11, 1, 1]] }, // bob
  { cap: 1, front: [[2, 3, 10, 1], [2, 4, 6, 1]], extra: [[2, 5, 1, 3], [11, 4, 2, 4], [12, 8, 2, 4], [11, 12, 2, 3], [11, 15, 1, 1]] }, // side braid
  { cap: 0, front: [[2, 3, 10, 1], [3, 4, 2, 1], [6, 4, 2, 1], [9, 4, 2, 1]], extra: [[2, 5, 1, 2], [11, 5, 1, 2], [4, -1, 1, 1], [7, -1, 2, 1], [10, 0, 1, 1]] }, // tousled
];

function drawHair(r: Rect, id: string, c: string, dir: Dir) {
  const h = HAIRS[Number(id.slice(5))] ?? HAIRS[0]!, dk = shade(c, -0.18);
  r(c, 3, h.cap, 8, 1); r(c, 2, h.cap + 1, 10, 3 - h.cap); // crown
  if (dir === "up") { r(c, 2, 3, 10, 8); r(dk, 3, 9, 8, 1); }
  else if (dir === "left") { r(c, 6, 3, 6, 7); for (const [x, y, w, hh] of h.front) if (x < 8) r(c, x, y, w, hh); }
  else if (dir === "right") { r(c, 2, 3, 6, 7); for (const [x, y, w, hh] of h.front) if (x + w > 6) r(c, x, y, w, hh); }
  else for (const [x, y, w, hh] of h.front) r(c, x, y, w, hh);
  for (const [x, y, w, hh] of h.extra) r(c, x, y, w, hh);
  r(dk, 3, h.cap, 1, 1); // soft highlight break
  if (id === "hair-0") { r("#e8708f", 0, 4, 2, 1); r("#e8708f", 12, 4, 2, 1); }
}

function drawHat(r: Rect, shape: string, c: string) {
  const dk = shade(c, -0.22), lt = shade(c, 0.3);
  if (shape === "santa") { r(c, 2, 0, 10, 3); r(c, 4, -2, 6, 2); r(c, 8, -4, 3, 2); r("#f9ece2", 1, 2, 12, 2); r("#f9ece2", 10, -5, 3, 3); }
  if (shape === "witch") { r(c, -1, 1, 16, 2); r(c, 3, -1, 8, 2); r(c, 5, -4, 4, 3); r(c, 7, -6, 3, 2); r("#f0c850", 3, 0, 8, 1); r(dk, 2, 2, 10, 1); }
  if (shape === "straw") { r(c, -1, 1, 16, 2); r(c, 3, -2, 8, 3); r(dk, 3, 0, 8, 1); r(lt, -1, 2, 16, 1); r("#e8708f", 3, 0, 8, 1); }
  if (shape === "beret") { r(c, 1, -1, 11, 3); r(c, 3, -2, 7, 1); r(dk, 1, 2, 11, 1); r(c, 6, -3, 2, 1); }
  if (shape === "beanie") { r(c, 2, -1, 10, 4); r(c, 4, -2, 6, 1); r(dk, 2, 2, 10, 1); r(lt, 3, 0, 1, 1); r(lt, 6, 0, 1, 1); r(lt, 9, 0, 1, 1); r(lt, 6, -3, 2, 1); }
  if (shape === "crown") { r(c, 3, 0, 8, 2); r(c, 3, -2, 1, 2); r(c, 6, -3, 2, 3); r(c, 10, -2, 1, 2); r("#e8506a", 6, 1, 2, 1); r(dk, 3, 2, 8, 1); }
}

function drawEyewear(r: Rect, shape: string, dir: Dir) {
  if (dir === "up") return;
  if (dir !== "down") { const x = dir === "left" ? 3 : 8; r("#44344b", x, 6, 3, 3); r("#cfe6f0", x + 1, 7, 1, 1); return; }
  if (shape === "sunglasses") { r("#2b2433", 3, 6, 4, 3); r("#2b2433", 8, 6, 4, 3); r("#2b2433", 7, 6, 1, 1); r("#8c7aa8", 4, 6, 1, 1); r("#8c7aa8", 9, 6, 1, 1); return; }
  const f = shape === "square" ? "#5b4a68" : "#c7943d";
  r(f, 3, 6, 4, 1); r(f, 3, 9, 4, 1); r(f, 3, 7, 1, 2); r(f, 6, 7, 1, 2);
  r(f, 8, 6, 4, 1); r(f, 8, 9, 4, 1); r(f, 8, 7, 1, 2); r(f, 11, 7, 1, 2); r(f, 7, 7, 1, 1);
  r("rgba(200,230,245,.55)", 4, 7, 2, 2); r("rgba(200,230,245,.55)", 9, 7, 2, 2);
}

function drawAccessory(r: Rect, shape: string, c: string, dir: Dir) {
  const dk = shade(c, -0.22);
  if (shape === "scarf") { r(c, 2, 11, 10, 2); r(dk, 2, 12, 10, 1); if (dir !== "up") { r(c, 8, 13, 2, 4); r(dk, 8, 16, 2, 1); } }
  if (shape === "backpack") { if (dir === "up") { r(c, 3, 12, 8, 7); r(dk, 3, 16, 8, 1); r(shade(c, .3), 5, 13, 4, 2); } else { r(dk, 3, 12, 1, 5); r(dk, 10, 12, 1, 5); if (dir !== "down") r(c, dir === "left" ? 11 : 1, 13, 2, 5); } }
  if (shape === "headphones") { r(c, 1, 5, 2, 4); r(c, 11, 5, 2, 4); r("#3e3e52", 2, 2, 10, 1); r("#3e3e52", 2, 3, 1, 2); r("#3e3e52", 11, 3, 1, 2); }
  if (shape === "bow") { r(c, 7, 1, 2, 3); r(c, 10, 1, 2, 3); r(dk, 9, 2, 1, 1); }
  if (shape === "flower crown") { r("#7cb87a", 2, 2, 10, 1); for (let i = 0; i < 4; i++) { r(i % 2 ? "#f6d679" : c, 2 + i * 3, 1, 2, 2); } }
  if (shape === "bunny ears") { r(c, 3, -7, 3, 8); r(c, 8, -7, 3, 8); r("#f6c7d4", 4, -6, 1, 5); r("#f6c7d4", 9, -6, 1, 5); }
}

/** Layered pixel avatar; same renderer is used by editor, town and partner. */
export function drawAvatar(ctx: CanvasRenderingContext2D, a: Avatar = DEFAULT_AVATAR, x: number, y: number, dir: Dir = "down", frame = 0) {
  const ox = Math.round(x - 7), oy = Math.round(y - 24);
  const skin = SKIN_TONES[a.skin] ?? "#f5cfad", skinDk = shade(skin, -0.12);
  const hairC = HAIR_COLORS[a.hairColor] ?? "#75503a";
  const r: Rect = (c, px, py, w, h) => { ctx.fillStyle = c; ctx.fillRect(ox + px, oy + py, w, h); };
  const item = (id: string) => ITEMS.find(i => i.id === id);
  const step = frame % 2;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "rgba(60,40,80,.2)"; ctx.beginPath(); ctx.ellipse(x, y, 6, 2, 0, 0, Math.PI * 2); ctx.fill();
  // legs + shoes (both planted when standing, alternate lift when walking)
  const lift = frame === 0 ? [0, 0] : step ? [1, 0] : [0, 1];
  r(skin, 3, 19, 3, 3 - lift[0]!); r(skin, 8, 19, 3, 3 - lift[1]!);
  r("#403047", 3, 22 - lift[0]!, 3, 1); r("#403047", 8, 22 - lift[1]!, 3, 1);
  // torso / arms (skin base so short sleeves show bare arms)
  r(skin, 2, 11, 10, 8); r(skin, 0, 12, 2, 6); r(skin, 12, 12, 2, 6); r(skinDk, 5, 11, 4, 1);
  // bottoms then top
  const bShape = item(a.bottoms)?.shape ?? "shorts";
  drawBottoms(r, bShape, colorOf(a, "bottoms", a.bottoms), step);
  drawTop(r, a.tops, colorOf(a, "tops", a.tops), dir !== "up");
  // head
  r(skin, 2, 3, 10, 9); r(skin, 2, 11, 10, 1);
  if (dir !== "up") {
    const eye = "#302535";
    if (dir === "down") { r(eye, 4, 7, 1, 2); r(eye, 9, 7, 1, 2); r("#eda2ac", 3, 9, 1, 1); r("#eda2ac", 10, 9, 1, 1); }
    else { r(eye, dir === "left" ? 3 : 10, 7, 1, 2); r("#eda2ac", dir === "left" ? 4 : 9, 9, 1, 1); }
  }
  if (a.moustache !== "moustache-none" && dir !== "up") {
    const mc = colorOf(a, "moustache", a.moustache);
    if (dir === "down") { r(mc, 4, 10, 6, 1); r(mc, 4, 11, 1, 1); r(mc, 9, 11, 1, 1); }
    else r(mc, dir === "left" ? 2 : 8, 10, 4, 1);
  }
  const acc = item(a.accessories)?.shape;
  const accC = colorOf(a, "accessories", a.accessories);
  const behind = acc === "backpack" && dir === "up";
  if (acc && acc !== "none" && acc !== "headphones" && acc !== "bow" && acc !== "flower crown" && acc !== "bunny ears" && !behind) drawAccessory(r, acc, accC, dir);
  if (acc === "bunny ears") drawAccessory(r, acc, accC, dir);
  drawHair(r, a.hair, hairC, dir);
  if (a.eyewear !== "eyewear-none") drawEyewear(r, item(a.eyewear)?.shape ?? "", dir);
  if (acc === "headphones" || acc === "bow" || acc === "flower crown" || behind) drawAccessory(r, acc, accC, dir);
  const hat = item(a.hats)?.shape;
  if (hat && a.hats !== "hat-none") drawHat(r, hat, colorOf(a, "hats", a.hats));
  ctx.restore();
}
