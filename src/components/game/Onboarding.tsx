import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CHARACTER_LOOKS } from "@/game/assets";
import { SpriteThumb } from "./SpriteThumb";

export function Onboarding({ userId, defaultName, onDone }: { userId: string; defaultName: string; onDone: (p: { display_name: string; avatar_sprite_index: number }) => void }) {
  const [name, setName] = useState(defaultName.slice(0, 16));
  const [sprite, setSprite] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    const display_name = name.trim();
    if (!display_name) return setErr("Pick a name first!");
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({ id: userId, display_name, avatar_sprite_index: sprite });
    setBusy(false);
    if (error) return setErr("Couldn't save. Try again.");
    onDone({ display_name, avatar_sprite_index: sprite });
  };
  return (
    <main className="bg-dream flex min-h-screen items-center justify-center p-4">
      <div className="pixel-panel w-full max-w-2xl p-6">
        <h1 className="text-3xl font-bold">Who are you?</h1>
        <label className="mt-5 block text-sm text-muted-foreground">Display name</label>
        <input value={name} maxLength={16} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded border-[3px] border-border bg-cream px-3 py-2 text-lg outline-none focus:border-primary" />
        <p className="mt-5 text-sm text-muted-foreground">Pick your look</p>
        <div className="mt-2 grid max-h-[46vh] grid-cols-7 gap-2 overflow-y-auto rounded bg-muted p-2">
          {CHARACTER_LOOKS.map((_, i) => (
            <button key={i} onClick={() => setSprite(i)} className={`flex justify-center rounded border-[3px] p-1 ${sprite === i ? "border-primary bg-blush" : "border-transparent bg-card"}`} aria-label={`Sprite ${i + 1}`}>
              <SpriteThumb index={i} size={2} />
            </button>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between gap-4">
          <SpriteThumb index={sprite} size={4} />
          {err && <p className="text-destructive">{err}</p>}
          <button onClick={save} disabled={busy} className="pixel-btn px-6 py-2 text-lg font-semibold">{busy ? "Saving…" : "Enter town"}</button>
        </div>
      </div>
    </main>
  );
}
