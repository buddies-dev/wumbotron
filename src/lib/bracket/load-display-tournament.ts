import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { deriveMatchState } from "@/lib/match/state";
import type {
  DisplayInning,
  DisplayMatch,
  DisplayToss,
} from "@/lib/match/demo";

type TournamentRow = Database["public"]["Tables"]["tournament"]["Row"];
type PlayerRow = Database["public"]["Tables"]["player"]["Row"];
type BracketMatchRow = Database["public"]["Tables"]["bracket_match"]["Row"];
type MatchRow = Database["public"]["Tables"]["match"]["Row"];
type InningRow = Database["public"]["Tables"]["inning"]["Row"];
type TossRow = Database["public"]["Tables"]["toss"]["Row"];

export type DisplayTournament = {
  id: string;
  name: string;
  status: "active" | "complete";
  format: "single_elim";
};

export type DisplayTournamentPlayer = {
  id: string;
  name: string;
  seed: number;
};

export type DisplayBracketMatch = {
  id: string;
  tournament_id: string;
  round: number;
  position: number;
  player1_id: string | null;
  player2_id: string | null;
  match_id: string | null;
  winner_player_id: string | null;
  match: DisplayMatch | null;
  innings: DisplayInning[];
  tosses: DisplayToss[];
  p1Score: number | null;
  p2Score: number | null;
  status: "pending" | "live" | "complete" | "bye";
  lastActivityAt: string | null;
};

export type DisplayTournamentData = {
  tournament: DisplayTournament;
  players: DisplayTournamentPlayer[];
  matches: DisplayBracketMatch[];
  championPlayerId: string | null;
  activeBracketMatchId: string | null;
  source: "supabase" | "demo";
};

export async function loadDisplayTournament(
  tournamentId: string,
): Promise<DisplayTournamentData | null> {
  if (!hasSupabaseEnv()) {
    return demoTournament.tournament.id === tournamentId ? demoTournament : null;
  }

  const supabase = await createClient();
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournament")
    .select("*")
    .eq("id", tournamentId)
    .maybeSingle();

  if (tournamentError) {
    throw new Error(`Failed to load tournament: ${tournamentError.message}`);
  }

  if (!tournament) {
    return null;
  }

  const [{ data: players, error: playersError }, { data: bracketRows, error }] =
    await Promise.all([
      supabase
        .from("player")
        .select("*")
        .eq("tournament_id", tournament.id)
        .order("seed", { ascending: true }),
      supabase
        .from("bracket_match")
        .select("*")
        .eq("tournament_id", tournament.id)
        .order("round", { ascending: true })
        .order("position", { ascending: true }),
    ]);

  if (playersError) {
    throw new Error(`Failed to load players: ${playersError.message}`);
  }

  if (error) {
    throw new Error(`Failed to load bracket matches: ${error.message}`);
  }

  const matchIds = bracketRows
    .map((bracketMatch) => bracketMatch.match_id)
    .filter((matchId): matchId is string => Boolean(matchId));
  const matches = matchIds.length > 0 ? await loadMatches(matchIds) : [];
  const innings = matchIds.length > 0 ? await loadInnings(matchIds) : [];
  const tosses = innings.length > 0
    ? await loadTosses(innings.map((inning) => inning.id))
    : [];

  return shapeTournament({
    tournament,
    players,
    bracketRows,
    matches,
    innings,
    tosses,
    source: "supabase",
  });
}

async function loadMatches(matchIds: string[]) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match")
    .select("*")
    .in("id", matchIds);

  if (error) {
    throw new Error(`Failed to load linked matches: ${error.message}`);
  }

  return data;
}

async function loadInnings(matchIds: string[]) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inning")
    .select("*")
    .in("match_id", matchIds)
    .order("number", { ascending: true });

  if (error) {
    throw new Error(`Failed to load tournament innings: ${error.message}`);
  }

  return data;
}

