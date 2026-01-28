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
            noms = []; 
        // 1. Demande du nombre de joueurs humains
        let nbHumains = -1;
        while (isNaN(nbHumains) || nbHumains < 0) {
            const rep = await rl.question("Combien de joueurs humains ? ");
            nbHumains = parseInt(rep);
            if (isNaN(nbHumains) || nbHumains < 0) {
                console.log("⚠️ Veuillez entrer un nombre valide (0 ou plus).");
            }
        }

        // Saisie des noms pour les humains
        for (let i = 1; i <= nbHumains; i++) {
            let nom = "";
            while (nom.trim() === "") {
                nom = await rl.question(`Nom du joueur humain #${i} : `);
                if (nom.trim() === "") {
                    console.log("⚠️ Le nom ne peut pas être vide.");
                }
            }
            noms.push(nom.trim());
        }

        // 2. Demande du nombre de joueurs IA
        let nbIA = -1;
        while (isNaN(nbIA) || nbIA < 0) {
            const rep = await rl.question("Combien de joueurs IA ? ");
            nbIA = parseInt(rep);
            if (isNaN(nbIA) || nbIA < 0) {
                console.log("⚠️ Veuillez entrer un nombre valide (0 ou plus).");
            } else if (noms.length + nbIA < 2) {
                console.log("⚠️ Il doit y avoir au moins 2 joueurs au total.");
            }
        }

        // Saisie des noms pour les IA
        for (let i = 1; i <= nbIA; i++) {
            let nomIA = await rl.question(`Nom de l'IA ${i} (laisser vide pour "IA-${i}") : `);
            if (nomIA.trim() === "") {
                nomIA = `IA-${i}`;
            }
            // on ajoute un marqueur [IA] pour différencier les IA des humains
            noms.push(nomIA.trim() + " [IA]");
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