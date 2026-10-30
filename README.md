# Little Together 🌱

**Play together, grow together, no matter the distance.**

Little Together is a cooperative multiplayer garden for families who live far apart. A three-year-old in Taipei and an aunt in Seattle join the same garden from their own devices, plant seeds, water sprouts, and watch flowers bloom on both screens at once. When the time zones don't line up, the garden waits: one person plants in the morning, the other waters it that evening, and the next visit opens with a little "someone helped your garden grow" celebration.

No accounts, no typing, no losing. Large tap targets, picture cues instead of instructions, and gentle animations make it playable by a pre-reader with an adult nearby.

## How to play

1. An adult taps **Create a garden** and shares the invite link (or the 8-character code).
2. Each person picks an animal. No names are needed.
3. Every plot shows a bouncing picture of what it needs next: seed bag, watering can, sun, sparkle. Tap the plot to do it.
4. Everyone sees every change live. A flower grown by two different players gets a twin-heart celebration.
5. Three flowers bring a butterfly; six bring a bee; ten bring a bird. They stay.
6. The big heart button sends floating hearts to everyone in the garden, which is handy during a video call.
7. The paintbrush opens **Magic Drawing**: draw a fish together, one line each (see below).
8. Close the tab whenever. The garden is saved on the server and is waiting next time.

## Magic Drawing

A shared canvas where the family draws a fish together, taking turns, and then watches their own lines swim.

- **Guided, four lines.** A dashed hint shows the next part: body, tail, fin, stripes. One line finishes a step, so a wobbly scribble or a single tap still counts.
- **Turns that never block.** After you draw, the turn passes to the next player who is online. If you're alone, or the next player has left, anyone can draw.
- **Their lines come alive.** The finished fish is built from the players' own strokes: the tail stroke wags, the fin stroke flaps, the body gets a soft fill, and only an eye, smile and cheeks are added. It swims across every screen in the room at once.
- **Saved, and alive in the garden.** Creations go into the room's gallery (last 24). The three newest swim back and forth in the garden pond; tap one and it jumps. Finishing a fish also shows up in Welcome Back for family who were away. An empty pond shows a dotted fish and opens Magic Drawing.

Protocol: a stroke is sent once, on pointer-up, as `{ t: "stroke", drawingId, step, color, pts }` with points simplified to at most 80 and normalized to a 1000×1000 space, so a drawing looks the same on every screen and fits the 2 KB message cap. The room checks payload shape and bounds, turn ownership, and that `drawingId` and `step` match the current drawing, so two strokes racing for one step can't both land. The current drawing, the gallery index and each creation are stored under their own keys, separate from garden state, so drawings never inflate garden updates. Rooms created before this feature start with an empty canvas.

## Architecture

```
 phone / tablet / laptop                        Cloudflare edge
┌───────────────────────┐   HTTPS   ┌──────────────────────────────────────┐
│ React SPA (Vite, TS,  │──────────▶│ Worker (worker/index.ts)             │
│ Tailwind)             │           │  • serves the built SPA (assets)     │
│                       │  WebSocket│  • POST /api/rooms   create room     │
│ useRoom() hook        │◀────────▶ │  • GET  /api/rooms/:code  exists?    │
│  • reconnect/backoff  │           │  • /api/rooms/:code/ws → room DO     │
│  • renders server     │           └──────────────┬───────────────────────┘
│    snapshots only     │                          │ idFromName(code)
└───────────────────────┘           ┌──────────────▼───────────────────────┐
                                    │ GardenRoom Durable Object (1 / room) │
                                    │  • authoritative garden state        │
                                    │  • WebSocket hibernation + presence  │
                                    │  • SQLite-backed storage             │
                                    │  • alarm deletes idle rooms (30 d)   │
                                    └──────────────────────────────────────┘
```

**Why Durable Objects.** Each room is one Durable Object, and a Durable Object handles one message at a time. That gives the game a single authoritative copy of each garden with serialized writes, so there is no lock code and no way for two clients to corrupt state. WebSockets, persistence and hosting live in one deploy with no database credentials anywhere near the browser.

### Multiplayer mechanics

- **Authoritative server.** Clients never edit garden state. A tap sends `{ t: "act", plotId, from, aid }`; the room validates it and broadcasts the full new snapshot plus an event to everyone (including the sender), and the UI renders that snapshot.
- **Optimistic concurrency.** `from` is the stage the client saw. If the plot has already moved on, the action is rejected as `stale` and the client receives the current snapshot. Two people tapping the same sprout at the same instant advance it exactly once, and a message replayed after a reconnect can never skip a stage.
- **Atomic persistence.** State, the 50-event activity log and the last-activity time are written in one multi-key `storage.put`, which is atomic. Broadcast happens after the write.
- **Late join and reconnect.** Every connection starts with `hello` and receives `welcome` with the current snapshot, so a late joiner, a refreshed tab and a reconnected phone all converge on the same state. The client reconnects with jittered exponential backoff, reacts immediately to the browser's `offline`/`online` events, and detects silent dead sockets with a ping that the Durable Object answers without waking up (`setWebSocketAutoResponse`).
- **No offline queue.** Taps while disconnected give a small shake and are not stored, so nothing stale is replayed later.
- **Play across time.** Each device remembers the last garden version it saw for that room. On return, the server sends the events other players made since then, which drives the Welcome Back screen.
- **Presence and hearts.** Online avatars come from the room's open sockets. Hearts and flower dances are broadcast-only effects and are never stored.

### Data model

