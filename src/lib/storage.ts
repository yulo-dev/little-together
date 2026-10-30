// localStorage holds only per-device conveniences (who am I in this room,
// sound, language). The garden itself always lives on the server.
import type { Avatar } from "../../shared/protocol";

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or storage full: fine to ignore */
  }
}

export interface Profile {
  pid: string;
  avatar: Avatar;
  lastSeen: number;
}

export const loadProfile = (code: string) => load<Profile | null>(`lt:room:${code}`, null);
export const saveProfile = (code: string, p: Profile) => save(`lt:room:${code}`, p);

export function newId(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}
