import { useState } from "react";
import { lovable } from "@/integrations/lovable/index";
import { SpriteThumb } from "./SpriteThumb";

export function Landing() {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signIn = async () => {
    setBusy(true);
    setErr(null);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) setErr("Couldn't sign in. Please try again.");
    setBusy(false);
  };
  return (
    <main className="bg-dream relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="vignette pointer-events-none absolute inset-0" />
      <div className="animate-float mb-6 flex gap-3">
        {[4, 13, 7, 3, 35].map((i) => <SpriteThumb key={i} index={i} size={3} />)}
      </div>
      <h1 className="text-6xl font-bold tracking-wide text-plum drop-shadow-[0_4px_0_var(--cream)] sm:text-7xl">Wedding City</h1>
      <p className="mt-4 max-w-md text-lg text-muted-foreground">A sleepy little town getting ready for the big day.</p>
      <button onClick={signIn} disabled={busy} className="pixel-btn mt-10 px-8 py-3 text-xl font-semibold disabled:opacity-60">
        {busy ? "Opening…" : "Continue with Google"}
      </button>
      {err && <p className="mt-4 text-destructive">{err}</p>}
    </main>
  );
}
