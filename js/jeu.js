const readline = require('readline/promises');
const { TYPES, CONFIG_PAQUET } = require('./constants.js');
const Joueur = require('./joueur.js');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

class JeuFlip7 {
    constructor(nomsJoueurs) {
        this.pioche = this.creerPaquet();
        this.defausse = [];
        this.joueurs = nomsJoueurs.map(nom => new Joueur(nom));
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
            console.log(`> ${joueur.nom} pioche : ${carte.valeur}`);
            if (this.verifierDoublon(joueur)) {
                console.log(`💥 DOUBLON ! ${joueur.nom} est éliminé.`);
                joueur.elimine = true;
                joueur.enJeu = false;
            }
        }
    }
    verifierDoublon(joueur) {
        const nombres = joueur.main.filter(c => c.type === TYPES.NOMBRE && c.valeur !== 0);
        if (nombres.length < 2) return false;

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
                console.log(`🃏 ${joueurPiochant.nom} pioche une carte supplémentaire grâce à la Seconde Chance.`);
                await this.piocherPour(joueurPiochant);
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
                            if (this.verifierDoublon(cible)) { 
                                cible.elimine = true; 
                                cible.enJeu = false; 
                                console.log(`💥 DOUBLON ! ${cible.nom} est éliminé.`);
                                break; }
                        }

                        // On vérifie si le joueur atteint 7 cartes NOMBRES
                        const nbCartesNombres = cible.main.filter(c => c.type === TYPES.NOMBRE).length;
                        if (nbCartesNombres === 7 && !cible.elimine) {
                            console.log(`✨ FLIP 7 par ${cible.nom} !`);

                            // On force l'arrêt de TOUS les joueurs pour arrêter la manche
                            this.joueurs.forEach(j => j.enJeu = false);
                            break;
                        }
                    }
                    if (this.joueurs.some(j => !j.enJeu)) {
                        for (let act of actionsAPosteriori) await this.resoudreAction(act, cible);
                    }
                }
            }
        }
        this.defausse.push(carte); 
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

                console.log(`\nTour de : ${j.nom}`);
                console.log(`Main : [${j.main.map(c => c.nom || c.valeur).join(', ')}]`);
                
                let rep = "";
                while (rep !== 'o' && rep !== 'n') {
                    rep = (await rl.question(`${j.nom} (${j.calculerScoreManche()} pts), piocher ? (o/n) : `)).toLowerCase();
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
            const pts = j.calculerScoreManche();
            j.scoreGlobal += pts;
            console.log(`${j.nom} marque ${pts} pts (Total: ${j.scoreGlobal})`);
            this.defausse.push(...j.main);
            j.resetManche();
        });
        
        this.donneurIndex = (this.donneurIndex + 1) % this.joueurs.length;
        this.numManche++;
    }

    async lancerPartie() {
        while (!this.joueurs.some(j => j.scoreGlobal >= 200)) {
            await this.jouerManche();
        }
        const vainqueur = this.joueurs.reduce((p, c) => (p.scoreGlobal > c.scoreGlobal) ? p : c);
        console.log(`\n🏆 VICTOIRE de ${vainqueur.nom} !`);
        rl.close();
    }
}

module.exports = JeuFlip7;