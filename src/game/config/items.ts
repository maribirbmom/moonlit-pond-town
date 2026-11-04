import art0 from "@/assets/avatar/beanie.png.asset.json";
import art1 from "@/assets/avatar/beret.png.asset.json";
import art2 from "@/assets/avatar/crown.png.asset.json";
import art3 from "@/assets/avatar/hair-0.png.asset.json";
import art4 from "@/assets/avatar/hair-1.png.asset.json";
import art5 from "@/assets/avatar/hair-2.png.asset.json";
import art6 from "@/assets/avatar/hair-3.png.asset.json";
import art7 from "@/assets/avatar/hair-4.png.asset.json";
import art8 from "@/assets/avatar/hair-5.png.asset.json";
import art9 from "@/assets/avatar/hair-6.png.asset.json";
import art10 from "@/assets/avatar/hair-7.png.asset.json";
import art11 from "@/assets/avatar/moustache.png.asset.json";
import art12 from "@/assets/avatar/orange.png.asset.json";
import art13 from "@/assets/avatar/shorts.png.asset.json";
import art14 from "@/assets/avatar/skirt.png.asset.json";
import art15 from "@/assets/avatar/straw.png.asset.json";
import art16 from "@/assets/avatar/sunglasses.png.asset.json";
import art17 from "@/assets/avatar/top-0.png.asset.json";
import art18 from "@/assets/avatar/top-1.png.asset.json";
import art19 from "@/assets/avatar/top-2.png.asset.json";
import art20 from "@/assets/avatar/top-3.png.asset.json";
import art21 from "@/assets/avatar/top-4.png.asset.json";
import art22 from "@/assets/avatar/top-5.png.asset.json";
import art23 from "@/assets/avatar/top-6.png.asset.json";
import art24 from "@/assets/avatar/top-7.png.asset.json";
import art25 from "@/assets/avatar/witch.png.asset.json";
export const ITEM_ART = {
  "beanie": art0.url,
  "beret": art1.url,
  "crown": art2.url,
  "hair-0": art3.url,
  "hair-1": art4.url,
  "hair-2": art5.url,
  "hair-3": art6.url,
  "hair-4": art7.url,
  "hair-5": art8.url,
  "hair-6": art9.url,
  "hair-7": art10.url,
  "moustache": art11.url,
  "orange": art12.url,
  "shorts": art13.url,
  "skirt": art14.url,
  "straw": art15.url,
  "sunglasses": art16.url,
  "top-0": art17.url,
  "top-1": art18.url,
  "top-2": art19.url,
  "top-3": art20.url,
  "top-4": art21.url,
  "top-5": art22.url,
  "top-6": art23.url,
  "top-7": art24.url,
  "witch": art25.url
};
export type Category = "hair" | "tops" | "bottoms" | "hats" | "accessories" | "eyewear" | "moustache";
export interface Item { id: string; category: Category; name: string; sprite: string | null; price: number; colorways: string[]; locked: boolean; shape?: string | undefined }
export const SKIN_TONES = ["#fbe1cc","#f5cfad","#e5b48c","#cc936b","#b47a53","#925c3d","#70452f","#4c3027"];
export const HAIR_COLORS = ["#24212b","#3b2723","#75503a","#943e36","#c86d35","#e4bf70","#f1e9cb","#919299","#efaac7","#b6a0d9","#8bcbb4","#89badc"];
export const HAIR_NAMES = ["Black","Dark brown","Brown","Auburn","Ginger","Blonde","Platinum","Grey","Pastel pink","Lavender","Mint","Sky blue"];
const COLORS = ["#e89aa8","#8fc8b4","#9dbbea","#e9cf86","#baa4db","#eee8db","#5a6478","#dd9373"];
const item = (id: string,category: Category,name: string,sprite: string|null,shape?: string): Item => ({id,category,name,sprite,shape,price:0,colorways:COLORS,locked:false});
export const ITEMS: Item[] = [
...Array.from({length:8},(_,i)=>item(`hair-${i}`,"hair",["Twin tails","Pixie","Soft curls","Fringe","Long waves","Bob","Side braid","Tousled"][i] ?? "Hair",ITEM_ART[`hair-${i}` as keyof typeof ITEM_ART])),
...Array.from({length:8},(_,i)=>item(`top-${i}`,"tops",["Sky tee","Midnight tee","Sunny tee","Heart tee","Forest tee","Ribbon tee","Orange tee","Ocean tee"][i] ?? "Tee",ITEM_ART[`top-${i}` as keyof typeof ITEM_ART])),
...["Teal shorts","Orange shorts","Ripped jeans","Orange pants","Red skirt","Lavender shorts","Mint pants","Blue skirt"].map((n,i)=>item(`bottom-${i}`,"bottoms",n,i===4||i===7?ITEM_ART.skirt:i===1||i===3?ITEM_ART.orange:ITEM_ART.shorts,i===2?"jeans":i===3||i===6?"pants":"shorts")),
item("hat-none","hats","None",null), ...["santa","witch","straw","beret","beanie","crown"].map(n=>item(`hat-${n}`,"hats",n[0]?.toUpperCase()+n.slice(1),n==="santa"?null:ITEM_ART[n as keyof typeof ITEM_ART],n)),
item("accessory-none","accessories","None",null), ...["scarf","backpack","headphones","bow","flower crown","bunny ears"].map(n=>item(`accessory-${n}`,"accessories",n,null,n)),
item("eyewear-none","eyewear","None",null), ...["round","square","sunglasses"].map(n=>item(`eyewear-${n}`,"eyewear",n,n==="sunglasses"?ITEM_ART.sunglasses:null,n)),
item("moustache-none","moustache","None",null), ...["Classic","Ginger","Silver"].map((n,i)=>item(`moustache-${i}`,"moustache",n,ITEM_ART.moustache)),
];
export interface Avatar { skin: number; hairColor: number; hair: string; tops: string; bottoms: string; hats: string; accessories: string; eyewear: string; moustache: string; colors: Partial<Record<Category,number>> }
export const DEFAULT_AVATAR: Avatar = {skin:1,hairColor:2,hair:"hair-0",tops:"top-0",bottoms:"bottom-0",hats:"hat-none",accessories:"accessory-none",eyewear:"eyewear-none",moustache:"moustache-none",colors:{}};
export const PRESETS = ["Petal","Lakeside","Stargazer"];
export function presetAvatar(index: number): Avatar {return {...DEFAULT_AVATAR,hair:`hair-${index*2}`,tops:`top-${index*2}`,bottoms:`bottom-${index*2}`,hairColor:[8,4,9][index]??2,colors:{tops:index,bottoms:index}};}
export function parseAvatar(value: unknown): Avatar|null { if (!value || typeof value!=="object" || !("hair" in value)) return null; return {...DEFAULT_AVATAR,...value} as Avatar; }
