const { TYPES } = require('./constants.js');

class Joueur {
    constructor(nom) {
        this.nom = nom;
        this.main = [];
        this.scoreGlobal = 0;
        this.enJeu = true;
        this.elimine = false;
        this.aSecondeChance = false;
        this.isIA = false;
    }

    calculerScoreManche() {
        if (this.elimine) return 0;

        // On ne compte QUE les cartes de type NOMBRE qui ne sont pas marquées 'utilisee'
        const cartesNombre = this.main.filter(c => c.type === TYPES.NOMBRE && !c.utilisee);
        let points = cartesNombre.reduce((acc, c) => acc + c.valeur, 0);

        // Multiplicateur x2 (uniquement si pas déjà utilisé/défaussé)
        if (this.main.some(c => c.nom === 'x2' && !c.utilisee)) {
            points *= 2;
        }

        // Bonus fixes (+2, +4, ...)
        const bonusFixes = this.main.filter(c => c.bonus && !c.utilisee)
                                    .reduce((acc, c) => acc + c.bonus, 0);
        points += bonusFixes;

        // Bonus Flip 7 : 7 cartes nombres ou plus en main
        if (cartesNombre.length >= 7) {
            points += 15;
        }

        return points;
    }

    resetManche() {
        this.main = [];
        this.enJeu = true;
        this.elimine = false;
        this.aSecondeChance = false;
        // On s'assure que les futures cartes ne seront pas marquées 'utilisee' par erreur
    }
}

module.exports = Joueur;