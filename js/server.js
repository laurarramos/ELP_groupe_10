const WebSocket = require('ws');
const JeuFlip7 = require('./jeu');

const wss = new WebSocket.Server({ port: 8080 });
let clientsConnectes = [];
let partieEnCours = false;
let nombreJoueursIA = 0;

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'JOIN') {
            const isHost = clientsConnectes.length === 0;
            clientsConnectes.push({ nom: data.nom, socket: ws, isHost: isHost });
            
            ws.send(JSON.stringify({ 
                type: 'WELCOME', 
                isHost: isHost,
                message: isHost ? "Vous êtes l'hôte. Combien de joueurs IA voulez-vous ajouter ?" : "En attente de l'hôte..."
            }));
            broadcast({ type: 'PLAYER_LIST', players: clientsConnectes.map(c => c.nom) });
        
            if (isHost) {
                ws.send(JSON.stringify({
                    type: 'ASK_NB_IA',
                    message: "Combien de joueurs IA voulez-vous ajouter ? (0-4)"
                }));
            }
        
        }

        if (data.type === 'SET_NB_IA') {
            const client = clientsConnectes.find(c => c.socket === ws);
            if (client?.isHost) {
                nombreJoueursIA = data.nombre;
                console.log(`L'hôte a choisi d'ajouter ${nombreJoueursIA} joueurs IA.`);
                ws.send(JSON.stringify({
                    type: 'NB_IA_CONFIRME',
                    message: `Vous avez choisi d'ajouter ${nombreJoueursIA} joueurs IA. Prêt à démarrer la partie !`
                }));
            }
        }

        if (data.type === 'START_GAME' && !partieEnCours) {
            const client = clientsConnectes.find(c => c.socket === ws);
            if (client?.isHost && clientsConnectes.length >= 2) {
                partieEnCours = true;
                lancerLaPartieReseau();
            }
        }
    });

    // pour nettoyer les déconnexions
    ws.on('close', () => {
        const index = clientsConnectes.findIndex(c => c.socket === ws);
        if (index !== -1) {
            console.log(`${clientsConnectes[index].nom} est parti.`);
            clientsConnectes.splice(index, 1);
            
            // Si l'hôte est parti, on désigne un nouvel hôte
            if (clientsConnectes.length > 0) {
                clientsConnectes[0].isHost = true;
                clientsConnectes[0].socket.send(JSON.stringify({ 
                    type: 'WELCOME', isHost: true, message: "Vous êtes le nouvel hôte." 
                }));
            }
            broadcast({ type: 'PLAYER_LIST', players: clientsConnectes.map(c => c.nom) });
        }
    });
});

function broadcast(data) {
    clientsConnectes.forEach(c => c.socket.send(JSON.stringify(data)));
}

async function lancerLaPartieReseau() {
    // On crée des objets config pour chaque joueur
    const noms = clientsConnectes.map(c => ({ nom: c.nom, isIA: false }));
    
    for (let i = 1; i <= nombreJoueursIA; i++) {
        noms.push({ nom: `IA_${i}`, isIA: true });
    }

    const partie = new JeuFlip7(noms);
    
    // On lie les sockets uniquement aux joueurs humains
    clientsConnectes.forEach((client, i) => {
        if (partie.joueurs[i]) {
            partie.joueurs[i].socket = client.socket;
        }
    });

    console.log("Lancement de la partie !"); // Vérifie si ce message s'affiche dans ton terminal
    await partie.lancerPartie();
}