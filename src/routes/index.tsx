import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Landing } from "@/components/game/Landing";
import { AvatarEditor } from "@/components/game/AvatarEditor";
import { SessionPicker } from "@/components/game/SessionPicker";
import { parseAvatar, type Avatar } from "@/game/config/items";
import { asJson, type TownSession } from "@/game/session";
import { GameView } from "@/components/game/GameView";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Family Town — play together" },
      { name: "description", content: "Make your own pixel avatar, explore Family Town together, and fish beneath the stars." },
      { property: "og:title", content: "Family Town — play together" },
      { property: "og:description", content: "Make your own pixel avatar, explore Family Town together, and fish beneath the stars." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Profile = { display_name: string; avatar_sprite_index: number; avatar: Avatar | null };

function Index() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [played,setPlayed] = useState(false);
  const [town,setTown] = useState<TownSession|null>(null);
  const [editing,setEditing] = useState(false);

  useEffect(() => {
    setPlayed(window.sessionStorage.getItem("family-town-play")==="1");
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {if(event==="SIGNED_IN"||event==="SIGNED_OUT"||event==="USER_UPDATED") {setUser(session?.user??null);if(event==="SIGNED_OUT"){setTown(null);setPlayed(false);window.sessionStorage.removeItem("family-town-play");}}});
    supabase.auth.getUser().then(({ data }) => { setUser(data.user ?? null); setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setProfile(undefined); return; }
    let active=true;
    setProfile(undefined);
    supabase.from("profiles").select("display_name, avatar_sprite_index, avatar").eq("id", user.id).maybeSingle().then(({ data }) => {
      if(active) setProfile(data?.display_name ? {display_name:data.display_name,avatar_sprite_index:data.avatar_sprite_index??0,avatar:parseAvatar(data.avatar)} : null);
    });
    return()=>{active=false;};
  }, [user?.id]);

  const saveAvatar = async (avatar:Avatar,name:string) => {if(!user)return;const {error}=await supabase.from("profiles").upsert({id:user.id,display_name:name,avatar_sprite_index:profile?.avatar_sprite_index??0,avatar:asJson(avatar)});if(error)throw error;setProfile({display_name:name,avatar_sprite_index:profile?.avatar_sprite_index??0,avatar});setEditing(false);};
  if(!played) return <Landing onPlay={()=>{window.sessionStorage.setItem("family-town-play","1");setPlayed(true);}}/>;
  if (!ready || (user && profile === undefined)) {
    return <main className="bg-dream flex min-h-screen items-center justify-center text-2xl">Loading town…</main>;
  }
  if (!user) return <Landing signInOnly />;
  if (!profile?.avatar || editing) {
    const meta = user.user_metadata ?? {};
    return <AvatarEditor {...(profile?.avatar?{initial:profile.avatar}:{})} initialName={profile?.display_name??String(meta["full_name"]||meta["name"]||"").split(" ")[0]??""} onSave={saveAvatar} {...(editing?{onClose:()=>setEditing(false)}:{})}/>;
  }
  if(!town) return <SessionPicker userId={user.id} name={profile.display_name} sprite={profile.avatar_sprite_index} avatar={profile.avatar} onEnter={setTown} onEdit={()=>setEditing(true)}/>;
  return <GameView userId={user.id} name={profile.display_name} sprite={profile.avatar_sprite_index} avatar={profile.avatar} session={town} onExit={()=>setTown(null)} onAvatarSave={saveAvatar}/>;
}
