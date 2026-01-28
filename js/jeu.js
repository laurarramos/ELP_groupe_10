const { TYPES, CONFIG_PAQUET } = require('./constants.js');
const Joueur = require('./joueur.js');
const JoueurIA = require('./joueur_ia.js');

class JeuFlip7 {
    constructor(nomsJoueurs) {
        this.pioche = this.creerPaquet();
        this.defausse = [];
        this.joueurs = [];
        
        // Initialisation hybride Humains / IA
        for (let i = 0; i < nomsJoueurs.length; i++) {
            const cfg = nomsJoueurs[i];
            // Si le nom contient [IA] ou si le flag isIA est présent
            if (cfg.isIA || (typeof cfg === 'string' && cfg.includes("[IA]"))) {
                this.joueurs.push(new JoueurIA(cfg.nom || cfg));
            } else {
                this.joueurs.push(new Joueur(cfg.nom || cfg));
            }
        }
        this.numManche = 1;
        this.donneurIndex = 0;
    }

    // --- LOGIQUE RÉSEAU ---
    
    // Envoie un message à tous les joueurs connectés
    broadcast(data) {
        this.joueurs.forEach(j => {
            if (j.socket && j.socket.readyState === 1) { // 1 = OPEN
                j.socket.send(JSON.stringify(data));
            }
        });
    }

    // Attente asynchrone d'un message spécifique d'un joueur (Promesse)
    attendreReponse(joueur, typeAttendu) {
        if (joueur.isIA) return null; // Les IA ne passent pas par les sockets

        return new Promise((resolve) => {
            const gestionnaire = (data) => {
                const message = JSON.parse(data);
                if (message.type === typeAttendu) {
                    joueur.socket.removeListener('message', gestionnaire);
                    resolve(message);
                }
            };
            joueur.socket.on('message', gestionnaire);
        });
    }

    // --- LOGIQUE DU JEU ---

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
// Sert à debugger / tester
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
 
// Sert à debugger / tester
    async piocherPour(joueur) {
        if (this.pioche.length === 0) {
            this.broadcast({ type: "INFO", msg: "🔄 Pioche vide ! Remélange..." });
            this.pioche = this.melanger(this.defausse);
            this.defausse = [];
        }
        const carte = this.pioche.pop();
        
        if (carte.type === TYPES.ACTION) {
            this.broadcast({ type: "INFO", msg: `> ${joueur.nom} pioche ACTION : ${carte.nom}` });
            await this.resoudreAction(carte, joueur);
        } else {
            joueur.main.push(carte);
            this.broadcast({ type: "INFO", msg: `> ${joueur.nom} pioche : ${carte.nom || carte.valeur}` });
            
            if (this.verifierDoublon(joueur)) {
                this.broadcast({ type: "INFO", msg: `💥 DOUBLON ! ${joueur.nom} est éliminé.` });
                joueur.elimine = true;
                joueur.enJeu = false;
            }
        }
        // Mise à jour visuelle pour tout le monde après chaque pioche
        this.notifierEtatGlobal();
    }

