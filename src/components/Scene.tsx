/**
 * The storybook backdrop: paper-cut sky, sun, clouds and layered hills.
 * Sky decorations keep a fixed size in the top corners; the meadow is anchored
 * to a share of the viewport height so plots always stand on grass, from
 * phones to wide laptops. Layers carry a hard offset shadow, like cut paper.
 */
export function Scene({
  children,
  calm = false,
  horizon = "38%",
}: {
  children: React.ReactNode;
  calm?: boolean;
  /** where the meadow starts, from the top */
  horizon?: string;
}) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-gradient-to-b from-[#BFE3F2] via-[#DDF0F2] to-[#EAF5EC]">
      <svg
        className="pointer-events-none absolute right-[-30px] top-[-30px] h-[150px] w-[150px]"
        viewBox="0 0 150 150"
        aria-hidden="true"
      >
        <g className={calm ? "" : "drift"}>
          <circle cx="80" cy="70" r="52" fill="#FFE07A" opacity="0.28" />
          <circle cx="80" cy="70" r="38" fill="#FFE07A" />
        </g>
      </svg>
      <svg
        className="pointer-events-none absolute left-0 top-[9%] h-[60px] w-[150px] overflow-visible"
        viewBox="0 0 150 60"
        aria-hidden="true"
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
      >
        <g className={calm ? "" : "cloud-b"} fill="#FFFDF7" opacity="0.9">
          <ellipse cx="50" cy="28" rx="36" ry="13" />
          <ellipse cx="68" cy="18" rx="22" ry="14" />
        </g>
      </svg>

      <div className="pointer-events-none absolute inset-x-0 bottom-0" style={{ top: horizon }}>
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
