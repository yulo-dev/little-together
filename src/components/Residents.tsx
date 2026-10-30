import type { Creation } from "../../shared/drawing";
import { CreationArt } from "./CreationArt";

/** Bunnies the family drew hop back and forth along the meadow. */
export function MeadowBunnies({ bunnies }: { bunnies: Creation[] }) {
  if (bunnies.length === 0) return null;
  return (
    // hops along the pond's far bank; never blocks taps on the plots behind it
    <div
      className="pointer-events-none absolute inset-x-0 bottom-[72%] z-20 mx-auto h-20 max-w-[34rem]"
      aria-hidden="true"
      data-testid="meadow"
    >
      {bunnies.map((c, i) => (
        <span
          key={c.id}
          data-testid="meadow-bunny"
          className="meadow-hop absolute bottom-0 h-20 w-20"
          style={{
            animationDuration: `${20 + i * 5}s`,
            animationDelay: `${-(20 + i * 5) * [0.1, 0.55, 0.8][i % 3]}s`,
            ["--i" as string]: i,
          }}
        >
          <CreationArt strokes={c.strokes} template="bunny" className="h-20 w-20" weight={40} />
        </span>
      ))}
    </div>
  );
}

/** Butterflies the family drew drift through the sky above the garden. */
export function SkyButterflies({ butterflies }: { butterflies: Creation[] }) {
  if (butterflies.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[9%] h-[22%]" aria-hidden="true" data-testid="sky">
      {butterflies.map((c, i) => (
        <span
          key={c.id}
          data-testid="sky-butterfly"
          className="sky-drift absolute h-16 w-16"
          style={{
            marginTop: `${i * 34}px`,
            animationDuration: `${24 + i * 6}s`,
            animationDelay: `${-(24 + i * 6) * [0.2, 0.6, 0.85][i % 3]}s`,
            ["--i" as string]: i,
          }}
        >
          <CreationArt strokes={c.strokes} template="butterfly" className="h-16 w-16" weight={44} />
        </span>
      ))}
    </div>
  );
}
