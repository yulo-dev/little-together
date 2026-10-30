import { CRAYONS, bbox, strokePath, type Stroke, type TemplateId } from "../../shared/drawing";

const INK = "#4A3B33";
const WIDTH = 18;

type Box = ReturnType<typeof bbox>;
const boxOf = (s?: Stroke): Box | null => (s && s.pts.length >= 4 ? bbox(s.pts) : null);

/**
 * Brings a finished drawing to life using the players' own lines. Stroke order
 * follows the template's steps, which decides what moves:
 *   fish:      body, tail (wags), fin (flaps), pattern
 *   bunny:     body, head, ears (wiggle), tail; the whole bunny hops
 *   butterfly: body, left wing, right wing (both flap), antennae
 * Only small faces (eyes, smile, cheeks) are added on top.
 */
export function CreationArt({
  strokes,
  template = "fish",
  alive = true,
  className = "",
  weight = WIDTH,
}: {
  strokes: Stroke[];
  template?: TemplateId;
  alive?: boolean;
  className?: string;
  /** line width in canvas units; thicker reads better at small sizes */
  weight?: number;
}) {
  const art =
    template === "bunny" ? (
      <Bunny strokes={strokes} alive={alive} w={weight} />
    ) : template === "butterfly" ? (
      <Butterfly strokes={strokes} alive={alive} w={weight} />
    ) : (
      <Fish strokes={strokes} alive={alive} w={weight} />
    );
  return (
    <svg
      viewBox="0 0 1000 1000"
      className={`overflow-visible ${className}`}
      aria-hidden="true"
      data-template={template}
    >
      {art}
    </svg>
  );
}

interface ArtProps {
  strokes: Stroke[];
  alive: boolean;
  w: number;
}

function Fish({ strokes, alive, w }: ArtProps) {
  const [body, tail, fin, ...pattern] = strokes;
  const bb = boxOf(body);
  const big = bb && bb.w > 120 && bb.h > 80;
  const eye = big
    ? { x: bb.maxX - bb.w * 0.24, y: bb.minY + bb.h * 0.4, r: Math.min(46, bb.h * 0.16) }
    : { x: 720, y: 470, r: 40 };
  const tb = boxOf(tail);
  const fb = boxOf(fin);
  return (
    <g className={alive ? "fish-bob" : ""} style={{ transformOrigin: "500px 500px" }}>
      {tail && tb && (
        <Moving cls={alive ? "fish-tail" : ""} ox={tb.maxX} oy={(tb.minY + tb.maxY) / 2}>
          <Line s={tail} fill w={w} />
        </Moving>
      )}
      {body && <Line s={body} fill w={w} />}
      {fin && fb && (
        <Moving cls={alive ? "fish-fin" : ""} ox={(fb.minX + fb.maxX) / 2} oy={fb.maxY}>
          <Line s={fin} w={w} />
        </Moving>
      )}
      {pattern.map((p, i) => (
        <Line key={i} s={p} w={w} />
      ))}
      {body && <Face x={eye.x} y={eye.y} r={eye.r} />}
    </g>
  );
}

function Bunny({ strokes, alive, w }: ArtProps) {
  const [body, head, ears, tail] = strokes;
  const hb = boxOf(head);
  const eb = boxOf(ears);
  const big = hb && hb.w > 100 && hb.h > 80;
  const eye = big
    ? { x: hb.minX + hb.w * 0.62, y: hb.minY + hb.h * 0.42, r: Math.min(36, hb.h * 0.13) }
    : { x: 680, y: 360, r: 32 };
  return (
    <g className={alive ? "bunny-hop" : ""} style={{ transformOrigin: "500px 820px" }}>
      {ears && eb && (
        <Moving cls={alive ? "bunny-ears" : ""} ox={(eb.minX + eb.maxX) / 2} oy={eb.maxY}>
          <Line s={ears} fill w={w} />
        </Moving>
      )}
      {tail && <Line s={tail} fill w={w} />}
      {body && <Line s={body} fill w={w} />}
      {head && <Line s={head} fill w={w} />}
      {head && (
        <>
          <Face x={eye.x} y={eye.y} r={eye.r} />
          <ellipse
            cx={eye.x + eye.r * 2.2}
            cy={eye.y + eye.r * 1.3}
            rx={eye.r * 0.5}
            ry={eye.r * 0.38}
            fill="#E9798F"
          />
        </>
      )}
    </g>
  );
}

function Butterfly({ strokes, alive, w }: ArtProps) {
  const [body, left, right, antennae] = strokes;
  const bb = boxOf(body);
  const cx = bb ? (bb.minX + bb.maxX) / 2 : 500;
  const top = bb ? bb.minY : 300;
  const lb = boxOf(left);
  const rb = boxOf(right);
  return (
    <g className={alive ? "butterfly-float" : ""} style={{ transformOrigin: "500px 500px" }}>
      {left && lb && (
        <Moving cls={alive ? "wing-flap" : ""} ox={lb.maxX} oy={(lb.minY + lb.maxY) / 2}>
          <Line s={left} fill w={w} />
        </Moving>
      )}
      {right && rb && (
        <Moving cls={alive ? "wing-flap" : ""} ox={rb.minX} oy={(rb.minY + rb.maxY) / 2}>
          <Line s={right} fill w={w} />
        </Moving>
      )}
      {antennae && <Line s={antennae} w={w} />}
      {body && <Line s={body} w={w * 1.8} />}
      {body && (
        <g>
          <circle cx={cx - 16} cy={top + 46} r={11} fill={INK} />
          <circle cx={cx + 16} cy={top + 46} r={11} fill={INK} />
          <circle cx={cx - 13} cy={top + 42} r={4} fill="#fff" />
          <circle cx={cx + 19} cy={top + 42} r={4} fill="#fff" />
          <path
            d={`M${cx - 12} ${top + 72} Q${cx} ${top + 84} ${cx + 12} ${top + 72}`}
            stroke={INK}
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
          />
        </g>
      )}
    </g>
  );
}

function Moving({ cls, ox, oy, children }: { cls: string; ox: number; oy: number; children: React.ReactNode }) {
  return (
    <g className={cls} style={{ transformOrigin: `${ox}px ${oy}px`, transformBox: "view-box" }}>
      {children}
    </g>
  );
}

function Face({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#FFFDF7" stroke={INK} strokeWidth={8} />
      <circle cx={x + r * 0.15} cy={y + r * 0.1} r={r * 0.5} fill={INK} />
      <circle cx={x + r * 0.3} cy={y - r * 0.15} r={r * 0.18} fill="#fff" />
      <path
        d={`M${x - r * 0.2} ${y + r * 1.7} Q${x + r * 0.5} ${y + r * 2.3} ${x + r * 1.1} ${y + r * 1.6}`}
        stroke={INK}
        strokeWidth={9}
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx={x - r * 0.8} cy={y + r * 1.3} rx={r * 0.45} ry={r * 0.28} fill="#F7A8B8" opacity={0.8} />
    </g>
  );
}

function Line({ s, fill = false, w }: { s: Stroke; fill?: boolean; w: number }) {
  const color = CRAYONS[s.color] ?? CRAYONS[0];
  return (
    <path
      d={strokePath(s.pts)}
      stroke={color}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={fill ? color : "none"}
      fillOpacity={fill ? 0.28 : 0}
    />
  );
}
