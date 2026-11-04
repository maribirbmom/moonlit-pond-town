/** Tiny synthesized sound effects (no audio files). Created lazily on first use, kept quiet on purpose. */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
try { enabled = localStorage.getItem("sfx") !== "off"; } catch { /* storage unavailable */ }

export function setSfxEnabled(on: boolean) {
  enabled = on;
  try { localStorage.setItem("sfx", on ? "on" : "off"); } catch { /* ignore */ }
}
export const sfxEnabled = () => enabled;

function ac() {
  if (!enabled || typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, opt: { type?: OscillatorType; vol?: number; at?: number; to?: number; lp?: number } = {}) {
  const c = ac(); if (!c || !master) return;
  const t = c.currentTime + (opt.at ?? 0);
  const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
  o.type = opt.type ?? "sine";
  o.frequency.setValueAtTime(freq, t);
  if (opt.to) o.frequency.exponentialRampToValueAtTime(opt.to, t + dur);
  f.type = "lowpass"; f.frequency.value = opt.lp ?? 4000;
  const v = opt.vol ?? 0.05;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f); f.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.03);
}

function noise(dur: number, opt: { vol?: number; at?: number; from?: number; to?: number; q?: number; type?: BiquadFilterType } = {}) {
  const c = ac(); if (!c || !master) return;
  const t = c.currentTime + (opt.at ?? 0);
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = buf;
  const f = c.createBiquadFilter(); f.type = opt.type ?? "bandpass"; f.Q.value = opt.q ?? 0.8;
  f.frequency.setValueAtTime(opt.from ?? 800, t);
  if (opt.to) f.frequency.exponentialRampToValueAtTime(opt.to, t + dur);
  const g = c.createGain(); const v = opt.vol ?? 0.04;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + dur * 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t); s.stop(t + dur + 0.03);
}

export const sfx = {
  /** line whooshes out */
  cast() { noise(0.38, { from: 500, to: 2200, vol: 0.05, q: 1.2 }); tone(260, 0.2, { type: "triangle", to: 520, vol: 0.015 }); },
  /** bobber lands */
  splash() { noise(0.22, { from: 2400, to: 500, vol: 0.05, type: "lowpass", q: 0.4 }); tone(620, 0.14, { to: 280, vol: 0.04, at: 0.02 }); },
  /** something is nibbling */
  bite() { tone(880, 0.09, { vol: 0.05 }); tone(1320, 0.12, { vol: 0.05, at: 0.1 }); },
  /** hooked it */
  hook() { tone(340, 0.1, { type: "triangle", to: 520, vol: 0.05 }); noise(0.1, { from: 1800, to: 900, vol: 0.03 }); },
  /** soft reel click while the needle is in the green; pitch climbs with progress */
  tick(progress: number) { tone(520 + progress * 360, 0.035, { type: "square", vol: 0.012, lp: 1800 }); },
  /** got one! */
  catch() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.22, { type: "triangle", vol: 0.055, at: i * 0.075 })); },
  /** it got away */
  miss() { tone(330, 0.2, { type: "sine", to: 247, vol: 0.05 }); tone(247, 0.3, { type: "sine", to: 174, vol: 0.05, at: 0.16 }); },
  /** coin flicks into the well */
  coin() { tone(1568, 0.09, { type: "triangle", vol: 0.05 }); tone(2093, 0.16, { type: "triangle", vol: 0.04, at: 0.08 }); },
  /** coin plops in the water, note drifts down, a soft chime */
  wish() { tone(700, 0.16, { to: 260, vol: 0.05 }); noise(0.2, { from: 2000, to: 500, vol: 0.03, type: "lowpass", at: 0.04 }); [659.25, 880, 1318.5].forEach((f, i) => tone(f, 0.5, { type: "sine", vol: 0.03, at: 0.28 + i * 0.12 })); },
  /** sit down / stand up */
  sit() { tone(300, 0.1, { type: "triangle", to: 220, vol: 0.035 }); },
  stand() { tone(220, 0.1, { type: "triangle", to: 320, vol: 0.035 }); },
};
