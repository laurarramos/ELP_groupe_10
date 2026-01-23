const readline = require('readline/promises');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

class JeuFLP7 {
    constructor(nomsJoueurs) {
        this.paquet = this.creerPaquet();
        this.joueurs = nomsJoueurs.map(nom => ({
            nom: nom,
            main: [],
            enJeu: true, // Est-ce que le joueur continue de piocher au fil des tours ?
            elimine: false // A-t-il fait un doublon ?
        }));
    }

    creerPaquet() {
        let p = [];
        for (let i = 12; i >= 1; i--) {
            for (let j = 0; j < i; j++) p.push(i);
        }
        p.push(0);
        return p.sort(() => Math.random() - 0.5);
    }

    // Vérifie si la dernière carte piochée est un doublon
    estUnDoublon(joueur) {
        const derniere = joueur.main[joueur.main.length - 1];
        if (derniere === 0) return false;
        return joueur.main.slice(0, -1).includes(derniere);
    }

    async jouer() {
        console.log("=== FLP-7 : TOUR PAR TOUR ALTERNÉ ===");

        // La boucle continue tant qu'il reste au moins un joueur actif (enJeu)
        while (this.joueurs.some(j => j.enJeu)) {
            
            for (let joueur of this.joueurs) {
                if (!joueur.enJeu) continue; // On passe le tour de ceux qui se sont arrêtés ou sont éliminés

                console.log(`\n--- Tour de ${joueur.nom} ---`);
                console.log(`Main actuelle : [${joueur.main.join(', ')}]`);
                
                const choix = await rl.question(`${joueur.nom}, veux-tu piocher une carte ? (o/n) : `);

                if (choix.toLowerCase() === 'o') {
                    const carte = this.paquet.pop();
                    joueur.main.push(carte);
                    console.log(`> Tu as pioché un : ${carte}`);

                    if (this.estUnDoublon(joueur)) {
                        console.log(`💥 DOUBLON ! ${joueur.nom} est éliminé.`);
                        joueur.elimine = true;
                        joueur.enJeu = false;
                        joueur.main = []; // Score tombe à zéro
                    } else if (joueur.main.length === 7) {
                        console.log(`✨ FLP-7 ! ${joueur.nom} a 7 cartes différentes et gagne IMMÉDIATEMENT !`);
                        this.afficherResultats();
                        rl.close();
                        return; // Fin brutale du jeu
                    }
                } else {
                    console.log(`${joueur.nom} décide de s'arrêter là.`);
                    joueur.enJeu = false;
                }
            }
        }

        this.afficherResultats();
        rl.close();
    }

    afficherResultats() {
        console.log("\n===========================");
        console.log("      SCORES FINAUX        ");
        console.log("===========================");
        this.joueurs.forEach(j => {
            const score = j.main.reduce((acc, v) => acc + v, 0);
            const statut = j.elimine ? "ÉLIMINÉ" : "ARRÊTÉ";
            console.log(`${j.nom} (${statut}) : ${score} pts | Main: [${j.main.join(', ')}]`);
        });
    }
}

const partie = new JeuFLP7(["Laura", "Flore", "Maksim"]);
partie.jouer();