import { CRAYONS, bbox, strokePath, type Stroke } from "../../shared/drawing";

const INK = "#4A3B33";
const WIDTH = 18;

/**
 * Brings a finished drawing to life using the players' own lines.
 * Stroke order follows the template: 0 body, 1 tail (wags), 2 fin (flaps), 3+ pattern.
 * Only the eye, smile and cheeks are added on top.
 */
export function CreationArt({
  strokes,
  alive = true,
  className = "",
}: {
  strokes: Stroke[];
  alive?: boolean;
  className?: string;
}) {
  const [body, tail, fin, ...pattern] = strokes;
  const bb = body && body.pts.length >= 4 ? bbox(body.pts) : null;
  const big = bb && bb.w > 120 && bb.h > 80;
  // Eye sits in the front third of the body; fall back to the template's spot.
  const eye = big
    ? { x: bb.maxX - bb.w * 0.24, y: bb.minY + bb.h * 0.4, r: Math.min(46, bb.h * 0.16) }
    : { x: 720, y: 470, r: 40 };
  const tb = tail ? bbox(tail.pts) : null;
  const fb = fin ? bbox(fin.pts) : null;

  return (
    <svg viewBox="0 0 1000 1000" className={`overflow-visible ${className}`} aria-hidden="true">
      <g className={alive ? "fish-bob" : ""} style={{ transformOrigin: "500px 500px" }}>
        {tail && (
          <g
            className={alive ? "fish-tail" : ""}
            style={{ transformOrigin: `${tb!.maxX}px ${(tb!.minY + tb!.maxY) / 2}px`, transformBox: "view-box" }}
          >
            <Line s={tail} fill />
          </g>
        )}
        {body && <Line s={body} fill />}
        {fin && (
          <g
            className={alive ? "fish-fin" : ""}
            style={{ transformOrigin: `${(fb!.minX + fb!.maxX) / 2}px ${fb!.maxY}px`, transformBox: "view-box" }}
          >
            <Line s={fin} />
          </g>
        )}
        {pattern.map((p, i) => (
          <Line key={i} s={p} />
        ))}
        {body && (
          <g>
            <circle cx={eye.x} cy={eye.y} r={eye.r} fill="#FFFDF7" stroke={INK} strokeWidth={8} />
            <circle cx={eye.x + eye.r * 0.15} cy={eye.y + eye.r * 0.1} r={eye.r * 0.5} fill={INK} />
            <circle cx={eye.x + eye.r * 0.3} cy={eye.y - eye.r * 0.15} r={eye.r * 0.18} fill="#fff" />
            <path
              d={`M${eye.x - eye.r * 0.2} ${eye.y + eye.r * 1.7} Q${eye.x + eye.r * 0.5} ${eye.y + eye.r * 2.3} ${eye.x + eye.r * 1.1} ${eye.y + eye.r * 1.6}`}
              stroke={INK}
              strokeWidth={9}
              fill="none"
              strokeLinecap="round"
            />
            <ellipse
              cx={eye.x - eye.r * 0.8}
              cy={eye.y + eye.r * 1.3}
              rx={eye.r * 0.45}
              ry={eye.r * 0.28}
              fill="#F7A8B8"
              opacity={0.8}
            />
          </g>
        )}
      </g>
    </svg>
  );
}

function Line({ s, fill = false }: { s: Stroke; fill?: boolean }) {
  const color = CRAYONS[s.color] ?? CRAYONS[0];
  return (
    <path
      d={strokePath(s.pts)}
      stroke={color}
      strokeWidth={WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={fill ? color : "none"}
      fillOpacity={fill ? 0.28 : 0}
    />
  );
}
