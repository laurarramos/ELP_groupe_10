# Flip 7 Online :) - Groupe 10

## Lancement

La personne qui héberge le serveur : 

1. Créez un compte [ngrok](https://ngrok.com/) et installez ngrok sur votre machine.
2. Ouvrez un terminal et lancez la commande suivante pour exposer le serveur local sur internet :
   ```
   ngrok http 8080
   ```
3. Notez l'URL publique fournie par ngrok (quelque chose comme `https://xxxxxx.ngrok-free.app`).
4. Mettez à jour l'URL du serveur WebSocket dans `js/client.js`  :
   ```javascript
   this.socket = new WebSocket('wss://xxxxxx.ngrok-free.app');
   ```
5. Dans un autre terminal, lancez le serveur Node.js :
   ```
   node js/server.js
   ```
6. Ouvrez le html `js/client.html` dans votre navigateur. 
7. Entrez votre nom, indiquez le nombre d'IA et cliquez sur "Se connecter".
8. Lancez la partie lorsque tous les joueurs sont connectés.

La ou les personnes qui se connectent au serveur :
1. Ouvrez le html `js/client.html` dans votre navigateur.
2. Entrez votre nom et cliquez sur "Se connecter".
3. Attendez que l'hôte lance la partie.