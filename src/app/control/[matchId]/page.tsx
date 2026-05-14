"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

export default function ControlPage() {
  const { matchId } = useParams<{ matchId: string }>();

  useEffect(() => {
    console.log("control match id:", matchId);
  }, [matchId]);

  return (
    <main className="flex flex-1 items-center justify-center px-8 py-16">
      <section className="w-full max-w-3xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
          Control
        </p>
        <h1 className="text-5xl font-semibold tracking-normal text-white">
          Match {matchId}
        </h1>
        <p className="mt-6 text-xl leading-8 text-zinc-300">
          This control shell is intentionally empty until the match data model
          lands.
        </p>
      </section>
    </main>
  );
}