    verifierDoublon(joueur) {
        const nombres = joueur.main.filter(c => c.type === TYPES.NOMBRE && c.valeur !== 0);
        if (nombres.length < 2) return false;

        const derniere = nombres[nombres.length - 1];
        const existeDeja = nombres.slice(0, -1).some(c => c.valeur === derniere.valeur);

        if (existeDeja) {
            if (joueur.aSecondeChance) {
                this.broadcast({ type: "INFO", msg: "🛡️ SECONDE CHANCE utilisée !" });
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

        // Logique IA
        if (joueurQuiChoisit.isIA) {
            const pool = ciblesActives.filter(c => c !== joueurQuiChoisit) || ciblesActives;
            return pool[Math.floor(Math.random() * pool.length)];
        }

        // Logique Réseau
        joueurQuiChoisit.socket.send(JSON.stringify({
            type: "CHOISIR_CIBLE",
            action: nomAction,
            cibles: ciblesActives.map((c, i) => ({ id: i, nom: c.nom }))
        }));

        const reponse = await this.attendreReponse(joueurQuiChoisit, "CIBLE_CHOISIE");
        return ciblesActives[reponse.cibleId];
    }

    async resoudreAction(carte, joueurPiochant) {
        if (carte.nom === 'SECOND CHANCE') {
            if (!joueurPiochant.aSecondeChance) {
                joueurPiochant.aSecondeChance = true;
                await this.piocherPour(joueurPiochant);
            } else {
                const ciblesEligibles = this.joueurs.filter(j => j.enJeu && !j.elimine && !j.aSecondeChance && j !== joueurPiochant);
                if (ciblesEligibles.length > 0) {
                    const cible = await this.choisirCible(joueurPiochant, "SECOND CHANCE", ciblesEligibles);
                    if (cible) cible.aSecondeChance = true;
                }
            }
        } else {
            const cible = await this.choisirCible(joueurPiochant, carte.nom);
            if (cible) {
                if (carte.nom === 'FREEZE') {
                    cible.elimine = true;
                    cible.enJeu = false;
                } else if (carte.nom === 'FLIP THREE') {
                    for (let i = 0; i < 3; i++) {
                        await this.piocherPour(cible);
                        if (cible.elimine || this.verifierFlip7(cible)) break;
                    }
                }
            }
        }
        this.defausse.push(carte); 
    }

    verifierFlip7(joueur) {
        const nbNombres = joueur.main.filter(c => c.type === TYPES.NOMBRE).length;
        if (nbNombres === 7 && !joueur.elimine) {
            this.broadcast({ type: "INFO", msg: `✨ FLIP 7 par ${joueur.nom} !` });
            this.joueurs.forEach(j => j.enJeu = false);
            return true;
        }
        return false;
    }

    notifierEtatGlobal() {
        const etat = {
            type: "UPDATE_GAME",
            joueurs: this.joueurs.map(j => ({
                nom: j.nom,
                scoreManche: j.calculerScoreManche(),
                scoreGlobal: j.scoreGlobal,
                main: j.main.map(c => c.nom || c.valeur),
                enJeu: j.enJeu,
                elimine: j.elimine,
                protege: j.aSecondeChance
            })),
            numManche: this.numManche
        };
        this.broadcast(etat);
    }

    async jouerManche() {
        this.broadcast({ type: "INFO", msg: `\n=== MANCHE ${this.numManche} ===` });
        
        // Distribution initiale
        for (let i = 0; i < this.joueurs.length; i++) {
            let idx = (this.donneurIndex + i) % this.joueurs.length;
            await this.piocherPour(this.joueurs[idx]);
        }

        while (this.joueurs.some(j => j.enJeu)) {
            for (let i = 0; i < this.joueurs.length; i++) {
                let idx = (this.donneurIndex + i) % this.joueurs.length;
                let j = this.joueurs[idx];
                if (!j.enJeu) continue;

                this.notifierEtatGlobal();
                let rep = "";

                if (j.isIA) {
                    const decision = j.action(this);
                    rep = (decision.type === "PIOCHER") ? "o" : "n";
                    await new Promise(r => setTimeout(r, 1000)); // Pause pour lisibilité
                } else {
                    j.socket.send(JSON.stringify({ type: "VOTRE_TOUR" }));
                    const msg = await this.attendreReponse(j, "ACTION_TOUR");
                    rep = msg.choix;
                }

                if (rep === "o") {
                    await this.piocherPour(j);
                    this.verifierFlip7(j);
                } else {
                    j.enJeu = false;
                }
            }
        }

        // Fin de manche
        this.joueurs.forEach(j => {
            j.scoreGlobal += j.calculerScoreManche();
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
        this.broadcast({ type: "GAMEOVER", winner: vainqueur.nom });
    }
}

module.exports = JeuFlip7;