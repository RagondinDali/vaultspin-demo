// js/db.js
import { supabase } from "./supabaseClient.js";

/**
 * Si pas connecté -> redirect login
 * @returns {Promise<import("@supabase/supabase-js").Session|null>}
 */
export async function requireAuthOrRedirect() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const session = data?.session ?? null;
  if (!session?.user) {
    // garde la page courante pour revenir après login
    const next = encodeURIComponent(window.location.pathname.split("/").pop() || "index.html");
    window.location.href = `./login.html?next=${next}`;
    return null;
  }
  return session;
}

/**
 * (Optionnel) Si ton front ne fournit pas déjà rarity_key.
 * Adapte si tu as une autre logique.
 */
export function getRarityKeyFromValue(estimatedValueEur) {
  const v = Number(estimatedValueEur || 0);
  if (v >= 250) return "LEGENDARY";
  if (v >= 80) return "ULTRA";
  if (v >= 20) return "EPIC";
  return "COMMON";
}

/**
 * Sauvegarde une carte ouverte dans user_cards
 * @param {{
 *  token_id?: number|null,
 *  card_type_index: number,
 *  rarity_key?: string|null,
 *  image_url?: string|null,
 *  card_name?: string|null,
 *  estimated_value_eur?: number|null,
 *  opened_at?: string|null,
 *  chain_id?: number|null,
 *  contract_address?: string|null,
 *  onchain_token_id?: string|null
 * }} card
 */
export async function saveCardToDb(card) {
  const session = await requireAuthOrRedirect();
  if (!session) return { ok: false, reason: "not_authed" };

  const userId = session.user.id;

  const payload = {
    user_id: userId,
    token_id: card.token_id ?? null,
    card_type_index: Number(card.card_type_index),
    rarity_key: card.rarity_key ?? null,
    image_url: card.image_url ?? null,
    card_name: card.card_name ?? null,
    estimated_value_eur: Number(card.estimated_value_eur ?? 0),
    opened_at: card.opened_at ?? null,

    chain_id: card.chain_id ?? null,
    contract_address: card.contract_address ?? null,
    onchain_token_id: card.onchain_token_id ?? null,
  };

  const { data, error } = await supabase
    .from("user_cards")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error("[saveCardToDb] error:", error);
    return { ok: false, error };
  }

  return { ok: true, id: data.id };
}
