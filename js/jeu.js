const readline = require('readline/promises');

const TYPES = { NOMBRE: 'nombre', MODIFIER: 'modifier', ACTION: 'action' };

const CONFIG_PAQUET = [
    { type: TYPES.NOMBRE, valeur: 0, quantite: 1 },
    { type: TYPES.NOMBRE, valeur: 1, quantite: 1 },
    { type: TYPES.NOMBRE, valeur: 2, quantite: 2 },
    { type: TYPES.NOMBRE, valeur: 3, quantite: 3 },
    { type: TYPES.NOMBRE, valeur: 4, quantite: 4 },
    { type: TYPES.NOMBRE, valeur: 5, quantite: 5 },
    { type: TYPES.NOMBRE, valeur: 6, quantite: 6 },
    { type: TYPES.NOMBRE, valeur: 7, quantite: 7 },
    { type: TYPES.NOMBRE, valeur: 8, quantite: 8 },
    { type: TYPES.NOMBRE, valeur: 9, quantite: 9 },
    { type: TYPES.NOMBRE, valeur: 10, quantite: 10 },
    { type: TYPES.NOMBRE, valeur: 11, quantite: 11 },
    { type: TYPES.NOMBRE, valeur: 12, quantite: 12 },
    { type: TYPES.MODIFIER, nom: '+2', bonus: 2, quantite: 1 },
    { type: TYPES.MODIFIER, nom: '+4', bonus: 4, quantite: 1 },
    { type: TYPES.MODIFIER, nom: '+6', bonus: 6, quantite: 1 },
    { type: TYPES.MODIFIER, nom: '+8', bonus: 8, quantite: 1 },
    { type: TYPES.MODIFIER, nom: '+10', bonus: 10, quantite: 1 },
    { type: TYPES.MODIFIER, nom: 'x2', multiplicateur: 2, quantite: 1 },
    { type: TYPES.ACTION, nom: 'FREEZE', quantite: 3 },
    { type: TYPES.ACTION, nom: 'FLIP THREE', quantite: 3 },
    { type: TYPES.ACTION, nom: 'SECOND CHANCE', quantite: 3 }
];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

class JeuFlip7 {
    constructor(nomsJoueurs) {
        this.pioche = this.creerPaquet();
        this.defausse = [];
        this.joueurs = nomsJoueurs.map(nom => ({
            nom: nom,
            main: [],
            scoreGlobal: 0,
            enJeu: true,
            elimine: false,
            aSecondeChance: false
        }));
        this.numManche = 1;
    }

    creerPaquet() {
        let p = [];
        CONFIG_PAQUET.forEach(c => {
            for (let i = 0; i < c.quantite; i++) p.push({ ...c });
        });
        return this.melanger(p);
    }

