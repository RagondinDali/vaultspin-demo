// js/boosters.js
// UI-only : liste des cartes pour affichage (grille "cartes potentielles", reel, etc.)
// Le tirage réel est fait côté backend via RPC vs_open_pack.

function eur(n) {
  return Number(n || 0);
}

export const BOOSTERS = {
  PLANT: {
    key: "PLANT",
    uiName: "Booster Plante",
    icon: "🌿",
    packPriceEur: 24.99,
    theme: "plant",
    cards: [
      // HIDDEN
      { id: "phyllali_pca", name: "Phyllali PCA", img: "images/phyllali_PCA.png", price: eur(5.5) },
      { id: "boskara", name: "Boskara", img: "images/boskara.png", price: eur(15.5) },
      { id: "filentrappe", name: "Filentrappe", img: "images/filentrappe.png", price: eur(4) },
      { id: "peterson", name: "Peterson", img: "images/peterson.png", price: eur(3) },
      { id: "scovilain", name: "Scovilain", img: "images/scovilain.png", price: eur(7) },

      // EPIC
      { id: "germignon", name: "Germignon", img: "images/germignon.png", price: eur(60) },
      { id: "astronelle", name: "Astronelle", img: "images/astronelle.png", price: eur(70) },
      { id: "chetiflor", name: "Chétiflor", img: "images/chetiflor.png", price: eur(109) },
      { id: "chenipan", name: "Chenipan", img: "images/chenipan.png", price: eur(69) },
      { id: "majaspic", name: "Majaspic", img: "images/majaspic.png", price: eur(70) },
      { id: "mimitoss", name: "Mimitoss", img: "images/mimitoss.png", price: eur(109) },
      { id: "noeufnoeuf", name: "Noeufnoeuf", img: "images/noeufnoeuf.png", price: eur(109) },
      { id: "paras", name: "Paras", img: "images/paras.png", price: eur(109) },
      { id: "phyllali", name: "Phyllali", img: "images/phyllali.png", price: eur(77) },

      // ULTRA
      { id: "aeromite", name: "Aéromite", img: "images/aeromite.png", price: eur(135) },
      { id: "energie_plante", name: "Énergie Plante", img: "images/energie_plante.png", price: eur(129) },
      { id: "jungko", name: "Jungko", img: "images/jungko.png", price: eur(209) },
      { id: "nidoking", name: "Nidoking", img: "images/nidoking.png", price: eur(199) },

      // LEGENDARY
      { id: "florizarre", name: "Florizarre", img: "images/florizarre.png", price: eur(1350) },
    ],
  },

  WATER: {
    key: "WATER",
    uiName: "Booster Eau",
    icon: "💧",
    packPriceEur: 24.99,
    theme: "water",
    cards: [
      // HIDDEN
      { id: "givrali_vstar", name: "Givrali VSTAR", img: "images/givrali_vstar.png", price: eur(5.5) },
      { id: "keldeo", name: "Keldeo", img: "images/keldeo.png", price: eur(8.05) },
      { id: "leviator_vmax", name: "Léviator VMAX", img: "images/leviator_vmax.png", price: eur(15.1) },
      { id: "tortank_pca", name: "Tortank PCA", img: "images/tortank_PCA.png", price: eur(4.0) },

      // EPIC
      { id: "aquali", name: "Aquali", img: "images/aquali.png", price: eur(40) },
      { id: "energie_eau", name: "Énergie Eau", img: "images/energie_eau.png", price: eur(119) },
      { id: "lumineon", name: "Lumineon", img: "images/lumineon.png", price: eur(54) },
      { id: "pingoleon", name: "Pingoléon", img: "images/pingoleon.png", price: eur(100) },
      { id: "poissirene", name: "Poissirène", img: "images/poissirene.png", price: eur(109) },

      // ULTRA
      { id: "flobio", name: "Flobio", img: "images/flobio.png", price: eur(249) },
      { id: "givrali", name: "Givrali", img: "images/givrali.png", price: eur(125.99) },
      { id: "leviator", name: "Léviator", img: "images/leviator.png", price: eur(229) },
      { id: "ludicolo", name: "Ludicolo", img: "images/ludicolo.png", price: eur(200) },
      { id: "palkia", name: "Palkia", img: "images/palkia.png", price: eur(145.99) },
      { id: "staross", name: "Staross", img: "images/staross.png", price: eur(215) },

      // LEGENDARY
      { id: "lokhlass", name: "Lokhlass", img: "images/lokhlass.png", price: eur(499) },
      { id: "leviator_obscur", name: "Léviator Obscur", img: "images/leviator_obscur.png", price: eur(1049) },
      { id: "tortank", name: "Tortank", img: "images/tortank.png", price: eur(1689) },
    ],
  },

  FIRE: {
    key: "FIRE",
    uiName: "Booster Feu",
    icon: "🔥",
    packPriceEur: 24.99,
    theme: "fire",
    cards: [
      // HIDDEN
      { id: "galopa_cgg", name: "Galopa CGG", img: "images/galopa_cgg.png", price: eur(7.5) },
      { id: "lugulabre", name: "Lugulabre", img: "images/lugulabre.png", price: eur(7.0) },

      // EPIC
      { id: "dracaufeu_ex", name: "Dracaufeu EX", img: "images/dracaufeu_ex.png", price: eur(75) },
      { id: "feu_percant", name: "Feu Perçant", img: "images/feu_percant.png", price: eur(53) },
      { id: "pyrobut", name: "Pyrobut", img: "images/pyrobut.png", price: eur(35.5) },
      { id: "reptincel", name: "Reptincel", img: "images/reptincel.png", price: eur(78.99) },
      { id: "scolocendre_vmax", name: "Scolocendre VMAX", img: "images/scolocendre_vmax.png", price: eur(60) },
      { id: "hericendre", name: "Héricendre", img: "images/hericendre.png", price: eur(120) },

      // ULTRA
      { id: "dracaufeu_vmax", name: "Dracaufeu VMAX", img: "images/dracaufeu_vmax.png", price: eur(145) },
      { id: "energie_feu", name: "Énergie Feu", img: "images/energie_feu.png", price: eur(149) },
      { id: "feurisson", name: "Feurisson", img: "images/feurisson.png", price: eur(249) },
      { id: "galopa", name: "Galopa", img: "images/galopa.png", price: eur(145) },
      { id: "pyroli", name: "Pyroli", img: "images/pyroli.png", price: eur(239) },
      { id: "reshiram", name: "Reshiram", img: "images/reshiram.png", price: eur(200) },
      { id: "typhlosion", name: "Typhlosion", img: "images/typhlosion.png", price: eur(199) },

      // LEGENDARY
      { id: "dracaufeu", name: "Dracaufeu", img: "images/dracaufeu.png", price: eur(6299) },
    ],
  },
};

// Helpers pratiques
export function boosterByKey(packKey) {
  const k = String(packKey || "").toUpperCase();
  return BOOSTERS[k] || null;
}

export function buildCardIndex() {
  const map = new Map();
  for (const b of Object.values(BOOSTERS)) {
    for (const c of b.cards) map.set(c.id, c);
  }
  return map;
}

// Optionnel: accès direct par (pack_key, card_id)
export function buildCardIndexByPack() {
  const byPack = new Map();
  for (const b of Object.values(BOOSTERS)) {
    const m = new Map();
    for (const c of b.cards) m.set(c.id, c);
    byPack.set(b.key, m);
  }
  return byPack;
}
