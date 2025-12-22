// js/boosterEngine.js
import { saveCardToDb, addMonthlyPointsForOpen, spendPoints } from "./db.js";

const UI_STATE = { IDLE: "idle", OPENING: "opening", RESULT: "result" };

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fmtEur(n) {
  return (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

function rarityKeyFromCard(card) {
  if (card.hidden) return "HIDDEN";
  if (card.legendary) return "LEGENDARY";
  if (card.ultra) return "ULTRA";
  return "EPIC";
}

function rarityLabelForKey(k) {
  if (k === "ULTRA") return "Ultra";
  if (k === "LEGENDARY") return "Legendary";
  if (k === "HIDDEN") return "";
  return "Epic";
}

function packKeyFromBooster(booster) {
  // booster.key = "plant"|"water"|"fire" => DB wants PLANT|WATER|FIRE
  const k = String(booster?.key || "").toUpperCase();
  if (k === "PLANT" || k === "WATER" || k === "FIRE") return k;
  // if key is lowercase, uppercase already fixed
  if (k === "PLANT" || k === "WATER" || k === "FIRE") return k;
  if (k === "PLANT" || k === "WATER" || k === "FIRE") return k;
  // common case: "PLANT" after uppercasing "plant"
  if (k === "PLANT" || k === "WATER" || k === "FIRE") return k;

  // map lowercase keys
  if (String(booster?.key || "") === "plant") return "PLANT";
  if (String(booster?.key || "") === "water") return "WATER";
  if (String(booster?.key || "") === "fire") return "FIRE";

  return "PLANT";
}

export class BoosterEngine {
  constructor({ booster, hooks = {} }) {
    this.booster = booster;
    this.hooks = hooks;

    this.uiState = UI_STATE.IDLE;
    this.currentOpen = null;

    // reel
    this.REEL_TOTAL_ITEMS = 60;
    this.spinning = false;
    this.stopIndex = 0;
    this.rafId = null;
    this.lastIndexUnderCursor = -1;

    // audio
    this.sfxBooster = null;
    this.sfxReveal = null;
    this.sfxLegendary = null;
    this.sfxTickSrc = null;
    this.tickA = null;
    this.tickB = null;
    this.tickFlip = false;
    this.lastTickAt = 0;

    // local token id (MVP)
    this.TOKEN_COUNTER_KEY = "vaultspin_demo_token_counter_v2";
  }

  setBooster(booster) {
    this.booster = booster;
  }

  initAudio() {
    this.sfxBooster = document.getElementById("sfx-booster");
    this.sfxReveal = document.getElementById("sfx-reveal");
    this.sfxLegendary = document.getElementById("sfx-legendary");
    this.sfxTickSrc = document.getElementById("sfx-tick");

    try {
      const src = this.sfxTickSrc ? this.sfxTickSrc.getAttribute("src") : null;
      if (src) {
        this.tickA = new Audio(src);
        this.tickB = new Audio(src);
        this.tickA.preload = "auto";
        this.tickB.preload = "auto";
        this.tickA.volume = 0.55;
        this.tickB.volume = 0.55;
      }
    } catch (_) {}
  }

  // ---------- DOM helpers ----------
  isBusy() {
    return this.uiState !== UI_STATE.IDLE;
  }

  setStatus(text, mode = "ok") {
    const t = document.getElementById("status-text");
    const d = document.getElementById("status-dot");
    if (!t || !d) return;
    t.textContent = text;
    d.classList.remove("error", "pending");
    if (mode === "error") d.classList.add("error");
    if (mode === "pending") d.classList.add("pending");
  }

  playSound(el) {
    if (!el) return;
    try {
      el.pause();
      el.currentTime = 0;
      el.play().catch(() => {});
    } catch (_) {}
  }

  stopTickAudio() {
    try {
      if (this.tickA) { this.tickA.pause(); this.tickA.currentTime = 0; }
      if (this.tickB) { this.tickB.pause(); this.tickB.currentTime = 0; }
    } catch (_) {}
  }

  playTick() {
    const now = performance.now();
    if (now - this.lastTickAt < 58) return;
    this.lastTickAt = now;
    const a = this.tickFlip ? this.tickA : this.tickB;
    this.tickFlip = !this.tickFlip;
    if (!a) return;
    try { a.currentTime = 0; a.play().catch(() => {}); } catch (_) {}
  }

  // ---------- Local token id ----------
  nextLocalTokenId() {
    const raw = localStorage.getItem(this.TOKEN_COUNTER_KEY);
    const n = raw ? Number(raw) : 1;
    const next = Number.isFinite(n) && n > 0 ? n : 1;
    localStorage.setItem(this.TOKEN_COUNTER_KEY, String(next + 1));
    return next;
  }

  // ---------- Pools ----------
  buildPools() {
    const cards = this.booster.cards;

    const hidden = cards.filter(c => c.hidden);
    const epic = cards.filter(c => !c.hidden && !c.ultra && !c.legendary);
    const ultra = cards.filter(c => c.ultra);
    const legendary = cards.filter(c => c.legendary);

    return { hidden, epic, ultra, legendary };
  }

  pickFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  pickHiddenCard(hiddenArr) {
    return this.pickFrom(hiddenArr);
  }

  pickCard() {
    const { hidden, epic, ultra, legendary } = this.buildPools();

    const r = Math.random();
    if (legendary.length && r < (1 / 5000)) return this.pickFrom(legendary);
    if (ultra.length && r < (1 / 5000) + (1 / 50)) return this.pickFrom(ultra);
    if (epic.length && r < (1 / 5000) + (1 / 50) + (1 / 20)) return this.pickFrom(epic);
    return this.pickHiddenCard(hidden);
  }

  // ---------- Overlay / Sections ----------
  openOverlay() {
    const o = document.getElementById("open-overlay");
    if (!o) return;
    o.classList.add("on");
    o.setAttribute("aria-hidden", "false");
  }
  closeOverlay() {
    const o = document.getElementById("open-overlay");
    if (!o) return;
    o.classList.remove("on");
    o.setAttribute("aria-hidden", "true");
  }
  showReel() {
    document.getElementById("reel-section")?.classList.remove("hidden");
    document.getElementById("result-section")?.classList.remove("on");
    const closeBtn = document.getElementById("open-close");
    const skipBtn = document.getElementById("open-skip");
    const hint = document.getElementById("open-hint");
    if (closeBtn) closeBtn.style.display = "none";
    if (skipBtn) skipBtn.style.display = "inline-flex";
    if (hint) hint.textContent = "Opening…";
  }
  showResult() {
    document.getElementById("reel-section")?.classList.add("hidden");
    document.getElementById("result-section")?.classList.add("on");
    const closeBtn = document.getElementById("open-close");
    const skipBtn = document.getElementById("open-skip");
    if (skipBtn) skipBtn.style.display = "none";
    if (closeBtn) closeBtn.style.display = "inline-flex";
  }

  // ---------- Reel rendering ----------
  buildReelItems(winningCard) {
    const arr = [];
    for (let i = 0; i < this.REEL_TOTAL_ITEMS; i++) arr.push(this.pickCard());
    this.stopIndex = Math.max(20, this.REEL_TOTAL_ITEMS - 10);
    arr[this.stopIndex] = winningCard;
    return arr;
  }

  renderReel(reelItems) {
    const track = document.getElementById("reel-track");
    if (!track) return;

    track.innerHTML = "";
    track.classList.remove("spinning");
    track.style.transition = "";
    track.style.transform = "translateX(0px)";
    void track.offsetHeight;

    for (let i = 0; i < reelItems.length; i++) {
      const card = reelItems[i];
      const rk = rarityKeyFromCard(card);

      const el = document.createElement("div");
      el.className = "reel-item";
      el.setAttribute("data-i", String(i));
      el.innerHTML = `
        <div class="reel-thumb">
          <img src="${card.img}" alt="${escapeHtml(card.name)}" loading="lazy" decoding="async"/>
        </div>
        <div class="reel-meta">
          <div class="reel-name">${escapeHtml(card.name)}</div>
          <div class="reel-tag ${rk.toLowerCase()}">${rk === "HIDDEN" ? "" : rk}</div>
        </div>
      `;
      track.appendChild(el);
    }
  }

  getStepPx() {
    const track = document.getElementById("reel-track");
    const first = track?.firstElementChild;
    if (!first) return 180;
    const w = first.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(track).gap || "12") || 12;
    return w + gap;
  }

  getTranslateX(el) {
    const tr = getComputedStyle(el).transform;
    if (!tr || tr === "none") return 0;
    const m = tr.match(/matrix\(([^)]+)\)/);
    if (!m) return 0;
    const parts = m[1].split(",").map(x => parseFloat(x.trim()));
    return Number.isFinite(parts[4]) ? parts[4] : 0;
  }

  startTickLoop() {
    const track = document.getElementById("reel-track");
    const viewport = document.getElementById("reel-viewport");
    if (!track || !viewport) return;

    this.lastIndexUnderCursor = -1;

    const loop = () => {
      if (!this.spinning) return;
      const x = this.getTranslateX(track);
      const step = this.getStepPx();
      const vw = viewport.getBoundingClientRect().width;
      const cursorX = vw / 2;
      const offset = -x;
      const idx = Math.floor((offset + cursorX) / step);

      if (idx !== this.lastIndexUnderCursor) {
        this.lastIndexUnderCursor = idx;
        this.playTick();
      }
      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  stopTickLoop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  async spinToStop() {
    this.spinning = true;
    this.setStatus("Ouverture…", "pending");
    this.stopTickAudio();
    this.playSound(this.sfxBooster);

    const track = document.getElementById("reel-track");
    const viewport = document.getElementById("reel-viewport");
    if (!track || !viewport) return;

    track.classList.remove("spinning");
    track.style.transition = "";
    track.style.transform = "translateX(0px)";
    void track.offsetHeight;

    const step = this.getStepPx();
    const vw = viewport.getBoundingClientRect().width;
    const cursorX = vw / 2;

    const targetCenter = this.stopIndex * step + (step / 2);
    const targetTranslate = targetCenter - cursorX;
    const jitter = (Math.random() * 6) - 3;
    const finalX = -(targetTranslate + jitter);

    this.startTickLoop();
    track.classList.add("spinning");
    requestAnimationFrame(() => {
      track.style.transform = `translateX(${finalX}px)`;
    });

    await new Promise((resolve) => {
      track.addEventListener("transitionend", resolve, { once: true });
    });

    this.spinning = false;
    this.stopTickLoop();
  }

  skipSpinNow() {
    if (!this.spinning) return;
    const track = document.getElementById("reel-track");
    const viewport = document.getElementById("reel-viewport");
    if (!track || !viewport) return;

    track.classList.remove("spinning");
    const step = this.getStepPx();
    const vw = viewport.getBoundingClientRect().width;
    const cursorX = vw / 2;

    const targetCenter = this.stopIndex * step + (step / 2);
    const targetTranslate = targetCenter - cursorX;
    const finalX = -(targetTranslate);

    track.style.transition = "transform 420ms cubic-bezier(.16,.84,.2,1)";
    track.style.transform = `translateX(${finalX}px)`;
  }

  // ---------- Result UI ----------
  fillResultUI() {
    const { card, tokenId, ts } = this.currentOpen;
    const rk = rarityKeyFromCard(card);
    const price = card.price || 0;

    const imgEl = document.getElementById("result-img");
    const nameEl = document.getElementById("result-name");
    const descEl = document.getElementById("result-desc");
    const pill = document.getElementById("result-pill");
    const profit = document.getElementById("result-profit");
    const sellBtn = document.getElementById("result-sell");

    if (imgEl) imgEl.src = card.img;
    if (nameEl) nameEl.textContent = `${card.name} — #${tokenId}`;

    const d = new Date(ts).toLocaleString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit"
    });

    const isHidden = rk === "HIDDEN";
    const desc = isHidden
      ? `${d}\nValeur estimée : ${fmtEur(price)}`
      : `${rarityLabelForKey(rk)} · ${d}\nValeur estimée : ${fmtEur(price)}`;

    if (descEl) descEl.textContent = desc;

    if (pill) {
      if (isHidden) {
        pill.style.display = "none";
      } else {
        pill.style.display = "inline-flex";
        pill.textContent = rk;
        pill.className = "result-pill " + rk.toLowerCase();
      }
    }

    if (profit) profit.textContent = "Valeur : " + fmtEur(price);

    if (sellBtn) {
      sellBtn.disabled = false;
      sellBtn.textContent = "Revendre · " + fmtEur(price);
    }
  }

  /**
   * ✅ Persistance DB + points (ALL + pack)
   */
  async commitToDb({ mode }) {
    const { card, tokenId, ts } = this.currentOpen;

    const packKey = packKeyFromBooster(this.booster);
    const rk = rarityKeyFromCard(card);

    // 1) save card
    const res = await saveCardToDb({
      pack_key: packKey,
      token_id: tokenId,                 // MVP local token id (OK)
      card_type_index: Number(card.cardTypeIndex ?? card.ct ?? card.index ?? 0), // fallback if you add later
      rarity_key: rk,
      image_url: card.img,
      card_name: card.name,
      estimated_value_eur: Number(card.price || 0),
      opened_at: new Date(ts).toISOString(),
      // chain_id / contract_address / onchain_token_id : plus tard
    });

    if (!res?.ok) throw (res?.error || new Error("DB insert failed"));

    // 2) points only if paid (you can change rules)
    if (mode === "paid") {
      await addMonthlyPointsForOpen({ delta: 25, packKey });
    }

    // hook
    this.hooks?.onDbCommitted?.({ packKey, rarity: rk, tokenId, openedAt: ts, dbId: res.id });
  }

  /**
   * Open pack
   * mode:
   *  - "paid" => +25 points (ALL + pack)
   *  - "free" => spend 2500 ALL points before opening
   */
  async openPack({ mode = "paid" } = {}) {
    if (this.isBusy()) return;

    // ✅ free gate
    if (mode === "free") {
      this.setStatus("Vérification points…", "pending");
      const spend = await spendPoints({ cost: 2500, packKey: "ALL" });
      if (!spend.ok) {
        this.setStatus("Points insuffisants ❌", "error");
        alert(`Points insuffisants. Il te reste ${Number(spend.points || 0).toLocaleString("fr-FR")} pts.`);
        return;
      }
    }

    this.uiState = UI_STATE.OPENING;

    this.openOverlay();
    this.showReel();

    const winningCard = this.pickCard();
    const tokenId = this.nextLocalTokenId();
    const ts = Date.now();

    // IMPORTANT: pour DB, on a besoin d’un card_type_index stable.
    // Pour l’instant, ton booster.cards ne porte pas de cardTypeIndex.
    // ✅ On dérive un index stable via la position dans booster.cards.
    const idx = this.booster.cards.findIndex(c => c.id === winningCard.id);
    winningCard.cardTypeIndex = idx >= 0 ? idx : 0;

    this.currentOpen = { card: winningCard, tokenId, ts };

    const reelItems = this.buildReelItems(winningCard);
    this.renderReel(reelItems);

    await sleep(70);
    await this.spinToStop();

    this.playSound(this.sfxReveal);
    if (rarityKeyFromCard(winningCard) === "LEGENDARY") this.playSound(this.sfxLegendary);

    // UI result
    this.fillResultUI();

    // ✅ DB commit (card + points)
    try {
      await this.commitToDb({ mode });
    } catch (e) {
      console.error(e);
      this.setStatus("Erreur DB ❌", "error");
      alert(e?.message || "Erreur DB (voir console)");
      // on laisse quand même l’UI afficher la carte (mais elle n’est pas persistée)
    }

    this.uiState = UI_STATE.RESULT;
    this.showResult();
    this.setStatus("Pack ouvert ✅", "ok");
  }
}
