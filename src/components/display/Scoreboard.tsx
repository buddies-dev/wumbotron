"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ConnectionDot } from "./ConnectionDot";
import type { ConnectionStatus } from "./ConnectionDot";
import { FitText } from "./FitText";
import { formatTossValue, TOSS_LABELS } from "@/lib/match/constants";
import type { DisplayMatch, DisplayToss } from "@/lib/match/demo";
import type { DerivedMatchState, PlayerSlot } from "@/lib/match/state";

type ScoreboardProps = {
  match: DisplayMatch;
  state: DerivedMatchState;
  lastToss: DisplayToss | null;
  connectionStatus?: ConnectionStatus;
  source?: "supabase" | "demo";
};

const PHASE_LABELS: Record<DerivedMatchState["currentPhase"], string> = {
  regulation: "regulation",
  redemption: "redemption",
  overtime: "overtime",
  sudden_death: "sudden death",
};

const HEADSHOT_PLACEHOLDER_SRC =
  "/player-placeholder.png";

export function Scoreboard({
  match,
  state,
  lastToss,
  connectionStatus = "live",
  source = "supabase",
}: ScoreboardProps) {
  const [showWinner, setShowWinner] = useState(false);
  const [phaseBanner, setPhaseBanner] = useState<string | null>(null);
  const previousPhaseRef = useRef<DerivedMatchState["currentPhase"] | null>(null);
  const playerNames = useMemo(() => ({
    1: match.player1_name,
    2: match.player2_name,
  }), [match.player1_name, match.player2_name]);

  useEffect(() => {
    const previousPhase = previousPhaseRef.current;
    previousPhaseRef.current = state.currentPhase;

    if (!previousPhase || previousPhase === state.currentPhase) {
      return;
    }

    let nextBanner: string | null = null;

    if (state.currentPhase === "redemption") {
      const redemptionPlayer = state.nextToToss
        ? playerNames[state.nextToToss]
        : "Redemption";

      nextBanner = `Redemption shot - ${redemptionPlayer}`;
    }

    if (state.currentPhase === "overtime") {
      nextBanner = "Overtime";
    }

    if (state.currentPhase === "sudden_death") {
      nextBanner = "Sudden death";
    }

    if (!nextBanner) {
      return;
    }

    const showTimer = setTimeout(() => setPhaseBanner(nextBanner), 0);
    const hideTimer = setTimeout(() => setPhaseBanner(null), 3000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [playerNames, state.currentPhase, state.nextToToss]);

  useEffect(() => {
    if (!state.isComplete) {
      const resetTimer = setTimeout(() => setShowWinner(false), 0);
      return () => clearTimeout(resetTimer);
    }

    const timer = setTimeout(() => setShowWinner(true), 2000);

    return () => clearTimeout(timer);
  }, [state.isComplete, state.winnerSlot]);

  if (showWinner && state.winnerSlot) {
    return (
      <WinnerView
        match={match}
        state={state}
        winnerName={playerNames[state.winnerSlot]}
      />
    );
  }

  return (
    <main className="relative flex h-full flex-col justify-between">
      <BroadcastOverlays
        lastToss={lastToss}
        playerNames={playerNames}
        phaseBanner={phaseBanner}
      />
      <header className="flex items-start justify-between gap-[4vw]">
        <div className="text-display-label font-semibold uppercase text-zinc-300">
          Inning <span className="score-nums">{state.inningNumber}</span>
          <span className="px-[1vmin] text-zinc-600">·</span>
          <span className="text-sky-300">
            {PHASE_LABELS[state.currentPhase]}
          </span>
          {source === "demo" ? (
            <span className="ml-[1vmin] text-zinc-500">demo</span>
          ) : null}
        </div>
        <ConnectionDot status={connectionStatus} />
      </header>

      <section className="grid min-h-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-[3vw] py-[2vmin]">
        <PlayerPanel
          align="left"
          name={match.player1_name}
          score={state.p1Score}
          isUpNext={state.nextToToss === 1}
        />

        <div className="text-display-label font-black uppercase text-zinc-600">
          vs
        </div>

        <PlayerPanel
          align="right"
          name={match.player2_name}
          score={state.p2Score}
          isUpNext={state.nextToToss === 2}
        />
      </section>

      <footer className="min-h-[7vmin] text-display-body text-zinc-300">
        {lastToss ? (
          <span>
            Last toss: {playerNames[lastToss.player_slot]} ·{" "}
            <span className="score-nums text-white">
              {formatTossValue(lastToss.value)}
            </span>{" "}
            {TOSS_LABELS[lastToss.value]}
          </span>
        ) : (
          <span>No tosses yet.</span>
        )}
      </footer>
    </main>
  );
}

function BroadcastOverlays({
  lastToss,
  playerNames,
  phaseBanner,
}: {
  lastToss: DisplayToss | null;
  playerNames: Record<PlayerSlot, string>;
  phaseBanner: string | null;
}) {
  const [stickToss, setStickToss] = useState<DisplayToss | null>(null);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!lastToss) {
      return;
    }

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (lastToss.value !== 3) {
      return;
    }

    const showTimer = setTimeout(() => setStickToss(lastToss), 0);
    const hideTimer = setTimeout(() => setStickToss(null), 1500);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [lastToss]);

  return (
    <>
      {phaseBanner ? (
        <div className="broadcast-in pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 rounded-md border border-amber-300/60 bg-amber-300 px-[2vmin] py-[1vmin] text-display-label font-black uppercase text-black shadow-[0_0_3rem_rgba(252,211,77,0.45)]">
          {phaseBanner}
        </div>
      ) : null}
      {stickToss ? (
        <div className="broadcast-in pointer-events-none absolute inset-x-0 top-[22%] z-20 mx-auto w-fit text-center">
          <div className="rounded-md border border-emerald-200/70 bg-emerald-300 px-[4vmin] py-[2vmin] text-black shadow-[0_0_4rem_rgba(110,231,183,0.45)]">
            <p className="text-[clamp(4rem,10vw,13rem)] font-black uppercase leading-none">
              Stick!
            </p>
            <p className="mt-[1vmin] text-display-label font-black uppercase">
              {playerNames[stickToss.player_slot]}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}

function PlayerPanel({
  align,
  name,
  score,
  isUpNext,
}: {
  align: "left" | "right";
  name: string;
  score: number;
  isUpNext: boolean;
}) {
  const isRight = align === "right";

  return (
    <article
      className={[
        "relative flex min-w-0 flex-col border-white/10 py-[2vmin]",
        isRight ? "text-right" : "text-left",
        isUpNext
          ? "border-sky-300/70 text-white"
          : "border-transparent text-zinc-200",
        isRight ? "border-r-[0.8vmin] pr-[2vw]" : "border-l-[0.8vmin] pl-[2vw]",
      ].join(" ")}
    >
      <HeadshotSlot name={name} isUpNext={isUpNext} align={align} />
      <div className="mt-[2vmin] min-w-0">
        <div className="score-nums text-[clamp(4rem,8vw,12rem)] font-black leading-[0.8]">
          <span key={score} className="score-pop">
            {score}
          </span>
        </div>
        <div
          className={[
            "mt-[2vmin] text-display-label font-semibold uppercase",
            isUpNext ? "text-sky-300" : "text-transparent",
          ].join(" ")}
        >
          Up next
        </div>
      </div>
    </article>
  );
}

function HeadshotSlot({
  name,
  isUpNext,
  align,
}: {
  name: string;
  isUpNext: boolean;
  align: "left" | "right";
}) {
  const isRight = align === "right";

  return (
    <div
      className={[
        "relative h-[min(32vw,52vmin)] w-[min(25.6vw,41.6vmin)] overflow-hidden rounded-md border bg-zinc-100",
        isRight ? "self-end" : "self-start",
        isUpNext
          ? "border-sky-300/80 shadow-[0_0_3.5rem_rgba(125,211,252,0.34)]"
          : "border-white/15",
      ].join(" ")}
      aria-label={`${name} headshot`}
    >
      <Image
        src={HEADSHOT_PLACEHOLDER_SRC}
        alt={`${name} headshot placeholder`}
        fill
        loading="eager"
        fetchPriority="high"
        sizes="(max-width: 900px) 38vw, 60vmin"
        className="object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-[1.5vmin] py-[1.2vmin]">
        <FitText
          className={[
            "h-[5vmin] w-full font-black text-white",
            isRight ? "text-right" : "text-left",
          ].join(" ")}
          minFontSize={16}
          maxFontSize={56}
        >
          {name}
        </FitText>
      </div>
    </div>
  );
}

function WinnerView({
  match,
  state,
  winnerName,
}: {
  match: DisplayMatch;
  state: DerivedMatchState;
  winnerName: string;
}) {
  const runnerUpSlot: PlayerSlot = state.winnerSlot === 1 ? 2 : 1;
  const runnerUpName =
    runnerUpSlot === 1 ? match.player1_name : match.player2_name;
  const runnerUpScore = runnerUpSlot === 1 ? state.p1Score : state.p2Score;
  const winnerScore = state.winnerSlot === 1 ? state.p1Score : state.p2Score;

  return (
    <main className="winner-rise relative flex h-full flex-col items-center justify-center overflow-hidden text-center">
      <div className="champion-glow absolute inset-x-[10%] top-1/2 h-[1vmin] rounded-full bg-sky-300/70 blur-xl" />
      <p className="text-display-label font-semibold uppercase text-sky-300">
        Winner
      </p>
      <FitText
        className="mt-[2vmin] h-[14vmin] w-full font-black"
        maxFontSize={180}
      >
        {winnerName}
      </FitText>
      <div className="score-nums mt-[4vmin] text-[clamp(5rem,10vw,12rem)] font-black leading-none">
        {winnerScore}
        <span className="mx-[2vw] text-[0.35em] text-zinc-500">-</span>
        {runnerUpScore}
      </div>
      <p className="mt-[3vmin] text-display-body text-zinc-300">
        {runnerUpName}
      </p>
    </main>
  );
}
