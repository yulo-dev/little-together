import type { Plant, Stage } from "../../shared/protocol";

const INK = "#4A3B33";
const LEAF = "#6FB36A";
const LEAF_DARK = "#3E7D4F";

export const PLANT_COLORS: Record<Plant, { petal: string; center: string; petals: number }> = {
  pink: { petal: "#F7A8B8", center: "#FFD45C", petals: 5 },
  sun: { petal: "#FFD45C", center: "#B9784A", petals: 11 },
  violet: { petal: "#C3A6F0", center: "#FFE9A0", petals: 6 },
  rose: { petal: "#F2827F", center: "#FFD45C", petals: 7 },
  sky: { petal: "#8EC9F0", center: "#FFF1B8", petals: 5 },
  peach: { petal: "#FFB98A", center: "#F7E07A", petals: 8 },
};

/** Soil mound plus the plant for one plot. viewBox 120x130, soil line at y=108. */
export function PlantArt({ stage, plant }: { stage: Stage; plant: Plant | null }) {
  const c = PLANT_COLORS[plant ?? "pink"];
  return (
    <svg viewBox="0 0 120 130" className="h-full w-full overflow-visible" aria-hidden="true">
      {/* soil */}
      <ellipse cx={60} cy={112} rx={50} ry={15} fill="#8A5A3C" />
      <ellipse cx={60} cy={108} rx={48} ry={13} fill="#B98157" />
      <path
        d="M30 106 q4 -3 8 0 M70 112 q4 -3 8 0 M52 103 q3 -2 6 0"
        stroke="#8A5A3C"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />

      {stage === 1 && (
        <g className="pop-in">
          <ellipse cx={60} cy={102} rx={14} ry={7} fill="#9C6A45" />
          <ellipse cx={60} cy={98} rx={6} ry={8} fill="#E9C29A" stroke={INK} strokeWidth={2} />
          <path d="M57 95 q3 -3 6 0" stroke={INK} strokeWidth={1.5} fill="none" />
        </g>
      )}

      {stage >= 2 && (
        <path
          d={stage === 2 ? "M60 106 Q58 94 60 82" : "M60 106 Q56 80 60 52"}
          stroke={LEAF_DARK}
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          className="grow-up"
        />
      )}

      {stage === 2 && (
        <g className="pop-in" style={{ transformOrigin: "60px 84px" }}>
          <path d="M60 86 Q44 70 34 80 Q44 92 60 86 Z" fill={LEAF} stroke={INK} strokeWidth={2} />
          <path d="M60 86 Q76 70 86 80 Q76 92 60 86 Z" fill={LEAF} stroke={INK} strokeWidth={2} />
        </g>
      )}

      {stage >= 3 && (
        <g>
          <path d="M58 90 Q38 74 28 86 Q40 98 58 90 Z" fill={LEAF} stroke={INK} strokeWidth={2} />
          <path d="M61 76 Q80 62 92 72 Q80 86 61 76 Z" fill={LEAF} stroke={INK} strokeWidth={2} />
        </g>
      )}

      {stage === 3 && (
        <g className="pop-in" style={{ transformOrigin: "60px 50px" }}>
          <path d="M60 24 Q76 40 68 54 Q60 60 52 54 Q44 40 60 24 Z" fill={c.petal} stroke={INK} strokeWidth={2.5} />
          <path d="M52 54 Q60 44 68 54 Q60 60 52 54 Z" fill={LEAF} stroke={INK} strokeWidth={2} />
        </g>
      )}

      {stage === 4 && (
        <g className="bloom" style={{ transformOrigin: "60px 44px" }}>
          {Array.from({ length: c.petals }, (_, i) => {
            const a = (i / c.petals) * Math.PI * 2;
            const r = c.petals > 8 ? 24 : 22;
            return (
              <ellipse
                key={i}
                cx={60 + Math.cos(a) * r}
                cy={44 + Math.sin(a) * r}
                rx={c.petals > 8 ? 9 : 14}
                ry={c.petals > 8 ? 13 : 14}
                transform={`rotate(${(a * 180) / Math.PI + 90} ${60 + Math.cos(a) * r} ${44 + Math.sin(a) * r})`}
                fill={c.petal}
                stroke={INK}
                strokeWidth={2.5}
              />
            );
          })}
          <circle cx={60} cy={44} r={16} fill={c.center} stroke={INK} strokeWidth={2.5} />
          <circle cx={54} cy={42} r={2.4} fill={INK} />
          <circle cx={66} cy={42} r={2.4} fill={INK} />
          <path d="M55 48 Q60 53 65 48" stroke={INK} strokeWidth={2.2} fill="none" strokeLinecap="round" />
          <ellipse cx={50} cy={48} rx={3.5} ry={2.2} fill="#F7A8B8" opacity={0.8} />
          <ellipse cx={70} cy={48} rx={3.5} ry={2.2} fill="#F7A8B8" opacity={0.8} />
        </g>
      )}
    </svg>
  );
}
