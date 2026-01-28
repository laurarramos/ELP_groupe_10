// client.js
class Flip7Client {
  constructor(nom) {
    this.nom = nom;
    this.socket = null;
    this.isHost = false;
  }

  // Connexion au serveur
  connect() {
    this.socket = new WebSocket('ws://localhost:8080');

    this.socket.onopen = () => {
      console.log('Connecté au serveur !');
      this.sendJoin();
    };

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.socket.onclose = () => {
      console.log('Déconnecté du serveur.');
    };
  }

  // Envoyer un message de type JOIN
  sendJoin() {
    this.socket.send(JSON.stringify({
      type: 'JOIN',
      nom: this.nom
    }));
  }

  // Envoyer un message de type START_GAME
  sendStartGame() {
    this.socket.send(JSON.stringify({
      type: 'START_GAME'
    }));
  }

  // Gérer les messages entrants
  handleMessage(message) {
    switch (message.type) {
      case 'WELCOME':
        this.isHost = message.isHost;
        console.log(message.message);
        break;
      case 'PLAYER_LIST':
        console.log('Liste des joueurs :', message.players.join(', '));
        break;
      case 'GAME_STATE':
        // Mettre à jour l'état du jeu côté client
        console.log('Nouvel état du jeu :', message.data);
        break;
      default:
        console.log('Message inconnu :', message);
    }
  }
}

//Utilisation
const client = new Flip7Client('Flore');
client.connect();
