import { useCallback, useEffect, useRef, useState } from "react";
import {
  ACTION_FOR_STAGE,
  BLOOMED,
  formatCode,
  type Avatar,
  type GardenEvent,
  type OnlinePlayer,
  type Plot as PlotT,
} from "../../shared/protocol";
import { Animal } from "../components/Animal";
import { Heart, Invite, Speaker } from "../components/Icons";
import { Plot, type PlotFx } from "../components/Plot";
import { Scene } from "../components/Scene";
import { VISITOR_ART, VisitorLayer } from "../components/Visitors";
import { setLang, useT } from "../i18n";
import { setMuted, sfx, useMuted } from "../lib/sound";
import type { Profile } from "../lib/storage";
import { useRoom, type RoomFx } from "../lib/useRoom";

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export function RoomSession({
  code,
  profile,
  startInLobby,
  onLeave,
}: {
  code: string;
  profile: Profile;
  startInLobby: boolean;
  onLeave: () => void;
}) {
  const { t } = useT();
  const [inLobby, setInLobby] = useState(startInLobby);
  const [plotFx, setPlotFx] = useState<Record<number, PlotFx>>({});
  const [hearts, setHearts] = useState<{ id: number; x: number; avatar: string; delay: number }[]>([]);
  const [visitorShow, setVisitorShow] = useState<GardenEvent["visitor"] | null>(null);
  const fxKey = useRef(0);

  const flash = useCallback((plotId: number, fx: Omit<PlotFx, "key">, ms = 1600) => {
    const key = ++fxKey.current;
    setPlotFx((m) => ({ ...m, [plotId]: { ...fx, key } }));
    window.setTimeout(() => setPlotFx((m) => (m[plotId]?.key === key ? omit(m, plotId) : m)), ms);
  }, []);

  const onFx = useCallback(
    (fx: RoomFx) => {
      if (fx.kind === "heart") {
        sfx.heart();
        const n = reducedMotion() ? 1 : 6;
        const base = Date.now() + Math.random();
        const batch = Array.from({ length: n }, (_, i) => ({
          id: base + i,
          x: 10 + Math.random() * 80,
          avatar: fx.avatar,
          delay: i * 0.12,
        }));
        setHearts((h) => [...h, ...batch]);
        window.setTimeout(() => setHearts((h) => h.filter((x) => !batch.includes(x))), 3200);
        return;
      }
      if (fx.kind === "dance") {
        sfx.dance();
        flash(fx.plotId, { kind: "dance", avatar: fx.avatar as Avatar }, 1200);
        return;
      }
      const e = fx.event;
      if (e.kind === "season") {
        sfx.sun();
        return;
      }
      if (e.plotId == null) return;
      const avatar = fx.mine ? undefined : e.avatar;
      if (e.kind === "bloom") {
        sfx.bloom();
        flash(e.plotId, { kind: e.shared ? "shared" : "bloom", avatar }, 2000);
      } else {
        if (!fx.mine) sfx[e.kind]();
        if (!fx.mine) flash(e.plotId, { kind: e.kind, avatar });
      }
      if (e.visitor) {
        window.setTimeout(() => {
          sfx.visitor();
          setVisitorShow(e.visitor);
          window.setTimeout(() => setVisitorShow(null), 3200);
        }, 900);
      }
    },
    [flash],
  );

  const room = useRoom(code, profile, onFx);
  const pending = useRef(new Map<number, number>());

  // A plot is "pending" between sending an action and seeing the server's answer,
  // so a toddler hammering one flower sends one action per stage, not twenty.
  useEffect(() => {
    pending.current.clear();
  }, [room.garden?.version]);

  const onTap = useCallback(
    (plot: PlotT) => {
      if (room.status !== "open") {
        flash(plot.id, { kind: "shake" }, 500);
        return;
      }
      if (plot.stage === BLOOMED) {
        room.dance(plot.id);
        return;
      }
      const sentAt = pending.current.get(plot.id);
      if (sentAt && Date.now() - sentAt < 2000) return;
      if (room.act(plot.id, plot.stage)) {
        pending.current.set(plot.id, Date.now());
        const kind = ACTION_FOR_STAGE[plot.stage];
        if (kind === "plant" || kind === "water" || kind === "sun") {
          sfx[kind]();
          flash(plot.id, { kind });
        }
      }
    },
    [room, flash],
  );

  if (room.status === "gone") return <Gone onLeave={onLeave} />;

  if (inLobby) {
    return (
      <Lobby
        code={code}
        me={profile}
        online={room.online}
        connected={room.status === "open"}
        onEnter={() => setInLobby(false)}
      />
    );
  }

  return (
    <Scene>
      <div className="relative mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-3 pb-4 pt-3 sm:px-6">
        <TopBar
          code={code}
          me={profile}
          online={room.online}
          bloomed={room.garden?.bloomedTotal ?? 0}
          status={room.status}
        />

        <main className="relative flex flex-1 flex-col justify-end pb-2 pt-[16vh] sm:pt-[14vh]">
          {room.garden ? (
            <div
              className="mx-auto grid w-full max-w-[min(42rem,calc((100dvh-250px)*1.1))] grid-cols-3 gap-x-2 gap-y-2 sm:gap-x-6 sm:gap-y-4"
              data-testid="garden"
              data-version={room.garden.version}
            >
              {room.garden.plots.map((p) => (
                <Plot key={p.id} plot={p} fx={plotFx[p.id]} disabled={room.status !== "open"} onTap={onTap} />
              ))}
            </div>
          ) : (
            <LoadingSprout />
          )}
        </main>

        {room.garden?.plots.every((p) => p.stage === BLOOMED) && <SeasonBanner onNew={room.newSeason} />}

        <div className="flex items-end justify-center pt-2">
          <button
            type="button"
            data-testid="heart-button"
            aria-label={t.sendHeart}
            onClick={() => room.heart()}
            disabled={room.status !== "open"}
            className="grid h-20 w-20 place-items-center rounded-full border-[3px] border-[#4A3B33] bg-[#FFE3E8] shadow-[0_6px_0_#4A3B33] transition-transform active:translate-y-1 active:shadow-[0_2px_0_#4A3B33] disabled:opacity-60"
          >
            <span className="heart-btn grid place-items-center">
              <Heart size={50} />
            </span>
          </button>
        </div>

        <VisitorLayer visitors={room.garden?.visitors ?? []} />
      </div>

      {/* floating hearts, shared by everyone in the room */}
      <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden="true">
        {hearts.map((h, i) => (
          <span
            key={h.id}
            className="float-heart absolute bottom-0"
            style={{ left: `${h.x}%`, animationDelay: `${h.delay}s` }}
          >
            {i % 6 === 0 ? (
              <span className="relative block">
                <Heart size={64} />
                <span className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2">
                  <Animal kind={h.avatar as Avatar} size={30} />
                </span>
              </span>
            ) : (
              <Heart size={36 + (i % 3) * 8} fill={i % 2 ? "#F7A8B8" : "#F2827F"} />
            )}
          </span>
        ))}
      </div>

      {visitorShow && (
        <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center" data-testid="visitor-show">
          <div className="visitor-arrive">{VISITOR_ART[visitorShow]()}</div>
        </div>
      )}

      {room.missed && <WelcomeBack events={room.missed} onDone={room.clearMissed} />}
    </Scene>
  );
}

