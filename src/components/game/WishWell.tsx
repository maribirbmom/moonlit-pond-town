import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sfx } from "@/game/sfx";

interface Wish { id: string; author: string; body: string; created_at: string; user_id: string }
interface Props { sessionId: string; userId: string; name: string; onClose: () => void; onWished: () => void }

const MAX = 160;

export function WishWell({ sessionId, userId, name, onClose, onWished }: Props) {
  const [text, setText] = useState("");
  const [step, setStep] = useState<"write" | "toss" | "done">("write");
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [error, setError] = useState("");

  const load = async () => {
    const { data } = await supabase.from("wishes").select("id,author,body,created_at,user_id").eq("session_id", sessionId).order("created_at", { ascending: false }).limit(30);
    setWishes((data ?? []) as Wish[]);
  };
  useEffect(() => { void load(); }, [sessionId]);

  const toss = async () => {
    const body = text.trim();
    if (!body || step !== "write") return;
    setError(""); setStep("toss"); sfx.coin();
    const save = supabase.from("wishes").insert({ session_id: sessionId, author: name, body });
    window.setTimeout(() => sfx.wish(), 650);
    const [{ error: err }] = await Promise.all([save, new Promise((r) => window.setTimeout(r, 1700))]);
    if (err) { setError("The well couldn't keep that wish. Please try again."); setStep("write"); return; }
    setStep("done"); onWished(); void load();
  };

  const mine = wishes.filter((w) => w.user_id === userId).length;

  return (
    <div className="game-modal" role="dialog" aria-label="Wishing well">
      <section className="wish-card">
        <header className="wish-head">
          <h2>✨ Wishing well</h2>
          <button type="button" className="wish-x" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </header>

        {step !== "done" && (
          <>
            <p className="wish-sub">Write a wish on a little note, then toss a coin in and let it drift down.</p>
            <div className={`wish-stage ${step === "toss" ? "tossing" : ""}`}>
              <div className="wish-note">
                <textarea
                  value={text}
                  maxLength={MAX}
                  disabled={step === "toss"}
                  placeholder="I wish…"
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  aria-label="Your wish"
                />
                <span className="wish-count">{text.length}/{MAX}</span>
              </div>
              <div className="wish-coin" aria-hidden="true">🪙</div>
              <div className="wish-ripple" aria-hidden="true" />
            </div>
            {error && <p className="wish-err" role="alert">{error}</p>}
            <button type="button" className="wish-go" disabled={!text.trim() || step === "toss"} onClick={() => void toss()}>
              {step === "toss" ? "Dropping in…" : "🪙 Toss coin & drop note"}
            </button>
          </>
        )}

        {step === "done" && (
          <div className="wish-done">
            <div className="wish-sparkle">✨</div>
            <h3>Your wish is in the well</h3>
            <p>Make it come true. 💜</p>
            <button type="button" className="wish-go" onClick={() => { setText(""); setStep("write"); }}>Make another wish</button>
          </div>
        )}

        <div className="wish-list">
          <h3>In the well <small>{wishes.length} {wishes.length === 1 ? "wish" : "wishes"}{mine ? ` · ${mine} yours` : ""}</small></h3>
          {wishes.length === 0 && <p className="wish-empty">No wishes yet. Be the first!</p>}
          <ul>
            {wishes.map((w) => (
              <li key={w.id}><span className="wish-by">{w.user_id === userId ? "You" : w.author || "Someone"}</span> {w.body}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
