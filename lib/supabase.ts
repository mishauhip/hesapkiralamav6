import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Tables = {
  users: {
    id: string;
    email: string;
    role: "ADMIN" | "USER" | "VIP";
    created_at: string;
  };
  game_accounts: {
    id: string;
    username: string;
    password: string;
    league: string;
    flex_league: string | null;
    solo_lp: number | null;
    flex_lp: number | null;
    is_available: boolean;
    assigned_to: string | null;
    created_at: string;
    notes: string | null;
    server: string;
    nickname: string | null;
  };
  account_assignments: {
    id: string;
    user_id: string;
    account_id: string;
    assigned_at: string;
    returned_at: string | null;
    league_at_return: string | null;
    created_at: string;
    flex_league_at_return: string | null;
    solo_lp_at_return: number | null;
    initial_flex_league: string | null;
    initial_solo_lp: number | null;
    flex_lp_at_return: number | null;
    initial_league: string | null;
    initial_flex_lp: number | null;
  };
};
