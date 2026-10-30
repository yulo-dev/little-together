// Tiny synthesized sound effects (no audio files to download).
import { useSyncExternalStore } from "react";
import { load, save } from "./storage";

let muted = load<boolean>("lt:muted", false);
const subs = new Set<() => void>();
let ctx: AudioContext | null = null;

export function setMuted(m: boolean) {
  muted = m;
  save("lt:muted", m);
  subs.forEach((f) => f());
}

export function useMuted() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => muted,
  );
}

function audio(): AudioContext | null {
  if (muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.12, slideTo?: number) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  plant: () => tone(330, 0, 0.18, "triangle", 0.15, 180),
  water: () => [0, 0.09, 0.18].forEach((s, i) => tone(900 - i * 120, s, 0.12, "sine", 0.08, 500)),
  sun: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.35, "sine", 0.08)),
  bloom: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.5, "triangle", 0.09)),
  dance: () => [784, 988, 784].forEach((f, i) => tone(f, i * 0.1, 0.15, "square", 0.03)),
  heart: () => [660, 880].forEach((f, i) => tone(f, i * 0.12, 0.3, "sine", 0.1)),
  visitor: () => [1047, 1175, 1319, 1568].forEach((f, i) => tone(f, i * 0.1, 0.3, "triangle", 0.07)),
  join: () => tone(440, 0, 0.25, "sine", 0.08, 660),
};
