/** All avatar art is drawn in code (see game/avatar.ts) so every piece shares one body grid and always lines up. */
export type Category = "hair" | "tops" | "bottoms" | "hats" | "accessories" | "eyewear" | "moustache";
export interface Item { id: string; category: Category; name: string; sprite: string | null; price: number; colorways: string[]; locked: boolean; shape?: string | undefined; base?: string | undefined }
export const SKIN_TONES = ["#fbe1cc","#f5cfad","#e5b48c","#cc936b","#b47a53","#925c3d","#70452f","#4c3027"];
export const HAIR_COLORS = ["#24212b","#3b2723","#75503a","#943e36","#c86d35","#e4bf70","#f1e9cb","#919299","#efaac7","#b6a0d9","#8bcbb4","#89badc"];
export const HAIR_NAMES = ["Black","Dark brown","Brown","Auburn","Ginger","Blonde","Platinum","Grey","Pastel pink","Lavender","Mint","Sky blue"];
const COLORS = ["#e89aa8","#8fc8b4","#9dbbea","#e9cf86","#baa4db","#eee8db","#5a6478","#dd9373"];
const item = (id: string,category: Category,name: string,shape?: string,base?: string): Item => ({id,category,name,sprite:null,shape,base,price:0,colorways:COLORS,locked:false});
const TOP_BASE = ["#9dbbea","#454c7a","#f2d070","#e89aa8","#5f9b6e","#f4efe4","#e8934f","#5fa8c8"];
const BOTTOM_BASE = ["#4fa8a0","#e8934f","#5a7bb0","#d9783a","#d9534f","#b49ad9","#8fd0b0","#5a82c8"];
const BOTTOM_SHAPE = ["shorts","shorts","jeans","pants","skirt","shorts","pants","skirt"];
const HAT_BASE: Record<string,string> = {santa:"#dd686b",witch:"#3b3550",straw:"#e6c87a",beret:"#c0505f",beanie:"#5f8fb0",crown:"#f0c850"};
export const ITEMS: Item[] = [
...Array.from({length:8},(_,i)=>item(`hair-${i}`,"hair",["Twin tails","Pixie","Soft curls","Fringe","Long waves","Bob","Side braid","Tousled"][i] ?? "Hair")),
...Array.from({length:8},(_,i)=>item(`top-${i}`,"tops",["Sky tee","Midnight tee","Sunny tee","Heart tee","Forest tee","Ribbon tee","Orange tee","Ocean tee"][i] ?? "Tee",`top-${i}`,TOP_BASE[i])),
...["Teal shorts","Orange shorts","Ripped jeans","Orange pants","Red skirt","Lavender shorts","Mint pants","Blue skirt"].map((n,i)=>item(`bottom-${i}`,"bottoms",n,BOTTOM_SHAPE[i],BOTTOM_BASE[i])),
item("hat-none","hats","None"), ...["santa","witch","straw","beret","beanie","crown"].map(n=>item(`hat-${n}`,"hats",n[0]?.toUpperCase()+n.slice(1),n,HAT_BASE[n])),
item("accessory-none","accessories","None"), ...["scarf","backpack","headphones","bow","flower crown","bunny ears"].map(n=>item(`accessory-${n}`,"accessories",n,n,"#e89aa8")),
item("eyewear-none","eyewear","None"), ...["round","square","sunglasses"].map(n=>item(`eyewear-${n}`,"eyewear",n,n)),
item("moustache-none","moustache","None"), ...["Classic","Ginger","Silver"].map((n,i)=>item(`moustache-${i}`,"moustache",n,undefined,["#4a3a34","#c86d35","#919299"][i])),
];
export interface Avatar { skin: number; hairColor: number; hair: string; tops: string; bottoms: string; hats: string; accessories: string; eyewear: string; moustache: string; colors: Partial<Record<Category,number>> }
export const DEFAULT_AVATAR: Avatar = {skin:1,hairColor:2,hair:"hair-0",tops:"top-0",bottoms:"bottom-0",hats:"hat-none",accessories:"accessory-none",eyewear:"eyewear-none",moustache:"moustache-none",colors:{}};
export const PRESETS = ["Petal","Lakeside","Stargazer"];
export function presetAvatar(index: number): Avatar {return {...DEFAULT_AVATAR,hair:`hair-${index*2}`,tops:`top-${index*2}`,bottoms:`bottom-${index*2}`,hairColor:[8,4,9][index]??2,colors:{tops:index,bottoms:index}};}
export function parseAvatar(value: unknown): Avatar|null { if (!value || typeof value!=="object" || !("hair" in value)) return null; return {...DEFAULT_AVATAR,...value} as Avatar; }
