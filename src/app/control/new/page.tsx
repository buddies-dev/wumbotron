"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function NewMatchPage() {
  const router = useRouter();
  const [player1Name, setPlayer1Name] = useState("Player One");
  const [player2Name, setPlayer2Name] = useState("Player Two");
  const [firstTosser, setFirstTosser] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canUseSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  async function createMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!canUseSupabase) {
      setError("Supabase environment variables are required to create matches.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data: match, error: matchError } = await supabase
        .from("match")
        .insert({
          player1_name: player1Name.trim() || "Player One",
          player2_name: player2Name.trim() || "Player Two",
          first_tosser: firstTosser,
        })
        .select("id")
        .single();

      if (matchError) {
        throw new Error(matchError.message);
      }

      const { error: inningError } = await supabase.from("inning").insert({
        match_id: match.id,
        number: 1,
        phase: "regulation",
      });

      if (inningError) {
        throw new Error(inningError.message);
      }

      router.push(`/control/${match.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Match failed.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4 py-8">
      <form
        onSubmit={createMatch}
        className="w-full rounded-lg border border-white/10 bg-white/[0.04] p-5"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
          New match
        </p>
        <h1 className="mt-2 text-4xl font-bold text-white">Create control room</h1>

        <label className="mt-6 block">
          <span className="text-sm font-semibold text-zinc-300">Player one</span>
          <input
            value={player1Name}
            onChange={(event) => setPlayer1Name(event.target.value)}
            className="mt-2 min-h-14 w-full rounded-md border border-white/10 bg-black px-4 text-lg text-white"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-semibold text-zinc-300">Player two</span>
          <input
            value={player2Name}
            onChange={(event) => setPlayer2Name(event.target.value)}
            className="mt-2 min-h-14 w-full rounded-md border border-white/10 bg-black px-4 text-lg text-white"
          />
        </label>

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-zinc-300">
            First tosser
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {[1, 2].map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setFirstTosser(slot as 1 | 2)}
                className={[
                  "min-h-14 rounded-md border px-4 font-semibold",
                  firstTosser === slot
                    ? "border-emerald-300 bg-emerald-300/15 text-white"
                    : "border-white/10 text-zinc-300",
                ].join(" ")}
              >
                Player {slot}
              </button>
            ))}
          </div>
        </fieldset>

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
          {isSubmitting ? "Creating..." : "Start match"}
        </button>
      </form>
    </main>
  );
}
