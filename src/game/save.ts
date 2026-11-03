import { supabase } from "@/integrations/supabase/client";
import type { PlayerState } from "./engine";

/** Save-state schema. Bump `version` when adding inventory, levels, etc. */
export interface WorldState {
  version: 1;
  level: "hub";
  player: PlayerState;
}

export async function loadSave(userId: string, slot = 1): Promise<WorldState | null> {
  const { data } = await supabase
    .from("game_saves")
    .select("world_state")
    .eq("user_id", userId)
    .eq("slot", slot)
    .eq("mode", "single")
    .maybeSingle();
  const ws = data?.world_state as unknown as WorldState | undefined;
  return ws?.player ? ws : null;
}

export async function writeSave(userId: string, state: WorldState, slot = 1) {
  await supabase.from("game_saves").upsert(
    { user_id: userId, slot, mode: "single", world_state: state as never, updated_at: new Date().toISOString() },
    { onConflict: "user_id,slot,mode" },
  );
}
