import { supabase } from "./supabaseClient.js";

const $ = (id) => document.getElementById(id);

function getNextUrl() {
  const p = new URLSearchParams(window.location.search);
  return p.get("next") || "./index.html";
}

function normalizeUsername(u) {
  return (u || "").trim().toLowerCase();
}

function validateUsername(u) {
  // 3–20, lettres/chiffres/_ uniquement
  if (!u) return "Pseudo requis.";
  if (u.length < 3 || u.length > 20) return "3 à 20 caractères.";
  if (!/^[a-z0-9_]+$/.test(u)) return "Utilise seulement lettres/chiffres/underscore (a-z, 0-9, _).";
  return null;
}

function showMsg(text, ok = true) {
  const el = $("msg");
  if (!el) return;
  el.textContent = text;
  el.style.color = ok ? "lime" : "salmon";
}

async function requireSessionOrRedirect() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    window.location.href = "./login.html";
    return null;
  }
  return session;
}

async function ensureProfileRow(user) {
  // crée la ligne profiles si elle n'existe pas
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, username, display_name, is_public")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const { error: insErr } = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      username: null,
      display_name: null,
      is_public: true,
      updated_at: new Date().toISOString()
    });
    if (insErr) throw insErr;
  } else {
    // optionnel: si is_public est null, on le met à true
    if (data.is_public === null || data.is_public === undefined) {
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ is_public: true, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (upErr) throw upErr;
    }
  }
}

function setPublicLink(userId, isPublic) {
  const wrap = $("publicLinkWrap");
  const link = $("publicLink");
  // Si ton profile.html n’a pas ces éléments => pas d’erreur
  if (!wrap || !link) return;

  link.href = `player.html?u=${encodeURIComponent(userId)}`;
  wrap.style.display = isPublic ? "inline" : "none";
}

async function saveProfile(user) {
  const rawU = $("username")?.value;
  const username = normalizeUsername(rawU);
  const displayName = ($("displayName")?.value || "").trim();

  const v = validateUsername(username);
  if (v) {
    showMsg("❌ " + v, false);
    return;
  }

  // ✅ is_public depuis checkbox (si présente)
  const isPublicEl = $("isPublic");
  const is_public = isPublicEl ? !!isPublicEl.checked : undefined;

  const payload = {
    username,
    display_name: displayName || null,
    updated_at: new Date().toISOString()
  };
  if (is_public !== undefined) payload.is_public = is_public;

  // UPDATE : RLS doit autoriser auth.uid() = id
  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id);

  if (error) {
    // username unique -> code Postgres 23505 (unique_violation)
    if (error.code === "23505") {
      showMsg("❌ Pseudo déjà pris. Essaie un autre.", false);
      return;
    }
    showMsg("❌ " + (error.message || "Erreur"), false);
    return;
  }

  showMsg("✅ Profil enregistré. Redirection…", true);
  setTimeout(() => {
    window.location.href = getNextUrl();
  }, 500);
}

window.addEventListener("DOMContentLoaded", async () => {
  const session = await requireSessionOrRedirect();
  if (!session) return;

  await ensureProfileRow(session.user);

  // pré-remplissage si déjà existant
  const { data, error } = await supabase
    .from("profiles")
    .select("username, display_name, is_public")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    showMsg("❌ " + (error.message || "Erreur lecture profil"), false);
    return;
  }

  if (data?.username) $("username").value = data.username;
  if (data?.display_name) $("displayName").value = data.display_name;

  // ✅ is_public checkbox (si existe dans le HTML)
  const isPublicEl = $("isPublic");
  if (isPublicEl) {
    const val = (data?.is_public === null || data?.is_public === undefined) ? true : !!data.is_public;
    isPublicEl.checked = val;

    // lien public optionnel
    setPublicLink(session.user.id, val);

    isPublicEl.addEventListener("change", () => {
      setPublicLink(session.user.id, !!isPublicEl.checked);
    });
  }

  $("btnSave").addEventListener("click", async () => {
    try {
      if ($("msg")) $("msg").textContent = "";
      await saveProfile(session.user);
    } catch (e) {
      console.error(e);
      showMsg("❌ " + (e?.message || String(e)), false);
    }
  });

  $("btnLogout").addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "./login.html";
  });
});
