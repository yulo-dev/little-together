import type { Visitor } from "../../shared/protocol";

const INK = "#4A3B33";

export function Butterfly({ size = 54 }: { size?: number }) {
  return (
    <svg viewBox="0 0 60 50" width={size} height={size * 0.83} aria-hidden="true">
      <g className="flap" style={{ transformOrigin: "30px 25px" }}>
        <path d="M30 24 Q12 2 6 14 Q2 28 30 26 Z" fill="#C3A6F0" stroke={INK} strokeWidth={2} />
        <path d="M30 26 Q10 30 12 42 Q20 48 30 28 Z" fill="#F7A8B8" stroke={INK} strokeWidth={2} />
        <path d="M30 24 Q48 2 54 14 Q58 28 30 26 Z" fill="#C3A6F0" stroke={INK} strokeWidth={2} />
        <path d="M30 26 Q50 30 48 42 Q40 48 30 28 Z" fill="#F7A8B8" stroke={INK} strokeWidth={2} />
      </g>
      <ellipse cx={30} cy={27} rx={3} ry={11} fill={INK} />
      <path d="M29 17 Q25 8 22 7 M31 17 Q35 8 38 7" stroke={INK} strokeWidth={1.6} fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Bee({ size = 44 }: { size?: number }) {
  return (
    <svg viewBox="0 0 50 40" width={size} height={size * 0.8} aria-hidden="true">
      <ellipse cx={20} cy={10} rx={8} ry={6} fill="#E8F4FB" stroke={INK} strokeWidth={1.8} className="flap" />
      <ellipse cx={30} cy={10} rx={8} ry={6} fill="#E8F4FB" stroke={INK} strokeWidth={1.8} className="flap" />
      <ellipse cx={25} cy={24} rx={16} ry={11} fill="#FFD45C" stroke={INK} strokeWidth={2} />
      <path d="M20 14 Q18 24 20 34 M28 14 Q26 24 28 34" stroke={INK} strokeWidth={4} fill="none" />
      <circle cx={37} cy={22} r={2} fill={INK} />
    </svg>
  );
}

export function Bird({ size = 52 }: { size?: number }) {
  return (
    <svg viewBox="0 0 60 50" width={size} height={size * 0.83} aria-hidden="true">
      <path d="M8 26 L2 20 L4 32 Z" fill="#5BA8DC" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <ellipse cx={28} cy={28} rx={20} ry={16} fill="#8EC9F0" stroke={INK} strokeWidth={2.2} />
      <path d="M20 26 Q28 36 36 26" fill="#5BA8DC" stroke={INK} strokeWidth={2} />
      <circle cx={40} cy={20} r={10} fill="#8EC9F0" stroke={INK} strokeWidth={2.2} />
      <circle cx={42} cy={18} r={2.2} fill={INK} />
      <path d="M49 20 L57 22 L49 25 Z" fill="#F59A3E" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      <ellipse cx={42} cy={24} rx={3} ry={2} fill="#F7A8B8" />
      <path d="M24 44 L24 48 M32 44 L32 48" stroke={INK} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

/** Animals that have visited stay and wander around the garden. */
export function VisitorLayer({ visitors }: { visitors: Visitor[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {visitors.includes("butterfly") && (
        <div className="wander-a absolute left-0 top-[18%]">
          <Butterfly />
        </div>
      )}
      {visitors.includes("bee") && (
        <div className="wander-b absolute left-0 top-[42%]">
          <Bee />
        </div>
      )}
      {visitors.includes("bird") && (
        <div className="hop absolute bottom-[5%] right-[4%]">
          <Bird />
        </div>
      )}
    </div>
  );
}

export const VISITOR_ART: Record<Visitor, () => React.ReactNode> = {
  butterfly: () => <Butterfly size={120} />,
  bee: () => <Bee size={110} />,
  bird: () => <Bird size={120} />,
};
