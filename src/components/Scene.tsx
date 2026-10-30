import type { Phase } from "../../shared/protocol";

const SKY: Record<Phase, string> = {
  dawn: "linear-gradient(to bottom, #F6C9C2, #FBE3CC 55%, #EAF5EC)",
  day: "linear-gradient(to bottom, #BFE3F2, #DDF0F2 55%, #EAF5EC)",
  dusk: "linear-gradient(to bottom, #EFA28C, #F7C9A0 55%, #E9E3C4)",
  night: "linear-gradient(to bottom, #1E2A4F, #2E3B66 55%, #46557D)",
};

// Hills keep their colors but dim with the light, so the garden stays readable.
const HILLS: Record<Phase, string> = {
  dawn: "brightness(0.97) saturate(0.95)",
  day: "none",
  dusk: "brightness(0.9) sepia(0.18)",
  night: "brightness(0.62) saturate(0.8) hue-rotate(-8deg)",
};

const STARS = [
  [8, 6, 1.6],
  [22, 14, 1.1],
  [36, 5, 1.3],
  [48, 18, 1],
  [61, 8, 1.5],
  [74, 20, 1.1],
  [14, 28, 1],
  [56, 30, 1.2],
  [90, 32, 1],
  [30, 34, 1.4],
  [82, 10, 1.1],
  [68, 36, 1],
];

/**
 * The storybook backdrop: paper-cut sky, sun or moon, clouds and layered hills.
 * The sky follows `phase` (this device's local time of day). Sky decorations
 * keep a fixed size in the corners; the meadow is anchored to a share of the
 * viewport height so plots always stand on grass, from phones to laptops.
 */
export function Scene({
  children,
  calm = false,
  horizon = "38%",
  phase = "day",
}: {
  children: React.ReactNode;
  calm?: boolean;
  /** where the meadow starts, from the top */
  horizon?: string;
  phase?: Phase;
}) {
  const low = phase === "dawn" || phase === "dusk";
  return (
    <div
      className="relative min-h-dvh overflow-hidden transition-[background] duration-1000"
      style={{ background: SKY[phase] }}
      data-testid="scene"
      data-phase={phase}
    >
      {phase === "night" ? (
        <>
          <svg className="pointer-events-none absolute inset-x-0 top-0 h-[40%] w-full" aria-hidden="true">
            {STARS.map(([x, y, r], i) => (
              <circle
                key={i}
                cx={`${x}%`}
                cy={`${y * 2}%`}
                r={r * 1.6}
                fill="#FFF1B8"
                className={calm ? "" : "twinkle"}
                style={{ animationDelay: `${(i % 5) * 0.6}s` }}
              />
            ))}
          </svg>
          <svg
            className="pointer-events-none absolute right-[-10px] top-[-10px] h-[120px] w-[120px]"
            viewBox="0 0 120 120"
            aria-hidden="true"
          >
            <circle cx="60" cy="60" r="48" fill="#FFF1B8" opacity="0.15" />
            <circle cx="58" cy="60" r="32" fill="#FFF1B8" />
            <circle cx="72" cy="50" r="27" fill="#26335A" />
          </svg>
        </>
      ) : (
        <svg
          className={`pointer-events-none absolute right-[-30px] h-[150px] w-[150px] ${low ? "top-[10%]" : "top-[-30px]"}`}
          viewBox="0 0 150 150"
          aria-hidden="true"
        >
          <g className={calm ? "" : "drift"}>
            <circle cx="80" cy="70" r="52" fill={low ? "#FFB45C" : "#FFE07A"} opacity="0.28" />
            <circle cx="80" cy="70" r="38" fill={low ? "#FFB45C" : "#FFE07A"} />
          </g>
        </svg>
      )}
      <svg
        className="pointer-events-none absolute left-0 top-[9%] h-[60px] w-[150px] overflow-visible"
        viewBox="0 0 150 60"
        aria-hidden="true"
        style={{ opacity: phase === "night" ? 0.22 : 1 }}
      >
        <g className={calm ? "" : "cloud-a"} fill="#FFFDF7">
          <ellipse cx="60" cy="38" rx="46" ry="16" />
          <ellipse cx="86" cy="26" rx="26" ry="18" />
          <ellipse cx="44" cy="28" rx="18" ry="13" />
        </g>
      </svg>
      <svg
        className="pointer-events-none absolute right-[8%] top-[22%] h-[44px] w-[110px] overflow-visible"
        viewBox="0 0 110 44"
        aria-hidden="true"
        style={{ opacity: phase === "night" ? 0.2 : 0.9 }}
      >
        <g className={calm ? "" : "cloud-b"} fill={low ? "#FFE9DA" : "#FFFDF7"}>
          <ellipse cx="50" cy="28" rx="36" ry="13" />
          <ellipse cx="68" cy="18" rx="22" ry="14" />
        </g>
      </svg>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 transition-[filter] duration-1000"
        style={{ top: horizon, filter: HILLS[phase] }}
      >
        <svg className="h-full w-full" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden="true">
          <path
            d="M0 60 Q100 -10 220 40 Q320 0 400 45 L400 500 L0 500 Z"
            fill="#7FB98A"
            opacity="0.35"
            transform="translate(0 6)"
          />
          <path d="M0 60 Q100 -10 220 40 Q320 0 400 45 L400 500 L0 500 Z" fill="#A9D8A0" />
          <path
            d="M0 130 Q120 80 260 112 Q340 96 400 115 L400 500 L0 500 Z"
            fill="#5E9E66"
            opacity="0.35"
            transform="translate(0 7)"
          />
          <path d="M0 130 Q120 80 260 112 Q340 96 400 115 L400 500 L0 500 Z" fill="#8CCB7E" />
        </svg>
      </div>

      <div className="relative">{children}</div>
    </div>
  );
}
