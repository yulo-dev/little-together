import { useEffect, useState } from "react";
import { AVATARS, formatCode, isValidCode, normalizeCode, type Avatar } from "../../shared/protocol";
import { Animal } from "../components/Animal";
import { PlantArt } from "../components/PlantArt";
import { Scene } from "../components/Scene";
import { Butterfly } from "../components/Visitors";
import { setLang, useT } from "../i18n";

function LangToggle() {
  const { t, lang } = useT();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "zh" ? "en" : "zh")}
      className="btn-ghost absolute right-4 top-4 z-10 text-sm"
      aria-label={t.language}
    >
      {t.language}
    </button>
  );
}

export function Welcome({ onCreate, onJoin }: { onCreate: () => Promise<void>; onJoin: () => void }) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      await onCreate();
    } catch (e) {
      setError(e instanceof Error && e.message === "rate_limited" ? t.rateLimited : t.networkError);
      setBusy(false);
    }
  };

  return (
    <Scene horizon="30%">
      <LangToggle />
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center px-6 pb-10 pt-14 text-center">
        <h1 className="font-display text-[2.75rem] font-semibold leading-none text-[#4A3B33] sm:text-6xl">
          Little Together
        </h1>
        <p className="mt-3 text-lg text-[#4A3B33]">{t.tagline}</p>

        {/* a tiny garden that grows itself on the welcome screen */}
        <div className="relative my-6 flex h-44 items-end justify-center gap-1" aria-hidden="true">
          <div className="hero-plant h-28 w-24" style={{ animationDelay: "0.1s" }}>
            <PlantArt stage={4} plant="pink" />
          </div>
          <div className="hero-plant -mb-2 h-36 w-28" style={{ animationDelay: "0.35s" }}>
            <PlantArt stage={4} plant="sun" />
          </div>
          <div className="hero-plant h-28 w-24" style={{ animationDelay: "0.6s" }}>
            <PlantArt stage={4} plant="sky" />
          </div>
          <div className="wander-a absolute -top-2 left-0">
            <Butterfly size={46} />
          </div>
          <div className="absolute -bottom-4 -left-6 rounded-full border-[3px] border-[#4A3B33] bg-[#FFFDF7]">
            <Animal kind="bunny" size={52} />
          </div>
          <div className="absolute -bottom-4 -right-6 rounded-full border-[3px] border-[#4A3B33] bg-[#FFFDF7]">
            <Animal kind="bear" size={52} />
          </div>
        </div>

        <div className="mt-6 flex w-full flex-col gap-3">
          <button
            type="button"
            className="btn-primary h-16 text-xl"
            onClick={create}
            disabled={busy}
            data-testid="create-garden"
          >
            {busy ? t.creating : t.create}
          </button>
          <button type="button" className="btn-secondary h-16 text-xl" onClick={onJoin} data-testid="join-garden">
            {t.join}
          </button>
          {error && (
            <p className="text-sm text-[#B4473F]" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="card mt-8 p-5 text-left">
          <p className="text-[15px] leading-relaxed text-[#4A3B33]">{t.intro}</p>
          <p className="mt-3 text-xs text-[#6B5A4E]">{t.privacy}</p>
        </div>
      </div>
    </Scene>
  );
}

/** Join screen: code (prefilled from an invite link) plus an animal. No typing a name. */
export function Join({
  initialCode,
  lockedCode,
  initialError,
  onJoin,
  onBack,
}: {
  initialCode: string;
  lockedCode: boolean;
  initialError?: "missing" | null;
  onJoin: (code: string, avatar: Avatar) => Promise<void>;
  onBack: () => void;
}) {
  const { t } = useT();
  const [code, setCode] = useState(initialCode ? formatCode(initialCode) : "");
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [error, setError] = useState<string | null>(initialError === "missing" ? t.roomMissing : null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initialError === "missing") setError(t.roomMissing);
  }, [initialError, t]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = normalizeCode(code);
    if (!isValidCode(c)) return setError(t.invalidCode);
    if (!avatar) return;
    setBusy(true);
    setError(null);
    try {
      await onJoin(c, avatar);
    } catch (err) {
      const m = err instanceof Error ? err.message : "";
      setError(m === "missing" ? t.roomMissing : m === "rate_limited" ? t.rateLimited : t.networkError);
      setBusy(false);
    }
  };

  return (
    <Scene calm>
      <LangToggle />
      <form onSubmit={submit} className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-5 py-16">
        <div className="card p-5">
          <label htmlFor="code" className="mb-2 block text-sm text-[#6B5A4E]">
            {t.roomCode}
          </label>
          <input
            id="code"
            data-testid="code-input"
            value={code}
            readOnly={lockedCode}
            onChange={(e) => {
              const n = normalizeCode(e.target.value).slice(0, 8);
              setCode(n.length > 4 ? `${n.slice(0, 4)}-${n.slice(4)}` : n);
              setError(null);
            }}
            placeholder={t.codePlaceholder}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
            className="h-16 w-full rounded-2xl border-[3px] border-[#4A3B33] bg-[#FFFDF7] px-4 text-center font-display text-3xl tracking-[0.12em] text-[#4A3B33] outline-none placeholder:text-lg placeholder:tracking-normal placeholder:text-[#B3A396] focus-visible:ring-4 focus-visible:ring-[#FFD45C] read-only:bg-[#FFF6E3]"
          />
        </div>

        <fieldset className="card p-5">
          <legend className="sr-only">{t.pickAnimal}</legend>
          <p className="mb-3 text-center font-display text-2xl text-[#4A3B33]" aria-hidden="true">
            {t.pickAnimal}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {AVATARS.map((a) => (
              <button
                type="button"
                key={a}
                data-testid={`avatar-${a}`}
                aria-pressed={avatar === a}
                aria-label={t.animals[a]}
                onClick={() => setAvatar(a)}
                className={`flex aspect-square flex-col items-center justify-center rounded-3xl border-[3px] transition-transform focus-visible:ring-4 focus-visible:ring-[#FFD45C] ${
                  avatar === a
                    ? "scale-105 border-[#3E7D4F] bg-[#E3F3DA] shadow-[0_4px_0_#3E7D4F]"
                    : "border-[#4A3B33]/25 bg-[#FFFDF7] active:scale-95"
                }`}
              >
                <Animal kind={a} size={64} className={avatar === a ? "hop-once" : ""} />
                <span className="mt-1 text-xs text-[#6B5A4E]">{t.animals[a]}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p
            className="rounded-2xl bg-[#FFE3E0] px-4 py-3 text-sm text-[#8E2F28]"
            role="alert"
            data-testid="join-error"
          >
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary h-16 text-xl" disabled={!avatar || busy} data-testid="join-submit">
          {busy ? t.joining : t.enter}
        </button>
        <button type="button" className="btn-ghost" onClick={onBack}>
          {t.back}
        </button>
      </form>
    </Scene>
  );
}
