const JeuFlip7 = require('./jeu');

async function demarrer() {
    const partie = new JeuFlip7(["Laura", "Flore", "Maksim"]);
    try {
        await partie.lancerPartie();
    } catch (err) {
        console.error("Erreur critique dans le jeu :", err);
    }
}

demarrer();