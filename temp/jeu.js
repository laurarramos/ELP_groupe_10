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

    // Attente asynchrone d'un message spécifique d'un joueur (Promesse) --> attente qu un joueur clique sur un bouton
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
 

    async piocherPour(joueur) {
        // 1. Vérification et remélange de la pioche si nécessaire
        if (this.pioche.length === 0) {
            this.broadcast({ type: "INFO", msg: "🔄 Pioche vide ! Remélange..." });
            this.pioche = this.melanger(this.defausse);
            this.defausse = [];
        }

        // 2. Récupération de la carte
        const carte = this.pioche.pop();
        
        // 3. Ajout immédiat à la main pour que ce soit visible par tous
        joueur.main.push(carte);
        
        // 4. Notification immédiate aux clients pour l'affichage visuel
        this.notifierEtatGlobal();

        // 5. Traitement selon le type de carte
        if (carte.type === TYPES.ACTION) {
            // Envoi d'un message d'information réseau
            this.broadcast({ type: "INFO", msg: `> ${joueur.nom} a pioché l'action : ${carte.nom}` });
            
            // Résolution de l'action (Freeze, Seconde Chance, etc.)
            await this.resoudreAction(carte, joueur);
        } else {
            // C'est une carte Nombre : message d'info
            this.broadcast({ type: "INFO", msg: `> ${joueur.nom} pioche : ${carte.nom || carte.valeur}` });
            
            // Vérification des doublons (avec la sécurité sur le nombre de cartes)
            if (this.verifierDoublon(joueur)) {
                this.broadcast({ type: "INFO", msg: `💥 DOUBLON ! ${joueur.nom} est éliminé.` });
                joueur.elimine = true;
                joueur.enJeu = false;
            }
        }

        // 6. Mise à jour finale de l'état global après résolution
        this.notifierEtatGlobal();
    }

    verifierDoublon(joueur) {
        const nombres = joueur.main.filter(c => c.type === TYPES.NOMBRE && c.valeur !== 0);
        if (nombres.length < 2) return false;

        const derniere = nombres[nombres.length - 1];
        // On compare la dernière carte avec toutes les précédentes
        const existeDeja = nombres.slice(0, -1).some(c => c.valeur === derniere.valeur);

        if (existeDeja) {
            if (joueur.aSecondeChance) {
                this.broadcast({ type: "INFO", msg: "🛡️ SECONDE CHANCE utilisée !" });
                // Retirer le doublon de la main et le mettre en défausse
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

        // ENVOI AU CLIENT : Demande de choisir une cible
        joueurQuiChoisit.socket.send(JSON.stringify({
            type: "CHOISIR_CIBLE",
            action: nomAction,
            cibles: ciblesActives.map((c, i) => ({ id: i, nom: c.nom }))
        }));

        // ATTENTE : On attend le message 'CIBLE_CHOISIE' du client
        const reponse = await this.attendreReponse(joueurQuiChoisit, "CIBLE_CHOISIE");
        return ciblesActives[reponse.cibleId];
    }

    async resoudreAction(carte, joueurPiochant) {
        // ÉTAPE 1 : On montre la carte Action telle quelle (en orange/blanc)
        // On appelle notifier pour que tout le monde voie ce qui vient d'être pioché
        this.notifierEtatGlobal();
        await new Promise(r => setTimeout(r, 1500)); // Pause de 1.5s pour observer la pioche

        // ÉTAPE 2 : Activation de l'action
        // On marque la carte comme "utilisée" (elle deviendra grise via le CSS)
        carte.utilisee = true; 
        this.notifierEtatGlobal();
        await new Promise(r => setTimeout(r, 800)); // Courte pause "effet visuel"

        if (carte.nom === 'SECOND CHANCE') {
            if (!joueurPiochant.aSecondeChance) {
                this.broadcast({ type: "INFO", msg: `🛡️ ${joueurPiochant.nom} active sa Seconde Chance !` });
                joueurPiochant.aSecondeChance = true;
                await new Promise(r => setTimeout(r, 1000));
                // La règle : on pioche immédiatement une autre carte après une protection
                await this.piocherPour(joueurPiochant); 
            } else {
                // Le joueur est déjà protégé, il doit choisir une cible
                const ciblesEligibles = this.joueurs.filter(j => j.enJeu && !j.elimine && !j.aSecondeChance && j !== joueurPiochant);
                if (ciblesEligibles.length > 0) {
                    const cible = await this.choisirCible(joueurPiochant, "SECOND CHANCE", ciblesEligibles);
                    if (cible) {
                        this.broadcast({ type: "INFO", msg: `🎁 ${joueurPiochant.nom} protège ${cible.nom} !` });
                        cible.aSecondeChance = true;
                        await new Promise(r => setTimeout(r, 1000));
                    }
                } else {
                    this.broadcast({ type: "INFO", msg: `🗑️ Pas de cible valide pour la Seconde Chance.` });
                }
            }
        } else {
            // Logique pour les cartes d'attaque : FREEZE et FLIP THREE
            // Si c'est une IA, elle choisit sa cible instantanément sans ouvrir de fenêtre chez vous
            const cible = await this.choisirCible(joueurPiochant, carte.nom);
            
            if (cible) {
                if (carte.nom === 'FREEZE') {
                    this.broadcast({ type: "INFO", msg: `🧊 ${joueurPiochant.nom} utilise FREEZE sur ${cible.nom} !` });
                    this.notifierEtatGlobal(); 
                    await new Promise(r => setTimeout(r, 2000)); // Longue pause pour le suspense
                    
                    cible.elimine = true;
                    cible.enJeu = false;
                } 
                else if (carte.nom === 'FLIP THREE') {
                    this.broadcast({ type: "INFO", msg: `🃏 ${joueurPiochant.nom} force ${cible.nom} à piocher 3 cartes !` });
                    this.notifierEtatGlobal();
                    await new Promise(r => setTimeout(r, 1500));
                    
                    // Pioche forcée de 3 cartes avec une pause entre chaque pioche
                    for (let i = 0; i < 3; i++) {
                        if (cible.elimine) break;
                        await this.piocherPour(cible); 
                        await new Promise(r => setTimeout(r, 1200)); // Délai entre chaque carte subie
                    }
                }
            }
        }

        // ÉTAPE 3 : Finalisation
        this.defausse.push(carte); 
        this.notifierEtatGlobal();
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
                enJeu: j.enJeu,
                elimine: j.elimine,
                // C'est cette ligne qui permet au client de savoir s'il faut afficher le bouclier
                protege: j.aSecondeChance, 
                main: j.main.map(c => ({
                    label: c.nom || c.valeur,
                    utilisee: c.utilisee || false,
                    isAction: c.type === TYPES.ACTION
                }))
            })),
            numManche: this.numManche
        };
        this.broadcast(etat);
    }

    async jouerManche() {
        this.broadcast({ type: "INFO", msg: `\n=== MANCHE ${this.numManche} ===` });
        
        // 1. Distribution initiale : chaque joueur reçoit une carte
        for (let i = 0; i < this.joueurs.length; i++) {
            let idx = (this.donneurIndex + i) % this.joueurs.length;
            await this.piocherPour(this.joueurs[idx]);
        }

        // 2. Boucle principale de la manche
        while (this.joueurs.some(j => j.enJeu)) {
            for (let i = 0; i < this.joueurs.length; i++) {
                let idx = (this.donneurIndex + i) % this.joueurs.length;
                let j = this.joueurs[idx];

                // Sécurité : On saute le tour si le joueur n'est plus en jeu ou a été éliminé (ex: Freeze)
                if (!j.enJeu || j.elimine) continue;

                this.notifierEtatGlobal();
                let rep = "";

                // --- Phase de décision ---
                if (j.isIA) {
                    const decision = j.action(this);
                    rep = (decision.type === "PIOCHER") ? "o" : "n";
                    // Petite pause pour que les humains puissent suivre l'IA
                    await new Promise(r => setTimeout(r, 800));
                } else {
                    j.socket.send(JSON.stringify({ type: "VOTRE_TOUR" }));
                    const msg = await this.attendreReponse(j, "ACTION_TOUR");
                    rep = msg.choix;
                }

                // --- Phase d'exécution ---
                if (rep === "o") {
                    await this.piocherPour(j);
                    if (!j.elimine) this.verifierFlip7(j);
                } else {
                    j.enJeu = false;
                }

                // --- NETTOYAGE DE FIN DE TOUR ---
                // On retire les cartes Action (grisées) de la main avant de passer au joueur suivant
                j.main = j.main.filter(c => c.type !== TYPES.ACTION);
                this.notifierEtatGlobal();
            }
        }

        // 3. Fin de manche : Calcul des scores et remise à zéro
        this.broadcast({ type: "INFO", msg: "--- Fin de la manche ---" });
        this.joueurs.forEach(j => {
            j.scoreGlobal += j.calculerScoreManche();
            this.defausse.push(...j.main);
            j.resetManche();
        });
        
        this.donneurIndex = (this.donneurIndex + 1) % this.joueurs.length;
        this.numManche++;
    }

    async lancerPartie() {
        let partieTerminee = false;
        
        while (!partieTerminee) {
            await this.jouerManche();
            
            // On vérifie si au moins un joueur a atteint 200 points à la fin de la manche
            if (this.joueurs.some(j => j.scoreGlobal >= 200)) {
                partieTerminee = true;
            }
        }

        // Le vainqueur est celui qui a le plus de points au total
        const vainqueur = this.joueurs.reduce((prev, current) => 
            (prev.scoreGlobal > current.scoreGlobal) ? prev : current
        );

        this.broadcast({ 
            type: "GAMEOVER", 
            winner: vainqueur.nom,
            score: vainqueur.scoreGlobal 
        });
    }
}

module.exports = JeuFlip7;