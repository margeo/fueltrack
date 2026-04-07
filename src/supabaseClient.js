import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bcmceeqodgbxolaqnwpg.supabase.co";
const supabaseAnonKey = "sb_publishable_ZSStAC_6N7L_QpdaX0Quhg_Ed96MPGm";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
