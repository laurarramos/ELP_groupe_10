const readline = require('readline/promises');
const JeuFlip7 = require('./jeu');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function demarrer() {
    console.log("Configuration de la partie Flip 7...");
    
    try {
        let noms = [];
        let totalJoueurs = 0;

        // On boucle tant qu'on n'a pas au moins 2 joueurs
        while (totalJoueurs < 2) {
            noms = []; // on réinitialise si l'utilisateur s'est trompé
            
            // 1. Demande du nombre de joueurs humains
            const repH = await rl.question("Combiens de joueurs humains ? ");
            let nbHumains = parseInt(repH) || 0;
            
            for (let i = 1; i <= nbHumains; i++) {
                let nom = "";
                while (!nom.trim()) {
                    nom = await rl.question(`Nom du joueur humain #${i} : `);
                    if (!nom.trim()) {
                        console.log("⚠️ Le nom ne peut pas être vide.");
                    }
                }
                noms.push(nom.trim());
            }

            // 2. Demande du nombre de joueurs IA
            const repM = await rl.question("Combiens de joueurs IA ? ");
            let nbIA = parseInt(repM) || 0;
            
            for (let i = 1; i <= nbIA; i++) {
                let nomIA = await rl.question(`Nom de l'IA ${i} (laisser vide pour "IA-${i}") : `);
                if (nomIA.trim() === "") {
                    nomIA = `IA-${i}`;
                }
                // on ajoute un marqueur [IA] pour différencier les IA des humains
                noms.push(nomIA.trim() + " [IA]");
            }
            totalJoueurs = noms.length;
            if (totalJoueurs < 2) {
                console.log("⚠️ Il faut au moins 2 joueurs pour commencer une partie.");
            }
        }

        console.log(`\n🚀 La partie va commencer avec : ${noms.join(', ')}`);

        const partie = new JeuFlip7(noms, rl);
        await partie.lancerPartie();
        
    } catch (err) {
        console.error("Une erreur est survenue :", err);
    } finally {
        rl.close();
    }
}

demarrer();