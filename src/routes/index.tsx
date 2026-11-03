import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Landing } from "@/components/game/Landing";
import { Onboarding } from "@/components/game/Onboarding";
import { GameView } from "@/components/game/GameView";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wedding City — a cozy pixel town" },
      { name: "description", content: "Wander a dreamy pixel-art town and meet the family getting ready for the wedding." },
      { property: "og:title", content: "Wedding City — a cozy pixel town" },
      { property: "og:description", content: "Wander a dreamy pixel-art town and meet the family getting ready for the wedding." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Profile = { display_name: string; avatar_sprite_index: number };

function Index() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    supabase.auth.getUser().then(({ data }) => { setUser(data.user ?? null); setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setProfile(undefined); return; }
    supabase.from("profiles").select("display_name, avatar_sprite_index").eq("id", user.id).maybeSingle().then(({ data }) => {
      setProfile(data?.display_name && data.avatar_sprite_index != null ? (data as Profile) : null);
    });
  }, [user?.id]);

  if (!ready || (user && profile === undefined)) {
    return <main className="bg-dream flex min-h-screen items-center justify-center text-2xl">Loading town…</main>;
  }
  if (!user) return <Landing />;
  if (!profile) {
    const meta = user.user_metadata ?? {};
    return <Onboarding userId={user.id} defaultName={(meta["full_name"] || meta["name"] || "").split(" ")[0] ?? ""} onDone={setProfile} />;
  }
  return <GameView userId={user.id} name={profile.display_name} sprite={profile.avatar_sprite_index} />;
}
