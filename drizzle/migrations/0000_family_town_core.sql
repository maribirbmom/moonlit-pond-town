CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_sprite_index int,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Our Town',
  invite_code text NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 6)),
  mode text NOT NULL DEFAULT 'duo',
  xp int NOT NULL DEFAULT 0,
  level int NOT NULL DEFAULT 1,
  world_state jsonb NOT NULL DEFAULT '{"schemaVersion":1,"players":{},"talkedTo":[],"visitedBuildings":[],"inventory":{},"flags":{},"fishCaught":[]}'::jsonb,
  clock_epoch timestamptz NOT NULL DEFAULT (now() - interval '8 minutes'),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.session_members (
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'player1',
  display_name text,
  sprite_index int,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);
CREATE TABLE public.xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  source text NOT NULL,
  amount int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.xp_events (session_id, source, created_at);
GRANT SELECT, DELETE ON public.sessions TO authenticated;
GRANT SELECT ON public.session_members TO authenticated;
GRANT SELECT ON public.xp_events TO authenticated;
GRANT ALL ON public.sessions, public.session_members, public.xp_events TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.is_member(_sid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.session_members WHERE session_id = _sid AND user_id = auth.uid())
$$;

CREATE POLICY "members read session" ON public.sessions FOR SELECT TO authenticated USING (public.is_member(id));
CREATE POLICY "creator deletes session" ON public.sessions FOR DELETE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "members read members" ON public.session_members FOR SELECT TO authenticated USING (public.is_member(session_id));
CREATE POLICY "members read xp" ON public.xp_events FOR SELECT TO authenticated USING (public.is_member(session_id));

-- level n reached at 25*n*(n-1) total XP (mirrors src/game/config/xp.ts)
CREATE OR REPLACE FUNCTION public.level_for_xp(_xp int) RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT greatest(1, floor((1 + sqrt(1 + 4 * _xp / 25.0)) / 2)::int)
$$;

CREATE OR REPLACE FUNCTION public.create_session(_name text, _mode text, _display text, _sprite int)
RETURNS public.sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.sessions;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  INSERT INTO public.sessions(name, mode, created_by) VALUES (coalesce(nullif(_name,''),'Our Town'), CASE WHEN _mode='solo' THEN 'solo' ELSE 'duo' END, auth.uid()) RETURNING * INTO s;
  INSERT INTO public.session_members(session_id, user_id, role, display_name, sprite_index) VALUES (s.id, auth.uid(), 'player1', _display, _sprite);
  RETURN s;
END $$;

CREATE OR REPLACE FUNCTION public.join_session(_code text, _display text, _sprite int)
RETURNS public.sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.sessions; n int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT * INTO s FROM public.sessions WHERE invite_code = upper(trim(_code)) AND mode = 'duo';
  IF s.id IS NULL THEN RAISE EXCEPTION 'invite code not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.session_members WHERE session_id = s.id AND user_id = auth.uid()) THEN RETURN s; END IF;
  SELECT count(*) INTO n FROM public.session_members WHERE session_id = s.id;
  IF n >= 2 THEN RAISE EXCEPTION 'this town already has two players'; END IF;
  INSERT INTO public.session_members(session_id, user_id, role, display_name, sprite_index) VALUES (s.id, auth.uid(), 'player2', _display, _sprite);
  RETURN s;
END $$;

-- Atomic shared XP. _cooldown_s > 0 blocks the same source for that many seconds (session-wide).
CREATE OR REPLACE FUNCTION public.add_xp(_sid uuid, _source text, _amount int, _cooldown_s int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.sessions;
BEGIN
  IF NOT public.is_member(_sid) THEN RAISE EXCEPTION 'not a member'; END IF;
  IF _amount <= 0 OR _amount > 100 THEN RAISE EXCEPTION 'bad amount'; END IF;
  SELECT * INTO s FROM public.sessions WHERE id = _sid FOR UPDATE;
  IF _cooldown_s > 0 AND EXISTS (SELECT 1 FROM public.xp_events WHERE session_id = _sid AND source = _source AND created_at > now() - make_interval(secs => _cooldown_s)) THEN
    RETURN jsonb_build_object('awarded', false, 'xp', s.xp, 'level', s.level);
  END IF;
  INSERT INTO public.xp_events(session_id, user_id, source, amount) VALUES (_sid, auth.uid(), _source, _amount);
  UPDATE public.sessions SET xp = xp + _amount, level = public.level_for_xp(xp + _amount), updated_at = now() WHERE id = _sid RETURNING * INTO s;
  RETURN jsonb_build_object('awarded', true, 'xp', s.xp, 'level', s.level);
END $$;

CREATE OR REPLACE FUNCTION public.save_player(_sid uuid, _pos jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_member(_sid) THEN RAISE EXCEPTION 'not a member'; END IF;
  UPDATE public.sessions SET world_state = jsonb_set(world_state, ARRAY['players', auth.uid()::text], _pos, true), updated_at = now() WHERE id = _sid;
END $$;

CREATE OR REPLACE FUNCTION public.record_catch(_sid uuid, _catch jsonb, _xp int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.is_member(_sid) THEN RAISE EXCEPTION 'not a member'; END IF;
  UPDATE public.sessions SET world_state = jsonb_set(world_state, '{fishCaught}', coalesce(world_state->'fishCaught','[]'::jsonb) || jsonb_build_array(_catch || jsonb_build_object('by', auth.uid(), 'at', now())), true) WHERE id = _sid;
  r := public.add_xp(_sid, 'fish:' || coalesce(_catch->>'id','?'), _xp, 0);
  RETURN r;
END $$;

REVOKE ALL ON FUNCTION public.create_session, public.join_session, public.add_xp, public.save_player, public.record_catch FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_session, public.join_session, public.add_xp, public.save_player, public.record_catch TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;