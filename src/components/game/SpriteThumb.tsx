import { useEffect, useRef } from "react";
import { drawCharacter } from "@/game/character";

export function SpriteThumb({ index, size = 3 }: { index: number; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    drawCharacter(ctx, index, 9, 25, "down", 0);
  }, [index]);
  return <canvas ref={ref} width={18} height={27} className="pixelated" style={{ width: 18 * size, height: 27 * size }} />;
}
