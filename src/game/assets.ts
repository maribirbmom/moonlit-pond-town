/**
 * Single source of truth for every piece of art in the game.
 * Swap an image here without touching game logic.
 */
import bakery from "@/assets/game/bakery.png";
import busstop from "@/assets/game/busstop.png";
import cafe from "@/assets/game/cafe.png";
import cake from "@/assets/game/cake.png";
import flower from "@/assets/game/flower.png";
import gameroom from "@/assets/game/gameroom.png";
import home from "@/assets/game/home.png";
import petdecor from "@/assets/game/petdecor.png";
import pub from "@/assets/game/pub.png";
import seedshop from "@/assets/game/seedshop.png";
import tree0 from "@/assets/game/tree0.png";
import tree1 from "@/assets/game/tree1.png";
import tree2 from "@/assets/game/tree2.png";
import tree3 from "@/assets/game/tree3.png";
import tree4 from "@/assets/game/tree4.png";
import tree5 from "@/assets/game/tree5.png";

export const BUILDING_ART = {
  salon: bakery, // placeholder until the tailor sprite is uploaded
  flower: flower,
  bar: pub,
  cafe: cafe,
  cake: cake,
  home: home,
  petdecor: petdecor,
  gameroom: gameroom,
  busstop: busstop,
  seedshop: seedshop,
} as const;
export type BuildingArtKey = keyof typeof BUILDING_ART;

/** 0-2 autumn, 3-5 green */
export const TREE_ART = [tree0, tree1, tree2, tree3, tree4, tree5];

/**
 * Character sheet. Set `image` to a sprite-sheet URL (7 cols x 7 rows) to slice real art.
 * While `image` is null, characters are drawn procedurally from CHARACTER_LOOKS below.
 */
export const CHARACTER_SHEET = {
  image: null as string | null,
  cols: 7,
  rows: 7,
};

export type HairStyle = "short" | "bun" | "long" | "twintails" | "bald" | "spiky";
export type Accessory = "none" | "beard" | "headphones" | "bow" | "apron" | "glasses";
export interface CharacterLook {
  skin: string;
  hair: string;
  style: HairStyle;
  top: string;
  bottom: string;
  acc: Accessory;
  accColor?: string;
}

/** (row, col) counting from 1 -> sprite index */
export const spriteIndex = (row: number, col: number) => (row - 1) * CHARACTER_SHEET.cols + (col - 1);

const SKINS = ["#f7d7c0", "#eec1a0", "#d9a07a", "#b97a56", "#8d5a3b"];
const HAIRS = ["#3b2a24", "#6b4231", "#a86b3c", "#e8c37a", "#f2a6c1", "#7fb6e8", "#c9c3d6", "#2e2e3a", "#c25a4a", "#7cc4a8"];
const TOPS = ["#e89aa8", "#9fc79b", "#a7b8e8", "#f2d58c", "#c7a6e0", "#f4f0e4", "#8fb8c9", "#e8a07a"];
const BOTTOMS = ["#5a4a6a", "#4a5a7a", "#6b5545", "#3e3e52", "#8a7aa0"];
const STYLES: HairStyle[] = ["short", "long", "bun", "spiky", "twintails", "short", "long"];

const generated: CharacterLook[] = Array.from({ length: 49 }, (_, i) => ({
  skin: SKINS[(i * 7 + 3) % SKINS.length]!,
  hair: HAIRS[(i * 3 + 1) % HAIRS.length]!,
  style: STYLES[(i * 5) % STYLES.length]!,
  top: TOPS[(i * 11 + 2) % TOPS.length]!,
  bottom: BOTTOMS[(i * 13) % BOTTOMS.length]!,
  acc: "none",
}));

// Hand-tuned entries matching the cast descriptions
const overrides: Record<number, CharacterLook> = {
  [spriteIndex(1, 5)]: { skin: SKINS[1]!, hair: "#6b4231", style: "bun", top: "#7fae7a", bottom: "#5a4a3a", acc: "none" },
  [spriteIndex(1, 4)]: { skin: SKINS[2]!, hair: "#4a3a34", style: "short", top: "#9a98a4", bottom: "#4a4a58", acc: "beard", accColor: "#4a3a34" },
  [spriteIndex(2, 7)]: { skin: SKINS[0]!, hair: "#f2a6c1", style: "twintails", top: "#f4f0e4", bottom: "#e89aa8", acc: "none" },
  [spriteIndex(2, 1)]: { skin: SKINS[1]!, hair: "#a86b3c", style: "long", top: "#f4f0e4", bottom: "#6b5545", acc: "apron", accColor: "#f2a6c1" },
  [spriteIndex(2, 3)]: { skin: SKINS[1]!, hair: "#7fb6e8", style: "long", top: "#d9534f", bottom: "#3e3e52", acc: "none" },
  [spriteIndex(5, 2)]: { skin: SKINS[2]!, hair: "#2e2e3a", style: "spiky", top: "#a7b8e8", bottom: "#3e3e52", acc: "headphones", accColor: "#e89aa8" },
  [spriteIndex(6, 1)]: { skin: SKINS[0]!, hair: "#7cc4a8", style: "long", top: "#f2d58c", bottom: "#5a4a6a", acc: "bow", accColor: "#d9534f" },
  [spriteIndex(6, 6)]: { skin: SKINS[1]!, hair: "#eeeae4", style: "bald", top: "#9fc79b", bottom: "#6b5545", acc: "beard", accColor: "#f4f2ee" },
};

export const CHARACTER_LOOKS: CharacterLook[] = generated.map((g, i) => overrides[i] ?? g);
