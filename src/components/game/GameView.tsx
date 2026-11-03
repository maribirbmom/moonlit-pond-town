import { useEffect, useRef, useState } from "react";
import { GameEngine, type Nearby } from "@/game/engine";
import { SPAWN } from "@/game/map";
import type { NpcDef } from "@/game/npcs";
import { loadSave, writeSave } from "@/game/save";
import { supabase } from "@/integrations/supabase/client";
import { SpriteThumb } from "./SpriteThumb";

const KEYMAP: Record<string, string> = { ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down", ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };

export function GameView({ userId, name, sprite }: { userId: string; name: string; sprite: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [nearby, setNearby] = useState<Nearby>(null);
  const [dialog, setDialog] = useState<{ npc: NpcDef; line: number; shown: number } | null>(null);
  const [pointers, setPointers] = useState(true);
  const [menu, setMenu] = useState(false);
  const [playing, setPlaying] = useState(false);
  const nearbyRef = useRef<Nearby>(null);
  const dialogRef = useRef(dialog);
  dialogRef.current = dialog;

  useEffect(() => {
    let eng: GameEngine | null = null;
    let cancelled = false;
    (async () => {
      const save = await loadSave(userId);
      if (cancelled) return;
      eng = new GameEngine(canvasRef.current!, {
        sprite, name,
        start: save?.player ?? { x: SPAWN.x, y: SPAWN.y, dir: "down" },
        onNearby: (n) => { nearbyRef.current = n; setNearby(n); },
      });
      engineRef.current = eng;
      if (import.meta.env.DEV) (window as unknown as { __eng: GameEngine }).__eng = eng;
      await eng.start();
    })();
    const persist = () => { const e = engineRef.current; if (e) void writeSave(userId, { version: 1, level: "hub", player: { ...e.player } }); };
    const iv = setInterval(persist, 10000);
    window.addEventListener("beforeunload", persist);
    return () => { cancelled = true; persist(); clearInterval(iv); window.removeEventListener("beforeunload", persist); eng?.stop(); };
  }, [userId, sprite, name]);

  const openNpc = (npc: NpcDef) => { setDialog({ npc, line: 0, shown: 0 }); if (engineRef.current) { engineRef.current.paused = true; engineRef.current.clearKeys(); } };
  const advance = () => {
    const d = dialogRef.current;
    if (!d) return;
    const full = d.npc.dialogue[d.line]!.length;
    if (d.shown < full) return setDialog({ ...d, shown: full });
    if (d.line + 1 < d.npc.dialogue.length) return setDialog({ ...d, line: d.line + 1, shown: 0 });
    setDialog(null);
    if (engineRef.current) engineRef.current.paused = false;
  };
  const interact = () => {
    if (dialogRef.current) return advance();
    const n = nearbyRef.current;
    if (n?.kind === "npc") openNpc(n.npc);
  };

  // typewriter
  useEffect(() => {
    if (!dialog) return;
    const full = dialog.npc.dialogue[dialog.line]!.length;
    if (dialog.shown >= full) return;
    const t = setTimeout(() => setDialog((d) => (d ? { ...d, shown: d.shown + 1 } : d)), 28);
    return () => clearTimeout(t);
  }, [dialog]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const k = KEYMAP[e.key];
      if (k) { e.preventDefault(); if (!dialogRef.current) engineRef.current?.setKey(k, true); }
      if (e.key === "e" || e.key === "E" || e.key === " " || e.key === "Enter") { e.preventDefault(); interact(); }
      if (e.key === "p" || e.key === "P" || e.key === "?") togglePointers();
    };
    const up = (e: KeyboardEvent) => { const k = KEYMAP[e.key]; if (k) engineRef.current?.setKey(k, false); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePointers = () => setPointers((p) => { const v = !p; if (engineRef.current) engineRef.current.showPointers = v; return v; });

  const onCanvasClick = (e: React.MouseEvent) => {
    if (dialogRef.current) return advance();
    const r = (e.target as HTMLElement).getBoundingClientRect();
    const npc = engineRef.current?.npcAtScreen(e.clientX - r.left, e.clientY - r.top);
    if (npc) openNpc(npc);
  };

  const dpad = (k: string) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); engineRef.current?.setKey(k, true); },
    onPointerUp: () => engineRef.current?.setKey(k, false),
    onPointerLeave: () => engineRef.current?.setKey(k, false),
  });

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-lavender select-none">
      <canvas ref={canvasRef} onClick={onCanvasClick} className="pixelated absolute inset-0 h-full w-full" />
      <div className="overlay-tint pointer-events-none absolute inset-0 mix-blend-soft-light" />
      <div className="vignette pointer-events-none absolute inset-0" />

      {/* top-left title + hint */}
      <div className="absolute left-3 top-3 flex items-center gap-2">
        <div className="pixel-panel px-3 py-1 text-lg font-bold">Wedding City</div>
        <button onClick={togglePointers} className={`pixel-btn h-9 w-9 text-lg font-bold ${pointers ? "" : "opacity-60"}`} aria-label="Toggle location pointers" title="Location pointers (P)">?</button>
      </div>

      {/* profile */}
      <div className="absolute right-3 top-3">
        <button onClick={() => setMenu((m) => !m)} className="pixel-panel flex items-center gap-2 px-2 py-1" aria-label="Profile menu">
          <SpriteThumb index={sprite} size={1.6} />
          <span className="max-w-28 truncate font-semibold">{name}</span>
        </button>
        {menu && (
          <div className="pixel-panel absolute right-0 mt-2 w-44 p-2">
            <p className="px-2 pb-2 text-sm text-muted-foreground">Signed in as <b className="text-foreground">{name}</b></p>
            <p className="px-2 pb-2 text-xs text-muted-foreground">Auto-saving to slot 1</p>
            <button onClick={() => supabase.auth.signOut()} className="pixel-btn w-full py-1">Log out</button>
          </div>
        )}
      </div>

      {/* mini player */}
      <div className="pixel-panel absolute bottom-3 left-3 flex items-center gap-3 px-3 py-2">
        <button onClick={() => setPlaying((p) => !p)} className="pixel-btn h-8 w-8 text-sm" aria-label={playing ? "Pause" : "Play"}>{playing ? "❚❚" : "▶"}</button>
        <div>
          <p className="text-sm font-semibold leading-tight">Petals on the Path</p>
          <p className="text-xs text-muted-foreground leading-tight">lofi town radio · soon</p>
        </div>
        <div className="flex h-3 items-end gap-0.5">
          {[0, 1, 2, 3].map((i) => <span key={i} className={`w-1 bg-primary ${playing ? "animate-eq" : "h-1"}`} style={{ animationDelay: `${i * 0.15}s` }} />)}
        </div>
      </div>

      {/* interaction hint */}
      {!dialog && nearby && (
        <div className="pixel-panel absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 text-center">
          {nearby.kind === "npc" ? <>Press <b>E</b> or tap to talk to <b>{nearby.npc.name}</b></> : <>🔒 Locked gate · <b>Coming soon</b></>}
        </div>
      )}

      {/* dialogue */}
      {dialog && (
        <div className="absolute inset-x-0 bottom-4 flex justify-center px-3" onClick={advance}>
          <div className="pixel-panel relative w-full max-w-2xl cursor-pointer p-5 pt-6">
            <div className="pixel-btn absolute -top-5 left-4 px-3 py-0.5 text-base font-bold">{dialog.npc.name}</div>
            <div className="flex gap-4">
              <SpriteThumb index={dialog.npc.sprite} size={3} />
              <p className="min-h-16 text-lg leading-snug">{dialog.npc.dialogue[dialog.line]!.slice(0, dialog.shown)}</p>
            </div>
            <p className="mt-2 text-right text-xs text-muted-foreground">{dialog.line + 1}/{dialog.npc.dialogue.length} · E / tap ▸</p>
          </div>
        </div>
      )}

      {/* mobile d-pad */}
      <div className="absolute bottom-20 right-4 grid grid-cols-3 gap-1 md:hidden">
        <span />
        <button className="pixel-btn h-12 w-12 touch-none" {...dpad("up")}>▲</button>
        <span />
        <button className="pixel-btn h-12 w-12 touch-none" {...dpad("left")}>◀</button>
        <button className="pixel-btn h-12 w-12 touch-none font-bold" onClick={interact}>E</button>
        <button className="pixel-btn h-12 w-12 touch-none" {...dpad("right")}>▶</button>
        <span />
        <button className="pixel-btn h-12 w-12 touch-none" {...dpad("down")}>▼</button>
        <span />
      </div>
    </div>
  );
}
