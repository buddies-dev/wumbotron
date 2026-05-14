import { describe, expect, it } from "vitest";
import { deriveMatchState, type TossRecord } from "./state";

const match = {
  first_tosser: 1,
} as const;

function tosses(values: Array<[1 | 2, -2 | 0 | 1 | 2 | 3]>): TossRecord[] {
  return values.map(([player_slot, value], index) => ({
    player_slot,
    value,
    order_in_inning: (index % 2) + 1,
    inning_number: Math.floor(index / 2) + 1,
  }));
}

describe("deriveMatchState", () => {
  it("tracks regulation scores and next tosser", () => {
    const state = deriveMatchState(
      match,
      tosses([
        [1, 3],
        [2, 2],
        [1, 1],
      ]),
    );

    expect(state).toMatchObject({
      p1Score: 4,
      p2Score: 2,
      currentPhase: "regulation",
      nextToToss: 2,
      isComplete: false,
      winnerSlot: null,
    });
  });

  it("applies the going-over bounce after each regulation toss", () => {
    const state = deriveMatchState(
      match,
      tosses([
        [1, 3],
        [2, 0],
        [1, 3],
        [2, 0],
        [1, 3],
        [2, 0],
        [1, 3],
        [2, 0],
        [1, 2],
        [2, 0],
        [1, 3],
      ]),
    );

    expect(state.p1Score).toBe(13);
    expect(state.currentPhase).toBe("regulation");
  });

  it("enters redemption when the first player hits 15", () => {
    const state = deriveMatchState(
      match,
      tosses([
        [1, 3],
        [2, 3],
        [1, 3],
        [2, 3],
        [1, 3],
        [2, 3],
        [1, 3],
        [2, 3],
        [1, 3],
      ]),
    );

    expect(state).toMatchObject({
      p1Score: 15,
      p2Score: 12,
      currentPhase: "redemption",
      nextToToss: 2,
      isComplete: false,
    });
  });

  it("completes in redemption when the trailing player misses", () => {
    const state = deriveMatchState(
      match,
      tosses([
        [1, 3],
        [2, 3],
        [1, 3],
        [2, 3],
        [1, 3],
        [2, 3],
        [1, 3],
        [2, 3],
        [1, 3],
        [2, 0],
      ]),
    );

    expect(state).toMatchObject({
      currentPhase: "redemption",
      nextToToss: null,
      isComplete: true,
      winnerSlot: 1,
    });
  });

  it("moves to overtime when both players reach 15", () => {
    const state = deriveMatchState(
      match,
      tosses([
        [1, 3],
        [2, 3],
        [1, 3],
        [2, 3],
        [1, 3],
        [2, 3],
        [1, 3],
        [2, 3],
        [1, 3],
        [2, 3],
      ]),
    );

    expect(state).toMatchObject({
      p1Score: 15,
      p2Score: 15,
      currentPhase: "overtime",
      nextToToss: 1,
      isComplete: false,
    });
  });

  it("chooses an overtime winner after three throws each", () => {
    const state = deriveMatchState(
      match,
      tosses([
        [1, 3],
        [2, 3],
        [1, 3],
        [2, 3],
        [1, 3],
        [2, 3],
        [1, 3],
        [2, 3],
        [1, 3],
        [2, 3],
        [1, 3],
        [2, 2],
        [1, 1],
        [2, 2],
        [1, 1],
        [2, 0],
      ]),
    );

    expect(state).toMatchObject({
      currentPhase: "overtime",
      isComplete: true,
      winnerSlot: 1,
      overtime: {
        p1Score: 5,
        p2Score: 4,
        p1Tosses: 3,
        p2Tosses: 3,
      },
    });
  });

  it("enters sudden death after tied overtime", () => {
    const state = deriveMatchState(
      match,
      tosses([
        [1, 3],
        [2, 3],
        [1, 3],
        [2, 3],
        [1, 3],
        [2, 3],
        [1, 3],
        [2, 3],
        [1, 3],
        [2, 3],
        [1, 1],
        [2, 1],
        [1, 1],
        [2, 1],
        [1, 1],
        [2, 1],
      ]),
    );

    expect(state).toMatchObject({
      currentPhase: "sudden_death",
      nextToToss: 1,
      isComplete: false,
    });
  });

  it("resolves sudden death after an untied pair", () => {
    const state = deriveMatchState(
      match,
      tosses([
        [1, 3],
        [2, 3],
        [1, 3],
        [2, 3],
        [1, 3],
        [2, 3],
        [1, 3],
        [2, 3],
        [1, 3],
        [2, 3],
        [1, 1],
        [2, 1],
        [1, 1],
        [2, 1],
        [1, 1],
        [2, 1],
        [1, 2],
        [2, 1],
      ]),
    );

    expect(state).toMatchObject({
      currentPhase: "sudden_death",
      isComplete: true,
      winnerSlot: 1,
      suddenDeath: {
        p1Score: 2,
        p2Score: 1,
      },
    });
  });
});
