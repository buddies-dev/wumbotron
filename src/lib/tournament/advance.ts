import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<Database>;
type BracketMatchRow = Database["public"]["Tables"]["bracket_match"]["Row"];
type PlayerRow = Database["public"]["Tables"]["player"]["Row"];

export async function advanceCompletedMatch(
  supabase: Supabase,
  matchId: string,
) {
  const { data: match, error: matchError } = await supabase
    .from("match")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError) {
    throw new Error(matchError.message);
  }

  if (!match?.bracket_match_id || match.status !== "complete" || !match.winner_slot) {
    return;
  }

  const { data: bracketMatch, error: bracketError } = await supabase
    .from("bracket_match")
    .select("*")
    .eq("id", match.bracket_match_id)
    .maybeSingle();

  if (bracketError) {
    throw new Error(bracketError.message);
  }

  if (!bracketMatch) {
    return;
  }

  const winnerPlayerId =
    match.winner_slot === 1 ? bracketMatch.player1_id : bracketMatch.player2_id;

  if (!winnerPlayerId) {
    return;
  }

  await setWinnerAndAdvance(supabase, bracketMatch, winnerPlayerId);
}

export async function setWinnerAndAdvance(
  supabase: Supabase,
  bracketMatch: BracketMatchRow,
  winnerPlayerId: string,
) {
  const { error: winnerError } = await supabase
    .from("bracket_match")
    .update({ winner_player_id: winnerPlayerId })
    .eq("id", bracketMatch.id);

  if (winnerError) {
    throw new Error(winnerError.message);
  }

  if (!bracketMatch.next_bracket_match_id || !bracketMatch.next_slot) {
    const { error: completeError } = await supabase
      .from("tournament")
      .update({ status: "complete" })
      .eq("id", bracketMatch.tournament_id);

    if (completeError) {
      throw new Error(completeError.message);
    }

    return;
  }

  const slotUpdate =
    bracketMatch.next_slot === 1
      ? { player1_id: winnerPlayerId }
      : { player2_id: winnerPlayerId };

  const { data: nextMatch, error: nextError } = await supabase
    .from("bracket_match")
    .update(slotUpdate)
    .eq("id", bracketMatch.next_bracket_match_id)
    .select("*")
    .single();

  if (nextError) {
    throw new Error(nextError.message);
  }

  if (nextMatch.player1_id && nextMatch.player2_id && !nextMatch.match_id) {
    await createMatchForBracketMatch(supabase, nextMatch);
  }
}

async function createMatchForBracketMatch(
  supabase: Supabase,
  bracketMatch: BracketMatchRow,
) {
  if (!bracketMatch.player1_id || !bracketMatch.player2_id) {
    return;
  }

  const players = await loadPlayers(supabase, [
    bracketMatch.player1_id,
    bracketMatch.player2_id,
  ]);
  const playerById = new Map(players.map((player) => [player.id, player]));
  const matchId = crypto.randomUUID();
  const { error: matchError } = await supabase.from("match").insert({
    id: matchId,
    player1_name: playerById.get(bracketMatch.player1_id)?.name ?? "Player One",
    player2_name: playerById.get(bracketMatch.player2_id)?.name ?? "Player Two",
    first_tosser: 1,
    bracket_match_id: bracketMatch.id,
  });

  if (matchError) {
    throw new Error(matchError.message);
  }

  const { error: bracketError } = await supabase
    .from("bracket_match")
    .update({ match_id: matchId })
    .eq("id", bracketMatch.id);

  if (bracketError) {
    throw new Error(bracketError.message);
  }
}

async function loadPlayers(supabase: Supabase, playerIds: string[]) {
  const { data, error } = await supabase
    .from("player")
    .select("*")
    .in("id", playerIds);

  if (error) {
    throw new Error(error.message);
  }

  return data satisfies PlayerRow[];
}
