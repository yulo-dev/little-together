import { DurableObject } from "cloudflare:workers";
import {
  BLOOMED,
  CODE_ALPHABET,
  CODE_LENGTH,
  MAX_PLAYERS,
  PLANTS,
  VISITORS,
  emptyGarden,
  isAvatar,
  isValidCode,
  normalizeCode,
  type Avatar,
  type ClientMsg,
  type EventKind,
  type GardenEvent,
  type GardenState,
  type OnlinePlayer,
  type Plant,
  type ServerMsg,
  type Stage,
} from "../shared/protocol";
import {
  GALLERY_LIMIT,
  canDraw,
  newDrawing,
  nextTurn,
  stepCount,
  validStroke,
  type Creation,
  type Drawing,
} from "../shared/drawing";

export interface Env {
  ASSETS: Fetcher;
  GARDEN: DurableObjectNamespace<GardenRoom>;
  RETENTION_DAYS?: string;
}

const DAY_MS = 86_400_000;
const EVENT_LOG_SIZE = 50;
const MAX_MESSAGE_BYTES = 2048; // fits one 80-point stroke with room to spare
const MAX_SOCKETS = MAX_PLAYERS * 2; // headroom for reconnecting tabs

interface Meta {
  created: boolean;
  createdAt: number;
  lastActivity: number;
}

interface Attachment {
  pid: string | null;
  avatar: Avatar | null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

// ---------------------------------------------------------------------------
// Best-effort per-isolate rate limiter for HTTP endpoints. Room codes have
// ~40 bits of entropy, so this is a speed bump on top of that, not the defense.
// ---------------------------------------------------------------------------
const buckets = new Map<string, { count: number; reset: number }>();
function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    if (buckets.size > 10_000) buckets.clear();
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

function randomCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  // 256 % 31 bias is negligible for this use; codes are not secrets of record.
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const ip = request.headers.get("cf-connecting-ip") ?? "local";

    if (url.pathname === "/api/rooms" && request.method === "POST") {
      if (!allow(`create:${ip}`, 20, 10 * 60_000)) return json({ error: "rate_limited" }, 429);
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = randomCode();
        const stub = env.GARDEN.get(env.GARDEN.idFromName(code));
        const created = await stub.init();
        if (created) return json({ code }, 201);
      }
      return json({ error: "try_again" }, 503);
    }

    const m = url.pathname.match(/^\/api\/rooms\/([^/]+)(\/ws)?$/);
    if (m) {
      const code = normalizeCode(decodeURIComponent(m[1]));
      if (!isValidCode(code)) return json({ error: "invalid_code" }, 400);
      const stub = env.GARDEN.get(env.GARDEN.idFromName(code));

      if (m[2]) {
        if (request.headers.get("upgrade") !== "websocket") return json({ error: "expected_websocket" }, 426);
        const origin = request.headers.get("origin");
        if (origin && new URL(origin).host !== url.host) return json({ error: "bad_origin" }, 403);
        if (!allow(`ws:${ip}`, 120, 60_000)) return json({ error: "rate_limited" }, 429);
        return stub.fetch(request);
      }

      if (request.method === "GET") {
        if (!allow(`lookup:${ip}`, 60, 60_000)) return json({ error: "rate_limited" }, 429);
        return json({ exists: await stub.exists() });
      }
    }

    if (url.pathname.startsWith("/api/")) return json({ error: "not_found" }, 404);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

