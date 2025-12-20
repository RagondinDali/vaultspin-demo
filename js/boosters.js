// js/boosters.js

function eur(n) {
  return Number(n || 0);
}

/**
 * Règles identiques au booster plante :
 * - LEGENDARY : pool dédié (tirage 1/5000)
 * - ULTRA : pool dédié (tirage 1/50)
 * - EPIC : pool dédié (tirage 1/20)
 * - sinon => HIDDEN (pool dédié, tirage majoritaire)
 */
export const BOOSTERS = {
  plant: {
    key: "plant",
    uiName: "Booster Plante",
    icon: "🌿",
    packPriceEur: 24.99,

    // (optionnel) look & feel
    theme: "plant",

    cards: [
      // HIDDEN
      { id: "phyllali_pca", name: "Phyllali PCA", img: "images/phyllali_PCA.png", price: eur(5.5), hidden: true },
      { id: "boskara", name: "Boskara", img: "images/boskara.png", price: eur(15.5), hidden: true },
      { id: "filentrappe", name: "Filentrappe", img: "images/filentrappe.png", price: eur(4), hidden: true },
      { id: "peterson", name: "Peterson", img: "images/peterson.png", price: eur(3), hidden: true },
      { id: "scovilain", name: "Scovilain", img: "images/scovilain.png", price: eur(7), hidden: true },

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
      { id: "florizarre", name: "Florizarre", img: "images/florizarre.png", price: eur(1350), legendary: true },
    ],
  },

  water: {
    key: "water",
    uiName: "Booster Eau",
    icon: "💧",
    packPriceEur: 24.99, // tu peux changer si tu veux

    theme: "water",

    cards: [
      // HIDDEN (communes)
      { id: "givrali_vstar", name: "Givrali VSTAR", img: "images/givrali_vstar.png", price: eur(5.50), hidden: true },
      { id: "keldeo", name: "Keldeo", img: "images/keldeo.png", price: eur(8.05), hidden: true },
      { id: "leviator_vmax", name: "Léviator VMAX", img: "images/leviator_vmax.png", price: eur(15.10), hidden: true },
      { id: "tortank_pca", name: "Tortank PCA", img: "images/tortank_PCA.png", price: eur(4.00), hidden: true },

      // EPIC (tout ce qui n’est pas hidden + pas ultra + pas legendary)
      { id: "aquali", name: "Aquali", img: "images/aquali.png", price: eur(40) },
      { id: "energie_eau", name: "Énergie Eau", img: "images/energie_eau.png", price: eur(119) }, // 119 => EPIC (comme ton seuil 121)
      { id: "lumineon", name: "Lumineon", img: "images/lumineon.png", price: eur(54) },
      { id: "pingoleon", name: "Pingoléon", img: "images/pingoleon.png", price: eur(100) },
      { id: "poissirene", name: "Poissirène", img: "images/poissirene.png", price: eur(109) },

      // ULTRA (121 à 300 inclus)
      { id: "flobio", name: "Flobio", img: "images/flobio.png", price: eur(249), ultra: true },
      { id: "givrali", name: "Givrali", img: "images/givrali.png", price: eur(125.99), ultra: true },
      { id: "leviator", name: "Léviator", img: "images/leviator.png", price: eur(229), ultra: true },
      { id: "ludicolo", name: "Ludicolo", img: "images/ludicolo.png", price: eur(200), ultra: true },
      { id: "palkia", name: "Palkia", img: "images/palkia.png", price: eur(145.99), ultra: true },
      { id: "staross", name: "Staross", img: "images/staross.png", price: eur(215), ultra: true },

      // LEGENDARY (pool dédié)
      { id: "lokhlass", name: "Lokhlass", img: "images/lokhlass.png", price: eur(499), legendary: true },
      { id: "leviator_obscur", name: "Léviator Obscur", img: "images/leviator_obscur.png", price: eur(1049), legendary: true },
      { id: "tortank", name: "Tortank", img: "images/tortank.png", price: eur(1689), legendary: true },
    ],
  },
};

// js/boosters.js

function eur(n) {
  return Number(n || 0);
}

/**
 * Règles :
 * - hidden:true => HIDDEN (pas de tag)
 * - legendary:true => LEGENDARY (pool dédié)
 * - ultra:true => ULTRA (pool dédié)
 * - sinon => EPIC
 *
 * Le prix "détermine" la rareté => ici on met les flags selon tes seuils :
 *   LEGENDARY : > 300
 *   ULTRA     : 121–300
 *   EPIC      : < 121
 *   HIDDEN    : hidden:true
 */
export const BOOSTERS = {
  plant: {
    /* ... ton code ... */
  },

  water: {
    /* ... ton code ... */
  },

  fire: {
    key: "fire",
    uiName: "Booster Feu",
    icon: "🔥",
    packPriceEur: 24.99,
    theme: "fire",

    cards: [
      // -------------------
      // HIDDEN
      // -------------------
      { id: "galopa_cgg", name: "Galopa CGG", img: "images/galopa_cgg.png", price: eur(7.5), hidden: true },
      { id: "lugulabre", name: "Lugulabre", img: "images/lugulabre.png", price: eur(7.0), hidden: true },

      // -------------------
      // EPIC (< 121)
      // -------------------
      { id: "dracaufeu_ex", name: "Dracaufeu EX", img: "images/dracaufeu_ex.png", price: eur(75) },
      { id: "feu_percant", name: "Feu Perçant", img: "images/feu_percant.png", price: eur(53) },
      { id: "pyrobut", name: "Pyrobut", img: "images/pyrobut.png", price: eur(35.5) },
      { id: "reptincel", name: "Reptincel", img: "images/reptincel.png", price: eur(78.99) },
      { id: "scolocendre_vmax", name: "Scolocendre VMAX", img: "images/scolocendre_vmax.png", price: eur(60) },
      { id: "hericendre", name: "Héricendre", img: "images/hericendre.png", price: eur(120) }, // 120 => EPIC

      // -------------------
      // ULTRA (121–300)
      // -------------------
      { id: "dracaufeu_vmax", name: "Dracaufeu VMAX", img: "images/dracaufeu_vmax.png", price: eur(145), ultra: true },
      { id: "energie_feu", name: "Énergie Feu", img: "images/energie_feu.png", price: eur(149), ultra: true },
      { id: "feurisson", name: "Feurisson", img: "images/feurisson.png", price: eur(249), ultra: true },
      { id: "galopa", name: "Galopa", img: "images/galopa.png", price: eur(145), ultra: true },
      { id: "pyroli", name: "Pyroli", img: "images/pyroli.png", price: eur(239), ultra: true },
      { id: "reshiram", name: "Reshiram", img: "images/reshiram.png", price: eur(200), ultra: true },
      { id: "typhlosion", name: "Typhlosion", img: "images/typhlosion.png", price: eur(199), ultra: true },

      // -------------------
      // LEGENDARY (> 300)
      // -------------------
      { id: "dracaufeu", name: "Dracaufeu", img: "images/dracaufeu.png", price: eur(6299), legendary: true },
    ],
  },
};
