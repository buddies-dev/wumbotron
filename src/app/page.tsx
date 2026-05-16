import Link from "next/link";
import {
  loadRecentMatches,
  loadRecentTournaments,
  type RecentMatch,
  type RecentTournament,
} from "@/lib/workflow/list-recent";

export default async function Home() {
  const [matches, tournaments] = await Promise.all([
    loadRecentMatches(5),
    loadRecentTournaments(5),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-5 py-10 sm:px-8">
      <section className="grid gap-8 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">
            Wumbotron
          </p>
          <h1 className="mt-4 max-w-3xl text-5xl font-black leading-[0.95] tracking-normal text-white sm:text-7xl">
            Run the match. Feed the TV.
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-zinc-300">
            Create a shoveltoss control room, put the display URL on a TV, and
            keep scoring from a phone or laptop.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <PrimaryAction
            href="/control/new"
            label="New match"
            description="Start a single head-to-head control room."
          />
          <PrimaryAction
            href="/control/tournament/new"
            label="New tournament"
            description="Seed players and run a single-elim bracket."
          />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <RecentMatches matches={matches} />
        <RecentTournaments tournaments={tournaments} />
      </section>

      <footer className="border-t border-white/10 pt-5">
        <Link
          href="/demos"
          className="text-sm font-semibold text-zinc-400 transition hover:text-sky-200"
        >
          Demos
        </Link>
      </footer>
    </main>
  );
}

function PrimaryAction({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-emerald-300/40 bg-emerald-300 px-5 py-5 text-black transition hover:bg-emerald-200"
    >
      <span className="block text-2xl font-black">{label}</span>
      <span className="mt-2 block text-sm font-semibold text-black/70">
        {description}
      </span>
    </Link>
  );
}

function RecentMatches({ matches }: { matches: RecentMatch[] }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-xl font-bold text-white">Recent matches</h2>
      {matches.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">
          No matches yet. Start one above.
        </p>
      ) : (
        <div className="mt-4 grid gap-3">
          {matches.map((match) => (
            <Link
              key={match.id}
              href={`/control/${match.id}`}
              className="rounded-md border border-white/10 bg-black/40 p-4 transition hover:border-sky-300/60"
            >
              <span className="block truncate text-lg font-bold text-white">
                {match.player1Name} vs {match.player2Name}
              </span>
              <span className="mt-2 flex items-center justify-between gap-3 text-sm uppercase tracking-[0.14em] text-zinc-500">
                <span>{match.status}</span>
                <span className="score-nums">
                  {formatDate(match.createdAt)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function RecentTournaments({
  tournaments,
}: {
  tournaments: RecentTournament[];
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-xl font-bold text-white">Recent tournaments</h2>
      {tournaments.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">
          No tournaments yet. Start one above.
        </p>
      ) : (
        <div className="mt-4 grid gap-3">
          {tournaments.map((tournament) => (
            <Link
              key={tournament.id}
              href={`/control/tournament/${tournament.id}`}
              className="rounded-md border border-white/10 bg-black/40 p-4 transition hover:border-sky-300/60"
            >
              <span className="block truncate text-lg font-bold text-white">
                {tournament.name}
              </span>
              <span className="mt-2 flex items-center justify-between gap-3 text-sm uppercase tracking-[0.14em] text-zinc-500">
                <span>{tournament.status}</span>
                <span className="score-nums">
                  {formatDate(tournament.createdAt)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
