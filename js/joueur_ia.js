const Joueur = require("./joueur");
const { TYPES } = require("./constants");

class JoueurIA extends Joueur {
  constructor(nom, { seuilDoublon = 0.25, seuilDoublonAvecSecondeChance = 0.5 } = {}) {
    super(nom);
    this.isIA = true;
    this.ia = { seuilDoublon, seuilDoublonAvecSecondeChance };
  }

  getValeursNombreMain() {
    // L'IA ne doit regarder que les nombres réels encore en main (pas les utilisés)
    return this.main
      .filter(c => c.type === TYPES.NOMBRE && c.valeur !== 0 && !c.utilisee)
      .map(c => c.valeur);
  }

  compterNombresDansPioche(pioche) {
    const compteur = {};
    for (const carte of pioche) {
      if (carte.type === TYPES.NOMBRE) {
        compteur[carte.valeur] = (compteur[carte.valeur] || 0) + 1;
      }
    }
    return compteur;
  }

  probaDoublonProchainTirage(pioche) {
    if (!pioche || pioche.length === 0) return 1;

    const valeursMain = this.getValeursNombreMain();
    if (valeursMain.length === 0) return 0;

    const counts = this.compterNombresDansPioche(pioche);
    const valeursUniques = [...new Set(valeursMain)]; // Utilisation de Set pour l'élégance

    let nbDangereuses = 0;
    for (const v of valeursUniques) {
      if (counts[v]) nbDangereuses += counts[v];
    }

    return nbDangereuses / pioche.length;
  }

  doitPiocher(jeu) {
    if (!jeu.pioche || jeu.pioche.length === 0) return false;

    const proba = this.probaDoublonProchainTirage(jeu.pioche);
    const seuil = this.aSecondeChance ? 
                  this.ia.seuilDoublonAvecSecondeChance : 
                  this.ia.seuilDoublon;

    return proba < seuil;
  }

  action(jeu) {
    return this.doitPiocher(jeu) ? { type: "PIOCHER" } : { type: "REFUSER" };
  }

  choisirCiblePourAction(jeu, carteAction) {
    if (!carteAction || carteAction.type !== TYPES.ACTION) return null;

    // Priorité : Ne pas se cibler soi-même et cibler quelqu'un qui n'est pas éliminé
    if (carteAction.nom === "SECOND CHANCE" && this.aSecondeChance) {
        return this.choisirCibleRandom(jeu, (j) => !j.aSecondeChance);
    }

    return this.choisirCibleRandom(jeu);
  }
}

module.exports = JoueurIA;