import { notFound } from "next/navigation";
import { TournamentControl } from "@/components/control/tournament/TournamentControl";
import { loadDisplayTournament } from "@/lib/bracket/load-display-tournament";

type TournamentControlPageProps = {
  params: Promise<{
    tournamentId: string;
  }>;
};

export default async function TournamentControlPage({
  params,
}: TournamentControlPageProps) {
  const { tournamentId } = await params;
  const data = await loadDisplayTournament(tournamentId);

  if (!data) {
    notFound();
  }

  return <TournamentControl initialData={data} />;
}
