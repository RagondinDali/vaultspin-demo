// js/boosterEngine.js
// Animation/UI only.
// Le gagnant vient de hooks.openPackRpc(packKey, mode) => RPC vs_open_pack (server-authoritative)

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

export class BoosterEngine {
  constructor({ booster, cardIndex, hooks = {} }) {
    this.booster = booster;      // { key:'PLANT', uiName,..., cards:[...] }
    this.cardIndex = cardIndex;  // Map(card_id -> card meta)
    this.hooks = hooks;          // { openPackRpc(packKey, mode), onCollectionChanged? }

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

    // local history (optionnel) : on garde pour l’UI MVP
    this.COLLECTION_KEY = "vaultspin_collection_v3";
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

  // ---------- local history ----------
  getCollection() {
    try { return JSON.parse(localStorage.getItem(this.COLLECTION_KEY) || "[]"); }
    catch { return []; }
  }
  setCollection(arr) {
    localStorage.setItem(this.COLLECTION_KEY, JSON.stringify(arr));
  }
  pushToCollection(entry) {
    const arr = this.getCollection();
    arr.unshift(entry);
    this.setCollection(arr);
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
  pickFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  buildReelItems(winningCard) {
    // IMPORTANT : ceci est un "reel visuel", pas le tirage réel
    const pool = this.booster?.cards || [];
    const arr = [];
    for (let i = 0; i < this.REEL_TOTAL_ITEMS; i++) arr.push(this.pickFrom(pool));
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

      const el = document.createElement("div");
      el.className = "reel-item";
      el.setAttribute("data-i", String(i));
      el.innerHTML = `
        <div class="reel-thumb">
          <img src="${card.img}" alt="${escapeHtml(card.name)}" loading="lazy" decoding="async"/>
        </div>
        <div class="reel-meta">
          <div class="reel-name">${escapeHtml(card.name)}</div>
          <div class="reel-tag"></div>
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
    const { card, ts, rarity_key, estimated_value_eur } = this.currentOpen;

    const imgEl = document.getElementById("result-img");
    const nameEl = document.getElementById("result-name");
    const descEl = document.getElementById("result-desc");
    const pill = document.getElementById("result-pill");
    const profit = document.getElementById("result-profit");
    const sellBtn = document.getElementById("result-sell");

    const price = Number(estimated_value_eur ?? card.price ?? 0);

    if (imgEl) imgEl.src = card.img;
    if (nameEl) nameEl.textContent = `${card.name}`;

    const d = new Date(ts).toLocaleString("fr-FR", {
      day:"2-digit", month:"2-digit", year:"2-digit", hour:"2-digit", minute:"2-digit"
    });

    const rk = String(rarity_key || "").toUpperCase(); // HIDDEN/EPIC/ULTRA/LEGENDARY
    const isHidden = rk === "HIDDEN" || rk === "";

    const desc = isHidden
      ? `${d}\nValeur estimée : ${fmtEur(price)}`
      : `${rk} · ${d}\nValeur estimée : ${fmtEur(price)}`;

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

  commitToLocalHistory() {
    const { card, ts, pack_key, rarity_key, estimated_value_eur } = this.currentOpen;

    const entry = {
      ts,
      pack_key,
      boosterName: this.booster.uiName,
      rarity_key: String(rarity_key || "").toUpperCase(),
      img: card.img,
      name: card.name,
      valueEur: Number(estimated_value_eur ?? card.price ?? 0),
    };

    this.pushToCollection(entry);
    this.hooks?.onCollectionChanged?.(entry, this.getCollection());
    return entry;
  }

  async openPack({ mode = "paid" } = {}) {
    if (this.isBusy()) return;

    this.uiState = UI_STATE.OPENING;
    this.openOverlay();
    this.showReel();

    try {
      const packKey = this.booster?.key; // "PLANT" | "WATER" | "FIRE"
      if (!packKey) throw new Error("Missing booster.key");
      if (!this.hooks?.openPackRpc) throw new Error("Missing hooks.openPackRpc(packKey, mode)");

      // ✅ vérité serveur
      const res = await this.hooks.openPackRpc(packKey, mode);
      // res attendu: { card_id, pack_key, rarity_key, estimated_value_eur, card_name, mode, ... }

      const card = this.cardIndex?.get(res.card_id);
      if (!card) throw new Error(`Card not found in client index: ${res.card_id}`);

      this.currentOpen = {
        ts: Date.now(),
        card,
        pack_key: res.pack_key,
        rarity_key: res.rarity_key,
        estimated_value_eur: res.estimated_value_eur,
        mode: res.mode,
      };

      // reel visuel
      const reelItems = this.buildReelItems(card);
      this.renderReel(reelItems);

      await sleep(70);
      await this.spinToStop();

      this.playSound(this.sfxReveal);
      if (String(res.rarity_key || "").toUpperCase() === "LEGENDARY") this.playSound(this.sfxLegendary);

      this.commitToLocalHistory();
      this.fillResultUI();

      this.uiState = UI_STATE.RESULT;
      this.showResult();
      this.setStatus("Pack ouvert ✅", "ok");
    } catch (e) {
      console.error(e);
      this.setStatus("Erreur ouverture ❌", "error");
      this.uiState = UI_STATE.IDLE;
      // option : fermer overlay
      // this.closeOverlay();
      const hint = document.getElementById("open-hint");
      if (hint) hint.textContent = e?.message || "Erreur";
    }
  }
}
