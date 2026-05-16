"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  formatTossOption,
  getNextAction,
  TOSS_OPTIONS,
} from "@/lib/match/control";
import type {
  DisplayInning,
  DisplayMatch,
  DisplayMatchData,
  DisplayToss,
} from "@/lib/match/demo";
import {
  deriveMatchState,
  type PlayerSlot,
  type TossValue,
} from "@/lib/match/state";
import { TOSS_LABELS } from "@/lib/match/constants";
import { createClient } from "@/lib/supabase/client";
import { advanceCompletedMatch } from "@/lib/tournament/advance";
import { DisplayLinkStrip } from "./DisplayLinkStrip";

type MatchControlProps = {
  matchId: string;
  initialData: DisplayMatchData | null;
};

export function MatchControl({ matchId, initialData }: MatchControlProps) {
  const canUseSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const [data, setData] = useState<DisplayMatchData>(() => {
    if (initialData?.source === "supabase") {
      return initialData;
    }

    if (typeof window === "undefined") {
      return initialData ?? createInitialLocalMatch(matchId);
    }

    return initialData ?? createInitialLocalMatch(matchId);
  });
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = useMemo(
    () => (canUseSupabase ? createClient() : null),
    [canUseSupabase],
  );

  const refetchMatch = useMemo(
    () => async () => {
      const response = await fetch(`/api/matches/${matchId}/display`, {
        cache: "no-store",
      });

      if (!response.ok) {
        return null;
      }

      const nextData = (await response.json()) as DisplayMatchData;
      setData(nextData);
      return nextData;
    },
    [matchId],
  );

  useEffect(() => {
    if (!supabase || !data.match.bracket_match_id) {
      return;
    }

    supabase
      .from("bracket_match")
      .select("tournament_id")
      .eq("id", data.match.bracket_match_id)
      .maybeSingle()
      .then(({ data: bracketMatch }) => {
        setTournamentId(bracketMatch?.tournament_id ?? null);
      });
  }, [data.match.bracket_match_id, supabase]);

  const state = useMemo(
    () => deriveMatchState(data.match, data.tosses),
    [data.match, data.tosses],
  );
  const playerNames = useMemo(
    () => ({
      1: data.match.player1_name,
      2: data.match.player2_name,
    }),
    [data.match.player1_name, data.match.player2_name],
  );
  const action = getNextAction(state, playerNames);
  const lastToss = data.tosses.at(-1) ?? null;

  async function recordToss(value: TossValue) {
    if (state.isComplete || !action.player) {
      return;
    }

    if (data.source === "supabase") {
      await recordRemoteToss(value);
      return;
    }

    setData((current) => {
      const currentState = deriveMatchState(current.match, current.tosses);
      const player = currentState.nextToToss;

      if (!player || currentState.isComplete) {
        return current;
      }

      const inning = ensureInning(current, currentState.inningNumber);
      const tossesInInning = current.tosses.filter(
        (toss) => toss.inning_number === inning.number,
      );
      const nextToss: DisplayToss = {
        id: crypto.randomUUID(),
        inning_id: inning.id,
        player_slot: player,
        value,
        order_in_inning: tossesInInning.length + 1,
        created_at: new Date().toISOString(),
        inning_number: inning.number,
      };
      const nextTosses = [...current.tosses, nextToss];
      const nextState = deriveMatchState(current.match, nextTosses);

      return {
        ...current,
        match: {
          ...current.match,
          status: nextState.isComplete ? "complete" : "active",
          winner_slot: nextState.winnerSlot,
        },
        innings: current.innings.some((item) => item.id === inning.id)
          ? current.innings
          : [...current.innings, inning],
        tosses: nextTosses,
      };
    });
  }

  async function recordRemoteToss(value: TossValue) {
    if (!supabase || isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const currentState = deriveMatchState(data.match, data.tosses);
      const player = currentState.nextToToss;

      if (!player || currentState.isComplete) {
        return;
      }

      const inning = await ensureRemoteInning(
        currentState.inningNumber,
        currentState.currentPhase,
      );
      const tossesInInning = data.tosses.filter(
        (toss) => toss.inning_number === inning.number,
      );
      const nextToss: Omit<DisplayToss, "inning_number"> = {
        id: crypto.randomUUID(),
        inning_id: inning.id,
        player_slot: player,
        value,
        order_in_inning: tossesInInning.length + 1,
        created_at: new Date().toISOString(),
      };
      const { error: tossError } = await supabase.from("toss").insert(nextToss);

      if (tossError) {
        throw new Error(tossError.message);
      }

      const nextState = deriveMatchState(data.match, [
        ...data.tosses,
        { ...nextToss, inning_number: inning.number },
      ]);

      if (nextState.isComplete) {
        const { error: matchError } = await supabase
          .from("match")
          .update({
            status: "complete",
            winner_slot: nextState.winnerSlot,
          })
          .eq("id", data.match.id);

        if (matchError) {
          throw new Error(matchError.message);
        }

        await advanceCompletedMatch(supabase, data.match.id);
      }

      await refetchMatch();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Toss failed.");
    } finally {
      setIsSaving(false);
    }
  }

  async function ensureRemoteInning(
    inningNumber: number,
    phase: DisplayInning["phase"],
  ) {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const existing = data.innings.find((inning) => inning.number === inningNumber);

    if (existing) {
      return existing;
    }

    const { data: inning, error: selectError } = await supabase
      .from("inning")
      .select("*")
      .eq("match_id", data.match.id)
      .eq("number", inningNumber)
      .maybeSingle();

    if (selectError) {
      throw new Error(selectError.message);
    }

    if (inning) {
      return {
        id: inning.id,
        match_id: inning.match_id,
        number: inning.number,
        phase: inning.phase,
      };
    }

    const { data: inserted, error: insertError } = await supabase
      .from("inning")
      .insert({
        id: crypto.randomUUID(),
        match_id: data.match.id,
        number: inningNumber,
        phase,
      })
      .select("*")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    return {
      id: inserted.id,
      match_id: inserted.match_id,
      number: inserted.number,
      phase: inserted.phase,
    };
  }

  async function undoLastToss() {
    if (data.source === "supabase") {
      if (!supabase || data.match.status === "complete") {
        return;
      }

      const lastRemoteToss = data.tosses.at(-1);

      if (!lastRemoteToss) {
        return;
      }

      setIsSaving(true);
      setError(null);

      try {
        const { error: deleteError } = await supabase
          .from("toss")
          .delete()
          .eq("id", lastRemoteToss.id);

        if (deleteError) {
          throw new Error(deleteError.message);
        }

        await refetchMatch();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Undo failed.");
      } finally {
        setIsSaving(false);
      }

      return;
    }

    setData((current) => ({
      ...current,
      match: {
        ...current.match,
        status: "active",
        winner_slot: null,
      },
      tosses: current.tosses.slice(0, -1),
    }));
  }

  function resetMatch() {
    const next = createInitialLocalMatch(matchId);
    setData(next);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-5 sm:px-6">
      <header className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Control
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">
              {playerNames[1]} vs {playerNames[2]}
            </h1>
          </div>
          <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs uppercase tracking-[0.14em] text-zinc-300">
            {data.source === "supabase" ? "live" : "local"}
          </span>
        </div>
        <div className="score-nums mt-5 grid grid-cols-2 gap-3 text-center">
          <ScoreCard
            name={playerNames[1]}
            score={state.p1Score}
            active={action.player === 1}
          />
          <ScoreCard
            name={playerNames[2]}
            score={state.p2Score}
            active={action.player === 2}
          />
        </div>
      </header>

      <DisplayLinkStrip path={`/display/${data.match.id}`} />

      {tournamentId ? (
        <Link
          href={`/control/tournament/${tournamentId}`}
          className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm font-semibold text-emerald-200"
        >
          Back to tournament
        </Link>
      ) : null}

      {error ? (
        <p className="rounded-md border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <section className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
          {state.currentPhase.replace("_", " ")} · inning {state.inningNumber}
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">{action.prompt}</h2>
        <p className="mt-1 text-base text-zinc-300">{action.detail}</p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {TOSS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={state.isComplete || isSaving}
            onClick={() => recordToss(option.value)}
            className={[
              "min-h-24 rounded-lg p-4 text-left text-xl font-black transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40",
              option.value === 3 ? "col-span-2" : "",
              option.tone,
            ].join(" ")}
          >
            <span className="score-nums block text-4xl">
              {option.value > 0 ? `+${option.value}` : option.value}
            </span>
            <span className="block text-base uppercase tracking-[0.16em]">
              {option.label}
            </span>
          </button>
        ))}
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Toss log</h2>
            <p className="text-sm text-zinc-400">
              {lastToss ? describeToss(lastToss, playerNames) : "No tosses yet."}
            </p>
          </div>
          <button
            type="button"
            onClick={undoLastToss}
            disabled={
              data.tosses.length === 0 ||
              isSaving ||
              (data.source === "supabase" && data.match.status === "complete")
            }
            className="min-h-12 rounded-md border border-white/15 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Undo
          </button>
        </div>
        <ol className="mt-4 max-h-48 space-y-2 overflow-auto text-sm text-zinc-300">
          {data.tosses.map((toss) => (
            <li key={toss.id} className="flex justify-between gap-3">
              <span>
                Inning {toss.inning_number} · {playerNames[toss.player_slot]}
              </span>
              <span className="score-nums text-white">
                {formatTossOption(toss.value)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {data.source === "demo" ? (
        <button
          type="button"
          onClick={resetMatch}
          className="min-h-12 rounded-md border border-red-400/40 text-sm font-semibold text-red-200"
        >
          Reset demo match
        </button>
      ) : null}
    </main>
  );
}

function ScoreCard({
  name,
  score,
  active,
}: {
  name: string;
  score: number;
  active: boolean;
}) {
  return (
    <div
      className={[
        "rounded-lg border p-3",
        active ? "border-emerald-300 bg-emerald-300/10" : "border-white/10",
      ].join(" ")}
    >
      <p className="truncate text-sm font-semibold text-zinc-300">{name}</p>
      <p className="mt-1 text-6xl font-black leading-none text-white">{score}</p>
      <p className={active ? "mt-2 text-xs uppercase text-emerald-300" : "mt-2 text-xs uppercase text-transparent"}>
        Up next
      </p>
    </div>
  );
}

function ensureInning(data: DisplayMatchData, inningNumber: number): DisplayInning {
  const existing = data.innings.find((inning) => inning.number === inningNumber);

  if (existing) {
    return existing;
  }

  return {
    id: crypto.randomUUID(),
    match_id: data.match.id,
    number: inningNumber,
    phase: "regulation",
  };
}

function createInitialLocalMatch(matchId: string): DisplayMatchData {
  const match: DisplayMatch = {
    id: matchId,
    player1_name: "Player One",
    player2_name: "Player Two",
    first_tosser: 1,
    status: "active",
    winner_slot: null,
  };

  return {
    match,
    innings: [
      {
        id: `${match.id}-inning-1`,
        match_id: match.id,
        number: 1,
        phase: "regulation",
      },
    ],
    tosses: [],
    source: "demo",
  };
}

function describeToss(
  toss: DisplayToss,
  playerNames: Record<PlayerSlot, string>,
) {
  return `${playerNames[toss.player_slot]} · ${formatTossOption(toss.value)} (${TOSS_LABELS[toss.value]})`;
}
