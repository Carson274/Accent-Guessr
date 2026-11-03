# Accent Guessr: notes for agents

Read this before changing the project. It records how things work and why they
were built this way, so you can pick up from these decisions instead of
rediscovering them. The rules in `/Users/carson/Code/AGENTS.md` (commits,
replies, asking before pushing) also apply. Keep this file up to date when you
change something it describes.

## What it is

A GeoGuessr-style game: listen to a clip, click the country on a map, score by
distance. Two modes, each playable solo or multiplayer:

- **Accents**: a real person reads part of an English paragraph; guess where they grew up.
- **Language**: a sentence in another language; guess the country.

Live site: https://accent-guessr.vercel.app (backend: https://accent-guessr-backend.vercel.app).

## Layout and commands

| Path | What |
|---|---|
| `client/` | React 19 + TypeScript + Vite + Tailwind v4 + Leaflet. `npm run dev`, `npm run lint`, `npm run build` |
| `client/party/index.ts` | PartyKit server for multiplayer rooms (`client/partykit.json`), deployed separately from Vercel |
| `backend/` | Express server that hands out audio clips. `npm run dev` (port 3000) |
| `backend/scripts/` | One-off scripts that build the audio clips (see below) |

There are no tests. Before calling a change done, run the client's lint and build.
Phone layouts: headless Chrome won't make a window narrower than about 500px, so
check phone widths by loading the page in a 360px or 390px wide `<iframe>`.

## Deployment

- Vercel team **First Dibs** (projects were moved there from the personal
  `carson274s-projects` scope in November 2026). Two projects, both deploying
  `main` from GitHub `Carson274/Accent-Guessr` on every push:
  - `accent-guessr`: root `client/`, Vite. Env: `VITE_BACKEND_URL`, `VITE_PARTYKIT_HOST`.
  - `accent-guessr-backend`: root `backend/`, Express preset. Needs no env vars.
- Branch pushes create preview deployments. Client previews sit behind Vercel
  login and still call the production backend (same `VITE_BACKEND_URL` for every
  environment), so backend changes only show up on the client once merged to `main`.
- The backend's CORS allowlist (`backend/index.js`) still names preview URLs
  under the old `carson274s-projects` slug; previews under the new team aren't allowed.
- The backend project still has `FORVO_API_KEY` and `GCP_SERVICE_ACCOUNT_JSON`
  set in Vercel. Neither is used anymore; they can be deleted.

## Audio: how it works

All clips are generated ahead of time and committed. Playing the game calls no
paid API and needs no keys.

- Clips live in `backend/public/clips/`. On Vercel, files in `public/` are served
  by the CDN; locally `express.static` serves them.
- `backend/clips/manifest.json` maps each country (ISO alpha-3, matching
  `ISO_A3` in `client/src/data/countries.json`) to its clips. The server picks a
  random unused country and clip and returns a relative `/clips/<file>` URL; the
  client turns it into a full URL in `client/src/hooks/useAudio.ts`.
- Clip file names are content hashes (`a-` accents, `l-` language), so the answer
  can't be read from the network tab. The manifest is never served publicly.
- `backend/scripts/clip-utils.js` rewrites one section of the manifest and
  deletes clips that section no longer uses.

### Accents mode clips (`npm run clips:accents`)

- Source: the [Speech Accent Archive](https://accent.gmu.edu) (George Mason
  University), licensed **CC BY-NC-SA 4.0**. The credit is on the Modes page and
  in the README, and must stay. Non-commercial only: if the site ever makes
  money, these clips need replacing.
- Why: the original Forvo integration broke (its API key is locked to another
  domain: "Calling from incorrect domain"). ElevenLabs was considered but costs
  money and only gives synthetic accents. The archive is free, has real
  speakers, and covers about 143 countries.
- Everyone in the archive reads the same paragraph ("Please call Stella…"). The
  game only plays the last two sentences, "We also need a small plastic snake…
  train station", because the owner didn't want names in the clip. Speakers whose
  two sentences run past about 17.5 seconds stop after "…for the kids."
