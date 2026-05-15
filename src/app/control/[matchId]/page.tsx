import { MatchControl } from "@/components/control/MatchControl";
import { loadDisplayMatch } from "@/lib/match/load-display-match";

type ControlPageProps = {
  params: Promise<{
    matchId: string;
  }>;
};

export default async function ControlPage({ params }: ControlPageProps) {
  const { matchId } = await params;
  const data = await loadDisplayMatch(matchId);

  return (
    <MatchControl matchId={matchId} initialData={data} />
  );
}
