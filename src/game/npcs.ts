import { spriteIndex } from "./assets";
import type { ShopId } from "./map";

export interface NpcDef {
  id: string;
  name: string;
  sprite: number;
  shop: ShopId;
  /** offset from the shop door, world px */
  offset: { x: number; y: number };
  dialogue: string[];
}

export const NPCS: NpcDef[] = [
  { id: "mai", name: "Mai", sprite: spriteIndex(1, 5), shop: "cafe", offset: { x: 22, y: 10 }, dialogue: ["Welcome, sweetheart! Once the wedding orders start coming in, this kitchen will be chaos.", "I'm going to make that special dish SD used to love. Don't tell anyone!"] },
  { id: "daddy", name: "Daddy", sprite: spriteIndex(1, 4), shop: "bar", offset: { x: 30, y: 10 }, dialogue: ["Hmm, I'll take a drink. Something strong. For the celebration, of course.", "Make it pretty, though. Umbrella and all."] },
  { id: "pilu", name: "Pilu", sprite: spriteIndex(2, 7), shop: "cake", offset: { x: 24, y: 10 }, dialogue: ["Cake is the heart of every wedding! Sprinkles, frosting, everything.", "I want orange juice with mine, by the way."] },
  { id: "mea", name: "Mea", sprite: spriteIndex(2, 1), shop: "flower", offset: { x: 26, y: 8 }, dialogue: ["The bouquets for the bride and bridesmaids won't build themselves!", "Pick your favorite blooms. This one will be at the wedding too."] },
  { id: "gracy", name: "Gracy Aunty", sprite: spriteIndex(2, 3), shop: "salon", offset: { x: 28, y: 8 }, dialogue: ["Dresses, makeup, hair. We have a lot of people to get ready!", "I have a feeling I'll team up with someone for the wedding look."] },
  { id: "vane", name: "Vane", sprite: spriteIndex(5, 2), shop: "gameroom", offset: { x: 24, y: 10 }, dialogue: ["...zzz... oh! Sorry, I was resting my eyes.", "Puzzles are in here. Finish one and you can frame it at home."] },
  { id: "sheena", name: "Sheena", sprite: spriteIndex(6, 1), shop: "petdecor", offset: { x: 24, y: 10 }, dialogue: ["The doggos and cats need to look their best for the big day.", "Bows, little suits, cat blush. We've got it all!"] },
  { id: "joe", name: "Grandpa Joe", sprite: spriteIndex(6, 6), shop: "garden", offset: { x: -30, y: -16 }, dialogue: ["No supplies, no cooking. Grab seeds from the stand next door.", "A little patience grows a lot of mint."] },
  { id: "attendant", name: "Bus Attendant", sprite: 20, shop: "busstop", offset: { x: -26, y: 10 }, dialogue: ["Everyone walks out this gate when the day is done. Not yet though!"] },
];
