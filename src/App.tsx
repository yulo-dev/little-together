import { useEffect, useState } from "react";
import { isValidCode, normalizeCode, type Avatar } from "../shared/protocol";
import { Join, Welcome } from "./screens/Home";
import { RoomSession } from "./screens/Room";
import { loadProfile, newId, saveProfile, type Profile } from "./lib/storage";

type Route =
  | { name: "home" }
  | { name: "join"; code: string; locked: boolean; error?: "missing" | null }
  | { name: "room"; code: string; profile: Profile; lobby: boolean };

async function roomExists(code: string): Promise<boolean> {
  const r = await fetch(`/api/rooms/${code}`);
  if (r.status === 429) throw new Error("rate_limited");
  if (!r.ok) throw new Error("network");
  return ((await r.json()) as { exists: boolean }).exists;
}

function routeFromPath(): Route {
  const m = location.pathname.match(/^\/r\/([A-Za-z0-9-]+)\/?$/);
  if (m) {
    const code = normalizeCode(m[1]);
    if (isValidCode(code)) {
      const profile = loadProfile(code);
      // Returning on this device: straight back into the garden.
      if (profile) return { name: "room", code, profile, lobby: false };
      return { name: "join", code, locked: true };
    }
    return { name: "join", code: "", locked: false };
  }
  if (location.pathname === "/join") return { name: "join", code: "", locked: false };
  return { name: "home" };
}

export function App() {
  const [route, setRoute] = useState<Route>(routeFromPath);

  useEffect(() => {
    const onPop = () => setRoute(routeFromPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Invite links: confirm the garden exists before showing the animal picker.
  useEffect(() => {
    if (route.name === "join" && route.locked && route.error === undefined) {
      roomExists(route.code)
        .then((ok) => setRoute((r) => (r.name === "join" ? { ...r, locked: ok, error: ok ? null : "missing" } : r)))
        .catch(() => setRoute((r) => (r.name === "join" ? { ...r, error: null } : r)));
    }
  }, [route]);

  const go = (path: string, next: Route, replace = false) => {
    if (replace) history.replaceState(null, "", path);
    else history.pushState(null, "", path);
    setRoute(next);
  };

  const create = async () => {
    const r = await fetch("/api/rooms", { method: "POST" });
    if (r.status === 429) throw new Error("rate_limited");
    if (!r.ok) throw new Error("network");
    const { code } = (await r.json()) as { code: string };
    go(`/r/${code}`, { name: "join", code, locked: true, error: null });
  };

  const join = async (code: string, avatar: Avatar) => {
    if (!(await roomExists(code))) throw new Error("missing");
    const prev = loadProfile(code);
    const profile: Profile = { pid: prev?.pid ?? newId(), avatar, lastSeen: prev?.lastSeen ?? 0 };
    saveProfile(code, profile);
    go(`/r/${code}`, { name: "room", code, profile, lobby: true }, location.pathname === `/r/${code}`);
  };

  switch (route.name) {
    case "home":
      return <Welcome onCreate={create} onJoin={() => go("/join", { name: "join", code: "", locked: false })} />;
    case "join":
      return (
        <Join
          key={route.code}
          initialCode={route.code}
          lockedCode={route.locked}
          initialError={route.error}
          onJoin={join}
          onBack={() => go("/", { name: "home" })}
        />
      );
    case "room":
      return (
        <RoomSession
          key={route.code}
          code={route.code}
          profile={route.profile}
          startInLobby={route.lobby}
          onLeave={() => go("/", { name: "home" })}
        />
      );
  }
}
