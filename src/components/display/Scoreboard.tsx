import { ConnectionDot } from "./ConnectionDot";
import { FitText } from "./FitText";
import { formatTossValue, TOSS_LABELS } from "@/lib/match/constants";
import type { DisplayMatch, DisplayToss } from "@/lib/match/demo";
import type { DerivedMatchState, PlayerSlot } from "@/lib/match/state";

type ScoreboardProps = {
  match: DisplayMatch;
  state: DerivedMatchState;
  lastToss: DisplayToss | null;
  source?: "supabase" | "demo";
};

const PHASE_LABELS: Record<DerivedMatchState["currentPhase"], string> = {
  regulation: "regulation",
  redemption: "redemption",
  overtime: "overtime",
  sudden_death: "sudden death",
};

export function Scoreboard({
  match,
  state,
  lastToss,
  source = "supabase",
}: ScoreboardProps) {
  const playerNames = {
    1: match.player1_name,
    2: match.player2_name,
  };

  if (state.isComplete && state.winnerSlot) {
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
        <ConnectionDot status="live" />
      </header>

      <section className="grid min-h-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-[3vw] py-[4vmin]">
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
        "relative min-w-0 border-white/10 py-[2vmin]",
        isRight ? "text-right" : "text-left",
        isUpNext
          ? "border-sky-300/70 text-white"
          : "border-transparent text-zinc-200",
        isRight ? "border-r-[0.8vmin] pr-[2vw]" : "border-l-[0.8vmin] pl-[2vw]",
      ].join(" ")}
    >
      <FitText
        className="h-[11vmin] font-black"
        minFontSize={24}
        maxFontSize={120}
      >
        {name}
      </FitText>
      <div className="score-nums mt-[2vmin] text-[clamp(9rem,20vw,26rem)] font-black leading-[0.8]">
        {score}
      </div>
      <div
        className={[
          "mt-[2vmin] text-display-label font-semibold uppercase",
          isUpNext ? "text-sky-300" : "text-transparent",
        ].join(" ")}
      >
        Up next
      </div>
    </article>
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
    <main className="flex h-full flex-col items-center justify-center text-center">
      <p className="text-display-label font-semibold uppercase text-sky-300">
        Winner
      </p>
      <FitText className="mt-[2vmin] h-[14vmin] w-full font-black" maxFontSize={180}>
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
