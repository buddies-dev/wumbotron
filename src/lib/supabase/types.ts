export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      match: {
        Row: {
          id: string;
          player1_name: string;
          player2_name: string;
          first_tosser: 1 | 2;
          status: "active" | "complete";
          winner_slot: 1 | 2 | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          player1_name: string;
          player2_name: string;
          first_tosser: 1 | 2;
          status?: "active" | "complete";
          winner_slot?: 1 | 2 | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          player1_name?: string;
          player2_name?: string;
          first_tosser?: 1 | 2;
          status?: "active" | "complete";
          winner_slot?: 1 | 2 | null;
          created_at?: string;
        };
        Relationships: [];
      };
      inning: {
        Row: {
          id: string;
          match_id: string;
          number: number;
          phase: "regulation" | "redemption" | "overtime" | "sudden_death";
        };
        Insert: {
          id?: string;
          match_id: string;
          number: number;
          phase?: "regulation" | "redemption" | "overtime" | "sudden_death";
        };
        Update: {
          id?: string;
          match_id?: string;
          number?: number;
          phase?: "regulation" | "redemption" | "overtime" | "sudden_death";
        };
        Relationships: [
          {
            foreignKeyName: "inning_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "match";
            referencedColumns: ["id"];
          },
        ];
      };
      toss: {
        Row: {
          id: string;
          inning_id: string;
          player_slot: 1 | 2;
          value: -2 | 0 | 1 | 2 | 3;
          order_in_inning: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          inning_id: string;
          player_slot: 1 | 2;
          value: -2 | 0 | 1 | 2 | 3;
          order_in_inning: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          inning_id?: string;
          player_slot?: 1 | 2;
          value?: -2 | 0 | 1 | 2 | 3;
          order_in_inning?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "toss_inning_id_fkey";
            columns: ["inning_id"];
            isOneToOne: false;
            referencedRelation: "inning";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
