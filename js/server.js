const WebSocket = require('ws');
const JeuFlip7 = require('./jeu');

// Création du serveur WebSocket sur le port 8080
const wss = new WebSocket.Server({ port: 8080 });
console.log("Serveur Flip 7 lancé sur le port 8080");

let clientsConnectes = [];
let partieEnCours = false;

wss.on('connection', (ws) => {
    console.log("Un joueur s'est connecté.");

    ws.on('message', async (message) => {
        const data = JSON.parse(message);

        // Inscription des joueurs
        if (data.type === 'JOIN') {
            const estPremier = clientsConnectes.length === 0;
            clientsConnectes.push({ nom: data.nom, socket: ws, estHote: estPremier});

            ws.send(JSON.stringify({
                type: 'WELCOME',
                isHost: estPremier,
                message: estPremier ? "Vous êtes l'hôte de la partie. attendez les joueurs et lancez la partie." : "Bienvenue ! Attendez que l'hôte lance la partie."
            }));

            console.log(` ${data.nom} a rejoint la partie. Hôte: ${estPremier}`);
        }

        // Lancement par l'hôte
        if (data.type === 'START_GAME' && !partieEnCours) {
            const joueur = clientsConnectes.find(c => c.socket === ws);
            if (joueur && joueur.estHote) {
                if (clientsConnectes.length < 2) {
                    partieEnCours = true;
                    console.log("Lancement de la partie...");
                    lancerLaPartieReseau();
                } else {
                    ws.send(JSON.stringify({ type: 'ERROR', message: "Il faut au moins 2 joueurs pour commencer la partie." }));
                }
            }
        }
    });
});

async function lancerLaPartieReseau() {
    const noms = clientsConnectes.map(c => c.nom);
    const partie = new JeuFlip7(noms);

    // On lie les sockets aux instances de joueurs
    partie.joueurs.forEach((j, index) => {
        j.socket = clientsConnectes[index].socket;
    });

    await partie.lancerPartie();
}