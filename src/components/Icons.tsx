const INK = "#4A3B33";
type P = { size?: number; className?: string };

export const SeedBag = ({ size = 44, className }: P) => (
  <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
    <path
      d="M12 14 L36 14 L38 42 Q24 46 10 42 Z"
      fill="#E9C29A"
      stroke={INK}
      strokeWidth={2.5}
      strokeLinejoin="round"
    />
    <path d="M12 14 L16 8 L32 8 L36 14" fill="#D9A877" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
    <circle cx={24} cy={28} r={7} fill="#F7A8B8" stroke={INK} strokeWidth={2} />
    <circle cx={24} cy={28} r={2.5} fill="#FFD45C" />
  </svg>
);

export const WateringCan = ({ size = 44, className }: P) => (
  <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
    <path d="M30 22 L44 12 L46 15 L34 28" fill="#8EC9F0" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
    <rect x={8} y={18} width={26} height={22} rx={6} fill="#8EC9F0" stroke={INK} strokeWidth={2.5} />
    <path d="M12 18 Q21 6 30 18" fill="none" stroke={INK} strokeWidth={2.5} />
    <circle cx={45} cy={20} r={1.8} fill="#5BA8DC" />
    <circle cx={42} cy={24} r={1.8} fill="#5BA8DC" />
  </svg>
);

export const Sun = ({ size = 44, className }: P) => (
  <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
    {Array.from({ length: 8 }, (_, i) => (
      <rect key={i} x={22} y={2} width={4} height={9} rx={2} fill="#FFB938" transform={`rotate(${i * 45} 24 24)`} />
    ))}
    <circle cx={24} cy={24} r={12} fill="#FFD45C" stroke={INK} strokeWidth={2.5} />
    <circle cx={20} cy={23} r={1.6} fill={INK} />
    <circle cx={28} cy={23} r={1.6} fill={INK} />
    <path d="M20 27 Q24 30 28 27" stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" />
  </svg>
);

export const Sparkle = ({ size = 44, className }: P) => (
  <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
    <path
      d="M24 4 Q27 21 44 24 Q27 27 24 44 Q21 27 4 24 Q21 21 24 4 Z"
      fill="#FFD45C"
      stroke={INK}
      strokeWidth={2.5}
      strokeLinejoin="round"
    />
    <path d="M38 6 Q39 10 43 11 Q39 12 38 16 Q37 12 33 11 Q37 10 38 6 Z" fill="#F7A8B8" />
  </svg>
);

export const MusicNote = ({ size = 44, className }: P) => (
  <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
    <path d="M18 34 L18 10 L38 6 L38 30" fill="none" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
    <ellipse cx={13} cy={35} rx={6} ry={5} fill="#C3A6F0" stroke={INK} strokeWidth={2.5} />
    <ellipse cx={33} cy={31} rx={6} ry={5} fill="#C3A6F0" stroke={INK} strokeWidth={2.5} />
  </svg>
);

export const Heart = ({ size = 44, className, fill = "#F2827F" }: P & { fill?: string }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
    <path
      d="M24 42 C10 32 4 24 4 16 C4 9 9 5 15 5 C19 5 22 7 24 11 C26 7 29 5 33 5 C39 5 44 9 44 16 C44 24 38 32 24 42 Z"
      fill={fill}
      stroke={INK}
      strokeWidth={2.5}
      strokeLinejoin="round"
    />
    <ellipse cx={14} cy={15} rx={4} ry={3} fill="#fff" opacity={0.6} />
  </svg>
);

export const Speaker = ({ on, size = 26 }: { on: boolean; size?: number }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
    <path
      d="M5 12 L11 12 L18 6 L18 26 L11 20 L5 20 Z"
      fill="#FFF6E3"
      stroke={INK}
      strokeWidth={2.2}
      strokeLinejoin="round"
    />
    {on ? (
      <path
        d="M22 11 Q26 16 22 21 M25 8 Q31 16 25 24"
        stroke={INK}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
      />
    ) : (
      <path d="M22 12 L29 20 M29 12 L22 20" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
    )}
  </svg>
);

export const Invite = ({ size = 26 }: { size?: number }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
    <rect x={4} y={8} width={24} height={17} rx={3} fill="#FFF6E3" stroke={INK} strokeWidth={2.2} />
    <path d="M5 10 L16 18 L27 10" fill="none" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
    <circle cx={25} cy={8} r={5} fill="#F2827F" stroke={INK} strokeWidth={2} />
    <path d="M25 6 L25 10 M23 8 L27 8" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" />
  </svg>
);

export const ACTION_ICON = { plant: SeedBag, water: WateringCan, sun: Sun, bloom: Sparkle, dance: MusicNote } as const;
