import type { Tables, Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import type { PlayerState } from "./engine";
export type TownSession = Tables<"sessions">;
export type TownWorld = { players?: Record<string, PlayerState>; fishCaught?: {id:string;name:string;rarity:string;size:number;by?:string}[]; visitedBuildings?: string[] };
export const asJson = (value: unknown): Json => JSON.parse(JSON.stringify(value)) as Json;
export function worldOf(session: TownSession): TownWorld { return session.world_state && typeof session.world_state === "object" && !Array.isArray(session.world_state) ? session.world_state as TownWorld : {}; }
export async function savePosition(sid: string, player: PlayerState) { const {error}=await supabase.rpc("save_player",{_sid:sid,_pos:asJson(player)}); if(error) throw error; }
export async function reward(sid: string, source: string, amount: number, cooldown = 0) { const {data,error}=await supabase.rpc("add_xp",{_sid:sid,_source:source,_amount:amount,_cooldown_s:cooldown}); if(error) throw error; return data; }