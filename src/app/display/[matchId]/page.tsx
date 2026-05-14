import { notFound } from "next/navigation";
import { Scoreboard } from "@/components/display/Scoreboard";
import { loadDisplayMatch } from "@/lib/match/load-display-match";
import { deriveMatchState } from "@/lib/match/state";

type DisplayPageProps = {
  params: Promise<{
    matchId: string;
  }>;
};

export default async function DisplayPage({ params }: DisplayPageProps) {
  const { matchId } = await params;
  const data = await loadDisplayMatch(matchId);

  if (!data) {
    notFound();
  }

  const state = deriveMatchState(data.match, data.tosses);
  const lastToss = data.tosses.at(-1) ?? null;

  return (
    <Scoreboard
      match={data.match}
      state={state}
      lastToss={lastToss}
      source={data.source}
    />
  );
}
