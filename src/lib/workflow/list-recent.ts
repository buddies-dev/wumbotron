import { createClient } from "@/lib/supabase/server";

export type RecentMatch = {
  id: string;
  player1Name: string;
  player2Name: string;
  status: "active" | "complete";
  createdAt: string;
};

export type RecentTournament = {
  id: string;
  name: string;
  status: "active" | "complete" | "abandoned";
  createdAt: string;
};

export async function loadRecentMatches(limit = 5): Promise<RecentMatch[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match")
    .select("id, player1_name, player2_name, status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load recent matches: ${error.message}`);
  }

  return data.map((match) => ({
    id: match.id,
    player1Name: match.player1_name,
    player2Name: match.player2_name,
    status: match.status,
    createdAt: match.created_at,
  }));
}

export async function loadRecentTournaments(
  limit = 5,
): Promise<RecentTournament[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournament")
    .select("id, name, status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load recent tournaments: ${error.message}`);
  }

  return data.map((tournament) => ({
    id: tournament.id,
    name: tournament.name,
    status: tournament.status,
    createdAt: tournament.created_at,
  }));
}

function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
