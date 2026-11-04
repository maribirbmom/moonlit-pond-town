import { DEFAULT_AVATAR, HAIR_COLORS, ITEMS, ITEM_ART, SKIN_TONES, type Avatar } from "./config/items";
import type { Dir } from "./character";

const images = new Map<string, HTMLImageElement>();
const tinted = new Map<string, HTMLCanvasElement>();
export async function preloadAvatars() {
  await Promise.all(Object.values(ITEM_ART).map(src => new Promise<void>(resolve => {
    if (images.has(src)) return resolve();
    const image = new Image(); image.crossOrigin = "anonymous";
    image.onload = () => { images.set(src, image); resolve(); }; image.onerror = () => resolve(); image.src = src;
  })));
}
function layer(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, w: number, h: number, color?: string) {
  const item = ITEMS.find(i => i.id === id), image = item?.sprite ? images.get(item.sprite) : null;
  if (!image) return false;
  let art: CanvasImageSource = image;
  if (color) {
    const key = id + color;
    let canvas = tinted.get(key);
    if (!canvas) {
      canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
      const c = canvas.getContext("2d");
      if (c) { c.drawImage(image, 0, 0); c.globalCompositeOperation = "source-atop"; c.globalAlpha = .45; c.fillStyle = color; c.fillRect(0, 0, canvas.width, canvas.height); }
      tinted.set(key, canvas);
    }
    art = canvas;
  }
  ctx.drawImage(art, Math.round(x), Math.round(y), w, h); return true;
}
/** Layered pixel avatar; same renderer is used by editor, town and partner. */
export function drawAvatar(ctx: CanvasRenderingContext2D, a: Avatar = DEFAULT_AVATAR, x: number, y: number, dir: Dir = "down", frame = 0) {
  const ox = Math.round(x - 7), oy = Math.round(y - 24);
  const skin = SKIN_TONES[a.skin] ?? SKIN_TONES[1] ?? "#f5cfad";
  const hair = HAIR_COLORS[a.hairColor] ?? "#75503a";
  const color = (category: "tops" | "bottoms" | "accessories" | "hats") => ITEMS.find(i => i.id === a[category])?.colorways[a.colors[category] ?? 0];
  const r = (c: string, px: number, py: number, w: number, h: number) => { ctx.fillStyle = c; ctx.fillRect(ox + px, oy + py, w, h); };
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "rgba(60,40,80,.2)"; ctx.beginPath(); ctx.ellipse(x, y, 6, 2, 0, 0, Math.PI*2); ctx.fill();
  r(skin, 2, 13, 10, 9); r("#403047",3,23-(frame%2),3,1); r("#403047",8,22+(frame%2),3,1);
  if (!layer(ctx,a.bottoms,ox+2,oy+17,10,6,color("bottoms"))) r(color("bottoms") ?? "#8fc8b4",2,17,10,5);
  r(skin,0,13,2,5); r(skin,12,13,2,5);
  if (!layer(ctx,a.tops,ox+1,oy+11,12,8,color("tops"))) r(color("tops") ?? "#e89aa8",1,11,12,7);
  r(skin,2,3,10,9);
  if (dir !== "up") { r("#302535",dir === "right" ? 9 : 4,7,1,2); if (dir === "down") r("#302535",9,7,1,2); r("#eda2ac",3,10,1,1); }
  layer(ctx,a.hair,ox-1,oy-1,16,14,hair);
  if (dir === "up") r(hair,3,4,8,6);
  const accessory = ITEMS.find(i=>i.id===a.accessories)?.shape;
  if (accessory && accessory !== "none") {
    const c = color("accessories") ?? "#e89aa8";
    if (accessory === "scarf") { r(c,2,11,10,2); r(c,8,13,2,4); }
    if (accessory === "backpack") r(c,dir === "up" ? 3 : 11,13,dir === "up" ? 8 : 2,6);
    if (accessory === "headphones") { r(c,0,5,2,4); r(c,12,5,2,4); r(c,2,1,10,1); }
    if (accessory === "bow") { r(c,8,0,6,3); r("#b45c80",10,1,1,2); }
    if (accessory === "flower crown") { for(let i=0;i<5;i++) r(i%2 ? "#f6d679":c,1+i*3,1,2,2); }
    if (accessory === "bunny ears") { r(c,3,-7,3,8); r(c,8,-7,3,8); }
  }
  if (a.hats === "hat-santa") { r("#dd686b",1,-3,12,5); r("#f9ece2",0,1,14,2); r("#f9ece2",11,-5,3,3); }
  else layer(ctx,a.hats,ox-3,oy-8,20,12,color("hats"));
  if(dir!=="up") {
    if(a.eyewear!=="eyewear-none" && !layer(ctx,a.eyewear,ox+1,oy+6,12,4)) { r("#44344b",2,6,4,3); r("#44344b",8,6,4,3); r("#44344b",6,7,2,1); }
    if(a.moustache!=="moustache-none") layer(ctx,a.moustache,ox+4,oy+10,6,2, a.moustache === "moustache-1" ? "#c86d35" : a.moustache === "moustache-2" ? "#919299" : hair);
  }
  ctx.restore();
}