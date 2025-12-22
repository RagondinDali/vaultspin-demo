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

/**
 * Helpers: mois courant (DATE: YYYY-MM-01)
 */
export function monthStartISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/**
 * Pack key normalizer (plant/water/fire -> PLANT/WATER/FIRE)
 */
export function normalizePackKey(packKey) {
  const k = String(packKey || "").toUpperCase();
  if (k === "PLANT" || k === "WATER" || k === "FIRE") return k;
  // fallback: si tu ajoutes d'autres packs plus tard
  return k || "PLANT";
}

/**
 * Sauvegarde une carte ouverte dans user_cards
 * (DB est source of truth: trigger peut remplir rarity_key si null)
 */
export async function saveCardToDb(card) {
  const session = await requireAuthOrRedirect();
  if (!session) return { ok: false, reason: "not_authed" };

  const userId = session.user.id;

  const payload = {
    user_id: userId,
    token_id: card.token_id ?? null,

    // ✅ multi-pack
    pack_key: normalizePackKey(card.pack_key || "PLANT"),

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

/* =========================================================
   POINTS (RPC server authoritative + fallback)
   - paid pack: +25 pts
   - free pack: cost 2500 pts
   ========================================================= */

async function rpcExists(name) {
  // Supabase ne donne pas un "list RPC" facile côté client.
  // On tente l'appel et on gère l'erreur dans les fonctions.
  return !!name;
}

/**
 * Ajoute des points (RPC prioritaire: vs_add_points)
 * @returns {Promise<{ok:boolean, points?:number, error?:any}>}
 */
export async function addMonthlyPoints(delta, monthISO = null) {
  const session = await requireAuthOrRedirect();
  if (!session) return { ok: false, reason: "not_authed" };

  const d = Number(delta || 0);
  if (!Number.isFinite(d) || d <= 0) return { ok: true, points: await getMyMonthlyPoints(monthISO || monthStartISO()) };

  const month = monthISO ? new Date(monthISO) : null; // juste pour cohérence si tu l'utilises
  const p_month = monthISO ? monthISO : undefined;

  // 1) try vs_add_points(p_delta, p_month)
  try {
    if (await rpcExists("vs_add_points")) {
      const args = { p_delta: d };
      // p_month est DATE côté Postgres; Supabase accepte "YYYY-MM-01"
      if (p_month) args.p_month = p_month;

      const { data, error } = await supabase.rpc("vs_add_points", args);
      if (error) throw error;
      return { ok: true, points: Number(data || 0) };
    }
  } catch (e) {
    // fallback below
    console.warn("[addMonthlyPoints] vs_add_points failed, fallback:", e?.message || e);
  }

  // 2) fallback add_monthly_points(delta) -> returns void
  try {
    const { error } = await supabase.rpc("add_monthly_points", { delta: d });
    if (error) throw error;
    const pts = await getMyMonthlyPoints(monthISO || monthStartISO());
    return { ok: true, points: pts };
  } catch (e) {
    console.error("[addMonthlyPoints] fallback failed:", e);
    return { ok: false, error: e };
  }
}

/**
 * Dépense des points (RPC: vs_spend_points)
 * @returns {Promise<{ok:boolean, points:number, error?:any}>}
 */
export async function spendMonthlyPoints(cost, monthISO = null) {
  const session = await requireAuthOrRedirect();
  if (!session) return { ok: false, points: 0, reason: "not_authed" };

  const c = Number(cost || 0);
  const p_month = monthISO ? monthISO : undefined;

  try {
    const args = { p_cost: c };
    if (p_month) args.p_month = p_month;

    const { data, error } = await supabase.rpc("vs_spend_points", args);
    if (error) throw error;

    // data = { ok:boolean, points:int } (ou tableau selon config)
    const row = Array.isArray(data) ? data[0] : data;
    return { ok: !!row?.ok, points: Number(row?.points || 0) };
  } catch (e) {
    console.error("[spendMonthlyPoints] error:", e);
    // Pas de fallback propre si vs_spend_points n'existe pas (sinon c'est insecure côté client)
    return { ok: false, points: await getMyMonthlyPoints(monthISO || monthStartISO()), error: e };
  }
}

/**
 * Mes points du mois (utile même si je ne suis pas dans le top 100)
 */
export async function getMyMonthlyPoints(monthISO = monthStartISO()) {
  const session = await requireAuthOrRedirect();
  if (!session) return 0;

  const userId = session.user.id;

  // Try by monthISO string -> cast ok côté supabase
  const { data, error } = await supabase
    .from("user_points_monthly")
    .select("points")
    .eq("user_id", userId)
    .eq("month", monthISO)
    .maybeSingle();

  if (error) {
    console.error("[getMyMonthlyPoints] error:", error);
    return 0;
  }
  return Number(data?.points || 0);
}

/**
 * Leaderboard top N
 * - tente pack_key si la colonne existe, sinon fallback
 */
export async function getLeaderboardMonthly(monthISO = monthStartISO(), { limit = 100, packKey = "ALL" } = {}) {
  const pack = normalizePackKey(packKey);
  const wantsPack = packKey && packKey !== "ALL";

  // Try pack-aware query
  if (wantsPack) {
    try {
      const { data, error } = await supabase
        .from("user_points_monthly")
        .select("user_id, month, points, pack_key, profiles:profiles(id, username, display_name, email)")
        .eq("month", monthISO)
        .eq("pack_key", pack)
        .order("points", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn("[getLeaderboardMonthly] pack_key not available, fallback:", e?.message || e);
    }
  }

  // Fallback (no pack filter)
  try {
    const { data, error } = await supabase
      .from("user_points_monthly")
      .select("user_id, month, points, profiles:profiles(id, username, display_name, email)")
      .eq("month", monthISO)
      .order("points", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("[getLeaderboardMonthly] error:", e);
    return [];
  }
}
