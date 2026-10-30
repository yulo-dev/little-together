// Magic Drawing: shared types, guided templates and validation.
import type { Avatar, OnlinePlayer } from "./protocol";

/** Drawings use a 1000x1000 coordinate space so they look the same on any screen. */
export const CANVAS = 1000;
export const MAX_POINTS = 80; // per stroke, after client-side simplification
export const CRAYONS = ["#F08A4B", "#5BA8DC", "#F2827F", "#6FB36A", "#C3A6F0", "#FFC93C"] as const;
export const GALLERY_LIMIT = 24;
export const POND_SIZE = 3; // fish shown swimming in the garden

export type TemplateId = "fish";

export interface GuideStep {
  /** short key used for i18n and test ids */
  part: "body" | "tail" | "fin" | "pattern";
  /** dashed SVG path shown as a hint, in 1000x1000 space */
  guide: string;
}

/**
 * Fish facing right. One stroke completes each step, so a messy scribble still
 * moves the drawing forward. Stroke index === step index, which the animation
 * uses to decide what wags (tail) and what flaps (fin).
 */
export const TEMPLATES: Record<TemplateId, GuideStep[]> = {
  fish: [
    {
      part: "body",
      guide:
        "M300 500 C300 320 520 300 700 380 C800 420 840 470 840 500 C840 530 800 580 700 620 C520 700 300 680 300 500 Z",
    },
    { part: "tail", guide: "M310 500 L140 370 Q170 500 140 630 Z" },
    { part: "fin", guide: "M470 360 Q540 220 660 365" },
    { part: "pattern", guide: "M520 420 Q545 500 520 580 M620 410 Q645 500 620 590" },
  ],
};

export interface Stroke {
  by: string;
  avatar: Avatar;
  /** index into CRAYONS */
  color: number;
  /** flattened [x0, y0, x1, y1, ...] integers in 0..1000 */
  pts: number[];
}

export interface Drawing {
  id: string;
  template: TemplateId;
  step: number;
  strokes: Stroke[];
  /** player id whose turn it is; null means anyone may draw */
  turn: string | null;
}

export interface Creation {
  id: string;
  template: TemplateId;
  strokes: Stroke[];
  artists: Avatar[];
  completedAt: number;
}

export function newDrawing(id: string): Drawing {
  return { id, template: "fish", step: 0, strokes: [], turn: null };
}

export function stepCount(d: Pick<Drawing, "template">): number {
  return TEMPLATES[d.template].length;
}

/**
 * Turn rule used by both sides: the named player draws next, unless they are
 * offline (or it is them asking). Nobody ever waits on someone who isn't here.
 */
export function canDraw(d: Drawing, pid: string, online: OnlinePlayer[]): boolean {
  if (d.turn === null || d.turn === pid) return true;
  return !online.some((p) => p.pid === d.turn);
}

/** After `pid` draws, hand the turn to the next online player in join order. */
export function nextTurn(pid: string, online: OnlinePlayer[]): string | null {
  const others = online.filter((p) => p.pid !== pid);
  if (others.length === 0) return null;
  const idx = online.findIndex((p) => p.pid === pid);
  for (let i = 1; i <= online.length; i++) {
    const cand = online[(idx + i + online.length) % online.length];
    if (cand && cand.pid !== pid) return cand.pid;
  }
  return others[0].pid;
}

export function validStroke(color: unknown, pts: unknown): pts is number[] {
  if (!Number.isInteger(color) || (color as number) < 0 || (color as number) >= CRAYONS.length) return false;
  if (!Array.isArray(pts) || pts.length < 2 || pts.length > MAX_POINTS * 2 || pts.length % 2 !== 0) return false;
  for (const v of pts) if (!Number.isInteger(v) || v < 0 || v > CANVAS) return false;
  return true;
}

/** Drop points closer than `minGap` and cap the count, keeping the last point. */
export function simplify(points: number[], minGap = 8, max = MAX_POINTS): number[] {
  const out: number[] = [];
  let lx = -1e9;
  let ly = -1e9;
  for (let i = 0; i < points.length; i += 2) {
    const x = points[i];
    const y = points[i + 1];
    if (Math.hypot(x - lx, y - ly) >= minGap || i === points.length - 2) {
      out.push(x, y);
      lx = x;
      ly = y;
    }
  }
  if (out.length / 2 <= max) return out;
  const n = out.length / 2;
  const res: number[] = [];
  for (let k = 0; k < max; k++) {
    const j = Math.round((k * (n - 1)) / (max - 1));
    res.push(out[j * 2], out[j * 2 + 1]);
  }
  return res;
}

/** Smooth SVG path through stroke points (quadratic midpoints). */
export function strokePath(pts: number[]): string {
  if (pts.length === 2 || (pts.length === 4 && pts[0] === pts[2] && pts[1] === pts[3])) {
    const [x, y] = pts;
    return `M${x} ${y} L${x + 0.1} ${y}`;
  }
  let d = `M${pts[0]} ${pts[1]}`;
  for (let i = 2; i < pts.length - 2; i += 2) {
    const mx = (pts[i] + pts[i + 2]) / 2;
    const my = (pts[i + 1] + pts[i + 3]) / 2;
    d += ` Q${pts[i]} ${pts[i + 1]} ${mx} ${my}`;
  }
  d += ` L${pts[pts.length - 2]} ${pts[pts.length - 1]}`;
  return d;
}

export function bbox(pts: number[]) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    minX = Math.min(minX, pts[i]);
    maxX = Math.max(maxX, pts[i]);
    minY = Math.min(minY, pts[i + 1]);
    maxY = Math.max(maxY, pts[i + 1]);
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}
