import { MatchControl } from "@/components/control/MatchControl";

type ControlPageProps = {
  params: Promise<{
    matchId: string;
  }>;
};

export default async function ControlPage({ params }: ControlPageProps) {
  const { matchId } = await params;

  return (
    <MatchControl matchId={matchId} />
  );
}
