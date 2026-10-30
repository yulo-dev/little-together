import { useEffect, useState } from "react";
import { localTimeAt, phaseAtHour, type Phase } from "../../shared/protocol";

const PHASES: Phase[] = ["dawn", "day", "dusk", "night"];

/** Re-render periodically so suns set and moons rise while the page is open. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** `?sky=night` (or dawn/day/dusk) forces a sky, handy for demos and screenshots. */
function forcedPhase(): Phase | null {
  try {
    const v = new URLSearchParams(location.search).get("sky");
    return PHASES.includes(v as Phase) ? (v as Phase) : null;
  } catch {
    return null;
  }
}
const FORCED = forcedPhase();

/** This device's own time of day. */
export function useLocalPhase(): Phase {
  const now = useNow();
  return FORCED ?? phaseAtHour(new Date(now).getHours());
}

export function phaseFor(utcOffset: number | undefined, now: number): Phase | null {
  if (utcOffset == null) return null;
  return phaseAtHour(localTimeAt(utcOffset, now).hour);
}

export function clockFor(utcOffset: number, now: number, lang: "zh" | "en"): string {
  return new Date(now + utcOffset * 60_000).toLocaleTimeString(lang === "zh" ? "zh-TW" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}