    melanger(tab) {
        for (let i = tab.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tab[i], tab[j]] = [tab[j], tab[i]];
        }
        return tab;
    }

    async piocherPour(joueur) {
        if (this.pioche.length === 0) {
            console.log("\n🔄 Pioche vide ! Remélange de la défausse...");
            this.pioche = this.melanger(this.defausse);
            this.defausse = [];
        }
        const carte = this.pioche.pop();
        
        if (carte.type === TYPES.ACTION) {
            await this.resoudreAction(carte, joueur);
        } else {
            joueur.main.push(carte);
            console.log(`> ${joueur.nom} pioche : ${carte.nom || carte.valeur}`);
            if (this.verifierDoublon(joueur)) {
                console.log(`💥 DOUBLON ! ${joueur.nom} perd ses points pour cette manche.`);
                joueur.elimine = true;
                joueur.enJeu = false;
            }
        }
    }

    verifierDoublon(joueur) {
        const nombres = joueur.main.filter(c => c.type === TYPES.NOMBRE && c.valeur !== 0);
        if (nombres.length === 0) return false;
        const derniere = nombres[nombres.length - 1];
        const existeDeja = nombres.slice(0, -1).some(c => c.valeur === derniere.valeur);

        if (existeDeja) {
            if (joueur.aSecondeChance) {
                console.log("🛡️ SECONDE CHANCE utilisée ! La carte est défaussée.");
                this.defausse.push(joueur.main.pop());
                joueur.aSecondeChance = false;
                return false;
            }
            return true;
        }
        return false;
    }

    async resoudreAction(carte, joueur) {
        console.log(`⚡ ACTION : ${carte.nom}`);
        if (carte.nom === 'FREEZE') {
            console.log(`🧊 ${joueur.nom} est gelé (éliminé du tour) !`);
            joueur.elimine = true;
            joueur.enJeu = false;
        } else if (carte.nom === 'FLIP THREE') {
            console.log(`🃏 ${joueur.nom} doit piocher 3 nouvelles cartes !`);
            for (let i = 0; i < 3; i++) {
                if (!joueur.elimine) await this.piocherPour(joueur);
            }
        } else if (carte.nom === 'SECOND CHANCE') {
            console.log(`❤️ ${joueur.nom} garde une Seconde Chance.`);
            joueur.aSecondeChance = true;
        }
        this.defausse.push(carte); 
    }

    calculerScoreTour(joueur) {
        if (joueur.elimine) return 0;
        let base = joueur.main.filter(c => c.type === TYPES.NOMBRE).reduce((acc, c) => acc + c.valeur, 0);
        if (joueur.main.some(c => c.nom === 'x2')) base *= 2;
        base += joueur.main.filter(c => c.bonus).reduce((acc, c) => acc + c.bonus, 0);
        if (joueur.main.filter(c => c.type === TYPES.NOMBRE).length >= 7) base += 15;
        return base;
    }

    async jouerManche() {
        console.log(`\n========== MANCHE ${this.numManche} ==========`);
        
        // Distribution initiale d'une carte par joueur
        for (let j of this.joueurs) await this.piocherPour(j);

        while (this.joueurs.some(j => j.enJeu)) {
            for (let j of this.joueurs) {
                if (!j.enJeu) continue;

                console.log(`\nTour de : ${j.nom}`);
                console.log(`Main : [${j.main.map(c => c.nom || c.valeur).join(', ')}]`);
                
                const rep = await rl.question(`${j.nom} (${this.calculerScoreTour(j)} pts), piocher ? (o/n) : `);
                
                if (rep.toLowerCase() === 'o') {
                    await this.piocherPour(j);
                    // Arrêt immédiat de la manche si un Flip 7 est réussi
                    if (j.main.filter(c => c.type === TYPES.NOMBRE).length === 7) {
                        console.log(`✨ FLIP 7 réussi par ${j.nom} ! Fin de la manche.`);
                        this.joueurs.forEach(other => other.enJeu = false);
                        break;
                    }
                } else {
                    j.enJeu = false;
                }
            }
        }

        // Fin de manche : Mise à jour des scores globaux
        console.log(`\n--- RÉSULTATS MANCHE ${this.numManche} ---`);
        this.joueurs.forEach(j => {
            const pts = this.calculerScoreTour(j);
            j.scoreGlobal += pts;
            console.log(`${j.nom} a marqué ${pts} pts.`);
            this.defausse.push(...j.main); // Les cartes utilisées vont en défausse
            // Réinitialisation pour la prochaine manche
            j.main = [];
            j.enJeu = true;
            j.elimine = false;
            j.aSecondeChance = false;
        });
        this.numManche++;
    }

    async lancerPartie() {
        // La partie s'arrête si au moins un joueur a atteint 200 points à la fin d'un tour
        while (!this.joueurs.some(j => j.scoreGlobal >= 200)) {
            await this.jouerManche();
            console.log("\n--- SCORES TOTAUX ---");
            this.joueurs.forEach(j => console.log(`${j.nom}: ${j.scoreGlobal} pts`));
        }

        // Détermination du vainqueur
        const vainqueur = this.joueurs.reduce((prev, curr) => (prev.scoreGlobal > curr.scoreGlobal) ? prev : curr);
        console.log(`\n🏆 VICTOIRE de ${vainqueur.nom} avec ${vainqueur.scoreGlobal} points !`);
        rl.close();
    }
}

const partie = new JeuFlip7(["Laura", "IA_Stephane"]);
partie.lancerPartie();