| Stored per room (Durable Object storage) | Fields |
| --- | --- |
| `meta` | `created`, `createdAt`, `lastActivity` |
| `state` | `version`, `plots[6]` (`stage` 0–4, `plant`, `helpers`, `updatedBy`, `updatedAt`), `bloomedTotal`, `season`, `visitors` |
| `events` | last 50 of `{ version, kind, plotId, by, avatar, at, shared?, visitor? }` |
| `drawing` | current Magic Drawing: `id`, `template`, `step`, `strokes`, `turn` |
| `gallery`, `creation:<id>` | ids of saved creations (last 24) and one entry per creation |

| Stored per device (localStorage) | Fields |
| --- | --- |
| `lt:room:<CODE>` | random player id, chosen animal, last seen version |
| `lt:lang`, `lt:muted` | UI preferences |

### Security and privacy

- Room codes are 8 characters from a 31-symbol alphabet without look-alikes (about 40 bits). Codes are validated on every request, and only `POST /api/rooms` can create a room; connecting to an unknown code returns 404.
- WebSocket upgrades from other origins are refused. Each socket is rate-limited (token bucket), messages are capped at 1 KB and schema-checked, and rooms accept at most 12 concurrent sockets. Room creation and lookups are rate-limited per IP.
- No accounts, names, birthdays, photos, audio, location, free text, chat, uploads, ads or analytics. The only identifier is a random per-device id.
- Idle gardens are deleted after `RETENTION_DAYS` (default 30, set in `wrangler.jsonc`).

## Project layout

```
shared/protocol.ts     message types, game rules, room-code helpers (used by both sides)
shared/drawing.ts      Magic Drawing types, fish template, turn rules, stroke validation
worker/index.ts        Worker routes + GardenRoom Durable Object
src/lib/useRoom.ts     WebSocket client: reconnect, heartbeat, snapshots, effects
src/screens/           Welcome, Join, Lobby, Garden, Welcome Back, Magic Drawing
src/components/        SVG animals, plants, tool icons, visitors, scene
tests/                 end-to-end multiplayer acceptance tests (Playwright)
```

## Run locally

Requires Node 20+.

```bash
npm install
npm run dev            # builds the SPA, then serves Worker + Durable Objects at http://localhost:8787
```

Open the URL in two different browsers (or one normal and one private window) to play with yourself. To try it on a phone on the same Wi‑Fi, run `npx wrangler dev --ip 0.0.0.0` and open `http://<your-computer-ip>:8787`.

No environment variables or secrets are needed. `.dev.vars.example` lists the one optional variable.

## Deploy (Cloudflare Workers, free plan)

**Option A: deploy on every push (recommended)**

1. In the Cloudflare dashboard, go to **Workers & Pages → Create → Import a repository** and connect GitHub.
2. Choose this repository. Set **Build command** to `npm run build` and leave **Deploy command** as `npx wrangler deploy`.
3. Deploy. The app is live at `https://little-together.<your-subdomain>.workers.dev`, and every push to `main` redeploys.

**Option B: from your machine**

```bash
npx wrangler login
npm run deploy
```

The Durable Object migration in `wrangler.jsonc` (`new_sqlite_classes`) is applied automatically on the first deploy.

## Tests

```bash
npm run dev                                   # in one terminal
npm i -D playwright && npx playwright install chromium
npm test                                      # BASE_URL defaults to http://127.0.0.1:8787
BASE_URL=https://little-together.<you>.workers.dev npm test   # against production
```

Each player is a separate browser context (separate storage and socket), emulating a laptop, an iPhone 13 and an iPad. The suite covers PRD section 9:

| Check | What it verifies |
| --- | --- |
| A1–A8 | Two devices in one room, each stage synced both ways without refresh, shared bloom celebration, hearts, latency < 2 s |
| B1–B3 | Garden persists after every player leaves; a brand-new device sees identical state |
| C1–C3 | Late joiner continues earlier progress; returning player gets Welcome Back and can continue |
| D1, D3 | Simultaneous taps from two devices stay identical; two raw sockets racing the same transition: exactly one wins per stage |
| D2 | Rapid repeated taps never skip or overshoot a stage |
| E1–E4 | Offline state shown, missed changes arrive on reconnect, offline taps are not replayed, refresh restores |
| G1 | Actions in one room never reach another |
| X1, U1 | Unknown code shows a friendly error; primary touch targets ≥ 64 px on a phone |
| M1–M3 | A stroke drawn on one device appears on the other; the turn passes; drawing out of turn is blocked |
| M4–M5 | The finished fish animates on both devices and both canvases reset |
| M6–M7 | If the next player leaves, the turn opens up; one player can finish alone |
| M8 | Two sockets racing a stroke for the same step: exactly one lands; malformed strokes are refused |
| M9–M11 | Creations persist after everyone leaves and can be replayed; the garden still works afterwards |
| M12–M13 | A finished fish appears in the garden pond and jumps when tapped; a new device sees the same pond |

Latest local run: **38/38 passed**. Tap-to-other-screen latency was about 120 ms median locally; a stroke appeared on the other device about 50 ms after pointer-up. The garden suite also passed 25/25 against the deployed Cloudflare URL. Persistence across a full server restart was checked manually.

### Known limitations

- Tested in Chromium with device emulation. Real iPhone Safari and Android Chrome still need a hands-on pass on the deployed URL.
- HTTP rate limits are kept in memory per Worker isolate, so they slow guessing but are not a global quota. The 40-bit room code is the real protection.
- Two players can pick the same animal; the activity summary will show the same face for both.
- Sounds are synthesized with Web Audio and start after the first tap (browser autoplay rules).

## License

MIT
