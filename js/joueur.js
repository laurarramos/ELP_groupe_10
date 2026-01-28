const { TYPES } = require('./constants.js');

class Joueur {
    constructor(nom) {
        this.nom = nom;
        this.main = [];
        this.scoreGlobal = 0;
        this.enJeu = true; // devient false si le joueur décide de s'arrêter volontairement ou s'il est forcé à s'arrêter (élimination ou fin de tour par un autre joueur)
        this.elimine = false; // il passe à true uniquement si le joueur pioche un doublon ou s'il a reçu une carte Freeze
        this.aSecondeChance = false;
    }

    calculerScoreManche() {
        if (this.elimine) return 0;

        const cartesNombre = this.main.filter(c => c.type === TYPES.NOMBRE);
        let points = cartesNombre.reduce((acc, c) => acc + c.valeur, 0);

        // Multiplicateur x2
        if (this.main.some(c => c.nom === 'x2')) {
            points *= 2;
        }

        // Bonus fixes (+2, +4, ...)
        const bonusFixes = this.main.filter(c => c.bonus).reduce((acc, c) => acc + c.bonus, 0);
        points += bonusFixes;

        // Bonus Flip 7
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
    }
}

module.exports = Joueur;