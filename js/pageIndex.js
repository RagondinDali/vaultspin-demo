// js/pageIndex.js
import { supabase } from "./supabaseClient.js";
import { BOOSTERS, boosterByKey, buildCardIndex } from "./boosters.js";
import { BoosterEngine } from "./boosterEngine.js";

function fmtEur(n){
  return (Number(n)||0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

async function openPackRpc(packKey, mode){
  // mode: "paid" | "free"
  const { data, error } = await supabase.rpc("vs_open_pack", {
    p_pack_key: String(packKey || "").toUpperCase(),
    p_mode: mode
  });
  if (error) throw error;
  return data; // { card_id, pack_key, rarity_key, estimated_value_eur, ... }
}

document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("booster-select");
  const openBtn = document.getElementById("open-pack-btn");
  const freeBtn = document.getElementById("free-pack-btn");

  const boosterTitle = document.getElementById("booster-title");
  const boosterSubtitle = document.getElementById("booster-subtitle");
  const boosterClosed = document.getElementById("booster-closed");

  const cardIndex = buildCardIndex();

  const engine = new BoosterEngine({
    booster: BOOSTERS.PLANT,
    cardIndex,
    hooks: {
      openPackRpc,
      onCollectionChanged: () => {
        // tu peux rebrancher stats/history ici plus tard
      }
    }
  });
  engine.initAudio();

  function applyBoosterUI(booster){
    if (boosterTitle) boosterTitle.textContent = booster.uiName;
    if (boosterSubtitle) boosterSubtitle.textContent = "1 carte à révéler";
    if (boosterClosed) {
      const icon = boosterClosed.querySelector(".booster-leaf-icon");
      if (icon) icon.textContent = booster.icon || "🎴";
      boosterClosed.setAttribute("data-theme", booster.theme || booster.key);
    }
    if (openBtn){
      openBtn.textContent = `Open ${booster.uiName} — ${fmtEur(booster.packPriceEur)}`;
    }
  }

  function getSelectedBooster(){
    const raw = (select?.value || "PLANT").toUpperCase();
    return boosterByKey(raw) || BOOSTERS.PLANT;
  }

  applyBoosterUI(getSelectedBooster());

  select?.addEventListener("change", () => {
    const b = getSelectedBooster();
    engine.setBooster(b);
    applyBoosterUI(b);
  });

  // ✅ paid => RPC server
  openBtn?.addEventListener("click", async () => {
    await engine.openPack({ mode: "paid" });
  });

  // ✅ free => RPC server (si ton RPC le gère)
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
