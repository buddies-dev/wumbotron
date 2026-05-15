import { ConnectionDot, type ConnectionStatus } from "./ConnectionDot";
import { FitText } from "./FitText";
import type {
  DisplayBracketMatch,
  DisplayTournamentData,
  DisplayTournamentPlayer,
} from "@/lib/bracket/load-display-tournament";

type BracketProps = {
  data: DisplayTournamentData;
  connectionStatus?: ConnectionStatus;
};

const STATUS_LABELS: Record<DisplayBracketMatch["status"], string> = {
  pending: "pending",
  live: "live",
  complete: "final",
  bye: "bye",
};

export function Bracket({
  data,
  connectionStatus = "live",
}: BracketProps) {
  const playerById = new Map(data.players.map((player) => [player.id, player]));
  const rounds = groupByRound(data.matches);
  const champion = data.championPlayerId
    ? playerById.get(data.championPlayerId) ?? null
    : null;

  if (data.tournament.status === "complete" && champion) {
    return (
      <ChampionView
        data={data}
        champion={champion}
        connectionStatus={connectionStatus}
      />
    );
  }

  return (
    <main className="flex h-full min-h-0 flex-col gap-[3vmin]">
      <BracketHeader data={data} connectionStatus={connectionStatus} />
      <section
        className="grid min-h-0 flex-1 gap-[2.4vw]"
        style={{ gridTemplateColumns: `repeat(${rounds.length}, minmax(0, 1fr))` }}
      >
        {rounds.map((roundMatches, index) => (
          <section
            key={index + 1}
            className="flex min-h-0 flex-col gap-[2vmin]"
          >
            <h2 className="text-display-label font-semibold uppercase text-zinc-500">
              {roundName(index + 1, rounds.length)}
            </h2>
            <div className="flex min-h-0 flex-1 flex-col justify-around gap-[2vmin]">
              {roundMatches.map((match) => (
                <BracketCell
                  key={match.id}
                  match={match}
                  players={playerById}
                  isActive={match.id === data.activeBracketMatchId}
                />
              ))}
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}

function ChampionView({
  data,
  champion,
  connectionStatus,
}: {
  data: DisplayTournamentData;
  champion: DisplayTournamentPlayer;
  connectionStatus: ConnectionStatus;
}) {
  return (
    <main className="grid h-full min-h-0 grid-cols-[1.2fr_0.8fr] gap-[4vw]">
      <section className="flex min-w-0 flex-col justify-center">
        <div className="flex items-center justify-between gap-[2vw]">
          <p className="text-display-label font-semibold uppercase text-amber-300">
            Champion
          </p>
          <ConnectionDot status={connectionStatus} />
        </div>
        <FitText
          className="mt-[3vmin] h-[18vmin] w-full font-black"
          maxFontSize={210}
        >
          {champion.name}
        </FitText>
        <p className="mt-[3vmin] text-display-body text-zinc-300">
          {data.tournament.name}
        </p>
      </section>
      <aside className="min-h-0 opacity-80">
        <Bracket data={{ ...data, tournament: { ...data.tournament, status: "active" } }} />
      </aside>
    </main>
  );
}

function BracketHeader({
  data,
  connectionStatus,
}: {
  data: DisplayTournamentData;
  connectionStatus: ConnectionStatus;
}) {
  const completeCount = data.matches.filter(
    (match) => match.status === "complete" || match.status === "bye",
  ).length;

  return (
    <header className="flex items-start justify-between gap-[4vw]">
      <div className="min-w-0">
        <p className="text-display-label font-semibold uppercase text-sky-300">
          Tournament
          {data.source === "demo" ? (
            <span className="ml-[1vmin] text-zinc-500">demo</span>
          ) : null}
        </p>
        <FitText
          className="mt-[1vmin] h-[8vmin] w-full font-black"
          maxFontSize={96}
        >
          {data.tournament.name}
        </FitText>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-[1.4vmin]">
        <ConnectionDot status={connectionStatus} />
        <p className="score-nums text-display-label font-semibold uppercase text-zinc-400">
          {completeCount}/{data.matches.length}
        </p>
      </div>
    </header>
  );
}

function BracketCell({
  match,
  players,
  isActive,
}: {
  match: DisplayBracketMatch;
  players: Map<string, DisplayTournamentPlayer>;
  isActive: boolean;
}) {
  const player1 = match.player1_id ? players.get(match.player1_id) : null;
  const player2 = match.player2_id ? players.get(match.player2_id) : null;
  const winnerId = match.winner_player_id;

  return (
    <article
      className={[
        "relative min-h-[13vmin] rounded-md border bg-zinc-950/80 p-[1.4vmin] shadow-2xl",
        isActive
          ? "border-sky-300 shadow-[0_0_3rem_rgba(125,211,252,0.28)]"
          : "border-white/10",
      ].join(" ")}
    >
      <div className="mb-[1vmin] flex items-center justify-between gap-[1vw]">
        <span
          className={[
            "rounded-sm px-[0.7vmin] py-[0.35vmin] text-[clamp(0.7rem,0.9vw,1rem)] font-bold uppercase tracking-[0.14em]",
            match.status === "live"
              ? "bg-sky-300 text-black"
              : "bg-white/10 text-zinc-300",
          ].join(" ")}
        >
          {STATUS_LABELS[match.status]}
        </span>
        <span className="score-nums text-[clamp(0.8rem,1vw,1.2rem)] font-semibold text-zinc-500">
          {matchLabel(match)}
        </span>
      </div>
      <div className="grid gap-[0.7vmin]">
        <PlayerLine
          name={player1?.name ?? "TBD"}
          seed={player1?.seed ?? null}
          score={match.p1Score}
          isWinner={winnerId === player1?.id}
          isEmpty={!player1}
        />
        <PlayerLine
          name={player2?.name ?? "TBD"}
          seed={player2?.seed ?? null}
          score={match.p2Score}
          isWinner={winnerId === player2?.id}
          isEmpty={!player2}
        />
      </div>
    </article>
  );
}

function PlayerLine({
  name,
  seed,
  score,
  isWinner,
  isEmpty,
}: {
  name: string;
  seed: number | null;
  score: number | null;
  isWinner: boolean;
  isEmpty: boolean;
}) {
  return (
    <div
      className={[
        "grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[0.8vmin] rounded-sm px-[0.8vmin] py-[0.65vmin]",
        isWinner ? "bg-emerald-300/15 text-white" : "text-zinc-300",
        isEmpty ? "text-zinc-600" : "",
      ].join(" ")}
    >
      <span className="score-nums w-[2.2ch] text-[clamp(0.8rem,1vw,1.2rem)] font-semibold text-zinc-500">
        {seed ?? "-"}
      </span>
      <span className="truncate text-[clamp(1.05rem,1.5vw,2rem)] font-black">
        {name}
      </span>
      <span className="score-nums text-[clamp(1.4rem,2.4vw,3rem)] font-black leading-none">
        {score ?? "-"}
      </span>
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

function matchLabel(match: DisplayBracketMatch) {
  return `R${match.round}.${match.position + 1}`;
}
