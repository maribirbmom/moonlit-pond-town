import { useEffect, useRef } from "react";
import { drawAvatar, preloadAvatars } from "@/game/avatar";
import type { Avatar } from "@/game/config/items";
export function AvatarPreview({ avatar, large = false }: { avatar: Avatar; large?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { let active = true; void preloadAvatars().then(() => { const c = ref.current, ctx = c?.getContext("2d"); if (!active || !c || !ctx) return; ctx.clearRect(0,0,c.width,c.height); drawAvatar(ctx,avatar,20,38); }); return () => {active=false;}; }, [avatar]);
  return <canvas aria-label="Avatar preview" ref={ref} width={40} height={44} className={`pixelated ${large ? "h-64 w-auto" : "h-11 w-10"}`} />;
}