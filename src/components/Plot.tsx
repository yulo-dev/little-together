import { memo } from "react";
import { ACTION_FOR_STAGE, BLOOMED, type Avatar, type Plot as PlotT } from "../../shared/protocol";
import { useT } from "../i18n";
import { Animal } from "./Animal";
import { ACTION_ICON, Heart, SeedBag, Sun, WateringCan } from "./Icons";
import { PlantArt } from "./PlantArt";

export type PlotFxKind = "plant" | "water" | "sun" | "bloom" | "dance" | "shake" | "shared";
export interface PlotFx {
  kind: PlotFxKind;
  key: number;
  avatar?: Avatar;
}

interface Props {
  plot: PlotT;
  fx?: PlotFx;
  disabled: boolean;
  onTap: (plot: PlotT) => void;
}

export const Plot = memo(function Plot({ plot, fx, disabled, onTap }: Props) {
  const { t } = useT();
  const action = ACTION_FOR_STAGE[plot.stage];
  const Cue = ACTION_ICON[action];
  const bloomed = plot.stage === BLOOMED;

  return (
    <button
      type="button"
      data-testid={`plot-${plot.id}`}
      data-stage={plot.stage}
      aria-label={t.plotLabel(plot.id, t.actions[action])}
      onClick={() => onTap(plot)}
      className={`plot group relative aspect-[3/4] w-full touch-manipulation select-none rounded-[2rem] outline-none focus-visible:ring-4 focus-visible:ring-[#FFD45C] ${
        disabled ? "opacity-80" : ""
      }`}
    >
      <div
        key={fx?.kind === "dance" || fx?.kind === "shake" ? fx.key : undefined}
        className={`absolute inset-x-[2%] bottom-0 top-[30%] ${
          fx?.kind === "dance" ? "wiggle" : fx?.kind === "shake" ? "shake" : "press"
        }`}
      >
        <PlantArt stage={plot.stage} plant={plot.plant} />
      </div>

      {/* next-action cue: big, bouncing, tells a pre-reader what tapping will do */}
      <span
        className={`cue absolute grid place-items-center rounded-full border-[3px] border-[#4A3B33] bg-[#FFFDF7] shadow-[0_4px_0_#4A3B33] ${
          bloomed ? "right-0 top-[8%] h-10 w-10 opacity-85" : "nudge left-1/2 top-0 h-14 w-14 -translate-x-1/2"
        }`}
        style={{ animationDelay: `${plot.id * 0.15}s` }}
      >
        <Cue size={bloomed ? 26 : 36} />
      </span>

      {fx && <ToolFx key={fx.key} fx={fx} />}
    </button>
  );
});

function ToolFx({ fx }: { fx: PlotFx }) {
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden="true">
      {fx.kind === "plant" && (
        <span className="drop-seed absolute left-1/2 top-[30%] -translate-x-1/2">
          <SeedBag size={48} />
        </span>
      )}
      {fx.kind === "water" && (
        <>
          <span className="tip-can absolute left-[8%] top-[18%]">
            <WateringCan size={56} />
          </span>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="raindrop absolute top-[40%] h-3 w-2 rounded-full bg-[#5BA8DC]"
              style={{ left: `${44 + i * 6}%`, animationDelay: `${i * 0.08}s` }}
            />
          ))}
        </>
      )}
      {fx.kind === "sun" && (
        <span className="sun-glow absolute left-1/2 top-[14%] -translate-x-1/2">
          <Sun size={72} />
        </span>
      )}
      {(fx.kind === "bloom" || fx.kind === "shared") && <Burst />}
      {fx.kind === "shared" && (
        <span className="twin absolute left-1/2 top-[6%] flex -translate-x-1/2 gap-1">
          <Heart size={34} />
          <Heart size={34} fill="#F7A8B8" />
        </span>
      )}
      {fx.avatar && fx.kind !== "shake" && (
        <span className="badge absolute bottom-[4%] right-[2%] rounded-full border-[3px] border-[#4A3B33] bg-[#FFFDF7]">
          <Animal kind={fx.avatar} size={40} />
        </span>
      )}
    </span>
  );
}

const BURST = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2;
  return { x: Math.cos(a) * 70, y: Math.sin(a) * 70 - 20, star: i % 2 === 0 };
});

function Burst() {
  return (
    <span className="absolute left-1/2 top-[40%]">
      {BURST.map((p, i) => (
        <span
          key={i}
          className="spark absolute"
          style={{ "--x": `${p.x}px`, "--y": `${p.y}px` } as React.CSSProperties}
        >
          {p.star ? (
            <svg width="18" height="18" viewBox="0 0 20 20">
              <path
                d="M10 1 L12.5 7.5 L19 10 L12.5 12.5 L10 19 L7.5 12.5 L1 10 L7.5 7.5 Z"
                fill="#FFD45C"
                stroke="#4A3B33"
                strokeWidth="1.5"
              />
            </svg>
          ) : (
            <Heart size={16} fill="#F7A8B8" />
          )}
        </span>
      ))}
    </span>
  );
}
