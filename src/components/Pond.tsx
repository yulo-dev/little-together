import { useState } from "react";
import { TEMPLATES, type Creation } from "../../shared/drawing";
import { useT } from "../i18n";
import { sfx } from "../lib/sound";
import { CreationArt } from "./CreationArt";

const INK = "#4A3B33";
const LANES = [-14, 10, -2]; // px offsets so fish don't stack on one line

/**
 * The garden pond: the family's most recent drawings live here and keep
 * swimming. Tap a fish to make it jump. An empty pond invites a first drawing.
 */
export function Pond({ fish, onDraw }: { fish: Creation[]; onDraw: () => void }) {
  const { t } = useT();
  const [jumps, setJumps] = useState<Record<string, number>>({});

  const jump = (id: string) => {
    sfx.dance();
    setJumps((j) => ({ ...j, [id]: (j[id] ?? 0) + 1 }));
  };

  return (
    <div className="relative z-10 mx-auto h-[100px] w-full max-w-[34rem]" data-testid="pond" data-fish={fish.length}>
      <svg
        viewBox="0 0 400 88"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <ellipse cx="200" cy="48" rx="194" ry="38" fill="#5E9E66" opacity="0.35" />
        <ellipse cx="200" cy="44" rx="192" ry="38" fill="#8EC9F0" stroke={INK} strokeWidth="3" />
        <ellipse cx="200" cy="40" rx="170" ry="28" fill="#A9D8F2" />
        <g stroke="#FFFDF7" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.8">
          <path d="M70 34 q14 -6 28 0" />
          <path d="M280 56 q12 -5 24 0" />
        </g>
        <g>
          <ellipse cx="352" cy="58" rx="22" ry="10" fill="#6FB36A" stroke={INK} strokeWidth="2.5" />
          <path d="M352 58 L372 52" stroke={INK} strokeWidth="2.5" />
          <circle cx="344" cy="54" r="5" fill="#F7A8B8" stroke={INK} strokeWidth="2" />
        </g>
        <g fill="#CDBFB3" stroke={INK} strokeWidth="2">
          <ellipse cx="22" cy="62" rx="10" ry="7" />
          <ellipse cx="38" cy="72" rx="8" ry="5" />
        </g>
      </svg>

      <div className="absolute inset-x-[7%] inset-y-[14%] overflow-hidden rounded-[50%]">
        {fish.length === 0 ? (
          <button
            type="button"
            onClick={onDraw}
            aria-label={t.draw}
            data-testid="pond-empty"
            className="absolute inset-0 grid place-items-center"
          >
            <svg viewBox="100 180 780 560" className="nudge-y h-12 w-16 opacity-60" aria-hidden="true">
              {TEMPLATES.fish.slice(0, 2).map((s) => (
                <path
                  key={s.part}
                  d={s.guide}
                  fill="none"
                  stroke={INK}
                  strokeWidth={28}
                  strokeDasharray="10 60"
                  strokeLinecap="round"
                />
              ))}
            </svg>
          </button>
        ) : (
          fish.map((c, i) => (
            <button
              key={c.id}
              type="button"
              data-testid="pond-fish"
              aria-label={t.animals[c.artists[0]] ?? "fish"}
              onClick={() => jump(c.id)}
              className="pond-swim absolute h-20 w-20"
              style={{
                top: `calc(50% - 40px + ${LANES[i % LANES.length]}px)`,
                animationDuration: `${11 + i * 3}s`,
                // start each fish at a different point of its lap so they don't bunch up
                animationDelay: `${-(11 + i * 3) * [0, 0.62, 0.3][i % 3]}s`,
                ["--i" as string]: i,
              }}
            >
              <span key={jumps[c.id] ?? 0} className={`block ${jumps[c.id] ? "fish-jump" : ""}`}>
                <CreationArt strokes={c.strokes} template={c.template} className="h-20 w-20" weight={40} />
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
