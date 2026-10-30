import type { OnlinePlayer, Phase } from "../../shared/protocol";
import { useT } from "../i18n";
import { clockFor, phaseFor, useNow } from "../lib/time";
import { Animal } from "./Animal";

const INK = "#4A3B33";

/**
 * A player's animal with a small sun or moon showing what time it is where
 * they are. A child can see at a glance that it's bedtime on the other side.
 */
export function PlayerAvatar({ player, size = 40 }: { player: OnlinePlayer; size?: number }) {
  const { t, lang } = useT();
  const now = useNow();
  const phase = phaseFor(player.utcOffset, now);
  const label =
    player.utcOffset == null
      ? t.animals[player.avatar]
      : `${t.animals[player.avatar]}, ${clockFor(player.utcOffset, now, lang)}, ${t.phases[phase!]}`;
  return (
    <span className="relative inline-block" data-phase={phase ?? undefined} title={label} aria-label={label} role="img">
      <Animal kind={player.avatar} size={size} />
      {phase && (
        <span
          className="absolute -bottom-1 -right-1.5 rounded-full border-2 border-[#4A3B33]"
          style={{ width: size * 0.48, height: size * 0.48 }}
          data-testid="phase-badge"
        >
          <PhaseIcon phase={phase} />
        </span>
      )}
    </span>
  );
}

export function PhaseIcon({ phase }: { phase: Phase }) {
  const bg = { dawn: "#FBE3CC", day: "#BFE3F2", dusk: "#F7C9A0", night: "#2E3B66" }[phase];
  return (
    <svg viewBox="0 0 24 24" className="block h-full w-full rounded-full" aria-hidden="true">
      <circle cx={12} cy={12} r={12} fill={bg} />
      {phase === "day" && (
        <>
          <circle cx={12} cy={12} r={5.5} fill="#FFD45C" stroke={INK} strokeWidth={1.2} />
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <rect
              key={a}
              x={11.3}
              y={2.5}
              width={1.4}
              height={3}
              rx={0.7}
              fill="#FFB938"
              transform={`rotate(${a} 12 12)`}
            />
          ))}
        </>
      )}
      {(phase === "dawn" || phase === "dusk") && (
        <>
          <path
            d="M5 16 A7 7 0 0 1 19 16 Z"
            fill={phase === "dawn" ? "#FFC46B" : "#F59A3E"}
            stroke={INK}
            strokeWidth={1.2}
          />
          <path d="M3 16 L21 16" stroke={INK} strokeWidth={1.4} strokeLinecap="round" />
        </>
      )}
      {phase === "night" && (
        <>
          <circle cx={11} cy={12} r={6.5} fill="#FFF1B8" />
          <circle cx={14} cy={10} r={5.5} fill={bg} />
          <circle cx={18} cy={6} r={1} fill="#FFF1B8" />
          <circle cx={17} cy={17} r={0.8} fill="#FFF1B8" />
        </>
      )}
    </svg>
  );
}

/** Avatar, name and that player's local clock, for the lobby. */
export function PlayerChip({ player }: { player: OnlinePlayer }) {
  const { t, lang } = useT();
  const now = useNow();
  return (
    <span className="flex items-center gap-2">
      <PlayerAvatar player={player} size={36} />
      <span className="flex flex-col leading-tight">
        <span className="text-sm text-[#4A3B33]">{t.animals[player.avatar]}</span>
        {player.utcOffset != null && (
          <span className="text-xs text-[#6B5A4E]" data-testid="player-clock">
            {clockFor(player.utcOffset, now, lang)}
          </span>
        )}
      </span>
    </span>
  );
}
