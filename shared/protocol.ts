import type { Creation, Drawing } from "./drawing";

// Shared types and pure game rules used by both the Worker and the browser client.

export const PLOT_COUNT = 6;
export const MAX_PLAYERS = 6;

/** 0 empty, 1 seeded, 2 sprout, 3 bud, 4 bloomed */
export type Stage = 0 | 1 | 2 | 3 | 4;
export const BLOOMED: Stage = 4;

export const AVATARS = ["bunny", "bear", "cat", "fox", "duck", "panda"] as const;
export type Avatar = (typeof AVATARS)[number];

export const PLANTS = ["pink", "sun", "violet", "rose", "sky", "peach"] as const;
export type Plant = (typeof PLANTS)[number];

/** Animal visitors unlock as the family grows more flowers in total. */
export const VISITORS = [
  { id: "butterfly", at: 3 },
  { id: "bee", at: 6 },
  { id: "bird", at: 10 },
] as const;
export type Visitor = (typeof VISITORS)[number]["id"];

export interface Plot {
  id: number;
  stage: Stage;
  plant: Plant | null;
  /** player ids who helped grow the current plant */
  helpers: string[];
  updatedBy: string | null;
  updatedAt: number;
}

export interface GardenState {
  version: number;
  plots: Plot[];
  bloomedTotal: number;
  season: number;
  visitors: Visitor[];
}

export type EventKind = "plant" | "water" | "sun" | "bloom" | "season" | "fish";

export interface GardenEvent {
  version: number;
  kind: EventKind;
  plotId: number | null;
  by: string; // player id
  avatar: Avatar;
  at: number;
  /** set when a bloom was grown by two or more different players */
  shared?: boolean;
  /** set when this action unlocked a new animal visitor */
  visitor?: Visitor;
}

export interface OnlinePlayer {
  pid: string;
  avatar: Avatar;
}

// ---------- client -> server ----------
export type ClientMsg =
  | { t: "hello"; pid: string; avatar: Avatar; lastSeen: number }
  | { t: "act"; aid: string; plotId: number; from: Stage }
  | { t: "dance"; plotId: number }
  | { t: "heart" }
  | { t: "season"; aid: string }
  | { t: "stroke"; aid: string; drawingId: string; step: number; color: number; pts: number[] }
  | { t: "gallery" };

// ---------- server -> client ----------
export type ServerMsg =
  | {
      t: "welcome";
      state: GardenState;
      online: OnlinePlayer[];
      /** events by other players since this player's last visit */
      missed: GardenEvent[];
      /** current shared drawing (absent from servers older than Magic Drawing) */
      drawing?: Drawing;
      /** the most recent finished creations, which live in the garden pond */
      recent?: Creation[];
    }
  | { t: "state"; state: GardenState; event: GardenEvent; aid: string }
  | { t: "presence"; online: OnlinePlayer[] }
  | { t: "reject"; aid: string; reason: string; state: GardenState }
  | { t: "fx"; kind: "heart" | "dance"; avatar: Avatar; plotId?: number }
  | { t: "error"; reason: string }
  | { t: "draw"; drawing: Drawing; aid: string }
  | { t: "drawReject"; aid: string; reason: string; drawing: Drawing }
  | { t: "drawDone"; creation: Creation; drawing: Drawing; aid: string }
  | { t: "gallery"; items: Creation[] };

// ---------- rules ----------
export type PlotAction = "plant" | "water" | "sun" | "bloom" | "dance";
export const ACTION_FOR_STAGE: Record<Stage, PlotAction> = {
  0: "plant",
  1: "water",
  2: "sun",
  3: "bloom",
  4: "dance",
};

export function emptyGarden(): GardenState {
  return {
    version: 0,
    plots: Array.from({ length: PLOT_COUNT }, (_, id) => ({
      id,
      stage: 0 as Stage,
      plant: null,
      helpers: [],
      updatedBy: null,
      updatedAt: 0,
    })),
    bloomedTotal: 0,
    season: 1,
    visitors: [],
  };
}

export function isAvatar(v: unknown): v is Avatar {
  return typeof v === "string" && (AVATARS as readonly string[]).includes(v);
}

// Room codes: 8 chars from an alphabet without look-alikes (no 0/O, 1/I/L).
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 8;

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidCode(code: string): boolean {
  if (code.length !== CODE_LENGTH) return false;
  for (const ch of code) if (!CODE_ALPHABET.includes(ch)) return false;
  return true;
}

export function formatCode(code: string): string {
  return code.length === CODE_LENGTH ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}
