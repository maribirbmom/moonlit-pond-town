import { useEffect, useState } from "react";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import logo from "@/assets/family-town-logo.png.asset.json";
import { preloadAvatars } from "@/game/avatar";
import "@lovable.dev/cloud-auth-js/styles.css";

/** The title art has its own baked-in "Play" graphic along the bottom; this hides that strip so only the real button shows. Tune if the art changes. */
const LOGO_PLAY_CROP_PERCENT = 24;

export function Landing({ onPlay, signInOnly = false }: { onPlay?: () => void; signInOnly?: boolean }) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ratio, setRatio] = useState<{ w: number; h: number } | null>(null);
  const play = () => { void preloadAvatars(); onPlay?.(); };
  useEffect(() => { if(signInOnly) return; const key=(e:KeyboardEvent)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();play();}};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key); },[signInOnly,onPlay]);
  const signIn = async (provider: "google") => {
    setBusy(true);
    setErr(null);
    window.sessionStorage.setItem("family-town-play", "1");
    const res = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (res.error) setErr("Couldn't sign in. Please try again.");
    setBusy(false);
  };
  return (
    <main className="title-background relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="w-full max-w-xl overflow-hidden" style={{ aspectRatio: ratio ? `${ratio.w} / ${ratio.h * (1 - LOGO_PLAY_CROP_PERCENT / 100)}` : undefined }}>
        <img src={logo.url} alt="Family Town" onLoad={(e) => setRatio({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} className="pixelated h-full w-full object-cover object-top" />
      </div>
      {!signInOnly ? <button type="button" onClick={play} className="play-btn mt-4"><span aria-hidden className="play-btn-star">✦</span>Play<span aria-hidden className="play-btn-star">✦</span></button> : <div className="mt-6 flex w-full max-w-xs flex-col gap-3"><Button variant="pixel" size="lg" disabled={busy} onClick={()=>signIn("google")}>{busy?"Opening…":"Continue with Google"}</Button></div>}
      {err && <p className="mt-4 text-destructive">{err}</p>}
    </main>
  );
}
