import { formatTossValue, TOSS_LABELS } from "./constants";
import type {
  DerivedMatchState,
  MatchPhase,
  PlayerSlot,
  TossValue,
} from "./state";

export const TOSS_OPTIONS: Array<{
  value: TossValue;
  label: string;
  tone: string;
}> = [
  { value: 3, label: "stick", tone: "bg-emerald-400 text-black" },
  { value: 2, label: "back wall", tone: "bg-sky-400 text-black" },
  { value: 1, label: "in garden", tone: "bg-lime-300 text-black" },
  { value: 0, label: "front wall", tone: "bg-zinc-600 text-white" },
  { value: -2, label: "outside", tone: "bg-red-500 text-white" },
];

export type NextAction = {
  player: PlayerSlot | null;
  phase: MatchPhase;
  prompt: string;
  detail: string;
};

export function getNextAction(
  state: DerivedMatchState,
  playerNames: Record<PlayerSlot, string>,
): NextAction {
  if (state.isComplete) {
    return {
      player: null,
      phase: state.currentPhase,
      prompt: "Match complete",
      detail: state.winnerSlot
        ? `${playerNames[state.winnerSlot]} wins`
        : "Winner pending",
    };
  }

  const player = state.nextToToss;

  if (!player) {
    return {
      player,
      phase: state.currentPhase,
      prompt: "No legal toss",
      detail: "The state machine could not find the next player.",
    };
  }

  if (state.currentPhase === "regulation") {
    return {
      player,
      phase: state.currentPhase,
      prompt: `${playerNames[player]} to toss`,
      detail: `Inning ${state.inningNumber}`,
    };
  }

  if (state.currentPhase === "redemption") {
    return {
      player,
      phase: state.currentPhase,
      prompt: `${playerNames[player]} gets a redemption shot`,
      detail: "Hit 15 to force overtime. Anything else ends it.",
    };
  }

  if (state.currentPhase === "overtime") {
    const thrown = player === 1 ? state.overtime.p1Tosses : state.overtime.p2Tosses;

    return {
      player,
      phase: state.currentPhase,
      prompt: `${playerNames[player]} overtime throw ${thrown + 1} of 3`,
      detail: "Three throws each. High total wins.",
    };
  }

  return {
    player,
    phase: state.currentPhase,
    prompt: `${playerNames[player]} sudden death`,
    detail: "Stick a 3 and hope it is not matched.",
  };
}

export function formatTossOption(value: TossValue) {
  return `${formatTossValue(value)} ${TOSS_LABELS[value]}`;
}
