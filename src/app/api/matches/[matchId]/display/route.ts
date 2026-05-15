import { NextResponse } from "next/server";
import { loadDisplayMatch } from "@/lib/match/load-display-match";

type DisplayMatchRouteContext = {
  params: Promise<{
    matchId: string;
  }>;
};

export async function GET(_request: Request, context: DisplayMatchRouteContext) {
  const { matchId } = await context.params;
  const data = await loadDisplayMatch(matchId);

  if (!data) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
