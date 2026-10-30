import { useEffect, useRef, useState } from "react";
import {
  CANVAS,
  CRAYONS,
  TEMPLATES,
  canDraw,
  simplify,
  strokePath,
  type Creation,
  type Drawing,
  type GuideStep,
} from "../../shared/drawing";
import type { OnlinePlayer } from "../../shared/protocol";
import { Animal } from "../components/Animal";
import { CreationArt } from "../components/CreationArt";
import { Scene } from "../components/Scene";
import { useT } from "../i18n";
import { sfx } from "../lib/sound";
import type { Profile } from "../lib/storage";
import type { Status } from "../lib/useRoom";

const INK = "#4A3B33";

interface Props {
  me: Profile;
  status: Status;
  online: OnlinePlayer[];
  drawing: Drawing | null;
  gallery: Creation[] | null;
  onStroke: (d: Drawing, color: number, pts: number[]) => boolean;
  onLoadGallery: () => void;
  onPlay: (c: Creation) => void;
  onBack: () => void;
}

export function MagicDrawing({ me, status, online, drawing, gallery, onStroke, onLoadGallery, onPlay, onBack }: Props) {
  const { t } = useT();
  const [color, setColor] = useState(() => (me.pid.charCodeAt(0) + me.pid.charCodeAt(1)) % CRAYONS.length);
  const [showGallery, setShowGallery] = useState(false);

  const steps = drawing ? TEMPLATES[drawing.template] : [];
  const step = drawing ? steps[drawing.step] : undefined;
  const myTurn = !!drawing && status === "open" && canDraw(drawing, me.pid, online);
  const turnHolder = drawing?.turn ? online.find((p) => p.pid === drawing.turn) : undefined;

  // A little chime when the turn comes back to me.
  const wasMyTurn = useRef(myTurn);
  useEffect(() => {
    if (myTurn && !wasMyTurn.current) sfx.join();
    wasMyTurn.current = myTurn;
  }, [myTurn]);

  const btn =
    "grid h-14 min-w-14 place-items-center rounded-full border-[3px] border-[#4A3B33] bg-[#FFFDF7] px-3 shadow-[0_3px_0_#4A3B33] active:translate-y-0.5 active:shadow-none";

  return (
    <Scene calm horizon="70%">
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center gap-3 px-3 pb-5 pt-3">
        <header className="flex w-full items-center justify-between gap-2">
          <button
            type="button"
            className={`${btn} !flex items-center gap-2`}
            onClick={onBack}
            aria-label={t.backToGarden}
            data-testid="back-to-garden"
          >
            <FlowerIcon />
            <span className="hidden text-sm font-semibold sm:inline">{t.backToGarden}</span>
          </button>
          <ul className="flex -space-x-1" aria-label={t.here}>
            {online.map((p) => {
              const turn = drawing?.turn === p.pid;
              return (
                <li
                  key={p.pid}
                  className={`rounded-full border-[3px] bg-[#FFFDF7] transition-transform ${
                    turn ? "scale-110 border-[#FFC93C] shadow-[0_0_0_4px_#FFE9A0]" : "border-[#4A3B33]"
                  }`}
                >
                  <Animal kind={p.avatar} size={40} />
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className={btn}
            onClick={() => {
              onLoadGallery();
              setShowGallery(true);
            }}
            aria-label={t.ourCreations}
            data-testid="open-gallery"
          >
            <FrameIcon />
          </button>
        </header>

        {drawing && step && (
          <div className="flex items-center gap-3" aria-live="polite">
            <StepDots steps={steps} current={drawing.step} />
          </div>
        )}

        <div className="relative mt-3 w-full max-w-[min(92vw,58dvh,560px)]">
          {drawing && step ? (
            <Canvas
              drawing={drawing}
              step={step}
              color={color}
              enabled={myTurn}
              onStroke={onStroke}
              label={t.canvasLabel}
            />
          ) : (
            <div className="card aspect-square w-full" />
          )}

          <div className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2" data-testid="turn-badge">
            {drawing && step && (
              <span
                className={`flex items-center gap-2 whitespace-nowrap rounded-full border-[3px] border-[#4A3B33] px-3 py-1 text-sm font-semibold shadow-[0_3px_0_#4A3B33] ${
                  myTurn ? "nudge-y bg-[#FFE9A0]" : "bg-[#FFFDF7]"
                }`}
              >
                {myTurn ? (
                  <>
                    <Animal kind={me.avatar} size={26} />
                    {t.yourTurn}
                  </>
                ) : turnHolder ? (
                  <>
                    <Animal kind={turnHolder.avatar} size={26} />
                    {t.waitingFor(t.animals[turnHolder.avatar])}
                  </>
                ) : (
                  t.reconnecting
                )}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2" role="radiogroup" aria-label="crayons">
          {CRAYONS.map((c, i) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === i}
              aria-label={t.crayon(i)}
              data-testid={`crayon-${i}`}
              onClick={() => setColor(i)}
              className={`h-[52px] w-[52px] rounded-full border-[3px] border-[#4A3B33] transition-transform ${
                color === i ? "-translate-y-1 scale-110 shadow-[0_5px_0_#4A3B33]" : "shadow-[0_3px_0_#4A3B33]"
              }`}
              style={{ background: c }}
            >
              {color === i && (
                <svg viewBox="0 0 24 24" className="mx-auto h-6 w-6" aria-hidden="true">
                  <path
                    d="M5 12 L10 17 L19 7"
                    stroke="#FFFDF7"
                    strokeWidth={3.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {showGallery && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#4A3B33]/40 p-4"
          onClick={() => setShowGallery(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t.ourCreations}
            className="card max-h-[85dvh] w-full max-w-lg overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
            data-testid="gallery"
          >
            <h2 className="mb-4 text-center font-display text-2xl">{t.ourCreations}</h2>
            {gallery === null ? (
              <div className="nudge mx-auto h-12 w-12 rounded-full bg-[#FFE9A0]" />
            ) : gallery.length === 0 ? (
              <p className="text-center text-[#6B5A4E]">{t.noCreations}</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[...gallery].reverse().map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      data-testid="gallery-item"
                      onClick={() => {
                        setShowGallery(false);
                        onPlay(c);
                      }}
                      className="flex w-full flex-col items-center rounded-3xl border-[3px] border-[#4A3B33]/20 bg-[#EAF6FB] p-2 active:scale-95"
                    >
                      <CreationArt strokes={c.strokes} className="h-28 w-28" />
                      <span className="flex -space-x-1">
                        {c.artists.map((a) => (
                          <Animal key={a} kind={a} size={24} />
                        ))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="btn-ghost mt-4 w-full" onClick={() => setShowGallery(false)}>
              {t.close}
            </button>
          </div>
        </div>
      )}
    </Scene>
  );
}

// ---------------------------------------------------------------------------

function Canvas({
  drawing,
  step,
  color,
  enabled,
  onStroke,
  label,
}: {
  drawing: Drawing;
  step: GuideStep;
  color: number;
  enabled: boolean;
  onStroke: Props["onStroke"];
  label: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pts = useRef<number[]>([]);
  const [live, setLive] = useState<number[] | null>(null);
  const [pending, setPending] = useState<number[] | null>(null);
  const [shake, setShake] = useState(0);

  // Whatever the server says next (accepted, rejected, someone else's stroke)
  // replaces our pending preview.
  useEffect(() => setPending(null), [drawing.id, drawing.step, drawing.strokes.length]);

  const toCanvas = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * CANVAS);
    const y = Math.round(((e.clientY - r.top) / r.height) * CANVAS);
    return [Math.max(0, Math.min(CANVAS, x)), Math.max(0, Math.min(CANVAS, y))];
  };

  const down = (e: React.PointerEvent) => {
    if (!enabled || pending) {
      setShake((n) => n + 1);
      return;
    }
    e.preventDefault();
    svgRef.current?.setPointerCapture(e.pointerId);
    pts.current = toCanvas(e);
    setLive([...pts.current]);
  };
  const move = (e: React.PointerEvent) => {
    if (!live) return;
    const [x, y] = toCanvas(e);
    const n = pts.current.length;
    if (Math.hypot(x - pts.current[n - 2], y - pts.current[n - 1]) < 4) return;
    pts.current.push(x, y);
    setLive([...pts.current]);
  };
  const up = () => {
    if (!live) return;
    let p = simplify(pts.current);
    if (p.length === 2) p = [p[0], p[1], p[0], p[1]]; // a tap is a dot, and a dot counts
    setLive(null);
    if (onStroke(drawing, color, p)) {
      setPending(p);
      sfx.sun();
    }
  };

  return (
    <div key={shake} className={shake ? "shake" : ""}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CANVAS} ${CANVAS}`}
        role="img"
        aria-label={label}
        data-testid="canvas"
        data-step={drawing.step}
        data-strokes={drawing.strokes.length}
        data-my-turn={enabled}
        className={`card block aspect-square w-full touch-none select-none ${enabled ? "cursor-crosshair" : "cursor-not-allowed"}`}
        style={{ background: "#FFFDF7" }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {/* soft water lines so it reads as a fish tank */}
        <g stroke="#BFE3F2" strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.7}>
          <path d="M80 860 q60 -24 120 0 t120 0 M640 140 q50 -20 100 0 t100 0" />
        </g>
        <path
          d={step.guide}
          stroke={INK}
          strokeOpacity={0.35}
          strokeWidth={10}
          strokeDasharray="4 26"
          strokeLinecap="round"
          fill="none"
          className="march"
          data-testid="guide"
        />
        {drawing.strokes.map((s, i) => (
          <path
            key={`${drawing.id}-${i}`}
            d={strokePath(s.pts)}
            pathLength={1}
            className="ink"
            stroke={CRAYONS[s.color]}
            strokeWidth={18}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
        {(live ?? pending) && (
          <path
            d={strokePath(live ?? pending!)}
            stroke={CRAYONS[color]}
            strokeWidth={18}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={pending ? 0.7 : 1}
          />
        )}
      </svg>
    </div>
  );
}

function StepDots({ steps, current }: { steps: GuideStep[]; current: number }) {
  const { t } = useT();
  return (
    <ol className="flex items-center gap-2" aria-label={t.drawStep[steps[current].part]} data-testid="steps">
      {steps.map((s, i) => (
        <li
          key={s.part}
          className={`grid place-items-center rounded-2xl border-[3px] bg-[#FFFDF7] transition-all ${
            i === current ? "h-16 w-16 border-[#4A3B33] shadow-[0_4px_0_#4A3B33]" : "h-11 w-11 border-[#4A3B33]/30"
          } ${i < current ? "bg-[#E3F3DA]" : ""}`}
          title={t.drawStep[s.part]}
        >
          <MiniFish part={i} size={i === current ? 48 : 30} done={i < current} />
        </li>
      ))}
    </ol>
  );
}

/** The whole template in grey, with the part for this step highlighted. */
function MiniFish({ part, size, done }: { part: number; size: number; done: boolean }) {
  const steps = TEMPLATES.fish;
  return (
    <svg viewBox="100 180 780 560" width={size} height={size} aria-hidden="true">
      {steps.map((s, i) => (
        <path
          key={s.part}
          d={s.guide}
          fill={i < 2 && i === part ? "#FFE9A0" : "none"}
          stroke={i === part ? (done ? "#6FB36A" : "#F08A4B") : "#CDBFB3"}
          strokeWidth={i === part ? 44 : 26}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

function FlowerIcon() {
  return (
    <svg viewBox="0 0 40 40" width={30} height={30} aria-hidden="true">
      <path d="M20 38 Q19 30 20 24" stroke="#3E7D4F" strokeWidth={3} fill="none" strokeLinecap="round" />
      {[0, 72, 144, 216, 288].map((a) => (
        <circle
          key={a}
          cx={20 + Math.cos((a * Math.PI) / 180) * 8}
          cy={15 + Math.sin((a * Math.PI) / 180) * 8}
          r={6}
          fill="#F7A8B8"
          stroke={INK}
          strokeWidth={2}
        />
      ))}
      <circle cx={20} cy={15} r={5.5} fill="#FFD45C" stroke={INK} strokeWidth={2} />
    </svg>
  );
}

function FrameIcon() {
  return (
    <svg viewBox="0 0 40 40" width={30} height={30} aria-hidden="true">
      <rect x={4} y={7} width={32} height={26} rx={4} fill="#EAF6FB" stroke={INK} strokeWidth={2.5} />
      <path d="M10 22 Q16 15 24 20 Q28 22 30 18 L30 26 Q24 30 16 27 Z" fill="#F08A4B" stroke={INK} strokeWidth={2} />
      <circle cx={26} cy={19} r={1.6} fill={INK} />
    </svg>
  );
}

export function PaintIcon({ size = 44 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <path
        d="M8 40 L12 28 L32 8 L40 16 L20 36 Z"
        fill="#C3A6F0"
        stroke={INK}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <path d="M32 8 L40 16" stroke={INK} strokeWidth={2.5} />
      <path d="M8 40 L12 28 L20 36 Z" fill="#FFE9A0" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M8 40 L10 34 L14 38 Z" fill={INK} />
      <circle cx={38} cy={36} r={4} fill="#F2827F" />
      <circle cx={30} cy={42} r={2.5} fill="#5BA8DC" />
    </svg>
  );
}
