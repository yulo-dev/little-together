// Magic Drawing: shared types, guided templates and validation.
import type { Avatar, OnlinePlayer } from "./protocol";

/** Drawings use a 1000x1000 coordinate space so they look the same on any screen. */
export const CANVAS = 1000;
export const MAX_POINTS = 80; // per stroke, after client-side simplification
export const CRAYONS = ["#F08A4B", "#5BA8DC", "#F2827F", "#6FB36A", "#C3A6F0", "#FFC93C"] as const;
export const GALLERY_LIMIT = 24;
export const POND_SIZE = 3; // fish shown swimming in the garden

export type TemplateId = "fish" | "bunny" | "butterfly";
export const TEMPLATE_IDS: TemplateId[] = ["fish", "bunny", "butterfly"];

export type Part = "body" | "tail" | "fin" | "pattern" | "head" | "ears" | "wingL" | "wingR" | "antennae";

export interface GuideStep {
  /** short key used for i18n and test ids */
  part: Part;
  /** dashed SVG path shown as a hint, in 1000x1000 space */
  guide: string;
}

/**
 * Fish facing right. One stroke completes each step, so a messy scribble still
 * moves the drawing forward. Stroke index === step index, which the animation
 * uses to decide what wags (tail) and what flaps (fin).
 */
export const TEMPLATES: Record<TemplateId, GuideStep[]> = {
  // Sitting bunny facing right: the ears stroke wiggles and the whole bunny hops.
  bunny: [
    {
      part: "body",
      guide:
        "M220 620 C220 470 330 420 460 430 C600 440 680 520 680 630 C680 760 560 820 440 815 C300 810 220 740 220 620 Z",
    },
    {
      part: "head",
      guide:
        "M500 380 C500 290 570 240 640 240 C720 240 780 300 780 380 C780 460 720 520 640 520 C560 520 500 460 500 380 Z",
    },
    {
      part: "ears",
      guide:
        "M590 255 C555 150 585 70 615 80 C650 95 650 190 625 250 M670 250 C680 140 730 80 760 100 C790 125 745 210 700 260",
    },
    { part: "tail", guide: "M170 640 C170 600 200 580 230 590 C265 600 270 650 245 675 C215 700 170 685 170 640 Z" },
  ],
  // Butterfly seen from above: each wing stroke flaps around the body.
  butterfly: [
    { part: "body", guide: "M500 300 L500 720" },
    {
      part: "wingL",
      guide:
        "M490 470 C380 260 180 250 190 420 C200 520 330 540 490 500 M490 525 C360 560 240 640 300 730 C360 790 460 680 490 560",
    },
    {
      part: "wingR",
      guide:
        "M510 470 C620 260 820 250 810 420 C800 520 670 540 510 500 M510 525 C640 560 760 640 700 730 C640 790 540 680 510 560",
    },
    { part: "antennae", guide: "M495 300 Q455 210 420 185 M505 300 Q545 210 580 185" },
  ],
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

export function newDrawing(id: string, template: TemplateId = "fish"): Drawing {
  return { id, template, step: 0, strokes: [], turn: null };
}

export function isTemplate(v: unknown): v is TemplateId {
  return typeof v === "string" && (TEMPLATE_IDS as string[]).includes(v);
}

/** Viewport framing each template, for small icons. */
export const TEMPLATE_VIEWBOX: Record<TemplateId, string> = {
  fish: "100 180 780 560",
  bunny: "130 40 700 800",
  butterfly: "150 150 700 660",
};

/** Keep the newest `n` creations of each template, oldest first. */
export function newestPerTemplate(list: Creation[], n: number): Creation[] {
  const counts = new Map<TemplateId, number>();
  const keep: Creation[] = [];
  for (let i = list.length - 1; i >= 0; i--) {
    const c = list[i];
    const k = counts.get(c.template) ?? 0;
    if (k < n) {
      keep.push(c);
      counts.set(c.template, k + 1);
    }
  }
  return keep.reverse();
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