// ---------------------------------------------------------------------------
// One Durable Object per room. A DO processes one message at a time, so every
// garden mutation below is serialized: this is the authoritative state.
// ---------------------------------------------------------------------------
export class GardenRoom extends DurableObject<Env> {
  private meta: Meta = { created: false, createdAt: 0, lastActivity: 0 };
  private state: GardenState = emptyGarden();
  private events: GardenEvent[] = [];
  private drawing: Drawing = newDrawing(crypto.randomUUID());
  private galleryIds: string[] = [];
  private rate = new WeakMap<WebSocket, { tokens: number; ts: number }>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      const stored = await ctx.storage.get<unknown>(["meta", "state", "events", "drawing", "gallery"]);
      this.meta = (stored.get("meta") as Meta) ?? this.meta;
      this.state = (stored.get("state") as GardenState) ?? this.state;
      this.events = (stored.get("events") as GardenEvent[]) ?? [];
      // Rooms created before Magic Drawing simply start with an empty canvas.
      this.drawing = (stored.get("drawing") as Drawing) ?? this.drawing;
      this.galleryIds = (stored.get("gallery") as string[]) ?? [];
    });
    // Answer keepalive pings without waking the object from hibernation.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  private retentionMs(): number {
    const days = Number(this.env.RETENTION_DAYS ?? "30");
    return (Number.isFinite(days) && days > 0 ? days : 30) * DAY_MS;
  }

  /** Returns true if this call created the room, false if it already existed. */
  async init(): Promise<boolean> {
    if (this.meta.created) return false;
    const now = Date.now();
    this.meta = { created: true, createdAt: now, lastActivity: now };
    this.state = emptyGarden();
    this.events = [];
    await this.ctx.storage.put({ meta: this.meta, state: this.state, events: this.events });
    await this.ctx.storage.setAlarm(now + this.retentionMs());
    return true;
  }

  async exists(): Promise<boolean> {
    return this.meta.created;
  }

  async fetch(request: Request): Promise<Response> {
    if (!this.meta.created) return json({ error: "room_not_found" }, 404);
    if (this.ctx.getWebSockets().length >= MAX_SOCKETS) return json({ error: "room_full" }, 429);
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ pid: null, avatar: null } satisfies Attachment);
    void request;
    return new Response(null, { status: 101, webSocket: client });
  }

  async alarm(): Promise<void> {
    const idleFor = Date.now() - this.meta.lastActivity;
    if (idleFor >= this.retentionMs() && this.ctx.getWebSockets().length === 0) {
      await this.ctx.storage.deleteAll();
      this.meta = { created: false, createdAt: 0, lastActivity: 0 };
      this.state = emptyGarden();
      this.events = [];
      this.drawing = newDrawing(crypto.randomUUID());
      this.galleryIds = [];
      return;
    }
    await this.ctx.storage.setAlarm(this.meta.lastActivity + this.retentionMs());
  }

  // ----- websocket handlers -----

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== "string" || raw.length > MAX_MESSAGE_BYTES) return;
    let msg: ClientMsg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!msg || typeof msg !== "object") return;
    if (!this.takeToken(ws)) return;

    const me = ws.deserializeAttachment() as Attachment;

    if (msg.t === "hello") {
      if (typeof msg.pid !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(msg.pid)) return;
      if (!isAvatar(msg.avatar)) return;
      ws.serializeAttachment({ pid: msg.pid, avatar: msg.avatar } satisfies Attachment);
      const lastSeen = Number.isInteger(msg.lastSeen) ? msg.lastSeen : 0;
      const missed = lastSeen > 0 ? this.events.filter((e) => e.version > lastSeen && e.by !== msg.pid) : [];
      this.send(ws, { t: "welcome", state: this.state, online: this.online(), missed, drawing: this.drawing });
      this.broadcast({ t: "presence", online: this.online() });
      return;
    }

    if (!me.pid || !me.avatar) return; // must say hello first

    switch (msg.t) {
      case "act":
        return this.act(ws, { pid: me.pid, avatar: me.avatar }, msg);
      case "season":
        return this.newSeason(ws, me.pid, me.avatar, msg.aid);
      case "stroke":
        return this.stroke(ws, { pid: me.pid, avatar: me.avatar }, msg);
      case "gallery":
        return this.sendGallery(ws);
      case "heart":
        return this.broadcast({ t: "fx", kind: "heart", avatar: me.avatar });
      case "dance": {
        const plot = this.state.plots[msg.plotId];
        if (plot && plot.stage === BLOOMED) {
          this.broadcast({ t: "fx", kind: "dance", avatar: me.avatar, plotId: plot.id });
        }
        return;
      }
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.broadcast({ t: "presence", online: this.online(ws) }, ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.broadcast({ t: "presence", online: this.online(ws) }, ws);
  }

  // ----- game actions -----

  private async act(
    ws: WebSocket,
    me: { pid: string; avatar: Avatar },
    msg: Extract<ClientMsg, { t: "act" }>,
  ): Promise<void> {
    const aid = typeof msg.aid === "string" ? msg.aid.slice(0, 64) : "";
    const plot = Number.isInteger(msg.plotId) ? this.state.plots[msg.plotId] : undefined;
    if (!plot) return this.send(ws, { t: "reject", aid, reason: "bad_plot", state: this.state });

    // Optimistic concurrency: the client says which stage it saw. If another
    // player already advanced this plot, the action is a no-op, so duplicate
    // taps, simultaneous taps and replays after reconnect can never skip a stage.
    if (plot.stage !== msg.from || plot.stage === BLOOMED) {
      return this.send(ws, { t: "reject", aid, reason: "stale", state: this.state });
    }

    const now = Date.now();
    const kinds: EventKind[] = ["plant", "water", "sun", "bloom"];
    const kind = kinds[plot.stage];
    const next = (plot.stage + 1) as Stage;

    const state = structuredClone(this.state);
    const p = state.plots[plot.id];
    if (p.stage === 0) {
      p.plant = this.pickPlant(state);
      p.helpers = [];
    }
    p.stage = next;
    if (!p.helpers.includes(me.pid)) p.helpers.push(me.pid);
    p.updatedBy = me.pid;
    p.updatedAt = now;
    state.version += 1;

    const event: GardenEvent = {
      version: state.version,
      kind,
      plotId: p.id,
      by: me.pid,
      avatar: me.avatar,
      at: now,
    };

    if (next === BLOOMED) {
      state.bloomedTotal += 1;
      if (p.helpers.length >= 2) event.shared = true;
      const unlocked = VISITORS.find((v) => state.bloomedTotal >= v.at && !state.visitors.includes(v.id));
      if (unlocked) {
        state.visitors.push(unlocked.id);
        event.visitor = unlocked.id;
      }
    }

    await this.commit(state, event, now);
    this.broadcast({ t: "state", state: this.state, event, aid });
  }

  private async newSeason(ws: WebSocket, pid: string, avatar: Avatar, aidIn: unknown) {
    const aid = typeof aidIn === "string" ? aidIn.slice(0, 64) : "";
    if (!this.state.plots.every((p) => p.stage === BLOOMED)) {
      return this.send(ws, { t: "reject", aid, reason: "not_ready", state: this.state });
    }
    const now = Date.now();
    const fresh = emptyGarden();
    const state: GardenState = {
      ...this.state,
      version: this.state.version + 1,
      season: this.state.season + 1,
      plots: fresh.plots,
    };
    const event: GardenEvent = { version: state.version, kind: "season", plotId: null, by: pid, avatar, at: now };
    await this.commit(state, event, now);
    this.broadcast({ t: "state", state: this.state, event, aid });
  }

  // ----- Magic Drawing -----

  private async stroke(
    ws: WebSocket,
    me: { pid: string; avatar: Avatar },
    msg: Extract<ClientMsg, { t: "stroke" }>,
  ): Promise<void> {
    const aid = typeof msg.aid === "string" ? msg.aid.slice(0, 64) : "";
    const reject = (reason: string) => this.send(ws, { t: "drawReject", aid, reason, drawing: this.drawing });
    if (!validStroke(msg.color, msg.pts)) return reject("bad_stroke");
    // Same optimistic-concurrency idea as the garden: the client names the
    // drawing and step it saw, so two strokes racing for one step can't both land.
    if (msg.drawingId !== this.drawing.id || msg.step !== this.drawing.step) return reject("stale");
    const online = this.online();
    if (!canDraw(this.drawing, me.pid, online)) return reject("not_your_turn");

    const now = Date.now();
    const strokes = [...this.drawing.strokes, { by: me.pid, avatar: me.avatar, color: msg.color, pts: msg.pts }];
    const step = this.drawing.step + 1;

    if (step < stepCount(this.drawing)) {
      this.drawing = { ...this.drawing, strokes, step, turn: nextTurn(me.pid, online) };
      this.meta = { ...this.meta, lastActivity: now };
      await this.ctx.storage.put({ drawing: this.drawing, meta: this.meta });
      await this.ctx.storage.setAlarm(now + this.retentionMs());
      this.broadcast({ t: "draw", drawing: this.drawing, aid });
      return;
    }

    // Finished: save the creation, start a fresh canvas, log it for Welcome Back.
    const creation: Creation = {
      id: this.drawing.id,
      template: this.drawing.template,
      strokes,
      artists: [...new Set(strokes.map((s) => s.avatar))],
      completedAt: now,
    };
    const ids = [...this.galleryIds, creation.id];
    const dropped = ids.length > GALLERY_LIMIT ? ids.splice(0, ids.length - GALLERY_LIMIT) : [];
    const fresh = newDrawing(crypto.randomUUID());
    const state = { ...this.state, version: this.state.version + 1 };
    const event: GardenEvent = {
      version: state.version,
      kind: "fish",
      plotId: null,
      by: me.pid,
      avatar: me.avatar,
      at: now,
    };

    this.drawing = fresh;
    this.galleryIds = ids;
    await this.commit(state, event, now, { drawing: fresh, gallery: ids, [`creation:${creation.id}`]: creation });
    if (dropped.length) await this.ctx.storage.delete(dropped.map((id) => `creation:${id}`));
    this.broadcast({ t: "drawDone", creation, drawing: fresh, aid });
    this.broadcast({ t: "state", state: this.state, event, aid: "" });
  }

  private async sendGallery(ws: WebSocket) {
    const found = await this.ctx.storage.get<Creation>(this.galleryIds.map((id) => `creation:${id}`));
    const items = this.galleryIds.map((id) => found.get(`creation:${id}`)).filter((c): c is Creation => !!c);
    this.send(ws, { t: "gallery", items });
  }

  private pickPlant(state: GardenState): Plant {
    const counts = new Map<Plant, number>(PLANTS.map((p) => [p, 0]));
    for (const p of state.plots) if (p.plant && p.stage > 0) counts.set(p.plant, (counts.get(p.plant) ?? 0) + 1);
    const min = Math.min(...counts.values());
    const options = PLANTS.filter((p) => counts.get(p) === min);
    return options[Math.floor(Math.random() * options.length)];
  }

  private async commit(state: GardenState, event: GardenEvent, now: number, extra: Record<string, unknown> = {}) {
    this.state = state;
    this.events = [...this.events, event].slice(-EVENT_LOG_SIZE);
    this.meta = { ...this.meta, lastActivity: now };
    // Multi-key put is atomic: state, log and activity time move together.
    await this.ctx.storage.put({ ...extra, state: this.state, events: this.events, meta: this.meta });
    await this.ctx.storage.setAlarm(now + this.retentionMs());
  }

  // ----- helpers -----

  private takeToken(ws: WebSocket): boolean {
    const now = Date.now();
    const b = this.rate.get(ws) ?? { tokens: 12, ts: now };
    b.tokens = Math.min(12, b.tokens + ((now - b.ts) / 1000) * 8);
    b.ts = now;
    if (b.tokens < 1) {
      this.rate.set(ws, b);
      return false;
    }
    b.tokens -= 1;
    this.rate.set(ws, b);
    return true;
  }

  private online(exclude?: WebSocket): OnlinePlayer[] {
    const seen = new Map<string, OnlinePlayer>();
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === exclude || ws.readyState !== WebSocket.OPEN) continue;
      const a = ws.deserializeAttachment() as Attachment;
      if (a?.pid && a.avatar) seen.set(a.pid, { pid: a.pid, avatar: a.avatar });
    }
    return [...seen.values()];
  }

  private send(ws: WebSocket, msg: ServerMsg) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      /* socket already gone */
    }
  }

  private broadcast(msg: ServerMsg, exclude?: WebSocket) {
    const data = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === exclude) continue;
      const a = ws.deserializeAttachment() as Attachment;
      if (!a?.pid) continue;
      try {
        ws.send(data);
      } catch {
        /* ignore */
      }
    }
  }
}
