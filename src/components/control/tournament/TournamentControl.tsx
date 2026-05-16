"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
  DisplayBracketMatch,
  DisplayTournamentData,
  DisplayTournamentPlayer,
} from "@/lib/bracket/load-display-tournament";
import { createClient } from "@/lib/supabase/client";
import { DisplayLinkStrip } from "@/components/control/DisplayLinkStrip";

type TournamentControlProps = {
  initialData: DisplayTournamentData;
};

export function TournamentControl({ initialData }: TournamentControlProps) {
  const [data, setData] = useState(initialData);
  const [message, setMessage] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const canUseSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const supabase = useMemo(
    () => (canUseSupabase ? createClient() : null),
    [canUseSupabase],
  );
  const playerById = useMemo(
    () => new Map(data.players.map((player) => [player.id, player])),
    [data.players],
  );
  const completed = data.matches.filter(
    (match) => match.status === "complete" || match.status === "bye",
  ).length;
  const hasTosses = data.matches.some((match) => match.tosses.length > 0);

  const refetchTournament = useCallback(async () => {
    const response = await fetch(
      `/api/tournaments/${data.tournament.id}/display`,
      { cache: "no-store" },
    );

    if (response.ok) {
      setData((await response.json()) as DisplayTournamentData);
    }
  }, [data.tournament.id]);

  useEffect(() => {
    if (data.source !== "supabase" || !supabase) {
      return;
    }

    const channel = supabase
      .channel(`control:tournament:${data.tournament.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament",
          filter: `id=eq.${data.tournament.id}`,
        },
        refetchTournament,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bracket_match",
          filter: `tournament_id=eq.${data.tournament.id}`,
        },
        refetchTournament,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match",
        },
        refetchTournament,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "toss",
        },
        refetchTournament,
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [data.source, data.tournament.id, refetchTournament, supabase]);

  async function setFeatured(matchId: string | null) {
    if (!supabase) {
      setMessage("Supabase environment variables are required.");
      return;
    }

    const nextMatchId =
      data.tournament.featured_match_id === matchId ? null : matchId;
    const { error } = await supabase
      .from("tournament")
      .update({ featured_match_id: nextMatchId })
      .eq("id", data.tournament.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setData((current) => ({
      ...current,
      tournament: {
        ...current.tournament,
        featured_match_id: nextMatchId,
      },
      activeBracketMatchId:
        current.matches.find((match) => match.match_id === nextMatchId)?.id ??
        current.activeBracketMatchId,
    }));
  }

  async function renamePlayer(player: DisplayTournamentPlayer, name: string) {
    if (!supabase) {
      setMessage("Supabase environment variables are required.");
      return;
    }

    const nextName = name.trim();

    if (!nextName || hasTosses) {
      return;
    }

    const { error } = await supabase
      .from("player")
      .update({ name: nextName })
      .eq("id", player.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setData((current) => ({
      ...current,
      players: current.players.map((item) =>
        item.id === player.id ? { ...item, name: nextName } : item,
      ),
    }));
  }

  async function abandonTournament() {
    if (!supabase) {
      setMessage("Supabase environment variables are required.");
      return;
    }

    const { error } = await supabase
      .from("tournament")
      .update({ status: "abandoned" })
      .eq("id", data.tournament.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setData((current) => ({
      ...current,
      tournament: { ...current.tournament, status: "abandoned" },
    }));
  }

  async function updateAccentColor(accentColor: string) {
    if (!supabase) {
      setMessage("Supabase environment variables are required.");
      return;
    }

    const { error } = await supabase
      .from("tournament")
      .update({ accent_color: accentColor })
      .eq("id", data.tournament.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setData((current) => ({
      ...current,
      tournament: { ...current.tournament, accent_color: accentColor },
    }));
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-5 sm:px-6">
      <header className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Tournament control
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">
              {data.tournament.name}
            </h1>
            <p className="score-nums mt-2 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-400">
              {completed}/{data.matches.length} matches complete
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex min-h-11 items-center gap-2 rounded-md border border-white/15 px-3 text-sm font-semibold text-zinc-300">
              Accent
              <input
                type="color"
                value={data.tournament.accent_color ?? "#7dd3fc"}
                onChange={(event) => updateAccentColor(event.target.value)}
                className="size-7 rounded-sm border-0 bg-transparent p-0"
                aria-label="Tournament accent color"
              />
            </label>
            <button
              type="button"
              onClick={abandonTournament}
              disabled={data.tournament.status !== "active"}
              className="min-h-11 rounded-md border border-red-400/40 px-4 text-sm font-semibold text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Abandon
            </button>
          </div>
        </div>
      </header>

      {message ? (
        <p className="rounded-md border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">
          {message}
        </p>
      ) : null}

      <DisplayLinkStrip path={`/display/tournament/${data.tournament.id}`} />

      <section className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <h2 className="text-lg font-bold text-white">Seeds</h2>
          <div className="mt-3 grid gap-2">
            {data.players.map((player) => (
              <label
                key={player.id}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2"
              >
                <span className="score-nums w-6 text-right text-sm font-semibold text-zinc-500">
                  {player.seed}
                </span>
                <input
                  defaultValue={player.name}
                  disabled={hasTosses}
                  onBlur={(event) => renamePlayer(player, event.target.value)}
                  className="min-h-10 rounded-md border border-white/10 bg-black px-3 text-sm text-white disabled:text-zinc-500"
                />
              </label>
            ))}
          </div>
          <p className="mt-3 text-sm text-zinc-500">
            {hasTosses ? "Player edits lock after the first toss." : "Names can be edited before play starts."}
          </p>
        </aside>

        <section className="grid gap-4 md:grid-cols-3">
          {groupByRound(data.matches).map((roundMatches, roundIndex) => (
            <section key={roundIndex + 1} className="min-w-0">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {roundName(roundIndex + 1, groupByRound(data.matches).length)}
              </h2>
              <div className="grid gap-3">
                {roundMatches.map((match) => (
                  <ControlBracketCell
                    key={match.id}
                    match={match}
                    players={playerById}
                    featuredMatchId={data.tournament.featured_match_id}
                    onFeatured={setFeatured}
                  />
                ))}
              </div>
            </section>
          ))}
        </section>
      </section>
    </main>
  );
}

function ControlBracketCell({
  match,
  players,
  featuredMatchId,
  onFeatured,
}: {
  match: DisplayBracketMatch;
  players: Map<string, DisplayTournamentPlayer>;
  featuredMatchId: string | null;
  onFeatured: (matchId: string | null) => void;
}) {
  const player1 = match.player1_id ? players.get(match.player1_id) : null;
  const player2 = match.player2_id ? players.get(match.player2_id) : null;
  const isFeatured = Boolean(match.match_id && match.match_id === featuredMatchId);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 transition hover:border-emerald-300/60">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          {match.status}
        </span>
        {match.match_id && match.status === "live" ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              onFeatured(match.match_id);
            }}
            className={[
              "size-9 rounded-md border text-lg",
              isFeatured
                ? "border-amber-300 bg-amber-300 text-black"
                : "border-white/15 text-zinc-300",
            ].join(" ")}
            aria-label={isFeatured ? "Unset featured match" : "Set featured match"}
          >
            ★
          </button>
        ) : null}
      </div>
      <PlayerRow
        name={player1?.name ?? "TBD"}
        score={match.p1Score}
        winner={match.winner_player_id === player1?.id}
      />
      <PlayerRow
        name={player2?.name ?? "TBD"}
        score={match.p2Score}
        winner={match.winner_player_id === player2?.id}
      />
      {match.match_id ? (
        <Link
          href={`/control/${match.match_id}`}
          className="mt-3 block min-h-10 rounded-md bg-emerald-300 px-3 py-2 text-center text-sm font-black text-black"
        >
          Open match
        </Link>
      ) : null}
    </div>
  );
}

function PlayerRow({
  name,
  score,
  winner,
}: {
  name: string;
  score: number | null;
  winner: boolean;
}) {
  return (
    <div
      className={[
        "mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-2",
        winner ? "bg-emerald-300/15 text-white" : "text-zinc-300",
      ].join(" ")}
    >
      <span className="truncate font-semibold">{name}</span>
      <span className="score-nums text-2xl font-black">{score ?? "-"}</span>
    </div>
  );
}

function groupByRound(matches: DisplayBracketMatch[]) {
  const roundCount = Math.max(...matches.map((match) => match.round), 1);

  return Array.from({ length: roundCount }, (_, index) =>
    matches
      .filter((match) => match.round === index + 1)
      .toSorted((a, b) => a.position - b.position),
  );
}

function roundName(round: number, totalRounds: number) {
  if (round === totalRounds) {
    return "Final";
  }

  if (round === totalRounds - 1) {
    return "Semifinal";
  }

  return `Round ${round}`;
}
