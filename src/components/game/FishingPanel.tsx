import { useEffect, useRef, type MutableRefObject } from "react";
import { FISHING, RARITY_XP } from "@/game/config/fish";
import type { Catch, FishingSim } from "@/game/fishing";

const CX = 100, CY = 100, SWEEP = 260;
const ang = (v: number) => -SWEEP / 2 + v * SWEEP;
const pt = (a: number, r: number) => {
  const t = (a * Math.PI) / 180;
  return [CX + r * Math.sin(t), CY - r * Math.cos(t)] as const;
};
const arc = (v0: number, v1: number, r: number) => {
  const [x0, y0] = pt(ang(v0), r), [x1, y1] = pt(ang(v1), r);
  const large = (v1 - v0) * SWEEP > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};
const wedge = (v0: number, v1: number, r: number) => {
  const [x0, y0] = pt(ang(v0), r), [x1, y1] = pt(ang(v1), r);
  return `M ${CX} ${CY} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
};

interface Props {
  sim: MutableRefObject<FishingSim>;
  phase: string;
  result: Catch | null;
  onDown: () => void;
  onUp: () => void;
  onStand: () => void;
}

const HINT: Record<string, string> = {
  idle: "Hold SPACE to charge your cast, let go to throw the line.",
  caught: "Nice one! Hold SPACE to cast again.",
  escaped: "Hold SPACE to try again.",
  charging: "Let go to cast — a stronger charge throws farther.",
  casting: "",
  waiting: "Wait for a nibble… don't pull yet.",
  bite: "Something bit! Press SPACE now!",
  reeling: "Hold SPACE to lift the needle. Keep it inside the green.",
};

export function FishingPanel({ sim, phase, result, onDown, onUp, onStand }: Props) {
  const power = useRef<HTMLDivElement>(null);
  const needle = useRef<SVGGElement>(null);
  const zoneArc = useRef<SVGPathElement>(null);
  const zoneWedge = useRef<SVGPathElement>(null);
  const prog = useRef<HTMLDivElement>(null);
  const dial = useRef<SVGSVGElement>(null);
  const fish = useRef<SVGGElement>(null);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const f = sim.current;
      if (power.current) power.current.style.width = `${f.power * 100}%`;
      if (needle.current) needle.current.setAttribute("transform", `rotate(${ang(f.marker).toFixed(2)} ${CX} ${CY})`);
      if (zoneArc.current) zoneArc.current.setAttribute("d", arc(f.zone, f.zone + FISHING.zoneSize, 76));
      if (zoneWedge.current) zoneWedge.current.setAttribute("d", wedge(f.zone, f.zone + FISHING.zoneSize, 66));
      if (prog.current) prog.current.style.width = `${Math.max(0, Math.min(1, f.progress)) * 100}%`;
      if (dial.current) dial.current.dataset['hit'] = f.inZone ? "1" : "0";
      if (fish.current) fish.current.setAttribute("transform", `translate(${CX} ${CY}) rotate(${Math.sin(performance.now() / 160) * (f.inZone ? 8 : 18)})`);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sim]);

  const label = phase === "charging" ? "Release to cast" : phase === "bite" ? "HOOK IT!" : phase === "reeling" ? "Hold to reel" : phase === "waiting" || phase === "casting" ? "Waiting…" : "Hold to cast";
  const hint = HINT[phase] ?? "";

  return (
    <section className="fishing-panel" aria-label="Fishing">
      <header className="fishing-head">
        <h2>🎣 Pond fishing</h2>
        <button type="button" className="stand-btn" onClick={onStand}><span className="keycap">E</span> Stand up</button>
      </header>

      {phase === "charging" && (
        <div className="cast-meter" aria-label="Cast power"><div ref={power} className="cast-fill" /><span>Power</span></div>
      )}

      {(phase === "waiting" || phase === "casting") && (
        <div className="waiting"><span className="bobber">🪝</span><i /><i /><i /></div>
      )}

      {phase === "bite" && <div className="bite-pop" aria-live="assertive">!</div>}

      {phase === "reeling" && (
        <div className="reel">
          <svg ref={dial} viewBox="0 0 200 200" className="dial" data-hit="0" role="img" aria-label="Reeling dial">
            <circle cx={CX} cy={CY} r="92" fill="#2e3326" stroke="#171a12" strokeWidth="4" />
            <path d={arc(0, 1, 76)} fill="none" stroke="#171a12" strokeWidth="20" strokeLinecap="round" />
            <path d={arc(0, 1, 76)} fill="none" stroke="#d4d8de" strokeWidth="14" strokeLinecap="round" />
            <path ref={zoneWedge} fill="rgba(143,200,110,0.28)" />
            <path ref={zoneArc} fill="none" stroke="#7fcf6a" strokeWidth="14" />
            <g ref={needle} transform={`rotate(${ang(0.3)} ${CX} ${CY})`}>
              <line x1={CX} y1={CY} x2={CX} y2="30" stroke="#f0a04a" strokeWidth="5" strokeLinecap="round" />
              <circle cx={CX} cy="26" r="7" fill="#e8552e" stroke="#171a12" strokeWidth="2" />
            </g>
            <circle cx={CX} cy={CY} r="22" fill="#f2efe4" stroke="#171a12" strokeWidth="3" />
            <g ref={fish}><text textAnchor="middle" dominantBaseline="central" fontSize="24">🐟</text></g>
          </svg>
          <div className="catch-bar" aria-label="Catch progress"><div ref={prog} className="catch-fill" /></div>
        </div>
      )}

      {phase === "caught" && result && (
        <div className="caught-card">
          <span className="text-4xl">🐟</span>
          <h3>{result.name}</h3>
          <p className="capitalize">{result.rarity} · {result.size} cm · +{RARITY_XP[result.rarity]} XP</p>
        </div>
      )}
      {phase === "escaped" && <p className="escaped">It got away…</p>}

      <p className="fishing-hint">{hint}</p>

      <button
        type="button"
        className="reel-btn"
        data-active={phase === "bite" ? "bite" : phase === "reeling" ? "reel" : "idle"}
        disabled={phase === "casting"}
        onPointerDown={(ev) => { ev.preventDefault(); ev.currentTarget.setPointerCapture(ev.pointerId); onDown(); }}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {label}
      </button>
    </section>
  );
}
