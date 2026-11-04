# Moonlit Pond Town

I'm adding images and assets for your reference, wait until I say go
Add life and night atmosphere to the town map.

- BENCHES: at least 14 two-seat benches along every path, near the plaza, flower shop, garden, cafe, and the home. Press E / tap "Sit" to snap onto a seat. Two players can use the two seats; when both are seated show a floating heart and award a small shared XP bonus (+5, max once every 5 minutes per bench) via add_xp.

- LAMPS: at least 40 lamp posts spaced every 4-6 tiles along all paths, around the shops, home and (later) the pond so night is fully navigable. They switch on gradually at dusk with a tiny flicker, each casts a warm soft radial light (additive), and light radii overlap so no path is dark. Keep ambient night brightness readable, never black.

- SCENERY: use ALL the attached tree, bush, flower, log and mushroom sprites. Scatter them with a seeded RNG so the layout is stable, avoiding paths, doors, NPC spots and benches. Y-sort everything so characters walk behind/in front correctly.

- FIREFLIES: 60-100 soft yellow-green dots drifting in sine paths, blinking, visible only at dusk and night, clustered near bushes (and the pond later).

- GLOWING BUSHES: 8-12 bushes that softly pulse teal/pink/lavender at night only.

- UNIQUE TREES: 3-4 special trees (recolor the attached trees): a big pink blossom tree near the home, a blue glowing-leaf tree, a golden autumn tree, and a lantern tree with hanging lights. Give them a gentle glow at night.

- Performance: draw lights on an offscreen canvas, cull anything outside the camera, cap particles.

Add a pond, boat and fishing.

- POND: extend the map south. Below the bottom building row add a lane and a grassy shore, then a pond that fills the whole bottom of the map to the edge of the view. Animated water (shimmer + ripples), reeds, lily pads, shoreline edge tiles, faint fish shadows. Water is not walkable except on the dock/pier. At night, lamp light reflects on the water and fireflies gather there. Leave a gap between two bottom-row buildings (e.g. cafe and cake) as a path leading down to the shore.

- DOCK + BOAT: a wooden walkway from the shore to a small rowboat with 2 seats. Prompt "Hop on" at the dock. Both seats can be taken by two players (sit-together XP bonus like the benches). The boat bobs gently.

- FISHING SPOT: at the point where the land meets the pond, a short pier with two chairs. Walking up shows a prompt "Fish?". Confirm to sit and start.

- FISHING SIM:

  1. Cast: hold Space/tap to charge a power meter, release to throw. The bobber lands farther with more power, with a splash ripple.

  2. Wait: random 3-10s of "..." with the bobber floating.

  3. Bite: bobber dips + "!" appears, give a ~1.5s window to react.

  4. Reel: a short timing bar mini-game (keep the marker in the green zone). Success = catch popup (fish name, rarity, size, pixel icon). Fail = "It got away."

  - fish.ts config with ~8 fish (common, uncommon, rare), some only at night or dusk.

  - Each catch awards shared XP (5/10/25 by rarity) and is saved in session.world_state.fishCaught as a simple collection list.

  - Both chairs work independently. The partner sees your bobber and catch via realtime.

- Keep everything in config files so I can add fish, items and minigames later.

## Setup

1. **Supabase** - create a free project at supabase.com. In *SQL Editor* paste and run `supabase/setup.sql`.
   In *Authentication -> Providers* enable **Google** (create an OAuth client in Google Cloud Console; the redirect URL to allow is shown on that page). In *Authentication -> URL Configuration* add your site URL and `http://localhost:5173`.
2. **Env** - copy `.env.example` to `.env` and fill in the keys from *Project Settings -> API*.
3. **Run** - `bun install && bun run dev`.
4. **Deploy** - import the repo into Vercel, add the same env vars, deploy.
