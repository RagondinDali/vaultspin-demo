// js/db.js
import { supabase } from "./supabaseClient.js";

/**
 * Redirect login si pas connecté
 * @returns {Promise<import("@supabase/supabase-js").Session|null>}
 */
export async function requireAuthOrRedirect() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const session = data?.session ?? null;
  if (!session?.user) {
    const next = encodeURIComponent(window.location.pathname.split("/").pop() || "index.html");
    window.location.href = `./login.html?next=${next}`;
    return null;
  }
  return session;
}

/** YYYY-MM-01 (DATE) */
export function monthStartISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function normPackKey(packKey) {
  const k = String(packKey || "").trim().toUpperCase();
  if (k === "PLANT" || k === "WATER" || k === "FIRE") return k;
  if (k === "ALL") return "ALL";
  // fallback safe
  return "ALL";
}

/**
 * Sauvegarde une carte dans user_cards
 * IMPORTANT: inclut pack_key (PLANT/WATER/FIRE)
 */
export async function saveCardToDb(card) {
  const session = await requireAuthOrRedirect();
  if (!session) return { ok: false, reason: "not_authed" };

  const userId = session.user.id;

  const payload = {
    user_id: userId,

    // ✅ pack support
    pack_key: normPackKey(card.pack_key || "PLANT"),

    token_id: card.token_id ?? null,
    card_type_index: Number(card.card_type_index),

    // optionnels (DB trigger peut remplir/normaliser)
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

/**
 * ✅ Ajoute des points :
 * - always credits ALL
 * - also credits the specific pack (PLANT/WATER/FIRE)
 *
 * Utilise ton RPC `add_monthly_points(delta)` et `add_monthly_points(delta, pack_key)`.
 */
export async function addMonthlyPointsForOpen({ delta, packKey }) {
  const session = await requireAuthOrRedirect();
  if (!session) return { ok: false, reason: "not_authed" };

  const d = Number(delta || 0);
  const pk = normPackKey(packKey);

  // credit ALL (global)
  {
    const { error } = await supabase.rpc("add_monthly_points", { delta: d });
    if (error) {
      console.error("[addMonthlyPointsForOpen] ALL error:", error);
      return { ok: false, error };
    }
  }

  // credit pack (si pack != ALL)
  if (pk !== "ALL") {
    const { error } = await supabase.rpc("add_monthly_points", { delta: d, pack_key: pk });
    if (error) {
      console.error("[addMonthlyPointsForOpen] PACK error:", error);
      return { ok: false, error };
    }
  }

  return { ok: true };
}

/**
 * ✅ Dépense des points (pour booster gratuit)
 * Par défaut on dépense sur ALL (recommandé).
 * RPC: vs_spend_points(cost, month, pack_key)
 */
export async function spendPoints({ cost, packKey = "ALL" }) {
  const session = await requireAuthOrRedirect();
  if (!session) return { ok: false, reason: "not_authed" };

  const pk = normPackKey(packKey);
  const c = Number(cost || 0);

  const { data, error } = await supabase.rpc("vs_spend_points", {
    p_cost: c,
    // month par défaut côté SQL -> ok si tu veux pas passer p_month
    p_pack_key: pk,
  });

  if (error) {
    console.error("[spendPoints] error:", error);
    return { ok: false, error };
  }

  // Supabase peut renvoyer array [{ok,points}]
  const row = Array.isArray(data) ? data[0] : data;
  return {
    ok: !!row?.ok,
    points: Number(row?.points ?? 0),
  };
}

/**
 * ✅ Mes points (utile si je ne suis pas dans le top100)
 * RPC: vs_get_points(month, pack_key)
 */
export async function getMyPoints({ monthISO = monthStartISO(), packKey = "ALL" } = {}) {
  const session = await requireAuthOrRedirect();
  if (!session) return 0;

  const pk = normPackKey(packKey);

  const { data, error } = await supabase.rpc("vs_get_points", {
    p_month: monthISO,
    p_pack_key: pk,
  });

  if (error) {
    console.error("[getMyPoints] error:", error);
    return 0;
  }

  return Number(data ?? 0);
}

/**
 * ✅ Leaderboard top N (pack-aware)
 * - packKey='ALL' => leaderboard global
 * - packKey='PLANT'|'WATER'|'FIRE' => leaderboard pack
 */
export async function getLeaderboardMonthly({ monthISO = monthStartISO(), packKey = "ALL", limit = 100 } = {}) {
  const pk = normPackKey(packKey);

  const { data, error } = await supabase
    .from("user_points_monthly")
    .select("user_id, month, pack_key, points, profiles:profiles(id, username, display_name, email)")
    .eq("month", monthISO)
    .eq("pack_key", pk)
    .order("points", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getLeaderboardMonthly] error:", error);
    return [];
  }

  return data || [];
}
