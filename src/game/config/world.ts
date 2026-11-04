/** Seats, pond, dock and lamp tuning. Coordinates are world px. */
export type SeatKind = "bench" | "boat" | "fish";

export interface SeatGroup {
  id: string;
  kind: SeatKind;
  /** interaction anchor */
  x: number;
  y: number;
  seats: { x: number; y: number }[];
  /** where the player stands when getting up */
  exit: { x: number; y: number };
}

export const PROMPTS: Record<SeatKind, string> = { bench: "Sit", boat: "Hop on", fish: "Fish?" };

/** Few benches, each sitting just beside a path edge (~3px gap), never on it. Checked against distToPaths. */
const BENCH_POS: [number, number][] = [
  [420, 295], [740, 295], [238, 430], [922, 430], [400, 577],
  [760, 577], [500, 823], [780, 823], [165, 823], [700, 863],
];
export const BENCHES: SeatGroup[] = BENCH_POS.map(([x, y], i) => ({
  id: `bench${i}`, kind: "bench", x, y: y + 6,
  seats: [{ x: x - 7, y: y - 1 }, { x: x + 7, y: y - 1 }],
  exit: { x, y: y + 12 },
}));

/** Pond: the shoreline wobbles around SHORE_Y and water fills to the bottom edge. */
export const SHORE_Y = 912;
export const LANE_Y = 838;
export const shoreY = (x: number) => SHORE_Y + 6 * Math.sin(x / 37) + 3 * Math.sin(x / 13 + 1);

/** Walkable wooden planks over the water */
export const DOCK = { x: 592, y: 880, w: 16, h: 98 };
export const PIER = { x: 212, y: 884, w: 42, h: 46 };
export const BOAT = { x: 600, y: 996, w: 96 };
/** Seated players stand on the deck, this far above the boat anchor. */
const BOAT_DECK = 14;

export const BOAT_GROUP: SeatGroup = {
  id: "boat", kind: "boat", x: 600, y: DOCK.y + DOCK.h - 4,
  seats: [{ x: 586, y: BOAT.y - BOAT_DECK }, { x: 614, y: BOAT.y - BOAT_DECK }],
  exit: { x: 600, y: DOCK.y + DOCK.h - 8 },
};
export const FISH_GROUP: SeatGroup = {
  id: "pier", kind: "fish", x: 233, y: PIER.y + 30,
  seats: [{ x: 223, y: 922 }, { x: 243, y: 922 }],
  exit: { x: 233, y: PIER.y + 14 },
};

export const SEAT_GROUPS: SeatGroup[] = [...BENCHES, BOAT_GROUP, FISH_GROUP];

export const LAMPS = {
  spacing: 80, // ~5 tiles
  minGap: 46,
  radius: 56,
  /** extra hand-placed lamps (pond shore, dock, pier) */
  extra: [[160, 885], [330, 890], [470, 893], [580, 884], [620, 884], [720, 890], [880, 890], [1040, 888], [204, 886], [262, 886], [610, 940], [590, 970]] as [number, number][],
};
