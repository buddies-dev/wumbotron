"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { faCircleCheck, faTrophy } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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

type BracketRound = {
  round: number;
  matches: DisplayBracketMatch[];
};

type SplitBracket = {
  rounds: BracketRound[];
  left: BracketRound[];
  right: BracketRound[];
  final: DisplayBracketMatch | null;
};

type ConnectorPath = {
  id: string;
  d: string;
  highlighted: boolean;
};

type MeasuredRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  midY: number;
};

export function Bracket({
  data,
  connectionStatus = "live",
}: BracketProps) {
  const bracket = useMemo(() => splitBracketSides(data.matches), [data.matches]);
  const accentColor = normalizeAccent(data.tournament.accent_color);
  const playerById = useMemo(
    () => new Map(data.players.map((player) => [player.id, player])),
    [data.players],
  );

  return (
    <BracketBoard
      data={data}
      connectionStatus={connectionStatus}
      bracket={bracket}
      playerById={playerById}
      accentColor={accentColor}
    />
  );
}

function BracketBoard({
  data,
  connectionStatus,
  bracket,
  playerById,
  accentColor,
}: {
  data: DisplayTournamentData;
  connectionStatus: ConnectionStatus;
  bracket: SplitBracket;
  playerById: Map<string, DisplayTournamentPlayer>;
  accentColor: string;
}) {
  const boardRef = useRef<HTMLElement | null>(null);
  const [connectorPaths, setConnectorPaths] = useState<ConnectorPath[]>([]);
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });
  const activeAncestry = useMemo(
    () => getActiveAncestryIds(data.matches, data.activeBracketMatchId),
    [data.activeBracketMatchId, data.matches],
  );
  const matchSides = useMemo(() => getMatchSides(bracket), [bracket]);
  const finalMatch = bracket.final;
  const shouldRenderSplit = bracket.rounds.length > 1 && Boolean(finalMatch);

  useLayoutEffect(() => {
    const board = boardRef.current;

    if (!board || !shouldRenderSplit) {
      setConnectorPaths([]);
      setSvgSize({ width: 0, height: 0 });
      return;
    }

    let frame = 0;

    function measure() {
      const currentBoard = boardRef.current;

      if (!currentBoard) {
        return;
      }

      const boardRect = currentBoard.getBoundingClientRect();
      const rects = new Map<string, MeasuredRect>();

      currentBoard
        .querySelectorAll<HTMLElement>("[data-bracket-cell]")
        .forEach((cell) => {
          const id = cell.dataset.bracketCell;

          if (!id) {
            return;
          }

          const rect = cell.getBoundingClientRect();
          rects.set(id, {
            left: rect.left - boardRect.left,
            right: rect.right - boardRect.left,
            top: rect.top - boardRect.top,
            bottom: rect.bottom - boardRect.top,
            midY: rect.top - boardRect.top + rect.height / 2,
          });
        });

      setSvgSize({ width: boardRect.width, height: boardRect.height });
      setConnectorPaths(
        buildConnectorPaths({
          matches: data.matches,
          rects,
          sides: matchSides,
          activeBracketMatchId: data.activeBracketMatchId,
          activeAncestry,
        }),
      );
    }

    function scheduleMeasure() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    }

    scheduleMeasure();

    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(board);
    board
      .querySelectorAll<HTMLElement>("[data-bracket-cell]")
      .forEach((cell) => observer.observe(cell));

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [
    activeAncestry,
    data.activeBracketMatchId,
    data.matches,
    matchSides,
    shouldRenderSplit,
  ]);

  return (
    <main
      className="flex h-full min-h-0 flex-col gap-[3vmin]"
      style={accentStyle(accentColor)}
    >
      <BracketHeader data={data} connectionStatus={connectionStatus} />
      {shouldRenderSplit ? (
        <section
          ref={boardRef}
          className="relative grid min-h-0 flex-1 gap-[3vw]"
          style={{
            gridTemplateColumns: `repeat(${bracket.rounds.length - 1}, minmax(0, 1fr)) minmax(18vmin, 0.9fr) repeat(${bracket.rounds.length - 1}, minmax(0, 1fr))`,
          }}
        >
          <ConnectorOverlay paths={connectorPaths} size={svgSize} />
          {bracket.left.map((round) => (
            <BracketRoundColumn
              key={`left-${round.round}`}
              round={round}
              totalRounds={bracket.rounds.length}
              players={playerById}
              activeBracketMatchId={data.activeBracketMatchId}
              championPlayerId={data.championPlayerId}
            />
          ))}
          <section className="relative z-10 flex min-h-0 flex-col gap-[2vmin]">
            <h2 className="text-center text-display-label font-semibold uppercase text-zinc-500">
              {roundName(bracket.rounds.length, bracket.rounds.length)}
            </h2>
            <div className="flex min-h-0 flex-1 flex-col justify-center">
              {finalMatch ? (
                <BracketCell
                  match={finalMatch}
                  players={playerById}
                  isActive={finalMatch.id === data.activeBracketMatchId}
                  championPlayerId={data.championPlayerId}
                  isFinal
                />
              ) : null}
            </div>
          </section>
          {bracket.right.toReversed().map((round) => (
            <BracketRoundColumn
              key={`right-${round.round}`}
              round={round}
              totalRounds={bracket.rounds.length}
              players={playerById}
              activeBracketMatchId={data.activeBracketMatchId}
              championPlayerId={data.championPlayerId}
              align="right"
            />
          ))}
        </section>
      ) : (
        <section
          className="grid min-h-0 flex-1 gap-[3vw]"
          style={{
            gridTemplateColumns: `repeat(${bracket.rounds.length}, minmax(0, 1fr))`,
          }}
        >
          {bracket.rounds.map((round) => (
            <BracketRoundColumn
              key={round.round}
              round={round}
              totalRounds={bracket.rounds.length}
              players={playerById}
              activeBracketMatchId={data.activeBracketMatchId}
              championPlayerId={data.championPlayerId}
            />
          ))}
        </section>
      )}
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
        <p className="text-display-label font-semibold uppercase text-[var(--accent)]">
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

function ConnectorOverlay({
  paths,
  size,
}: {
  paths: ConnectorPath[];
  size: { width: number; height: number };
}) {
  if (size.width === 0 || size.height === 0) {
    return null;
  }

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0"
      width={size.width}
      height={size.height}
      viewBox={`0 0 ${size.width} ${size.height}`}
    >
      {paths.map((path) => (
        <path
          key={path.id}
          d={path.d}
          fill="none"
          stroke={path.highlighted ? "var(--accent)" : "rgba(255,255,255,0.25)"}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={path.highlighted ? 2.25 : 1.5}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

function BracketRoundColumn({
  round,
  totalRounds,
  players,
  activeBracketMatchId,
  championPlayerId,
  align = "left",
}: {
  round: BracketRound;
  totalRounds: number;
  players: Map<string, DisplayTournamentPlayer>;
  activeBracketMatchId: string | null;
  championPlayerId: string | null;
  align?: "left" | "right";
}) {
  return (
    <section className="relative z-10 flex min-h-0 flex-col gap-[2vmin]">
      <h2
        className={[
          "text-display-label font-semibold uppercase text-zinc-500",
          align === "right" ? "text-right" : "",
        ].join(" ")}
      >
        {roundName(round.round, totalRounds)}
      </h2>
      <div className="flex min-h-0 flex-1 flex-col justify-around gap-[3vmin]">
        {round.matches.map((match) => (
          <BracketCell
            key={match.id}
            match={match}
            players={players}
            isActive={match.id === activeBracketMatchId}
            championPlayerId={championPlayerId}
          />
        ))}
      </div>
    </section>
  );
}

function BracketCell({
  match,
  players,
  isActive,
  championPlayerId,
  isFinal = false,
}: {
  match: DisplayBracketMatch;
  players: Map<string, DisplayTournamentPlayer>;
  isActive: boolean;
  championPlayerId: string | null;
  isFinal?: boolean;
}) {
  const player1 = match.player1_id ? players.get(match.player1_id) : null;
  const player2 = match.player2_id ? players.get(match.player2_id) : null;
  const winnerId = match.winner_player_id;

  return (
    <article
      data-bracket-cell={match.id}
      className={[
        "relative min-h-[13vmin] overflow-hidden rounded-md border bg-zinc-950/80 p-[1.4vmin] shadow-2xl",
        isActive
          ? "border-[var(--accent)] shadow-[0_0_3rem_var(--accent-glow)]"
          : "border-white/10",
      ].join(" ")}
    >
      <div className="mb-[1vmin] flex items-center justify-between gap-[1vw]">
        <span
          className={[
            "rounded-sm px-[0.7vmin] py-[0.35vmin] text-[clamp(0.7rem,0.9vw,1rem)] font-bold uppercase tracking-[0.14em]",
            match.status === "live"
              ? "bg-[var(--accent)] text-black"
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
          isChampion={isFinal && championPlayerId === player1?.id}
          isEmpty={!player1}
        />
        <PlayerLine
          name={player2?.name ?? "TBD"}
          seed={player2?.seed ?? null}
          score={match.p2Score}
          isWinner={winnerId === player2?.id}
          isChampion={isFinal && championPlayerId === player2?.id}
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
  isChampion,
  isEmpty,
}: {
  name: string;
  seed: number | null;
  score: number | null;
  isWinner: boolean;
  isChampion: boolean;
  isEmpty: boolean;
}) {
  const winnerIcon = isChampion ? faTrophy : faCircleCheck;
  const winnerIconClass = isChampion ? "text-amber-300" : "text-emerald-300";

  return (
    <div
      className={[
        "grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[0.8vmin] rounded-sm py-[0.65vmin]",
        isWinner ? "text-white" : "text-zinc-300",
        isEmpty ? "text-zinc-600" : "",
      ].join(" ")}
    >
      <span className="score-nums w-[2.2ch] text-[clamp(0.8rem,1vw,1.2rem)] font-semibold text-zinc-500">
        {seed ?? "-"}
      </span>
      <span className="flex min-w-0 items-center gap-[0.7vmin]">
        {isWinner ? (
          <FontAwesomeIcon
            icon={winnerIcon}
            className={[
              "shrink-0 text-[clamp(0.9rem,1.15vw,1.4rem)]",
              winnerIconClass,
            ].join(" ")}
          />
        ) : null}
        <span className="truncate text-[clamp(1.05rem,1.5vw,2rem)] font-black">
          {name}
        </span>
      </span>
      <span className="score-nums text-[clamp(1.4rem,2.4vw,3rem)] font-black leading-none">
        {score ?? "-"}
      </span>
    </div>
  );
}

function splitBracketSides(matches: DisplayBracketMatch[]): SplitBracket {
  const roundCount = Math.max(...matches.map((match) => match.round), 1);
  const rounds = Array.from({ length: roundCount }, (_, index) => {
    const round = index + 1;

    return {
      round,
      matches: matches
        .filter((match) => match.round === round)
        .toSorted((a, b) => a.position - b.position),
    };
  });

  if (rounds.length <= 1) {
    return {
      rounds,
      left: rounds,
      right: [],
      final: null,
    };
  }

  const sideRounds = rounds.slice(0, -1);
  const left = sideRounds.map((round) => ({
    round: round.round,
    matches: round.matches.slice(0, Math.ceil(round.matches.length / 2)),
  }));
  const right = sideRounds.map((round) => ({
    round: round.round,
    matches: round.matches.slice(Math.ceil(round.matches.length / 2)),
  }));

  return {
    rounds,
    left,
    right,
    final: rounds.at(-1)?.matches[0] ?? null,
  };
}

function getMatchSides(bracket: SplitBracket) {
  const sides = new Map<string, "left" | "right" | "final">();

  for (const round of bracket.left) {
    for (const match of round.matches) {
      sides.set(match.id, "left");
    }
  }

  for (const round of bracket.right) {
    for (const match of round.matches) {
      sides.set(match.id, "right");
    }
  }

  if (bracket.final) {
    sides.set(bracket.final.id, "final");
  }

  return sides;
}

function getActiveAncestryIds(
  matches: DisplayBracketMatch[],
  activeBracketMatchId: string | null,
) {
  const ancestry = new Set<string>();

  if (!activeBracketMatchId) {
    return ancestry;
  }

  const childrenByParentId = new Map<string, DisplayBracketMatch[]>();

  for (const match of matches) {
    if (!match.next_bracket_match_id) {
      continue;
    }

    childrenByParentId.set(match.next_bracket_match_id, [
      ...(childrenByParentId.get(match.next_bracket_match_id) ?? []),
      match,
    ]);
  }

  function visit(matchId: string) {
    for (const child of childrenByParentId.get(matchId) ?? []) {
      ancestry.add(child.id);
      visit(child.id);
    }
  }

  visit(activeBracketMatchId);
  return ancestry;
}

function buildConnectorPaths({
  matches,
  rects,
  sides,
  activeBracketMatchId,
  activeAncestry,
}: {
  matches: DisplayBracketMatch[];
  rects: Map<string, MeasuredRect>;
  sides: Map<string, "left" | "right" | "final">;
  activeBracketMatchId: string | null;
  activeAncestry: Set<string>;
}) {
  const matchById = new Map(matches.map((match) => [match.id, match]));

  return matches.flatMap<ConnectorPath>((match) => {
    if (!match.next_bracket_match_id) {
      return [];
    }

    const sourceRect = rects.get(match.id);
    const parentRect = rects.get(match.next_bracket_match_id);
    const parent = matchById.get(match.next_bracket_match_id);
    const side = sides.get(match.id);

    if (!sourceRect || !parentRect || !parent || !side || side === "final") {
      return [];
    }

    const sourceX = side === "right" ? sourceRect.left : sourceRect.right;
    const targetX = side === "right" ? parentRect.right : parentRect.left;
    const gutterX = sourceX + (targetX - sourceX) / 2;
    const d = [
      `M ${sourceX} ${sourceRect.midY}`,
      `H ${gutterX}`,
      `V ${parentRect.midY}`,
      `H ${targetX}`,
    ].join(" ");
    const highlighted =
      activeAncestry.has(match.id) ||
      match.id === activeBracketMatchId ||
      (parent.id === activeBracketMatchId &&
        (match.status === "complete" || match.status === "bye"));

    return [
      {
        id: `${match.id}-${parent.id}`,
        d,
        highlighted,
      },
    ];
  });
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

function normalizeAccent(value: string | null) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#7dd3fc";
}

function accentStyle(accentColor: string): CSSProperties {
  return {
    "--accent": accentColor,
    "--accent-glow": `${accentColor}55`,
  } as CSSProperties;
}
