import { supabase } from "./supabaseClient.js";

const $ = (id) => document.getElementById(id);

function getRedirectTo() {
  // URL absolue de la page login (important pour GitHub Pages)
  return new URL("./login.html", window.location.href).toString();
}

async function refreshUI() {
  const { data: { session } } = await supabase.auth.getSession();

  $("sessionBox").style.display = session ? "block" : "none";
  $("authBox").style.display = session ? "none" : "block";

  if (session) {
    $("userEmail").textContent = session.user.email || "(email inconnu)";
  }
}

async function signUp(email, password) {
  const redirectTo = getRedirectTo();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) throw error;

  // Si email confirmation activée, l'utilisateur doit cliquer le lien
  $("msg").textContent =
    "✅ Compte créé. Regarde tes emails et clique le lien de confirmation, puis reviens ici pour te connecter.";
  $("msg").style.color = "lime";
}

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;

  $("msg").textContent = "✅ Connecté ! Redirection vers l’accueil…";
  $("msg").style.color = "lime";

  // Retour à l'accueil
  setTimeout(() => {
    window.location.href = "./index.html";
  }, 600);
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  $("msg").textContent = "✅ Déconnecté.";
  $("msg").style.color = "lime";
  await refreshUI();
}

async function resendConfirmation(email) {
  const redirectTo = getRedirectTo();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;

  $("msg").textContent = "✅ Email de confirmation renvoyé.";
  $("msg").style.color = "lime";
}

function showError(err) {
  console.error(err);
  $("msg").textContent = "❌ " + (err?.message || String(err));
  $("msg").style.color = "salmon";
}

window.addEventListener("DOMContentLoaded", async () => {
  // Si tu arrives ici depuis un email de confirmation, Supabase peut renvoyer une session
  // On écoute les changements
  supabase.auth.onAuthStateChange(async () => {
    await refreshUI();
  });

  $("btnSignUp").addEventListener("click", async () => {
    try {
      $("msg").textContent = "";
      const email = $("email").value.trim();
      const password = $("password").value;
      if (!email || !password) return showError("Email et mot de passe requis.");
      await signUp(email, password);
    } catch (e) {
      showError(e);
    }
  });

  $("btnSignIn").addEventListener("click", async () => {
    try {
      $("msg").textContent = "";
      const email = $("email").value.trim();
      const password = $("password").value;
      if (!email || !password) return showError("Email et mot de passe requis.");
      await signIn(email, password);
    } catch (e) {
      showError(e);
    }
  });

  $("btnResend").addEventListener("click", async () => {
    try {
      $("msg").textContent = "";
      const email = $("email").value.trim();
      if (!email) return showError("Entre ton email pour renvoyer.");
      await resendConfirmation(email);
    } catch (e) {
      showError(e);
    }
  });

  $("btnSignOut").addEventListener("click", async () => {
    try {
      $("msg").textContent = "";
      await signOut();
    } catch (e) {
      showError(e);
    }
  });

  await refreshUI();
});
