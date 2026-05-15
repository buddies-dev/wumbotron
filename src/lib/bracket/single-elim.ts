export type BracketPlayer = {
  id: string;
  name: string;
  seed: number;
};

export type BracketMatch = {
  id: string;
  tournamentId: string;
  round: number;
  position: number;
  player1Id: string | null;
  player2Id: string | null;
  matchId: string | null;
  nextBracketMatchId: string | null;
  nextSlot: 1 | 2 | null;
  winnerPlayerId: string | null;
};

export type SingleElimBracket = {
  tournamentId: string;
  players: BracketPlayer[];
  matches: BracketMatch[];
  championPlayerId: string | null;
};

export function generateSingleElim(
  playerNames: string[],
  tournamentId = "tournament-1",
): SingleElimBracket {
  if (playerNames.length < 2) {
    throw new Error("A single-elimination bracket needs at least two players.");
  }

  const players = playerNames.map<BracketPlayer>((name, index) => ({
    id: `player-${index + 1}`,
    name,
    seed: index + 1,
  }));
  const bracketSize = nextPowerOfTwo(players.length);
  const roundCount = Math.log2(bracketSize);
  const matches: BracketMatch[] = [];

  for (let round = 1; round <= roundCount; round += 1) {
    const matchCount = bracketSize / 2 ** round;

    for (let position = 0; position < matchCount; position += 1) {
      const hasNext = round < roundCount;
      matches.push({
        id: matchId(round, position),
        tournamentId,
        round,
        position,
        player1Id: null,
        player2Id: null,
        matchId: null,
        nextBracketMatchId: hasNext ? matchId(round + 1, Math.floor(position / 2)) : null,
        nextSlot: hasNext ? ((position % 2) + 1 as 1 | 2) : null,
        winnerPlayerId: null,
      });
    }
  }

  seedFirstRound(matches, players, bracketSize);

  let bracket: SingleElimBracket = {
    tournamentId,
    players,
    matches,
    championPlayerId: null,
  };

  for (const bracketMatch of matches.filter((item) => item.winnerPlayerId)) {
    bracket = advanceWinner(bracket, bracketMatch.id);
  }

  return bracket;
}

export function advanceWinner(
  bracket: SingleElimBracket,
  bracketMatchId: string,
  winnerPlayerId?: string,
): SingleElimBracket {
  const matches = bracket.matches.map((match) => ({ ...match }));
  const current = getMatch(matches, bracketMatchId);
  const resolvedWinner = winnerPlayerId ?? current.winnerPlayerId;

  if (!resolvedWinner) {
    return bracket;
  }

  current.winnerPlayerId = resolvedWinner;

  if (!current.nextBracketMatchId || !current.nextSlot) {
    return {
      ...bracket,
      championPlayerId: resolvedWinner,
      matches,
    };
  }

  const next = getMatch(matches, current.nextBracketMatchId);

  if (next.player1Id === resolvedWinner || next.player2Id === resolvedWinner) {
    return {
      ...bracket,
      matches,
    };
  }

  if (current.nextSlot === 1) {
    next.player1Id = resolvedWinner;
  } else {
    next.player2Id = resolvedWinner;
  }

  if (next.player1Id && next.player2Id && !next.matchId) {
    next.matchId = linkedMatchId(next.id);
  }

  return {
    ...bracket,
    matches,
  };
}

function seedFirstRound(
  matches: BracketMatch[],
  players: BracketPlayer[],
  bracketSize: number,
) {
  const firstRound = matches.filter((match) => match.round === 1);
  const byeCount = bracketSize - players.length;
  const pairings: Array<[BracketPlayer | null, BracketPlayer | null]> = [];

  for (let index = 0; index < byeCount; index += 1) {
    pairings.push([players[index], null]);
  }

  for (let index = byeCount; index < players.length; index += 2) {
    pairings.push([players[index], players[index + 1] ?? null]);
  }

  firstRound.forEach((match, index) => {
    const [player1, player2] = pairings[index] ?? [null, null];
    match.player1Id = player1?.id ?? null;
    match.player2Id = player2?.id ?? null;

    if (match.player1Id && match.player2Id) {
      match.matchId = linkedMatchId(match.id);
    } else {
      match.winnerPlayerId = match.player1Id ?? match.player2Id;
    }
  });
}

function nextPowerOfTwo(value: number) {
  return 2 ** Math.ceil(Math.log2(value));
}

function getMatch(matches: BracketMatch[], id: string) {
  const bracketMatch = matches.find((match) => match.id === id);

  if (!bracketMatch) {
    throw new Error(`Unknown bracket match: ${id}`);
  }

  return bracketMatch;
}

function matchId(round: number, position: number) {
  return `round-${round}-match-${position}`;
}

function linkedMatchId(bracketMatchId: string) {
  return `match-${bracketMatchId}`;
}
