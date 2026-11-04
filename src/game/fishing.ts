import { FISHING, rollFish, type FishDef } from "./config/fish";
import type { Phase } from "./config/time";

export type FishPhase = "idle" | "charging" | "casting" | "waiting" | "bite" | "reeling" | "caught" | "escaped";

export interface Catch { id: string; name: string; rarity: FishDef["rarity"]; size: number }

/** Pure fishing state machine. Rendering/UI read its fields; call update() every frame. */
export class FishingSim {
  phase: FishPhase = "idle";
  power = 0;
  private dirUp = true;
  distance = 0;
  castT = 0;
  timer = 0;
  /** reel minigame, all 0..1 */
  marker = 0.5;
  markerV = 0;
  zone = 0.4;
  zoneV = 0;
  private zoneTarget = 0.4;
  private zoneWait = 0;
  progress = 0.35;
  fish: FishDef | null = null;
  result: Catch | null = null;

  constructor(private rand: () => number = Math.random) {}

  /** Space / tap went down */
  press(getPhase: () => Phase) {
    if (this.phase === "idle" || this.phase === "caught" || this.phase === "escaped") {
      this.phase = "charging"; this.power = 0; this.dirUp = true; this.result = null;
    } else if (this.phase === "bite") {
      this.fish = rollFish(getPhase(), this.rand);
      this.phase = "reeling"; this.marker = 0.3; this.markerV = 0; this.zone = 0.35; this.zoneTarget = 0.35; this.zoneWait = 1; this.progress = 0.4;
    } else if (this.phase === "waiting") {
      this.phase = "escaped"; this.timer = 0; // pulled too early
    }
  }
  /** Space / tap released */
  release() {
    if (this.phase !== "charging") return;
    this.distance = FISHING.castMin + (FISHING.castMax - FISHING.castMin) * this.power;
    this.phase = "casting"; this.castT = 0;
  }

  update(dt: number, holding: boolean) {
    const F = FISHING;
    switch (this.phase) {
      case "charging": {
        this.power += (this.dirUp ? 1 : -1) * F.chargeSpeed * dt;
        if (this.power >= 1) { this.power = 1; this.dirUp = false; }
        if (this.power <= 0) { this.power = 0; this.dirUp = true; }
        break;
      }
      case "casting":
        this.castT += dt / 0.55;
        if (this.castT >= 1) { this.castT = 1; this.phase = "waiting"; this.timer = F.waitMin + this.rand() * (F.waitMax - F.waitMin); }
        break;
      case "waiting":
        this.timer -= dt;
        if (this.timer <= 0) { this.phase = "bite"; this.timer = F.biteWindow; }
        break;
      case "bite":
        this.timer -= dt;
        if (this.timer <= 0) { this.phase = "escaped"; this.timer = 0; }
        break;
      case "reeling": {
        const diff = this.fish?.difficulty ?? 0.3;
        // frame-rate independent, damped motion: hold to rise, release to sink
        this.markerV += (holding ? F.markerLift : -F.markerGravity) * dt;
        this.markerV *= Math.exp(-5 * dt);
        this.marker += this.markerV * dt;
        if (this.marker <= 0) { this.marker = 0; this.markerV = Math.max(0, this.markerV * -0.3); }
        if (this.marker >= 1) { this.marker = 1; this.markerV = Math.min(0, this.markerV * -0.3); }
        // the fish drifts toward a new spot every so often instead of jittering
        this.zoneWait -= dt;
        if (this.zoneWait <= 0) {
          this.zoneWait = 1.6 - diff * 0.8 + this.rand() * 1.2;
          this.zoneTarget = this.rand() * (1 - F.zoneSize);
        }
        this.zone += (this.zoneTarget - this.zone) * Math.min(1, dt * (0.9 + diff * 1.4));
        const inZone = this.marker >= this.zone && this.marker <= this.zone + F.zoneSize;
        this.progress += (inZone ? F.fillRate : -F.drainRate * (0.6 + diff * 0.6)) * dt;
        if (this.progress >= 1) {
          const f = this.fish!;
          const size = Math.round((f.size[0] + this.rand() * (f.size[1] - f.size[0])) * 10) / 10;
          this.result = { id: f.id, name: f.name, rarity: f.rarity, size };
          this.phase = "caught";
        } else if (this.progress <= 0) this.phase = "escaped";
        break;
      }
    }
  }

  get inZone() { return this.marker >= this.zone && this.marker <= this.zone + FISHING.zoneSize; }
  get bobberOut() { return ["casting", "waiting", "bite", "reeling"].includes(this.phase); }
}
