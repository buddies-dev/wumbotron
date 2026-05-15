import { describe, expect, it } from "vitest";
import { advanceWinner, generateSingleElim } from "./single-elim";

describe("generateSingleElim", () => {
  it("generates a 4-player bracket with no byes", () => {
    const bracket = generateSingleElim(["A", "B", "C", "D"]);

    expect(bracket.players).toHaveLength(4);
    expect(bracket.matches).toHaveLength(3);
    expect(bracket.matches.filter((match) => match.round === 1)).toMatchObject([
      {
        player1Id: "player-1",
        player2Id: "player-2",
        matchId: "match-round-1-match-0",
        nextBracketMatchId: "round-2-match-0",
        nextSlot: 1,
      },
      {
        player1Id: "player-3",
        player2Id: "player-4",
        matchId: "match-round-1-match-1",
        nextBracketMatchId: "round-2-match-0",
        nextSlot: 2,
      },
    ]);
  });

  it("generates a 5-player bracket with byes advanced immediately", () => {
    const bracket = generateSingleElim(["A", "B", "C", "D", "E"]);
    const semifinals = bracket.matches.filter((match) => match.round === 2);

    expect(bracket.matches).toHaveLength(7);
    expect(bracket.matches.filter((match) => match.winnerPlayerId)).toHaveLength(3);
    expect(semifinals).toMatchObject([
      {
        player1Id: "player-1",
        player2Id: "player-2",
        matchId: "match-round-2-match-0",
      },
      {
        player1Id: "player-3",
        player2Id: null,
        matchId: null,
      },
    ]);
  });

  it("generates a 6-player bracket with two byes", () => {
    const bracket = generateSingleElim(["A", "B", "C", "D", "E", "F"]);
    const firstRound = bracket.matches.filter((match) => match.round === 1);
    const semifinals = bracket.matches.filter((match) => match.round === 2);

    expect(firstRound.filter((match) => match.winnerPlayerId)).toHaveLength(2);
    expect(semifinals).toMatchObject([
      {
        player1Id: "player-1",
        player2Id: "player-2",
        matchId: "match-round-2-match-0",
      },
      {
        player1Id: null,
        player2Id: null,
        matchId: null,
      },
    ]);
  });
});

describe("advanceWinner", () => {
  it("is idempotent when called repeatedly", () => {
    const first = generateSingleElim(["A", "B", "C", "D"]);
    const second = advanceWinner(first, "round-1-match-0", "player-1");
    const third = advanceWinner(second, "round-1-match-0", "player-1");

    expect(third).toEqual(second);
  });

  it("advances an 8-player bracket through to a champion", () => {
    let bracket = generateSingleElim(["A", "B", "C", "D", "E", "F", "G", "H"]);

    bracket = advanceWinner(bracket, "round-1-match-0", "player-1");
    bracket = advanceWinner(bracket, "round-1-match-1", "player-3");
    bracket = advanceWinner(bracket, "round-1-match-2", "player-5");
    bracket = advanceWinner(bracket, "round-1-match-3", "player-7");

    expect(bracket.matches.filter((match) => match.round === 2)).toMatchObject([
      {
        player1Id: "player-1",
        player2Id: "player-3",
        matchId: "match-round-2-match-0",
      },
      {
        player1Id: "player-5",
        player2Id: "player-7",
        matchId: "match-round-2-match-1",
      },
    ]);

    bracket = advanceWinner(bracket, "round-2-match-0", "player-1");
    bracket = advanceWinner(bracket, "round-2-match-1", "player-7");

    expect(bracket.matches.find((match) => match.round === 3)).toMatchObject({
      player1Id: "player-1",
      player2Id: "player-7",
      matchId: "match-round-3-match-0",
    });

    bracket = advanceWinner(bracket, "round-3-match-0", "player-7");

    expect(bracket.championPlayerId).toBe("player-7");
  });
});
