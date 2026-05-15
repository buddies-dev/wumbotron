import { generateSingleElim } from "@/lib/bracket/single-elim";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<Database>;

type CreatedTournament = {
  id: string;
};

export async function createTournament(
  supabase: Supabase,
  name: string,
  playerNames: string[],
): Promise<CreatedTournament> {
  const normalizedPlayers = playerNames
    .map((playerName) => playerName.trim())
    .filter(Boolean);

  if (normalizedPlayers.length < 2) {
    throw new Error("Add at least two players.");
  }

  const tournamentId = crypto.randomUUID();
  const { error: tournamentError } = await supabase.from("tournament").insert({
    id: tournamentId,
    name: name.trim() || "Untitled Tournament",
  });

  if (tournamentError) {
    throw new Error(tournamentError.message);
  }

  const players = normalizedPlayers.map((playerName, index) => ({
    id: crypto.randomUUID(),
    tournament_id: tournamentId,
    name: playerName,
    seed: index + 1,
  }));
  const { error: playerError } = await supabase.from("player").insert(players);

  if (playerError) {
    throw new Error(playerError.message);
  }

  const generated = generateSingleElim(normalizedPlayers, tournamentId);
  const playerIdByGeneratedId = new Map(
    generated.players.map((player) => [
      player.id,
      players[player.seed - 1]?.id ?? null,
    ]),
  );
  const bracketIdByGeneratedId = new Map(
    generated.matches.map((match) => [match.id, crypto.randomUUID()]),
  );
  const matchIdByGeneratedBracketId = new Map(
    generated.matches
      .filter((match) => match.matchId)
      .map((match) => [match.id, crypto.randomUUID()]),
  );
  const bracketRows = generated.matches.map((match) => ({
    id: bracketIdByGeneratedId.get(match.id)!,
    tournament_id: tournamentId,
    round: match.round,
    position: match.position,
    player1_id: mapPlayerId(match.player1Id, playerIdByGeneratedId),
    player2_id: mapPlayerId(match.player2Id, playerIdByGeneratedId),
    match_id: null,
    next_bracket_match_id: match.nextBracketMatchId
      ? bracketIdByGeneratedId.get(match.nextBracketMatchId)!
      : null,
    next_slot: match.nextSlot,
    winner_player_id: mapPlayerId(match.winnerPlayerId, playerIdByGeneratedId),
  }));
  const { error: bracketError } = await supabase
    .from("bracket_match")
    .insert(bracketRows);

  if (bracketError) {
    throw new Error(bracketError.message);
  }

  const matchRows = generated.matches
    .filter((match) => match.matchId && match.player1Id && match.player2Id)
    .map((match) => {
      const player1 = players.find(
        (player) => player.id === mapPlayerId(match.player1Id, playerIdByGeneratedId),
      );
      const player2 = players.find(
        (player) => player.id === mapPlayerId(match.player2Id, playerIdByGeneratedId),
      );

      return {
        id: matchIdByGeneratedBracketId.get(match.id)!,
        player1_name: player1?.name ?? "Player One",
        player2_name: player2?.name ?? "Player Two",
        first_tosser: 1 as const,
        bracket_match_id: bracketIdByGeneratedId.get(match.id)!,
      };
    });

  if (matchRows.length > 0) {
    const { error: matchError } = await supabase.from("match").insert(matchRows);

    if (matchError) {
      throw new Error(matchError.message);
    }

    const updates = await Promise.all(
      matchRows.map((match) =>
        supabase
          .from("bracket_match")
          .update({ match_id: match.id })
          .eq("id", match.bracket_match_id),
      ),
    );

    const updateError = updates.find((update) => update.error)?.error;

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  return { id: tournamentId };
}

function mapPlayerId(
  generatedId: string | null,
  playerIdByGeneratedId: Map<string, string | null>,
) {
  return generatedId ? playerIdByGeneratedId.get(generatedId) ?? null : null;
}