- `backend/clips/accent-speakers.json` lists the speakers with `start`, `end`
  and `firstEnd` times (seconds into the original recording). For entries without
  times, the build runs `find-passage.py` (Whisper `small.en`; set
  `WHISPER_PYTHON` / `WHISPER_MODEL`). Cuts snap to nearby pauses.
- Hand fixes already applied: start times nudged for `hungarian8`, `arabic137`,
  `arabic13`, `russian10` (Whisper started them inside "…brother Bob"). Dropped:
  `mongolian7` (passage not found), `spanish81` (runs straight from "Bob" into
  "We"), and `swissgerman8`, `arabic105`, `mandarin152` (not on OSF). The two
  Kyrgyz files are spelled `kirgiz1.mp3` and `kirghiz2.mp3` on OSF.
- To check clips after changing times, transcribe the first few seconds of each
  with Whisper and look for anything before "We also need".
- `select-accent-speakers.py` is how the speaker list was chosen (rules are in
  the script). Running it again overwrites hand edits, so merge new speakers by hand.
- OSF (the archive's file host) rate-limits downloads and some file names contain
  a space (`bengali 1.mp3`); the build script handles both. Downloads are cached in
  the system temp folder.

### Language mode clips (`npm run clips:language`)

- Google Cloud Translation + Text-to-Speech, needs `GCP_SERVICE_ACCOUNT_JSON` in
  `backend/.env` (only for regenerating). 6 sentences per language from
  `SENTENCES` in `backend/constants.js`.
- Voice choice: best tier per locale (Chirp 3 HD, then Neural2, then WaveNet), one
  female and one male voice alternating. Languages that only have Google's basic
  "Standard" voices are left out on purpose (they sounded robotic).
- Regional voices: Spain and Equatorial Guinea use `es-ES`, other Spanish
  countries `es-US`; Brazil `pt-BR`, other Portuguese `pt-PT`; Belgium `nl-BE`;
  Taiwan `cmn-TW`. Bosnian text is read with the Croatian voice.
- 113 countries have clips. 32 in `ALL_COUNTRY_MAP` have no usable Google voice
  (the script prints the list); they could be filled from another TTS service.

## Game UI decisions

- **No autoplay.** Each round starts with a big play button over the map
  (`client/src/components/ClipControls.tsx`); after that a small play/pause bar
  sits in the map's corner. `useClipPlayer` stops audio when leaving the game,
  when the round changes, and when the browser tab is hidden.
- **Round results** (`Map` `result` prop): answer country green, guess red,
  pins with labels, dashed line between them, map zooms to fit both. Colors live
  in `client/src/utils/constants.ts`. Pins use the middle of each country's
  largest landmass (`getCountryLabelPoint`), so the US pin isn't pulled toward Alaska.
- **Scoring** is unchanged from the original: up to 5,000 points by distance
  between country centroids, 0 at 10,000 km or more.
- **Phones** (below Tailwind's `sm`, 640px): the scoreboard and the
  Submit/Next button sit below the map instead of over it; the map starts one zoom
  level further out; the map box uses `dvh` units.
- Multiplayer has the same audio and results changes but hasn't been tested
  with two live players.

## Branding

- Colors: red `#DA4F49`, cream `#EAE8DD`. Title font: Jim Nightshade (`.logo` class).
- Favicon: a cream Jim Nightshade "A" on a red rounded tile, `client/public/favicon.svg`.
  The glyph outline was taken from the Google Fonts TTF (OFL license) with fonttools.
  The PNG/ICO versions were rendered from the SVG with headless Chrome and Pillow:
  `favicon.ico` (16/32/48), `apple-touch-icon.png` (180, square, no rounded
  corners since iOS adds them), `icon-192.png` and `icon-512.png` for `site.webmanifest`.

## Known issues and ideas

- The client bundle is about 22 MB because the 24 MB country GeoJSON is bundled;
  a simplified GeoJSON would make the first load much faster.
- `client/public/vite.svg` and `client/src/assets/react.svg` are unused Vite template files.
