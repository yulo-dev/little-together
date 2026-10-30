import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientMsg, GardenEvent, GardenState, OnlinePlayer, ServerMsg, Stage } from "../../shared/protocol";
import { newId, saveProfile, type Profile } from "./storage";

export type Status = "connecting" | "open" | "reconnecting" | "gone";

export type RoomFx =
  | { kind: "event"; event: GardenEvent; mine: boolean }
  | { kind: "heart"; avatar: string }
  | { kind: "dance"; plotId: number; avatar: string };

const PING_MS = 20_000;
const DEAD_MS = 45_000;

/**
 * Keeps one WebSocket to the room's Durable Object open, reconnecting with
 * backoff. The server is authoritative: the hook never edits garden state
 * locally, it only renders snapshots the server sends.
 */
export function useRoom(code: string, profile: Profile, onFx: (fx: RoomFx) => void) {
  const [status, setStatus] = useState<Status>("connecting");
  const [garden, setGarden] = useState<GardenState | null>(null);
  const [online, setOnline] = useState<OnlinePlayer[]>([]);
  const [missed, setMissed] = useState<GardenEvent[] | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const fxRef = useRef(onFx);
  fxRef.current = onFx;
  const myAids = useRef(new Set<string>());
  const profileRef = useRef(profile);

  const remember = useCallback(
    (s: GardenState) => {
      profileRef.current = { ...profileRef.current, lastSeen: s.version };
      saveProfile(code, profileRef.current);
    },
    [code],
  );

  useEffect(() => {
    let stopped = false;
    let attempt = 0;
    let firstWelcome = true;
    let retryTimer: number | undefined;
    let pingTimer: number | undefined;
    let lastMsg = Date.now();

    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${location.host}/api/rooms/${code}/ws`;

    const connect = () => {
      if (stopped) return;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
        lastMsg = Date.now();
        const p = profileRef.current;
        send({ t: "hello", pid: p.pid, avatar: p.avatar, lastSeen: p.lastSeen });
        pingTimer = window.setInterval(() => {
          if (Date.now() - lastMsg > DEAD_MS) drop();
          else if (ws.readyState === WebSocket.OPEN) ws.send("ping");
        }, PING_MS);
      };

      ws.onmessage = (e) => {
        if (wsRef.current !== ws) return;
        lastMsg = Date.now();
        if (e.data === "pong") return;
        let msg: ServerMsg;
        try {
          msg = JSON.parse(e.data);
        } catch {
          return;
        }
        switch (msg.t) {
          case "welcome":
            setStatus("open");
            setGarden(msg.state);
            setOnline(msg.online);
            if (firstWelcome) {
              firstWelcome = false;
              setMissed(msg.missed.length ? msg.missed : null);
            }
            remember(msg.state);
            break;
          case "state": {
            setGarden(msg.state);
            remember(msg.state);
            const mine = myAids.current.delete(msg.aid);
            fxRef.current({ kind: "event", event: msg.event, mine });
            break;
          }
          case "reject":
            myAids.current.delete(msg.aid);
            setGarden(msg.state);
            break;
          case "presence":
            setOnline(msg.online);
            break;
          case "fx":
            if (msg.kind === "heart") fxRef.current({ kind: "heart", avatar: msg.avatar });
            else if (msg.plotId != null) fxRef.current({ kind: "dance", plotId: msg.plotId, avatar: msg.avatar });
            break;
        }
      };

      ws.onclose = () => {
        if (wsRef.current === ws) handleClose();
      };
      ws.onerror = () => ws.close();
    };

    const handleClose = () => {
      window.clearInterval(pingTimer);
      window.clearTimeout(retryTimer);
      if (stopped) return;
      attempt += 1;
      setStatus("reconnecting");
      // After a few failures, check whether the room still exists at all.
      if (attempt === 4) {
        fetch(`/api/rooms/${code}`)
          .then((r) => r.json())
          .then((j: { exists?: boolean }) => {
            if (j.exists === false) {
              stopped = true;
              setStatus("gone");
            }
          })
          .catch(() => {});
      }
      const delay = Math.min(8000, 400 * 2 ** Math.min(attempt, 5)) * (0.75 + Math.random() * 0.5);
      retryTimer = window.setTimeout(connect, delay);
    };

    // Drop a socket without waiting for a close handshake that may never come.
    const drop = () => {
      const ws = wsRef.current;
      if (!ws) return;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      handleClose();
    };

    const onOnline = () => {
      // Network came back: skip the remaining backoff.
      const rs = wsRef.current?.readyState;
      if (rs === WebSocket.OPEN || rs === WebSocket.CONNECTING) return;
      window.clearTimeout(retryTimer);
      attempt = 0;
      connect();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && wsRef.current?.readyState === WebSocket.CLOSED) onOnline();
    };

    // The OS knows the network dropped before the socket does; show it right away.
    const onOffline = () => drop();

    connect();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearTimeout(retryTimer);
      window.clearInterval(pingTimer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
      wsRef.current?.close();
    };
  }, [code, remember]);

  const send = (msg: ClientMsg) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  };

  const act = useCallback((plotId: number, from: Stage) => {
    const aid = newId();
    myAids.current.add(aid);
    if (!send({ t: "act", aid, plotId, from })) {
      myAids.current.delete(aid);
      return false;
    }
    return true;
  }, []);

  const heart = useCallback(() => send({ t: "heart" }), []);
  const dance = useCallback((plotId: number) => send({ t: "dance", plotId }), []);
  const newSeason = useCallback(() => {
    const aid = newId();
    myAids.current.add(aid);
    return send({ t: "season", aid });
  }, []);

  return { status, garden, online, missed, clearMissed: () => setMissed(null), act, heart, dance, newSeason };
}
