import { notFound } from "next/navigation";
import { LiveMatch } from "@/components/display/LiveMatch";
import { loadDisplayMatch } from "@/lib/match/load-display-match";

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

  return <LiveMatch initialData={data} />;
}