async function loadTosses(inningIds: string[]) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("toss")
    .select("*")
    .in("inning_id", inningIds)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load tournament tosses: ${error.message}`);
  }

  return data;
}

function shapeTournament({
  tournament,
  players,
  bracketRows,
  matches,
  innings,
  tosses,
  source,
}: {
  tournament: TournamentRow;
  players: PlayerRow[];
  bracketRows: BracketMatchRow[];
  matches: MatchRow[];
  innings: InningRow[];
  tosses: TossRow[];
  source: "supabase" | "demo";
}): DisplayTournamentData {
  const matchesById = new Map(matches.map((match) => [match.id, match]));
  const inningsByMatchId = groupBy(innings, (inning) => inning.match_id);
  const inningById = new Map(innings.map((inning) => [inning.id, inning]));
  const tossesByInningId = groupBy(tosses, (toss) => toss.inning_id);

  const shapedMatches = bracketRows.map<DisplayBracketMatch>((bracketMatch) => {
    const match = bracketMatch.match_id
      ? matchesById.get(bracketMatch.match_id) ?? null
      : null;
    const matchInnings = match ? inningsByMatchId.get(match.id) ?? [] : [];
    const matchTosses = matchInnings.flatMap((inning) =>
      (tossesByInningId.get(inning.id) ?? []).map((toss) => ({
        ...normalizeToss(toss),
        inning_number: inningById.get(toss.inning_id)?.number ?? 0,
      })),
    );
    const displayMatch = match ? normalizeMatch(match) : null;
    const state = displayMatch
      ? deriveMatchState(displayMatch, matchTosses)
      : null;
    const lastTossAt = matchTosses.at(-1)?.created_at ?? null;
    const status = getBracketMatchStatus(bracketMatch, displayMatch);

    return {
      id: bracketMatch.id,
      tournament_id: bracketMatch.tournament_id,
      round: bracketMatch.round,
      position: bracketMatch.position,
      player1_id: bracketMatch.player1_id,
      player2_id: bracketMatch.player2_id,
      match_id: bracketMatch.match_id,
      winner_player_id: bracketMatch.winner_player_id,
      match: displayMatch,
      innings: matchInnings.map(normalizeInning),
      tosses: matchTosses,
      p1Score: state?.p1Score ?? null,
      p2Score: state?.p2Score ?? null,
      status,
      lastActivityAt: lastTossAt ?? match?.created_at ?? null,
    };
  });

  const championPlayerId =
    bracketRows.find((match) => !match.next_bracket_match_id)
      ?.winner_player_id ?? null;

  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
      format: tournament.format,
    },
    players: players.map((player) => ({
      id: player.id,
      name: player.name,
      seed: player.seed,
    })),
    matches: shapedMatches,
    championPlayerId,
    activeBracketMatchId: getActiveBracketMatchId(shapedMatches),
    source,
  };
}

function getBracketMatchStatus(
  bracketMatch: BracketMatchRow,
  match: DisplayMatch | null,
): DisplayBracketMatch["status"] {
  if (bracketMatch.winner_player_id && !match) {
    return "bye";
  }

  if (!match) {
    return "pending";
  }

  return match.status === "complete" ? "complete" : "live";
}

function getActiveBracketMatchId(matches: DisplayBracketMatch[]) {
  const liveMatches = matches.filter((match) => match.status === "live");

  if (liveMatches.length === 0) {
    return null;
  }

  return liveMatches
    .toSorted((a, b) => (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? ""))
    .at(0)?.id ?? null;
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = getKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return groups;
}

function normalizeMatch(match: MatchRow): DisplayMatch {
  return {
    id: match.id,
    player1_name: match.player1_name,
    player2_name: match.player2_name,
    first_tosser: match.first_tosser,
    status: match.status,
    winner_slot: match.winner_slot,
  };
}

function normalizeInning(inning: InningRow): DisplayInning {
  return {
    id: inning.id,
    match_id: inning.match_id,
    number: inning.number,
    phase: inning.phase,
  };
}

function normalizeToss(toss: TossRow): Omit<DisplayToss, "inning_number"> {
  return {
    id: toss.id,
    inning_id: toss.inning_id,
    player_slot: toss.player_slot,
    value: toss.value,
    order_in_inning: toss.order_in_inning,
    created_at: toss.created_at,
  };
}

function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

const demoTournament: DisplayTournamentData = shapeTournament({
  tournament: {
    id: "demo",
    name: "Backyard Classic",
    format: "single_elim",
    status: "active",
    created_at: "2026-05-14T18:00:00.000Z",
  },
  players: [
    demoPlayer("demo-player-1", "Ada", 1),
    demoPlayer("demo-player-2", "Grace", 2),
    demoPlayer("demo-player-3", "Katherine", 3),
    demoPlayer("demo-player-4", "Dorothy", 4),
    demoPlayer("demo-player-5", "Mary", 5),
    demoPlayer("demo-player-6", "Annie", 6),
    demoPlayer("demo-player-7", "Mae", 7),
    demoPlayer("demo-player-8", "Hedy", 8),
  ],
  bracketRows: [
    demoBracketMatch("bm-1", 1, 0, "demo-player-1", "demo-player-2", "m-1", "bm-5", 1, "demo-player-1"),
    demoBracketMatch("bm-2", 1, 1, "demo-player-3", "demo-player-4", "m-2", "bm-5", 2, "demo-player-4"),
    demoBracketMatch("bm-3", 1, 2, "demo-player-5", "demo-player-6", "m-3", "bm-6", 1, null),
    demoBracketMatch("bm-4", 1, 3, "demo-player-7", "demo-player-8", "m-4", "bm-6", 2, null),
    demoBracketMatch("bm-5", 2, 0, "demo-player-1", "demo-player-4", "m-5", "bm-7", 1, null),
    demoBracketMatch("bm-6", 2, 1, null, null, null, "bm-7", 2, null),
    demoBracketMatch("bm-7", 3, 0, null, null, null, null, null, null),
  ],
  matches: [
    demoMatch("m-1", "Ada", "Grace", "complete", 1),
    demoMatch("m-2", "Katherine", "Dorothy", "complete", 2),
    demoMatch("m-3", "Mary", "Annie", "active", null),
    demoMatch("m-4", "Mae", "Hedy", "active", null),
    demoMatch("m-5", "Ada", "Dorothy", "active", null),
  ],
  innings: [
    demoInning("m-1", 1),
    demoInning("m-1", 2),
    demoInning("m-1", 3),
    demoInning("m-1", 4),
    demoInning("m-1", 5),
    demoInning("m-2", 1),
    demoInning("m-2", 2),
    demoInning("m-2", 3),
    demoInning("m-2", 4),
    demoInning("m-2", 5),
    demoInning("m-3", 1),
    demoInning("m-3", 2),
    demoInning("m-4", 1),
    demoInning("m-5", 1),
    demoInning("m-5", 2),
  ],
  tosses: [
    demoToss("m-1", 1, 1, 3),
    demoToss("m-1", 1, 2, 1),
    demoToss("m-1", 2, 1, 3),
    demoToss("m-1", 2, 2, 2),
    demoToss("m-1", 3, 1, 3),
    demoToss("m-1", 3, 2, 2),
    demoToss("m-1", 4, 1, 3),
    demoToss("m-1", 4, 2, 3),
    demoToss("m-1", 5, 1, 3),
    demoToss("m-2", 1, 1, 1),
    demoToss("m-2", 1, 2, 3),
    demoToss("m-2", 2, 1, 3),
    demoToss("m-2", 2, 2, 3),
    demoToss("m-2", 3, 1, 2),
    demoToss("m-2", 3, 2, 3),
    demoToss("m-2", 4, 1, 1),
    demoToss("m-2", 4, 2, 3),
    demoToss("m-2", 5, 2, 3),
    demoToss("m-3", 1, 1, 3),
    demoToss("m-3", 1, 2, 2),
    demoToss("m-3", 2, 1, 1),
    demoToss("m-4", 1, 1, 2),
    demoToss("m-4", 1, 2, 3),
    demoToss("m-5", 1, 1, 3),
    demoToss("m-5", 1, 2, 3),
    demoToss("m-5", 2, 1, 2),
  ],
  source: "demo",
});

function demoPlayer(id: string, name: string, seed: number): PlayerRow {
  return { id, name, seed, tournament_id: "demo" };
}

function demoBracketMatch(
  id: string,
  round: number,
  position: number,
  player1_id: string | null,
  player2_id: string | null,
  match_id: string | null,
  next_bracket_match_id: string | null,
  next_slot: 1 | 2 | null,
  winner_player_id: string | null,
): BracketMatchRow {
  return {
    id,
    tournament_id: "demo",
    round,
    position,
    player1_id,
    player2_id,
    match_id,
    next_bracket_match_id,
    next_slot,
    winner_player_id,
  };
}

function demoMatch(
  id: string,
  player1_name: string,
  player2_name: string,
  status: "active" | "complete",
  winner_slot: 1 | 2 | null,
): MatchRow {
  return {
    id,
    player1_name,
    player2_name,
    first_tosser: 1,
    status,
    winner_slot,
    created_at: "2026-05-14T18:00:00.000Z",
    bracket_match_id: null,
  };
}

function demoInning(matchId: string, number: number): InningRow {
  return {
    id: `${matchId}-inning-${number}`,
    match_id: matchId,
    number,
    phase: "regulation",
  };
}

function demoToss(
  matchId: string,
  inningNumber: number,
  playerSlot: 1 | 2,
  value: -2 | 0 | 1 | 2 | 3,
): TossRow {
  return {
    id: `${matchId}-toss-${inningNumber}-${playerSlot}-${value}`,
    inning_id: `${matchId}-inning-${inningNumber}`,
    player_slot: playerSlot,
    value,
    order_in_inning: playerSlot,
    created_at: new Date(Date.UTC(2026, 4, 14, 18, inningNumber, playerSlot))
      .toISOString(),
  };
}
