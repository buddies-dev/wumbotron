import { NextResponse } from "next/server";
import { loadDisplayTournament } from "@/lib/bracket/load-display-tournament";

type DisplayTournamentRouteContext = {
  params: Promise<{
    tournamentId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: DisplayTournamentRouteContext,
) {
  const { tournamentId } = await context.params;
  const data = await loadDisplayTournament(tournamentId);

  if (!data) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(data);
}
