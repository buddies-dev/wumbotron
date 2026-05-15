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
          bracket_match_id: string | null;
        };
        Insert: {
          id?: string;
          player1_name: string;
          player2_name: string;
          first_tosser: 1 | 2;
          status?: "active" | "complete";
          winner_slot?: 1 | 2 | null;
          created_at?: string;
          bracket_match_id?: string | null;
        };
        Update: {
          id?: string;
          player1_name?: string;
          player2_name?: string;
          first_tosser?: 1 | 2;
          status?: "active" | "complete";
          winner_slot?: 1 | 2 | null;
          created_at?: string;
          bracket_match_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "match_bracket_match_id_fkey";
            columns: ["bracket_match_id"];
            isOneToOne: false;
            referencedRelation: "bracket_match";
            referencedColumns: ["id"];
          },
        ];
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
      tournament: {
        Row: {
          id: string;
          name: string;
          format: "single_elim";
          status: "active" | "complete";
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          format?: "single_elim";
          status?: "active" | "complete";
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          format?: "single_elim";
          status?: "active" | "complete";
          created_at?: string;
        };
        Relationships: [];
      };
      player: {
        Row: {
          id: string;
          tournament_id: string;
          name: string;
          seed: number;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          name: string;
          seed: number;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          name?: string;
          seed?: number;
        };
        Relationships: [
          {
            foreignKeyName: "player_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournament";
            referencedColumns: ["id"];
          },
        ];
      };
      bracket_match: {
        Row: {
          id: string;
          tournament_id: string;
          round: number;
          position: number;
          player1_id: string | null;
          player2_id: string | null;
          match_id: string | null;
          next_bracket_match_id: string | null;
          next_slot: 1 | 2 | null;
          winner_player_id: string | null;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          round: number;
          position: number;
          player1_id?: string | null;
          player2_id?: string | null;
          match_id?: string | null;
          next_bracket_match_id?: string | null;
          next_slot?: 1 | 2 | null;
          winner_player_id?: string | null;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          round?: number;
          position?: number;
          player1_id?: string | null;
          player2_id?: string | null;
          match_id?: string | null;
          next_bracket_match_id?: string | null;
          next_slot?: 1 | 2 | null;
          winner_player_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bracket_match_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournament";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bracket_match_player1_id_fkey";
            columns: ["player1_id"];
            isOneToOne: false;
            referencedRelation: "player";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bracket_match_player2_id_fkey";
            columns: ["player2_id"];
            isOneToOne: false;
            referencedRelation: "player";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bracket_match_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "match";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bracket_match_next_bracket_match_id_fkey";
            columns: ["next_bracket_match_id"];
            isOneToOne: false;
            referencedRelation: "bracket_match";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bracket_match_winner_player_id_fkey";
            columns: ["winner_player_id"];
            isOneToOne: false;
            referencedRelation: "player";
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
