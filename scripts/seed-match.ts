import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

const { data: match, error: matchError } = await supabase
  .from("match")
  .insert({
    player1_name: "Ada",
    player2_name: "Grace",
    first_tosser: 1,
  })
  .select()
  .single();

if (matchError) {
  throw matchError;
}

const { data: insertedInnings, error: inningsError } = await supabase
  .from("inning")
  .insert([
    { match_id: match.id, number: 1 },
    { match_id: match.id, number: 2 },
    { match_id: match.id, number: 3 },
  ])
  .select();

if (inningsError) {
  throw inningsError;
}

const inningByNumber = new Map(
  insertedInnings.map((inning) => [inning.number, inning.id]),
);

const { error: tossesError } = await supabase.from("toss").insert([
  {
    inning_id: inningByNumber.get(1)!,
    player_slot: 1,
    value: 3,
    order_in_inning: 1,
  },
  {
    inning_id: inningByNumber.get(1)!,
    player_slot: 2,
    value: 2,
    order_in_inning: 2,
  },
  {
    inning_id: inningByNumber.get(2)!,
    player_slot: 1,
    value: 1,
    order_in_inning: 1,
  },
  {
    inning_id: inningByNumber.get(2)!,
    player_slot: 2,
    value: 3,
    order_in_inning: 2,
  },
  {
    inning_id: inningByNumber.get(3)!,
    player_slot: 1,
    value: 2,
    order_in_inning: 1,
  },
]);

if (tossesError) {
  throw tossesError;
}

console.log(`Seeded match ${match.id}`);
