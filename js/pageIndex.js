// js/pageIndex.js
import { BOOSTERS } from "./boosters.js";
import { BoosterEngine } from "./boosterEngine.js";

function fmtEur(n){
  return (Number(n)||0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("booster-select");
  const openBtn = document.getElementById("open-pack-btn");
  const freeBtn = document.getElementById("free-pack-btn");

  const boosterTitle = document.getElementById("booster-title");
  const boosterSubtitle = document.getElementById("booster-subtitle");
  const boosterClosed = document.getElementById("booster-closed");

  // ✅ moteur
  const engine = new BoosterEngine({
    booster: BOOSTERS.plant,
    hooks: {
      onCollectionChanged: () => {
        // si tu veux rebrancher tes stats/history existants :
        // -> on pourra migrer ça en module aussi, step suivante
      }
    }
  });
  engine.initAudio();

  function applyBoosterUI(booster){
    if (boosterTitle) boosterTitle.textContent = booster.uiName;
    if (boosterSubtitle) boosterSubtitle.textContent = "1 carte à révéler";
    if (boosterClosed) {
      // option simple : change juste l’emoji + label (si tu veux)
      const icon = boosterClosed.querySelector(".booster-leaf-icon");
      if (icon) icon.textContent = booster.icon || "🎴";

      // option style rapide (si tu veux)
      boosterClosed.setAttribute("data-theme", booster.theme || booster.key);
    }

    if (openBtn){
      openBtn.textContent = `Open ${booster.uiName} — ${fmtEur(booster.packPriceEur)}`;
    }
  }

  function getSelectedBooster(){
    const key = select?.value || "plant";
    return BOOSTERS[key] || BOOSTERS.plant;
  }

  applyBoosterUI(getSelectedBooster());

  select?.addEventListener("change", () => {
    const b = getSelectedBooster();
    engine.setBooster(b);
    applyBoosterUI(b);
  });

  // ✅ bouton paid
  openBtn?.addEventListener("click", async () => {
    // Ton guard Supabase en capture (dans index.html) continue de fonctionner
    await engine.openPack({ mode: "paid" });
  });

  // ✅ bouton free (si tu gardes la logique points ailleurs)
  freeBtn?.addEventListener("click", async () => {
    await engine.openPack({ mode: "free" });
  });

  // Skip / Close
  document.getElementById("open-skip")?.addEventListener("click", () => engine.skipSpinNow());
  document.getElementById("open-close")?.addEventListener("click", () => {
    if (engine.spinning) return;
    engine.closeOverlay();
    engine.uiState = "idle";
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const overlay = document.getElementById("open-overlay");
    if (overlay?.classList.contains("on") && !engine.spinning && engine.uiState === "result"){
      engine.closeOverlay();
      engine.uiState = "idle";
    }
  });
});
