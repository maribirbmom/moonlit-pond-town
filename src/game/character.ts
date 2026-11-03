import { CHARACTER_LOOKS, type CharacterLook } from "./assets";

export type Dir = "down" | "up" | "left" | "right";
export const CHAR_W = 14;
export const CHAR_H = 22;

/** Draws a procedural pixel character with feet at (x, y) in world px. */
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  index: number,
  x: number,
  y: number,
  dir: Dir,
  frame: number,
  bob = 0,
) {
  const L: CharacterLook = CHARACTER_LOOKS[((index % 49) + 49) % 49]!;
  const ox = Math.round(x - CHAR_W / 2);
  const oy = Math.round(y - CHAR_H + bob);
  const r = (c: string, px: number, py: number, w: number, h: number) => {
    ctx.fillStyle = c;
    ctx.fillRect(ox + px, oy + py, w, h);
  };
  // shadow
  ctx.fillStyle = "rgba(60,40,80,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y, 6, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  const step = frame % 2 === 1;
  // legs
  if (dir === "left" || dir === "right") {
    r(L.bottom, 4, 17, 3, step ? 4 : 5);
    r(L.bottom, 7, 17, 3, step ? 5 : 4);
    r("#3a2e3a", step ? 3 : 4, 21, 3, 1);
    r("#3a2e3a", step ? 8 : 7, 21, 3, 1);
  } else {
    r(L.bottom, 3, 17, 3, step ? 4 : 5);
    r(L.bottom, 8, 17, 3, step ? 5 : 4);
    r("#3a2e3a", 3, step ? 20 : 21, 3, 1);
    r("#3a2e3a", 8, step ? 21 : 20, 3, 1);
  }
  // body
  r(L.top, 2, 11, 10, 7);
  if (L.acc === "apron") r(L.accColor!, 4, 12, 6, 6);
  // arms
  if (dir === "down" || dir === "up") {
    r(L.top, 1, 11, 1, 5);
    r(L.top, 12, 11, 1, 5);
    r(L.skin, 1, 16, 1, 1);
    r(L.skin, 12, 16, 1, 1);
  } else {
    r(L.skin, dir === "left" ? 5 : 8, step ? 15 : 16, 2, 1);
  }
  // head
  r(L.skin, 2, 2, 10, 9);
  // hair
  const h = L.hair;
  if (L.style !== "bald") {
    r(h, 2, 1, 10, 3);
    r(h, 3, 0, 8, 1);
  } else {
    r(h, 2, 4, 1, 3);
    r(h, 11, 4, 1, 3);
  }
  if (dir === "up") {
    r(h, 2, 1, 10, L.style === "bald" ? 3 : 9);
  } else {
    if (L.style !== "bald") {
      r(h, 2, 3, 1, 4);
      r(h, 11, 3, 1, 4);
    }
    if (dir === "left") r(h, 7, 3, 5, 5);
    if (dir === "right") r(h, 2, 3, 5, 5);
  }
  if (L.style === "long") {
    r(h, 1, 3, 2, 10);
    r(h, 11, 3, 2, 10);
  }
  if (L.style === "bun") r(h, 5, -2, 4, 3);
  if (L.style === "spiky") {
    r(h, 3, -1, 2, 1);
    r(h, 7, -1, 2, 1);
    r(h, 10, 0, 2, 1);
  }
  if (L.style === "twintails") {
    r(h, -1, 3, 3, 7);
    r(h, 12, 3, 3, 7);
  }
  // face
  if (dir !== "up") {
    const eye = "#2a2230";
    if (dir === "down") {
      r(eye, 4, 6, 1, 2);
      r(eye, 9, 6, 1, 2);
      r("#f2a6b4", 3, 8, 1, 1);
      r("#f2a6b4", 10, 8, 1, 1);
    } else if (dir === "left") r(eye, 3, 6, 1, 2);
    else r(eye, 10, 6, 1, 2);
  }
  if (L.acc === "beard" && dir !== "up") {
    r(L.accColor!, 3, 8, 8, 3);
    if (dir === "down") r(L.skin, 6, 8, 2, 1);
  }
  if (L.acc === "headphones") {
    r(L.accColor!, 1, 4, 2, 3);
    r(L.accColor!, 11, 4, 2, 3);
    r("#3e3e52", 2, 0, 10, 1);
  }
  if (L.acc === "bow") {
    r(L.accColor!, 8, -1, 4, 2);
    r("#8a2a2a", 9, -1, 1, 2);
  }
  if (L.acc === "glasses" && dir === "down") r("#2a2230", 3, 6, 8, 1);
}