function omit<T>(m: Record<number, T>, k: number) {
  const n = { ...m };
  delete n[k];
  return n;
}

// ---------------------------------------------------------------------------

function TopBar({
  code,
  me,
  online,
  bloomed,
  status,
}: {
  code: string;
  me: Profile;
  online: OnlinePlayer[];
  bloomed: number;
  status: string;
}) {
  const { t, lang } = useT();
  const muted = useMuted();
  const [invite, setInvite] = useState(false);
  const prevCount = useRef(online.length);
  useEffect(() => {
    if (online.length > prevCount.current) sfx.join();
    prevCount.current = online.length;
  }, [online.length]);

  const iconBtn =
    "grid h-12 w-12 place-items-center rounded-full border-[3px] border-[#4A3B33] bg-[#FFFDF7] shadow-[0_3px_0_#4A3B33] active:translate-y-0.5 active:shadow-none";

  return (
    <header className="relative z-20 flex items-start justify-between gap-2">
      <div className="flex flex-col gap-1.5">
        <ul className="flex -space-x-2" aria-label={t.here} data-testid="online">
          {online.map((p) => (
            <li
              key={p.pid}
              data-avatar={p.avatar}
              className={`pop-in rounded-full border-[3px] bg-[#FFFDF7] ${p.pid === me.pid ? "border-[#3E7D4F]" : "border-[#4A3B33]"}`}
              title={t.animals[p.avatar]}
            >
              <Animal kind={p.avatar} size={40} />
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 pl-1 text-sm text-[#4A3B33]">
          {bloomed > 0 && <span data-testid="bloomed-total">{t.flowersGrown(bloomed)}</span>}
          {status !== "open" && (
            <span
              className="flex items-center gap-1.5 rounded-full bg-[#FFFDF7]/90 px-2.5 py-0.5"
              role="status"
              data-testid="status"
            >
              <span className="pulse-dot h-2 w-2 rounded-full bg-[#F59A3E]" />
              {navigator.onLine ? t.reconnecting : t.offline}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className={iconBtn}
          onClick={() => setMuted(!muted)}
          aria-label={muted ? t.soundOn : t.soundOff}
          aria-pressed={!muted}
        >
          <Speaker on={!muted} />
        </button>
        <button
          type="button"
          className={`${iconBtn} text-sm font-semibold`}
          onClick={() => setLang(lang === "zh" ? "en" : "zh")}
          aria-label={t.language}
        >
          {lang === "zh" ? "EN" : "中"}
        </button>
        <button
          type="button"
          className={iconBtn}
          onClick={() => setInvite(true)}
          aria-label={t.invite}
          data-testid="invite-button"
        >
          <Invite />
        </button>
      </div>

      {invite && <InviteSheet code={code} onClose={() => setInvite(false)} />}
    </header>
  );
}

export function InviteCard({ code }: { code: string }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const link = `${location.origin}/r/${code}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-[#6B5A4E]">{t.roomCode}</p>
      <p className="font-display text-4xl font-semibold tracking-[0.12em] text-[#4A3B33]" data-testid="room-code">
        {formatCode(code)}
      </p>
      <div className="flex w-full flex-wrap justify-center gap-2">
        <button type="button" onClick={copy} className="btn-primary min-w-40" data-testid="copy-link">
          {copied ? t.copied : t.copyLink}
        </button>
        {"share" in navigator && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigator.share({ title: "Little Together", url: link }).catch(() => {})}
          >
            {t.share}
          </button>
        )}
      </div>
      <p className="break-all text-center text-xs text-[#6B5A4E]">{link}</p>
    </div>
  );
}

function InviteSheet({ code, onClose }: { code: string; onClose: () => void }) {
  const { t } = useT();
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#4A3B33]/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.invite}
        className="card w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-center font-display text-2xl text-[#4A3B33]">{t.invite}</h2>
        <InviteCard code={code} />
        <button type="button" onClick={onClose} className="btn-ghost mt-4 w-full">
          {t.close}
        </button>
      </div>
    </div>
  );
}

function Lobby({
  code,
  me,
  online,
  connected,
  onEnter,
}: {
  code: string;
  me: Profile;
  online: OnlinePlayer[];
  connected: boolean;
  onEnter: () => void;
}) {
  const { t } = useT();
  return (
    <Scene calm>
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-8">
        <div className="card p-6">
          <h1 className="mb-2 text-center font-display text-3xl text-[#4A3B33]">{t.lobbyTitle}</h1>
          <p className="mb-6 text-center text-[15px] leading-relaxed text-[#6B5A4E]">{t.lobbyHint}</p>
          <InviteCard code={code} />
        </div>
        <div className="card p-5">
          <p className="mb-3 text-sm text-[#6B5A4E]">{t.here}</p>
          <ul className="flex flex-wrap gap-2" data-testid="lobby-online">
            {(online.length ? online : [{ pid: me.pid, avatar: me.avatar }]).map((p) => (
              <li key={p.pid} className="pop-in flex items-center gap-2 rounded-full bg-[#FFF6E3] py-1 pl-1 pr-3">
                <Animal kind={p.avatar} size={36} />
                <span className="text-sm text-[#4A3B33]">{t.animals[p.avatar]}</span>
              </li>
            ))}
          </ul>
          {online.length <= 1 && <p className="mt-3 text-sm text-[#6B5A4E]">{t.onlyYou}</p>}
        </div>
        <button
          type="button"
          className="btn-primary h-16 text-xl"
          onClick={onEnter}
          data-testid="enter-garden"
          disabled={!connected}
        >
          {connected ? t.enter : t.joining}
        </button>
      </div>
    </Scene>
  );
}

function WelcomeBack({ events, onDone }: { events: GardenEvent[]; onDone: () => void }) {
  const { t } = useT();
  useEffect(() => {
    sfx.bloom();
  }, []);
  const helpers = [...new Map(events.map((e) => [e.by, e.avatar])).values()];
  const recent = events.slice(-4).reverse();
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#4A3B33]/35 p-4"
      onClick={onDone}
      data-testid="welcome-back"
    >
      <div className="card welcome-pop w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-2 flex justify-center -space-x-3">
          {helpers.map((a) => (
            <span key={a} className="hop-once rounded-full border-[3px] border-[#4A3B33] bg-[#FFFDF7]">
              <Animal kind={a} size={64} />
            </span>
          ))}
        </div>
        <div className="mx-auto h-28 w-24">
          <svg viewBox="0 0 120 130" className="h-full w-full" aria-hidden="true">
            <ellipse cx={60} cy={112} rx={44} ry={13} fill="#B98157" />
            <path
              d="M60 108 Q56 80 60 60"
              stroke="#3E7D4F"
              strokeWidth={6}
              fill="none"
              strokeLinecap="round"
              className="grow-up"
            />
            <g className="pop-in" style={{ transformOrigin: "60px 64px", animationDelay: ".5s" }}>
              <path d="M60 66 Q40 46 26 58 Q40 74 60 66 Z" fill="#6FB36A" stroke="#4A3B33" strokeWidth={2.5} />
              <path d="M60 66 Q80 46 94 58 Q80 74 60 66 Z" fill="#6FB36A" stroke="#4A3B33" strokeWidth={2.5} />
            </g>
          </svg>
        </div>
        <h2 className="font-display text-2xl text-[#4A3B33]">{t.welcomeBack}</h2>
        <p className="mt-2 text-sm text-[#6B5A4E]">{t.welcomeBackSummary(events.length)}</p>
        <ul className="mt-3 space-y-1 text-left text-sm text-[#4A3B33]">
          {recent.map((e) => (
            <li key={e.version} className="flex items-center gap-2">
              <Animal kind={e.avatar} size={24} />
              {t.animals[e.avatar]} {t.eventVerb[e.kind]}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="btn-primary mt-5 h-14 w-full text-lg"
          onClick={onDone}
          data-testid="welcome-back-done"
        >
          {t.goGarden}
        </button>
      </div>
    </div>
  );
}

function SeasonBanner({ onNew }: { onNew: () => void }) {
  const { t } = useT();
  return (
    <div
      className="card relative z-20 mx-auto mt-1 flex w-full max-w-md items-center justify-between gap-3 px-4 py-3"
      data-testid="season-banner"
    >
      <div>
        <p className="font-display text-lg text-[#4A3B33]">{t.allBloomed}</p>
        <p className="text-xs text-[#6B5A4E]">{t.seasonHint}</p>
      </div>
      <button type="button" className="btn-secondary shrink-0" onClick={onNew} data-testid="new-season">
        {t.newSeason}
      </button>
    </div>
  );
}

function LoadingSprout() {
  return (
    <div className="grid place-items-center py-20" role="status">
      <div className="nudge h-20 w-20 rounded-full bg-[#FFFDF7]/80" />
    </div>
  );
}

function Gone({ onLeave }: { onLeave: () => void }) {
  const { t } = useT();
  return (
    <Scene calm>
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-5 px-6 text-center">
        <p className="font-display text-2xl text-[#4A3B33]">{t.gone}</p>
        <button type="button" className="btn-primary" onClick={onLeave}>
          {t.goHome}
        </button>
      </div>
    </Scene>
  );
}
