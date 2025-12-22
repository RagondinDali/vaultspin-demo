// js/supabaseClient.js

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Client Supabase principal
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================================================
// DEBUG ONLY
// Permet d'appeler supabase depuis la console (F12)
// À supprimer ou commenter plus tard si souhaité
// ==================================================
if (typeof window !== "undefined") {
  window.supabase = supabase;
}
