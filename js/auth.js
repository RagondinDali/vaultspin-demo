// js/auth.js
import { supabase } from "./supabaseClient.js";

/**
 * Helpers DOM (tolérant: si l'élément n'existe pas, ça ne crash pas)
 */
const $ = (sel) => document.querySelector(sel);
const setMsg = (text, ok = true) => {
  const el = $("#msg");
  if (!el) return;
  el.textContent = text || "";
  el.style.color = ok ? "lime" : "salmon";
};

function getNextUrl(defaultNext = "./index.html") {
  const p = new URLSearchParams(window.location.search);
  return p.get("next") || defaultNext;
}

/**
 * Vérifie que l'utilisateur a bien un profil + un username.
 * Redirige vers profile.html si nécessaire.
 */
async function ensureProfileAndRoute(user, next = "./index.html") {
  // 1) Lire profiles
  const { data: profile, error: selErr } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", user.id)
    .maybeSingle();

  if (selErr) throw selErr;

  // 2) Si pas de row => créer
  if (!profile) {
    const { error: insErr } = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      is_public: true,
      username: null,
      display_name: null,
    });
    if (insErr) throw insErr;

    // profil créé, maintenant forcer écran pseudo
    window.location.href = `./profile.html?next=${encodeURIComponent(next)}`;
    return;
  }

  // 3) Si username manquant => forcer écran pseudo
  if (!profile.username) {
    window.location.href = `./profile.html?next=${encodeURIComponent(next)}`;
    return;
  }

  // 4) OK => aller au next
  window.location.href = next;
}

/**
 * Connexion
 */
export async function signIn(email, password, next = "./index.html") {
  setMsg("Connexion…", true);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    setMsg(error.message || "Erreur de connexion", false);
    throw error;
  }

  setMsg("✅ Connecté. Vérification du profil…", true);
  await ensureProfileAndRoute(data.user, next);
}

/**
 * Inscription
 * (Supabase peut demander confirmation email selon ta config)
 */
export async function signUp(email, password, next = "./index.html") {
  setMsg("Création du compte…", true);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    setMsg(error.message || "Erreur d'inscription", false);
    throw error;
  }

  // Si confirmation email activée : pas de session immédiate
  if (!data.session) {
    setMsg("✅ Compte créé. Vérifie tes emails pour confirmer, puis reconnecte-toi.", true);
    return;
  }

  setMsg("✅ Compte créé. Vérification du profil…", true);
  await ensureProfileAndRoute(data.user, next);
}

/**
 * Déconnexion
 */
export async function signOut() {
  await supabase.auth.signOut();
  setMsg("Déconnecté.", true);
}

/**
 * Brancher automatiquement les boutons si présents dans la page.
 * Attendu :
 *  - #email, #password
 *  - #btnLogin, #btnRegister, #btnLogout
 *  - #msg
 */
async function wireUI() {
  const emailEl = $("#email");
  const passEl = $("#password");

  const btnLogin = $("#btnLogin");
  const btnRegister = $("#btnRegister");
  const btnLogout = $("#btnLogout");

  const next = getNextUrl("./index.html");

  if (btnLogin) {
    btnLogin.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        const email = emailEl?.value?.trim();
        const password = passEl?.value;
        if (!email || !password) return setMsg("Email et mot de passe requis.", false);
        await signIn(email, password, next);
      } catch (err) {
        console.error(err);
      }
    });
  }

  if (btnRegister) {
    btnRegister.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        const email = emailEl?.value?.trim();
        const password = passEl?.value;
        if (!email || !password) return setMsg("Email et mot de passe requis.", false);
        await signUp(email, password, next);
      } catch (err) {
        console.error(err);
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await signOut();
        window.location.href = "./login.html";
      } catch (err) {
        console.error(err);
      }
    });
  }

  // UX: si déjà connecté et qu'on est sur login.html, on redirige direct
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    // si tu es sur login, ça évite de rester bloqué
    const onLoginPage = /login\.html$/i.test(window.location.pathname);
    if (onLoginPage) {
      setMsg("Session active. Vérification du profil…", true);
      await ensureProfileAndRoute(session.user, next);
    }
  }
}

document.addEventListener("DOMContentLoaded", wireUI);
