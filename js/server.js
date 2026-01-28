const WebSocket = require('ws');
const JeuFlip7 = require('./jeu');

const wss = new WebSocket.Server({ port: 8080 });
let clientsConnectes = [];
let partieEnCours = false;

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'JOIN') {
            const isHost = clientsConnectes.length === 0;
            clientsConnectes.push({ nom: data.nom, socket: ws, isHost: isHost });
            
            ws.send(JSON.stringify({ 
                type: 'WELCOME', 
                isHost: isHost,
                message: isHost ? "Vous êtes l'hôte." : "En attente de l'hôte..."
            }));
            broadcast({ type: 'PLAYER_LIST', players: clientsConnectes.map(c => c.nom) });
        }

        if (data.type === 'START_GAME' && !partieEnCours) {
            const client = clientsConnectes.find(c => c.socket === ws);
            if (client?.isHost && clientsConnectes.length >= 2) {
                partieEnCours = true;
                lancerLaPartieReseau();
            }
        }
    });
});

function broadcast(data) {
    clientsConnectes.forEach(c => c.socket.send(JSON.stringify(data)));
}

async function lancerLaPartieReseau() {
    const noms = clientsConnectes.map(c => c.nom);
    const partie = new JeuFlip7(noms);
    
    // Injection des sockets dans les objets Joueur
    partie.joueurs.forEach((j, i) => { j.socket = clientsConnectes[i].socket; });

    await partie.lancerPartie();
}