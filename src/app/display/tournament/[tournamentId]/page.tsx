import { notFound } from "next/navigation";
import { LiveTournament } from "@/components/display/LiveTournament";
import { loadDisplayTournament } from "@/lib/bracket/load-display-tournament";

type DisplayTournamentPageProps = {
  params: Promise<{
    tournamentId: string;
  }>;
};

export default async function DisplayTournamentPage({
  params,
}: DisplayTournamentPageProps) {
  const { tournamentId } = await params;
  const data = await loadDisplayTournament(tournamentId);

  if (!data) {
    notFound();
  }

  return <LiveTournament initialData={data} />;
}
