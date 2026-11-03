/** Shared pair progression. The database function public.level_for_xp mirrors xpForLevel — change both together. */
export const xpForLevel = (level: number) => 25 * level * (level - 1);
export const levelForXp = (xp: number) => Math.max(1, Math.floor((1 + Math.sqrt(1 + (4 * xp) / 25)) / 2));

export const XP_REWARDS = {
  npcFirstTalk: 10,
  sitTogether: 5,
  /** seconds between sit-together bonuses for the same bench/boat */
  sitTogetherCooldownS: 300,
} as const;

/** Effectively "once ever" for a source. */
export const ONCE = 60 * 60 * 24 * 365 * 10;
