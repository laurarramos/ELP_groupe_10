// client.js
class Flip7Client {
  constructor(nom) {
    this.nom = nom;
    this.socket = null;
    this.isHost = false;
  }

  // Connexion au serveur
  connect() {
    this.socket = new WebSocket('wss://1d18137f42a1.ngrok-free.app'); // URL du serveur WebSocket

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
      document.getElementById('statut').innerText = "Déconnecté du serveur.";
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

  // Envoie 'o' pour piocher ou 'n' pour s'arrêter
  sendAction(choix) {
    this.socket.send(JSON.stringify({ type: 'ACTION_TOUR', choix: choix }));
    document.getElementById('controls').style.display = 'none';
  }

  // Gérer les messages entrants
  handleMessage(message) {
    switch (message.type) {
      case 'WELCOME':
        this.isHost = message.isHost;
        document.getElementById('statut').innerText = message.message;
        // On n'affiche le bouton START que si l'hôte a fini de configurer les IA
        break;

      case 'ASK_NB_IA':
        const nb = prompt(message.message, "0");
        this.socket.send(JSON.stringify({ type: 'SET_NB_IA', nombre: parseInt(nb) || 0 }));
        break;

      case 'NB_IA_CONFIRME':
        document.getElementById('statut').innerText = message.message;
        if (this.isHost) {
            document.getElementById('host-zone').style.display = 'block';
        }
        break;

      case 'PLAYER_LIST':
        const liste = document.getElementById('player-list');
        liste.innerHTML = message.players.map(p => `<li>${p}</li>`).join('');
        break;

      case 'UPDATE_GAME':
        // Fonction définie dans le HTML pour mettre à jour la vue
        majPlateau(message.joueurs);
        break;

      case 'VOTRE_TOUR':
        document.getElementById('statut').innerText = "C'est votre tour !";
        document.getElementById('controls').style.display = 'block';
        break;

      case 'CHOISIR_CIBLE':
        afficherSelectionCible(message.action, message.cibles);
        break;

      case 'INFO':
        console.log("Info serveur:", message.msg);
        break;

      case 'GAMEOVER':
        alert("La partie est terminée ! Vainqueur : " + message.winner);
        location.reload();
        break;
    }
  }
}