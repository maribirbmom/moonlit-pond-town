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

/**
 * Street lamps are placed on purpose, never scattered: evenly spaced rows along the inside of the
 * main ring road and the south lane, plus a matching row on the shore promenade with a pair
 * flanking the dock and the pier. None on the boat or the water.
 */
export const LAMPS = {
  radius: 56,
  /** distance from a road's centre line to its lamp row */
  inset: 27,
  /** target spacing along a straight run */
  spacing: 150,
  /** shore promenade, hand-spaced; pairs flank the dock (x 592-608) and pier (x 212-254) */
  shore: [[110, 884], [204, 884], [262, 884], [410, 884], [574, 884], [626, 884], [790, 884], [940, 884], [1040, 884]] as [number, number][],
};
