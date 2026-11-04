import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import logo from "@/assets/family-town-title.png";
import { preloadAvatars } from "@/game/avatar";

export function Landing({ onPlay, signInOnly = false }: { onPlay?: () => void; signInOnly?: boolean }) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const play = () => { void preloadAvatars(); onPlay?.(); };
  useEffect(() => { if(signInOnly) return; const key=(e:KeyboardEvent)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();play();}};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key); },[signInOnly,onPlay]);
  const signIn = async (provider: "google") => {
    setBusy(true);
    setErr(null);
    window.sessionStorage.setItem("family-town-play", "1");
    const res = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
    if (res.error) setErr("Couldn't sign in. Please try again.");
    setBusy(false);
  };
  return (
    <main className="title-background relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <img src={logo} alt="Family Town" className="w-full max-w-xl object-contain" />
      {!signInOnly ? <button type="button" onClick={play} className="play-btn -mt-6"><span aria-hidden className="play-btn-star">✦</span>Play<span aria-hidden className="play-btn-star">✦</span></button> : <div className="mt-6 flex w-full max-w-xs flex-col gap-3"><Button variant="pixel" size="lg" disabled={busy} onClick={()=>signIn("google")}>{busy?"Opening…":"Continue with Google"}</Button></div>}
      {err && <p className="mt-4 text-destructive">{err}</p>}
    </main>
  );
}
