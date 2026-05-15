"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import type { DisplayMatchData } from "@/lib/match/demo";

const STORAGE_PREFIX = "wumbotron:control:";

export default function NewMatchPage() {
  const router = useRouter();
  const [player1Name, setPlayer1Name] = useState("Player One");
  const [player2Name, setPlayer2Name] = useState("Player Two");
  const [firstTosser, setFirstTosser] = useState<1 | 2>(1);

  function createLocalMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const id = `local-${crypto.randomUUID().slice(0, 8)}`;
    const data: DisplayMatchData = {
      match: {
        id,
        player1_name: player1Name.trim() || "Player One",
        player2_name: player2Name.trim() || "Player Two",
        first_tosser: firstTosser,
        status: "active",
        winner_slot: null,
      },
      innings: [
        {
          id: crypto.randomUUID(),
          match_id: id,
          number: 1,
          phase: "regulation",
        },
      ],
      tosses: [],
      source: "demo",
    };

    window.localStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(data));
    router.push(`/control/${id}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4 py-8">
      <form
        onSubmit={createLocalMatch}
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

        <button
          type="submit"
          className="mt-6 min-h-14 w-full rounded-md bg-emerald-300 px-5 text-lg font-black text-black"
        >
          Start match
        </button>
      </form>
    </main>
  );
}
