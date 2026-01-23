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
        this.donneurIndex = 0;
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

    afficherEtatPioche() {
        const stats = this.pioche.reduce((acc, c) => {
            const label = c.nom || c.valeur.toString();
            acc[label] = (acc[label] || 0) + 1;
            return acc;
        }, {});
        
        console.log("\n📊 ÉTAT DE LA PIOCHE (Cartes restantes) :");
        let ligne = "";
        Object.keys(stats).sort((a, b) => {
            if (!isNaN(a) && !isNaN(b)) return parseInt(a) - parseInt(b);
            return a.localeCompare(b);
        }).forEach(k => {
            ligne += `[${k}]:x${stats[k]}  `;
        });
        console.log(ligne || "La pioche est vide.");
        console.log(`Nombre total de cartes : ${this.pioche.length}`);
    }

    async piocherPour(joueur) {
        if (this.pioche.length === 0) {
            console.log("\n🔄 Pioche épuisée ! Remélange des cartes défaussées.");
            this.pioche = this.melanger(this.defausse);
            this.defausse = [];
        }
        const carte = this.pioche.pop();
        
        if (carte.type === TYPES.ACTION) {
            console.log(`> ${joueur.nom} pioche : ${carte.nom}`);
            await this.resoudreAction(carte, joueur);
        } else if (carte.type === TYPES.MODIFIER) {
            console.log(`> ${joueur.nom} pioche : modifier ${carte.nom}`);
            joueur.main.push(carte);
        } else {
            joueur.main.push(carte);
            console.log(`> ${joueur.nom} pioche : ${carte.nom || carte.valeur}`);
            if (this.verifierDoublon(joueur)) {
                console.log(`💥 DOUBLON ! ${joueur.nom} est éliminé.`);
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
                console.log("🛡️ SECONDE CHANCE utilisée ! Le doublon est défaussé.");
                this.defausse.push(joueur.main.pop());
                joueur.aSecondeChance = false;
                return false;
            }
            return true;
        }
        return false;
    }

    async choisirCible(joueurQuiChoisit, nomAction, ciblesRestreintes = null) {
        const ciblesActives = ciblesRestreintes || this.joueurs.filter(j => j.enJeu && !j.elimine);
        
        if (ciblesActives.length === 0) return null;
        if (ciblesActives.length === 1) {
            console.log(`ℹ️ Cible unique : ${ciblesActives[0].nom} subit l'action.`);
            return ciblesActives[0];
        }

        console.log(`\n🎯 ${joueurQuiChoisit.nom}, choisis la cible pour ${nomAction} :`);
        ciblesActives.forEach((j, i) => console.log(`${i} : ${j.nom}`));

        let index = -1;
        while (isNaN(index) || index < 0 || index >= ciblesActives.length) {
            const rep = await rl.question(`Numéro du joueur : `);
            index = parseInt(rep);
        }
        return ciblesActives[index];
    }

    async resoudreAction(carte, joueurPiochant) {
        if (carte.nom === 'SECOND CHANCE') {
            if (!joueurPiochant.aSecondeChance) {
                console.log(`❤️ ${joueurPiochant.nom} garde la Seconde Chance.`);
                joueurPiochant.aSecondeChance = true;
            } else {
                console.log(`⚠️ ${joueurPiochant.nom} en a déjà une. Doit la donner à un joueur sans protection.`);
                // On ne cible que les joueurs ACTIFS qui n'ont PAS de seconde chance 
                const ciblesEligibles = this.joueurs.filter(j => j.enJeu && !j.elimine && !j.aSecondeChance && j !== joueurPiochant);
                
                if (ciblesEligibles.length === 0) {
                    console.log(`🗑️ Personne n'est éligible. La Seconde Chance est défaussée.`);
                } else {
                    const cible = await this.choisirCible(joueurPiochant, "SECOND CHANCE", ciblesEligibles);
                    if (cible) {
                        console.log(`❤️ Don de Seconde Chance à ${cible.nom}.`);
                        cible.aSecondeChance = true;
                    }
                }
            }
        } else {
            const cible = await this.choisirCible(joueurPiochant, carte.nom);
            if (cible) {
                if (carte.nom === 'FREEZE') {
                    console.log(`🧊 ${cible.nom} est gelé !`);
                    cible.elimine = true;
                    cible.enJeu = false;
                } else if (carte.nom === 'FLIP THREE') {
                    console.log(`🃏 ${cible.nom} subit 3 pioches forcées !`);
                    let actionsAPosteriori = [];
                    for (let i = 0; i < 3; i++) {
                        if (this.pioche.length === 0) { this.pioche = this.melanger(this.defausse); this.defausse = []; }
                        const c = this.pioche.pop();
                        if (c.type === TYPES.ACTION) actionsAPosteriori.push(c);
                        else {
                            cible.main.push(c);
                            console.log(`> Pioche ${i+1}: ${c.nom || c.valeur}`);
                            if (this.verifierDoublon(cible)) { cible.elimine = true; cible.enJeu = false; break; }
                        }
                        if (cible.main.filter(c => c.type === TYPES.NOMBRE).length === 7 && !cible.elimine) break;
                    }
                    for (let act of actionsAPosteriori) await this.resoudreAction(act, cible);
                }
            }
        }
        this.defausse.push(carte); 
    }

    calculerScoreTour(joueur) {
        if (joueur.elimine) return 0;
        let cN = joueur.main.filter(c => c.type === TYPES.NOMBRE);
        let pts = cN.reduce((acc, c) => acc + c.valeur, 0);
        if (joueur.main.some(c => c.nom === 'x2')) pts *= 2;
        pts += joueur.main.filter(c => c.bonus).reduce((acc, c) => acc + c.bonus, 0);
        if (cN.length >= 7) pts += 15;
        return pts;
    }

    async jouerManche() {
        console.log(`\n========== MANCHE ${this.numManche} ==========`);
        for (let i = 0; i < this.joueurs.length; i++) {
            let idx = (this.donneurIndex + i) % this.joueurs.length;
            await this.piocherPour(this.joueurs[idx]);
        }

        while (this.joueurs.some(j => j.enJeu)) {
            for (let i = 0; i < this.joueurs.length; i++) {
                let idx = (this.donneurIndex + i) % this.joueurs.length;
                let j = this.joueurs[idx];
                if (!j.enJeu) continue;

                this.afficherEtatPioche();
                console.log(`\nTour de : ${j.nom}`);
                console.log(`Main : [${j.main.map(c => c.nom || c.valeur).join(', ')}]`);
                
                let rep = "";
                while (rep !== 'o' && rep !== 'n') {
                    rep = (await rl.question(`${j.nom} (${this.calculerScoreTour(j)} pts), piocher ? (o/n) : `)).toLowerCase();
                    if (rep !== 'o' && rep !== 'n') console.log("⚠️ Répondez par 'o' ou 'n'.");
                }
                
                if (rep === 'o') {
                    await this.piocherPour(j);
                    if (!j.elimine && j.main.filter(c => c.type === TYPES.NOMBRE).length === 7) {
                        console.log(`✨ FLIP 7 par ${j.nom} !`);
                        this.joueurs.forEach(other => other.enJeu = false);
                        break;
                    }
                } else {
                    j.enJeu = false;
                }
            }
        }

        console.log("\n--- MANCHE TERMINÉE ---");
        this.joueurs.forEach(j => {
            const pts = this.calculerScoreTour(j);
            j.scoreGlobal += pts;
            this.defausse.push(...j.main);
            j.main = []; j.enJeu = true; j.elimine = false; j.aSecondeChance = false;
        });
        
        this.donneurIndex = (this.donneurIndex + 1) % this.joueurs.length;
        this.numManche++;
    }

    async lancerPartie() {
        while (!this.joueurs.some(j => j.scoreGlobal >= 200)) {
            await this.jouerManche();
            this.joueurs.forEach(j => console.log(`${j.nom}: ${j.scoreGlobal} pts`));
        }
        const vainqueur = this.joueurs.reduce((p, c) => (p.scoreGlobal > c.scoreGlobal) ? p : c);
        console.log(`\n🏆 VICTOIRE de ${vainqueur.nom} !`);
        rl.close();
    }
}

const partie = new JeuFlip7(["Laura", "Flore", "Maksim"]);
partie.lancerPartie();