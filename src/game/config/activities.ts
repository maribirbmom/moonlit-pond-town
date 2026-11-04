import type { Phase } from "./time";
import type { ShopId } from "../map";
export const VISIT_XP = 5;
export const ALL_BUILDINGS_XP = 25;
export const VISIT_IDS: ShopId[] = ["salon","flower","bar","cafe","cake","garden","seedshop","petdecor","gameroom","busstop"];
export const SHOP_HOURS: Partial<Record<ShopId, [number,number]>> = {salon:[480,1080],flower:[420,1080],cafe:[360,1260],cake:[600,1380],seedshop:[420,1080],petdecor:[480,1080],gameroom:[480,1260],bar:[720,1440]};
export function shopOpen(id: ShopId, minutes: number) { const hours=SHOP_HOURS[id]; return !hours || (minutes>=hours[0] && minutes<hours[1]); }
export function weatherAt(day: number, phase: Phase) { if(phase==="night") return {emoji:"🌙",label:"Night"}; const weather=[{emoji:"☀️",label:"Sunshine"},{emoji:"☁️",label:"Cloudy"},{emoji:"🌧️",label:"Rain"}]; return weather[((day-1)%3+3)%3] ?? weather[0]; }
export const LEVEL_UNLOCKS = [{level:2,id:"garden-cosmetics"},{level:3,id:"home-cosmetics"},{level:5,id:"town-festival"}];