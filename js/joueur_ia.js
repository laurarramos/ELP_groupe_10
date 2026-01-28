// joueur_ia.js
const Joueur = require("./joueur");
const { TYPES } = require("./constants");

class JoueurIA extends Joueur {
    isIA = true;

  constructor(
    nom,
    {
      seuilDoublon = 0.25,
      seuilDoublonAvecSecondeChance = 0.5,
    } = {}
  ) {
    super(nom);
    this.ia = {
      seuilDoublon,
      seuilDoublonAvecSecondeChance,
    };
  }

  getValeursNombreMain() {
  const valeurs = [];

  for (let i = 0; i < this.main.length; i++) {
    const carte = this.main[i];

    if (carte.type === TYPES.NOMBRE && carte.valeur !== 0) {
      valeurs.push(carte.valeur);
    }
  }

  return valeurs;
}

  compterNombresDansPioche(pioche) {
  const compteur = {};

  for (let i = 0; i < pioche.length; i++) {
    const carte = pioche[i];

    if (carte.type === TYPES.NOMBRE) {
      const valeur = carte.valeur;

      if (compteur[valeur] === undefined) {
        compteur[valeur] = 1;
      } else {
        compteur[valeur] = compteur[valeur] + 1;
      }
    }
  }

  return compteur;
}

probaDoublonProchainTirage(pioche) {
  // Si la pioche est vide, on considère que c'est trop risqué
  if (!pioche || pioche.length === 0) {
    return 1;
  }

  // Valeurs déjà présentes dans la main (ex: [3, 7, 3] )
  const valeursMain = this.getValeursNombreMain();

  // Si la main n'a aucun nombre, aucun risque de doublon
  if (valeursMain.length === 0) {
    return 0;
  }

  // Compte combien de chaque valeur il reste dans la pioche
  const counts = this.compterNombresDansPioche(pioche);

  // On crée une liste de valeurs uniques (pas de doublons)
  const valeursUniques = [];
  for (let i = 0; i < valeursMain.length; i++) {
    const v = valeursMain[i];
    if (!valeursUniques.includes(v)) {
      valeursUniques.push(v);
    }
  }

  // On additionne le nombre de cartes "dangereuses" restantes dans la pioche
  let nbDangereuses = 0;
  for (let i = 0; i < valeursUniques.length; i++) {
    const v = valeursUniques[i];

    if (counts[v] !== undefined) {
      nbDangereuses += counts[v];
    }
  }

  // Proba = (nombre de cartes dangereuses) / (taille totale de la pioche)
  return nbDangereuses / pioche.length;
}


  choisirCibleRandom(jeu, predicate = null) {
    const candidats = jeu.joueurs.filter((j) => {
      if (j === this) return false;
      if (!j.enJeu || j.elimine) return false;
      if (predicate && !predicate(j)) return false;
      return true;
    });

    if (candidats.length === 0) return null;
    const idx = Math.floor(Math.random() * candidats.length);
    return candidats[idx];
  }


  doitPiocher(jeu) {
  // Si la pioche est vide, on considère que c'est trop risqué
  if (!jeu.pioche || jeu.pioche.length === 0) {
    return false;
  }

  // Calcul de la probabilité de doublon
  const proba = this.probaDoublonProchainTirage(jeu.pioche);

  // Choix du seuil selon l'état du joueur
  let seuil;
  if (this.aSecondeChance) {
    seuil = this.ia.seuilDoublonAvecSecondeChance;
  } else {
    seuil = this.ia.seuilDoublon;
  }

  // Décision finale
  if (proba < seuil) {
    return true;   // l'IA pioche
  } else {
    return false;  // l'IA s'arrête
  }
}


  action(jeu) {
    return this.doitPiocher(jeu) ? { type: "PIOCHER" } : { type: "REFUSER" };
  }
  choisirCiblePourAction(jeu, carteAction) {
    if (!carteAction || carteAction.type !== TYPES.ACTION) return null;

    // Cas particulier: SECOND CHANCE quand le joueur en a déjà une
    if (carteAction.nom === "SECOND CHANCE" && this.aSecondeChance) {
      return this.choisirCibleRandom(jeu, (j) => !j.aSecondeChance);
    }

    // FREEZE / FLIP THREE : random parmi joueurs actifs
    return this.choisirCibleRandom(jeu);
  }
}

module.exports = JoueurIA;
