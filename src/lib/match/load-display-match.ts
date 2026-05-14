import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import {
  demoCompleteDisplayMatch,
  demoDisplayMatch,
  type DisplayInning,
  type DisplayMatch,
  type DisplayMatchData,
  type DisplayToss,
} from "./demo";

type MatchRow = Database["public"]["Tables"]["match"]["Row"];
type InningRow = Database["public"]["Tables"]["inning"]["Row"];
type TossRow = Database["public"]["Tables"]["toss"]["Row"];

export async function loadDisplayMatch(
  matchId: string,
): Promise<DisplayMatchData | null> {
  if (!hasSupabaseEnv()) {
    const demos = [demoDisplayMatch, demoCompleteDisplayMatch];

    return demos.find((demo) => demo.match.id === matchId) ?? null;
  }

  const supabase = await createClient();
  const { data: match, error: matchError } = await supabase
    .from("match")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError) {
    throw new Error(`Failed to load match: ${matchError.message}`);
  }

  if (!match) {
    return null;
  }

  const { data: innings, error: inningsError } = await supabase
    .from("inning")
    .select("*")
    .eq("match_id", match.id)
    .order("number", { ascending: true });

  if (inningsError) {
    throw new Error(`Failed to load innings: ${inningsError.message}`);
  }

  const inningIds = innings.map((inning) => inning.id);
  const tosses = inningIds.length > 0
    ? await loadTossesForInnings(inningIds)
    : [];

  const inningNumberById = new Map(
    innings.map((inning) => [inning.id, inning.number]),
  );

  return {
    match: normalizeMatch(match),
    innings: innings.map(normalizeInning),
    tosses: tosses
      .map((toss) => ({
        ...normalizeToss(toss),
        inning_number: inningNumberById.get(toss.inning_id) ?? 0,
      }))
      .sort((a, b) => {
        if (a.inning_number !== b.inning_number) {
          return a.inning_number - b.inning_number;
        }

        return a.order_in_inning - b.order_in_inning;
      }),
    source: "supabase",
  };
}

async function loadTossesForInnings(inningIds: string[]) {
  const supabase = await createClient();
  const { data: tosses, error } = await supabase
    .from("toss")
    .select("*")
    .in("inning_id", inningIds)
    .order("order_in_inning", { ascending: true });

  if (error) {
    throw new Error(`Failed to load tosses: ${error.message}`);
  }

  return tosses;
}

function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
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
