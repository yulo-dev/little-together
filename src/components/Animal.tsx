import type { Avatar } from "../../shared/protocol";

const INK = "#4A3B33";

/** Round storybook animal faces drawn in SVG (viewBox 100x100). */
export function Animal({ kind, size = 56, className = "" }: { kind: Avatar; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
      {FACES[kind]}
    </svg>
  );
}

const eyes = (y = 52, dx = 14, fill = INK) => (
  <>
    <circle cx={50 - dx} cy={y} r={4.5} fill={fill} />
    <circle cx={50 + dx} cy={y} r={4.5} fill={fill} />
    <circle cx={50 - dx + 1.5} cy={y - 1.5} r={1.4} fill="#fff" />
    <circle cx={50 + dx + 1.5} cy={y - 1.5} r={1.4} fill="#fff" />
  </>
);
const cheeks = (y = 62) => (
  <>
    <ellipse cx={30} cy={y} rx={6} ry={4} fill="#F7A8B8" opacity={0.75} />
    <ellipse cx={70} cy={y} rx={6} ry={4} fill="#F7A8B8" opacity={0.75} />
  </>
);
const smile = (y = 62) => (
  <path d={`M44 ${y} Q50 ${y + 6} 56 ${y}`} stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
);

const FACES: Record<Avatar, React.ReactNode> = {
  bunny: (
    <>
      <ellipse cx={36} cy={24} rx={9} ry={22} fill="#F3EEF0" stroke={INK} strokeWidth={2.5} />
      <ellipse cx={64} cy={24} rx={9} ry={22} fill="#F3EEF0" stroke={INK} strokeWidth={2.5} />
      <ellipse cx={36} cy={26} rx={4} ry={15} fill="#F7A8B8" />
      <ellipse cx={64} cy={26} rx={4} ry={15} fill="#F7A8B8" />
      <circle cx={50} cy={60} r={32} fill="#F3EEF0" stroke={INK} strokeWidth={2.5} />
      {eyes(56)}
      {cheeks(66)}
      <ellipse cx={50} cy={63} rx={3.5} ry={2.5} fill="#E9798F" />
      {smile(67)}
    </>
  ),
  bear: (
    <>
      <circle cx={24} cy={30} r={12} fill="#C8925F" stroke={INK} strokeWidth={2.5} />
      <circle cx={76} cy={30} r={12} fill="#C8925F" stroke={INK} strokeWidth={2.5} />
      <circle cx={24} cy={30} r={6} fill="#E9C29A" />
      <circle cx={76} cy={30} r={6} fill="#E9C29A" />
      <circle cx={50} cy={56} r={34} fill="#C8925F" stroke={INK} strokeWidth={2.5} />
      <ellipse cx={50} cy={66} rx={15} ry={11} fill="#E9C29A" />
      {eyes(50)}
      <ellipse cx={50} cy={61} rx={5} ry={3.5} fill={INK} />
      {smile(66)}
    </>
  ),
  cat: (
    <>
      <path d="M20 44 L24 12 L44 30 Z" fill="#F2B880" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M80 44 L76 12 L56 30 Z" fill="#F2B880" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <circle cx={50} cy={57} r={33} fill="#F2B880" stroke={INK} strokeWidth={2.5} />
      <path d="M42 28 Q50 36 58 28" stroke="#D98E4F" strokeWidth={4} fill="none" strokeLinecap="round" />
      {eyes(54)}
      {cheeks(64)}
      <path d="M47 61 L53 61 L50 64 Z" fill="#E9798F" />
      {smile(65)}
      <path
        d="M18 60 L32 62 M18 68 L32 66 M82 60 L68 62 M82 68 L68 66"
        stroke={INK}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </>
  ),
  fox: (
    <>
      <path d="M18 46 L22 10 L46 30 Z" fill="#F08A4B" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M82 46 L78 10 L54 30 Z" fill="#F08A4B" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M24 38 L25 20 L37 30 Z" fill="#FFF6E3" />
      <path d="M76 38 L75 20 L63 30 Z" fill="#FFF6E3" />
      <circle cx={50} cy={57} r={33} fill="#F08A4B" stroke={INK} strokeWidth={2.5} />
      <path d="M18 60 Q34 58 50 86 Q66 58 82 60 Q80 84 50 90 Q20 84 18 60 Z" fill="#FFF6E3" />
      {eyes(52)}
      <ellipse cx={50} cy={66} rx={4.5} ry={3.5} fill={INK} />
      {smile(70)}
    </>
  ),
  duck: (
    <>
      <path d="M50 18 Q46 8 54 6" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
      <circle cx={50} cy={55} r={34} fill="#FFD45C" stroke={INK} strokeWidth={2.5} />
      {eyes(48, 15)}
      {cheeks(60)}
      <ellipse cx={50} cy={66} rx={16} ry={8} fill="#F59A3E" stroke={INK} strokeWidth={2.5} />
      <path d="M36 66 Q50 70 64 66" stroke={INK} strokeWidth={2} fill="none" />
    </>
  ),
  panda: (
    <>
      <circle cx={24} cy={28} r={12} fill={INK} />
      <circle cx={76} cy={28} r={12} fill={INK} />
      <circle cx={50} cy={56} r={34} fill="#FFFDF7" stroke={INK} strokeWidth={2.5} />
      <ellipse cx={35} cy={52} rx={9} ry={11} fill={INK} transform="rotate(-20 35 52)" />
      <ellipse cx={65} cy={52} rx={9} ry={11} fill={INK} transform="rotate(20 65 52)" />
      <circle cx={36} cy={51} r={3.5} fill="#fff" />
      <circle cx={64} cy={51} r={3.5} fill="#fff" />
      {cheeks(66)}
      <ellipse cx={50} cy={64} rx={5} ry={3.5} fill={INK} />
      {smile(69)}
    </>
  ),
};
