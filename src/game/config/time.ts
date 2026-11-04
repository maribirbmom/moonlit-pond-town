/** Day/night cycle. Game time is derived from the session's shared clock so both players match. */
export const REAL_MINUTES_PER_GAME_DAY = 24;

export type Phase = "night" | "dawn" | "day" | "dusk";

export function gameClock(epochMs: number, nowMs: number, offsetMin = 0) {
  const total = ((nowMs - epochMs) / 60000) * (1440 / REAL_MINUTES_PER_GAME_DAY) + offsetMin;
  const minutes = ((total % 1440) + 1440) % 1440;
  return { minutes, day: Math.floor(total / 1440) + 1 };
}

export function phaseOf(minutes: number): Phase {
  if (minutes < 300 || minutes >= 1260) return "night";
  if (minutes < 420) return "dawn";
  if (minutes < 1050) return "day";
  return "dusk";
}

export function formatClock(minutes: number) {
  const h = Math.floor(minutes / 60), m = Math.floor(minutes % 60);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** [minute, tint rgb, tint alpha, nightness 0..1]. Night stays a soft indigo — never black. */
const KEYS: [number, [number, number, number], number, number][] = [
  [0, [22, 28, 90], 0.62, 1],
  [300, [22, 28, 90], 0.6, 1],
  [370, [255, 168, 176], 0.2, 0.45],
  [450, [255, 240, 222], 0.04, 0],
  [1020, [255, 228, 196], 0.06, 0],
  [1110, [255, 140, 96], 0.16, 0.3],
  [1200, [96, 74, 160], 0.34, 0.75],
  [1260, [22, 28, 90], 0.62, 1],
  [1440, [22, 28, 90], 0.62, 1],
];

export function lightingAt(minutes: number) {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1]![0] <= minutes) i++;
  const a = KEYS[i]!, b = KEYS[i + 1]!;
  const t = Math.min(1, Math.max(0, (minutes - a[0]) / (b[0] - a[0] || 1)));
  const s = t * t * (3 - 2 * t);
  const mix = (x: number, y: number) => x + (y - x) * s;
  return {
    rgb: [mix(a[1][0], b[1][0]), mix(a[1][1], b[1][1]), mix(a[1][2], b[1][2])] as [number, number, number],
    alpha: mix(a[2], b[2]),
    night: mix(a[3], b[3]),
  };
}
