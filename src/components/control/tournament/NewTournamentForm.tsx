"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { createTournament } from "@/lib/tournament/create";
import { createClient } from "@/lib/supabase/client";

export function NewTournamentForm() {
  const router = useRouter();
  const [name, setName] = useState("Backyard Classic");
  const [players, setPlayers] = useState([
    "Player One",
    "Player Two",
    "Player Three",
    "Player Four",
    "Player Five",
    "Player Six",
    "Player Seven",
    "Player Eight",
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canUseSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!canUseSupabase) {
      setError("Supabase environment variables are required to create tournaments.");
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await createTournament(createClient(), name, players);
      router.push(`/control/tournament/${created.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tournament failed.");
      setIsSubmitting(false);
    }
  }

  function updatePlayer(index: number, value: string) {
    setPlayers((current) =>
      current.map((player, playerIndex) =>
        playerIndex === index ? value : player,
      ),
    );
  }

  function removePlayer(index: number) {
    setPlayers((current) => current.filter((_, playerIndex) => playerIndex !== index));
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
      <form
        onSubmit={submit}
        className="w-full rounded-lg border border-white/10 bg-white/[0.04] p-5"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
          New tournament
        </p>
        <h1 className="mt-2 text-4xl font-bold text-white">
          Build a bracket
        </h1>

        <label className="mt-6 block">
          <span className="text-sm font-semibold text-zinc-300">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 min-h-14 w-full rounded-md border border-white/10 bg-black px-4 text-lg text-white"
          />
        </label>

        <section className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white">Players</h2>
            <button
              type="button"
              onClick={() => setPlayers((current) => [...current, ""])}
              className="min-h-11 rounded-md border border-white/15 px-4 text-sm font-semibold text-white"
            >
              Add
            </button>
          </div>
          <div className="mt-3 grid gap-3">
            {players.map((player, index) => (
              <div
                key={index}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3"
              >
                <span className="score-nums w-7 text-right text-sm font-semibold text-zinc-500">
                  {index + 1}
                </span>
                <input
                  value={player}
                  onChange={(event) => updatePlayer(index, event.target.value)}
                  className="min-h-12 rounded-md border border-white/10 bg-black px-3 text-base text-white"
                />
                <button
                  type="button"
                  onClick={() => removePlayer(index)}
                  disabled={players.length <= 2}
                  className="min-h-12 rounded-md border border-white/15 px-3 text-sm font-semibold text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>

        {error ? (
          <p className="mt-4 rounded-md border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 min-h-14 w-full rounded-md bg-emerald-300 px-5 text-lg font-black text-black disabled:cursor-wait disabled:opacity-60"
        >
          {isSubmitting ? "Creating..." : "Generate bracket"}
        </button>
      </form>
    </main>
  );
}
