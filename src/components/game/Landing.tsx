import { useEffect, useState } from "react";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import logo from "@/assets/family-town-logo.png.asset.json";
import { preloadAvatars } from "@/game/avatar";
import "@lovable.dev/cloud-auth-js/styles.css";

export function Landing({ onPlay, signInOnly = false }: { onPlay?: () => void; signInOnly?: boolean }) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const play = () => { void preloadAvatars(); onPlay?.(); };
  useEffect(() => { if(signInOnly) return; const key=(e:KeyboardEvent)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();play();}};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key); },[signInOnly,onPlay]);
  const signIn = async (provider: "google" | "lovable") => {
    setBusy(true);
    setErr(null);
    window.sessionStorage.setItem("family-town-play", "1");
    const res = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (res.error) setErr("Couldn't sign in. Please try again.");
    setBusy(false);
  };
  return (
    <main className="title-background relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <img src={logo.url} alt="Family Town" className="pixelated w-full max-w-xl object-contain" />
      {!signInOnly ? <Button variant="pixel" size="lg" onClick={play} className="mt-6 h-14 min-w-44 bg-cream text-plum text-2xl">▶ Play</Button> : <div className="mt-6 flex w-full max-w-xs flex-col gap-3"><Button variant="pixel" size="lg" disabled={busy} onClick={()=>signIn("google")}>{busy?"Opening…":"Continue with Google"}</Button><Button className="lovable-auth-button" disabled={busy} onClick={()=>signIn("lovable")}>Continue with Lovable</Button></div>}
      {err && <p className="mt-4 text-destructive">{err}</p>}
    </main>
  );
}
