export type PlayerSlot = 1 | 2;

export type MatchPhase =
  | "regulation"
  | "redemption"
  | "overtime"
  | "sudden_death";

export type MatchStatus = "active" | "complete";

export type TossValue = -2 | 0 | 1 | 2 | 3;

export type MatchRecord = {
  first_tosser: PlayerSlot;
  status?: MatchStatus;
  winner_slot?: PlayerSlot | null;
};

export type TossRecord = {
  player_slot: PlayerSlot;
  value: TossValue;
  inning_number?: number;
  order_in_inning?: number;
};

export type PhaseTossSummary = {
  p1Score: number;
  p2Score: number;
  p1Tosses: number;
  p2Tosses: number;
};

export type DerivedMatchState = {
  p1Score: number;
  p2Score: number;
  currentPhase: MatchPhase;
  nextToToss: PlayerSlot | null;
  isComplete: boolean;
  winnerSlot: PlayerSlot | null;
  inningNumber: number;
  tossesInCurrentInning: number;
  overtime: PhaseTossSummary;
  suddenDeath: PhaseTossSummary;
};

type Score = {
  1: number;
  2: number;
};

type PhaseTosses = {
  1: TossValue[];
  2: TossValue[];
};

const TARGET_SCORE = 15;
const OVERTIME_TOSSES_PER_PLAYER = 3;

export function deriveMatchState(
  match: MatchRecord,
  tosses: TossRecord[],
): DerivedMatchState {
  const regulationScore: Score = { 1: 0, 2: 0 };
  const overtimeTosses: PhaseTosses = { 1: [], 2: [] };
  const suddenDeathTosses: PhaseTosses = { 1: [], 2: [] };

  let phase: MatchPhase = "regulation";
  let firstToFifteen: PlayerSlot | null = null;
  let winnerSlot: PlayerSlot | null = null;
  let isComplete = false;
  let regulationTossCount = 0;
  let activePhaseTossCount = 0;

  for (const toss of tosses) {
    if (isComplete) {
      break;
    }

    if (phase === "regulation") {
      regulationTossCount += 1;
      activePhaseTossCount = regulationTossCount % 2;
      regulationScore[toss.player_slot] = applyRegulationToss(
        regulationScore[toss.player_slot],
        toss.value,
      );

      if (regulationScore[toss.player_slot] === TARGET_SCORE) {
        firstToFifteen = toss.player_slot;
        phase = "redemption";
        activePhaseTossCount = 0;
      }

      continue;
    }

    if (phase === "redemption") {
      activePhaseTossCount += 1;
      regulationScore[toss.player_slot] = applyRegulationToss(
        regulationScore[toss.player_slot],
        toss.value,
      );

      if (regulationScore[toss.player_slot] === TARGET_SCORE) {
        phase = "overtime";
        activePhaseTossCount = 0;
      } else if (isMiss(toss.value)) {
        isComplete = true;
        winnerSlot = firstToFifteen;
      }

      continue;
    }

    if (phase === "overtime") {
      activePhaseTossCount += 1;
      overtimeTosses[toss.player_slot].push(toss.value);

      const overtime = summarizePhaseTosses(overtimeTosses);
      if (
        overtime.p1Tosses === OVERTIME_TOSSES_PER_PLAYER &&
        overtime.p2Tosses === OVERTIME_TOSSES_PER_PLAYER
      ) {
        if (overtime.p1Score === overtime.p2Score) {
          phase = "sudden_death";
          activePhaseTossCount = 0;
        } else {
          isComplete = true;
          winnerSlot = overtime.p1Score > overtime.p2Score ? 1 : 2;
        }
      }

      continue;
    }

    activePhaseTossCount += 1;
    suddenDeathTosses[toss.player_slot].push(toss.value);

    const suddenDeath = summarizePhaseTosses(suddenDeathTosses);
    if (suddenDeath.p1Tosses === suddenDeath.p2Tosses) {
      if (suddenDeath.p1Score !== suddenDeath.p2Score) {
        isComplete = true;
        winnerSlot = suddenDeath.p1Score > suddenDeath.p2Score ? 1 : 2;
      } else {
        activePhaseTossCount = 0;
      }
    }
  }

  if (match.status === "complete" && match.winner_slot) {
    isComplete = true;
    winnerSlot = match.winner_slot;
  }

  return {
    p1Score: regulationScore[1],
    p2Score: regulationScore[2],
    currentPhase: phase,
    nextToToss: isComplete
      ? null
      : getNextToToss({
          phase,
          firstTosser: match.first_tosser,
          firstToFifteen,
          regulationTossCount,
          overtimeTosses,
          suddenDeathTosses,
        }),
    isComplete,
    winnerSlot,
    inningNumber: Math.floor(regulationTossCount / 2) + 1,
    tossesInCurrentInning: activePhaseTossCount,
    overtime: summarizePhaseTosses(overtimeTosses),
    suddenDeath: summarizePhaseTosses(suddenDeathTosses),
  };
}

function applyRegulationToss(score: number, value: TossValue) {
  const nextScore = score + value;

  if (nextScore > TARGET_SCORE) {
    return TARGET_SCORE - (nextScore - TARGET_SCORE);
  }

  return Math.max(0, nextScore);
}

function getNextToToss({
  phase,
  firstTosser,
  firstToFifteen,
  regulationTossCount,
  overtimeTosses,
  suddenDeathTosses,
}: {
  phase: MatchPhase;
  firstTosser: PlayerSlot;
  firstToFifteen: PlayerSlot | null;
  regulationTossCount: number;
  overtimeTosses: PhaseTosses;
  suddenDeathTosses: PhaseTosses;
}): PlayerSlot {
  const secondTosser = otherPlayer(firstTosser);

  if (phase === "regulation") {
    return regulationTossCount % 2 === 0 ? firstTosser : secondTosser;
  }

  if (phase === "redemption") {
    return otherPlayer(firstToFifteen ?? firstTosser);
  }

  if (phase === "overtime") {
    const totalOvertimeTosses =
      overtimeTosses[1].length + overtimeTosses[2].length;
    return totalOvertimeTosses % 2 === 0 ? firstTosser : secondTosser;
  }

  const totalSuddenDeathTosses =
    suddenDeathTosses[1].length + suddenDeathTosses[2].length;
  return totalSuddenDeathTosses % 2 === 0 ? firstTosser : secondTosser;
}

function summarizePhaseTosses(tosses: PhaseTosses): PhaseTossSummary {
  return {
    p1Score: sum(tosses[1]),
    p2Score: sum(tosses[2]),
    p1Tosses: tosses[1].length,
    p2Tosses: tosses[2].length,
  };
}

function otherPlayer(player: PlayerSlot): PlayerSlot {
  return player === 1 ? 2 : 1;
}

function isMiss(value: TossValue) {
  return value <= 0;
}

function sum(values: TossValue[]) {
  return values.reduce<number>((total, value) => total + value, 0);
}
