// js/auth.js
import { supabase } from "./supabaseClient.js";

/* ----------------------------- DOM helpers ----------------------------- */
const $ = (sel) => document.querySelector(sel);

const ui = {
  email: () => $("#email"),
  password: () => $("#password"),

  btnSignUp: () => $("#btnSignUp"),
  btnSignIn: () => $("#btnSignIn"),
  btnResend: () => $("#btnResend"),
  btnSignOut: () => $("#btnSignOut"),

  authBox: () => $("#authBox"),
  sessionBox: () => $("#sessionBox"),
  userEmail: () => $("#userEmail"),
  msg: () => $("#msg"),
};

function setMsg(text = "", ok = true) {
  const el = ui.msg();
  if (!el) return;
  el.textContent = text;
  el.style.color = ok ? "lime" : "salmon";
}

function setLoading(isLoading) {
  const buttons = [
    ui.btnSignUp(),
    ui.btnSignIn(),
    ui.btnResend(),
    ui.btnSignOut()
  ].filter(Boolean);

  buttons.forEach((b) => (b.disabled = !!isLoading));
  if (isLoading) setMsg("⏳ Traitement…", true);
}

function getNextUrl(defaultNext = "./index.html") {
  const p = new URLSearchParams(window.location.search);
  return p.get("next") || defaultNext;
}

/* ------------------------ Profile gating (VaultSpin) ------------------------ */
async function ensureProfileAndRoute(user, next = "./index.html") {
  if (!user?.id) throw new Error("Utilisateur introuvable (session invalide).");

  const { data: profile, error: selErr } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", user.id)
    .maybeSingle();

  if (selErr) throw selErr;

  if (!profile) {
    const { error: insErr } = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      username: null,
      display_name: null,
      avatar_url: null,
      is_public: true,
      updated_at: new Date().toISOString(),
    });
    if (insErr) throw insErr;

    window.location.href = `./profile.html?next=${encodeURIComponent(next)}`;
    return;
  }

  if (!profile.username) {
    window.location.href = `./profile.html?next=${encodeURIComponent(next)}`;
    return;
  }

  window.location.href = next;
}

/* ----------------------------- Auth actions ----------------------------- */
async function signIn(email, password, next) {
  setLoading(true);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const user = data?.user || data?.session?.user;
    if (!user) throw new Error("Connexion OK, mais user manquant dans la réponse.");

    setMsg("✅ Connecté. Vérification du profil…", true);
    await ensureProfileAndRoute(user, next);
  } catch (err) {
    console.error(err);
    setMsg(err?.message || "Erreur de connexion", false);
  } finally {
    setLoading(false);
  }
}

async function signUp(email, password, next) {
  setLoading(true);
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    // Si email confirmation activée => pas de session directe
    if (!data?.session) {
      setMsg("✅ Compte créé. Vérifie tes emails puis reconnecte-toi.", true);
      return;
    }

    const user = data?.user || data?.session?.user;
    if (!user) throw new Error("Inscription OK, mais user manquant dans la réponse.");

    setMsg("✅ Compte créé. Vérification du profil…", true);
    await ensureProfileAndRoute(user, next);
  } catch (err) {
    console.error(err);
    setMsg(err?.message || "Erreur d'inscription", false);
  } finally {
    setLoading(false);
  }
}

async function resendConfirmation(email) {
  setLoading(true);
  try {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    if (error) throw error;

    setMsg("📩 Email de confirmation renvoyé. Check ta boîte (et spam).", true);
  } catch (err) {
    console.error(err);
    setMsg(err?.message || "Impossible de renvoyer l'email", false);
  } finally {
    setLoading(false);
  }
}

async function signOut() {
  setLoading(true);
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // UX: reset champs
    if (ui.email()) ui.email().value = "";
    if (ui.password()) ui.password().value = "";

    setMsg("👋 Déconnecté.", true);
  } catch (err) {
    console.error(err);
    setMsg(err?.message || "Erreur de déconnexion", false);
  } finally {
    setLoading(false);
  }
}

/* ----------------------------- UI rendering ----------------------------- */
function renderSession(session) {
  const authBox = ui.authBox();
  const sessionBox = ui.sessionBox();
  const userEmail = ui.userEmail();

  if (!authBox || !sessionBox) return;

  if (session?.user) {
    authBox.style.display = "none";
    sessionBox.style.display = "block";
    if (userEmail) userEmail.textContent = session.user.email || "";
  } else {
    authBox.style.display = "block";
    sessionBox.style.display = "none";
    if (userEmail) userEmail.textContent = "";
  }
}

/* ----------------------------- Wire events ----------------------------- */
async function wireUI() {
  const next = getNextUrl("./index.html");

  ui.btnSignIn()?.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = ui.email()?.value?.trim();
    const password = ui.password()?.value;
    if (!email || !password) return setMsg("Email et mot de passe requis.", false);
    await signIn(email, password, next);
  });

  ui.btnSignUp()?.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = ui.email()?.value?.trim();
    const password = ui.password()?.value;
    if (!email || !password) return setMsg("Email et mot de passe requis.", false);
    await signUp(email, password, next);
  });

  ui.btnResend()?.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = ui.email()?.value?.trim();
    if (!email) return setMsg("Entre ton email pour renvoyer la confirmation.", false);
    await resendConfirmation(email);
  });

  ui.btnSignOut()?.addEventListener("click", async (e) => {
    e.preventDefault();
    await signOut();
    const { data } = await supabase.auth.getSession();
    renderSession(data.session);
  });

  // Etat initial
  const { data } = await supabase.auth.getSession();
  renderSession(data.session);

  // Si déjà loggé sur login.html => check profil et redirect
  if (data.session?.user) {
    setMsg("Session active. Vérification du profil…", true);
    await ensureProfileAndRoute(data.session.user, next);
    return;
  }

  // Listener global : si la session change, on met à jour l'UI
  supabase.auth.onAuthStateChange(async (_event, session) => {
    renderSession(session);
  });
}

document.addEventListener("DOMContentLoaded", wireUI);
