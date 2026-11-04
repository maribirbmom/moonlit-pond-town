import { supabase } from "@/integrations/supabase/client";
import type { PlayerState } from "./engine";

/** Save-state schema. Player position lives in sessions.world_state.players[userId]. */
export interface WorldState {
  version: 1;
  level: "hub";
  player: PlayerState;
}

async function latestSessionId(userId: string) {
  const { data } = await supabase.from("session_members").select("session_id, joined_at").eq("user_id", userId).order("joined_at", { ascending: false }).limit(1).maybeSingle();
  return data?.session_id ?? null;
}

async function ensureSession(userId: string) {
  const id = await latestSessionId(userId);
  if (id) return id;
  const { data } = await supabase.rpc("create_session", { _name: "Our Town", _mode: "solo", _display: "", _sprite: 0 });
  return (data as { id: string } | null)?.id ?? null;
}

export async function loadSave(userId: string): Promise<WorldState | null> {
  const sid = await ensureSession(userId);
  if (!sid) return null;
  const { data } = await supabase.from("sessions").select("world_state").eq("id", sid).maybeSingle();
  const ws = data?.world_state as { players?: Record<string, PlayerState> } | undefined;
  const p = ws?.players?.[userId];
  return p ? { version: 1, level: "hub", player: p } : null;
}

export async function writeSave(userId: string, state: WorldState) {
  const sid = await latestSessionId(userId);
  if (sid) await supabase.rpc("save_player", { _sid: sid, _pos: state.player as never });
}
