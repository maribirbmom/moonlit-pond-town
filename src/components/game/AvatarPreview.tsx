import { useEffect, useRef } from "react";
import { drawAvatar } from "@/game/avatar";
import type { Avatar, Category } from "@/game/config/items";
export function AvatarPreview({ avatar, large = false }: { avatar: Avatar; large?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const c = ref.current, ctx = c?.getContext("2d"); if (!c || !ctx) return; ctx.clearRect(0, 0, c.width, c.height); drawAvatar(ctx, avatar, 20, 38); }, [avatar]);
  return <canvas aria-label="Avatar preview" ref={ref} width={40} height={44} className={`pixelated ${large ? "h-64 w-auto" : "h-11 w-10"}`} />;
}
const HEAD: Category[] = ["hair", "hats", "eyewear", "moustache"];
/** Tile thumbnail: the current avatar wearing this item, cropped to the relevant body area. */
export function ItemThumb({ avatar, category, id }: { avatar: Avatar; category: Category; id: string }) {
  const ref = useRef<HTMLCanvasElement>(null), head = HEAD.includes(category);
  useEffect(() => {
    const c = ref.current, ctx = c?.getContext("2d"); if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    drawAvatar(ctx, { ...avatar, [category]: id }, head ? 12 : 10, head ? 33 : 26);
  }, [avatar, category, id, head]);
  return head
    ? <canvas ref={ref} width={24} height={24} className="pixelated h-12 w-12" aria-hidden />
    : <canvas ref={ref} width={20} height={28} className="pixelated h-14 w-10" aria-hidden />;
}
