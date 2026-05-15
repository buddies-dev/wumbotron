import type { MatchPhase, PlayerSlot, TossValue } from "./state";

export type DisplayMatch = {
  id: string;
  player1_name: string;
  player2_name: string;
  first_tosser: PlayerSlot;
  status: "active" | "complete";
  winner_slot: PlayerSlot | null;
  bracket_match_id?: string | null;
};

export type DisplayInning = {
  id: string;
  match_id: string;
  number: number;
  phase: MatchPhase;
};

export type DisplayToss = {
  id: string;
  inning_id: string;
  player_slot: PlayerSlot;
  value: TossValue;
  order_in_inning: number;
  created_at: string;
  inning_number: number;
};

export type DisplayMatchData = {
  match: DisplayMatch;
  innings: DisplayInning[];
  tosses: DisplayToss[];
  source: "supabase" | "demo";
};

const demoMatch: DisplayMatch = {
  id: "test",
  player1_name: "Alexandria Thunderhands",
  player2_name: "Maximilian Wall Leaner",
  first_tosser: 1,
  status: "active",
  winner_slot: null,
};

const demoInnings: DisplayInning[] = [
  {
    id: "demo-inning-1",
    match_id: demoMatch.id,
    number: 1,
    phase: "regulation",
  },
  {
    id: "demo-inning-2",
    match_id: demoMatch.id,
    number: 2,
    phase: "regulation",
  },
  {
    id: "demo-inning-3",
    match_id: demoMatch.id,
    number: 3,
    phase: "regulation",
  },
  {
    id: "demo-inning-4",
    match_id: demoMatch.id,
    number: 4,
    phase: "regulation",
  },
  {
    id: "demo-inning-5",
    match_id: demoMatch.id,
    number: 5,
    phase: "regulation",
  },
];

export const demoDisplayMatch: DisplayMatchData = {
  match: demoMatch,
  innings: demoInnings,
  tosses: [
    createDemoToss(1, 1, 3),
    createDemoToss(1, 2, 2),
    createDemoToss(2, 1, 3),
    createDemoToss(2, 2, 3),
    createDemoToss(3, 1, 1),
    createDemoToss(3, 2, -2),
    createDemoToss(4, 1, 2),
    createDemoToss(4, 2, 3),
    createDemoToss(5, 1, 3),
  ],
  source: "demo",
};

export const demoCompleteDisplayMatch: DisplayMatchData = {
  match: {
    ...demoMatch,
    id: "complete",
    player1_name: "Ada",
    player2_name: "Grace",
    status: "complete",
    winner_slot: 1,
  },
  innings: Array.from({ length: 5 }, (_, index) => ({
    id: `complete-inning-${index + 1}`,
    match_id: "complete",
    number: index + 1,
    phase: "regulation" as const,
  })),
  tosses: [
    createCompleteToss(1, 1, 3),
    createCompleteToss(1, 2, 3),
    createCompleteToss(2, 1, 3),
    createCompleteToss(2, 2, 3),
    createCompleteToss(3, 1, 3),
    createCompleteToss(3, 2, 3),
    createCompleteToss(4, 1, 3),
    createCompleteToss(4, 2, 2),
    createCompleteToss(5, 1, 3),
    createCompleteToss(5, 2, 0),
  ],
  source: "demo",
};

function createDemoToss(
  inningNumber: number,
  playerSlot: PlayerSlot,
  value: TossValue,
): DisplayToss {
  return {
    id: `demo-toss-${inningNumber}-${playerSlot}`,
    inning_id: `demo-inning-${inningNumber}`,
    player_slot: playerSlot,
    value,
    order_in_inning: playerSlot,
    created_at: new Date(Date.UTC(2026, 4, 13, 12, inningNumber, playerSlot))
      .toISOString(),
    inning_number: inningNumber,
  };
}

function createCompleteToss(
  inningNumber: number,
  playerSlot: PlayerSlot,
  value: TossValue,
): DisplayToss {
  return {
    id: `complete-toss-${inningNumber}-${playerSlot}`,
    inning_id: `complete-inning-${inningNumber}`,
    player_slot: playerSlot,
    value,
    order_in_inning: playerSlot,
    created_at: new Date(Date.UTC(2026, 4, 13, 13, inningNumber, playerSlot))
      .toISOString(),
    inning_number: inningNumber,
  };
}
