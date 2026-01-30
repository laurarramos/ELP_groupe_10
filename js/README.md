# Flip 7 Online - Groupe 10

## Lancement

La personne qui héberge le serveur : 

1. Créez un compte [ngrok] et récupérez le authtoken.
2. Installez ngrok sur votre machine :
   sur Mac/Linux :
   ```brew install ngrok```
3. Rajoutez votre authtoken :
   ```ngrok config add-authtoken <token>```
4. Lancez la commande suivante pour exposer le serveur local sur internet :
   ```
   ngrok http 8080
   ```
5. Notez l'URL publique fournie par ngrok (quelque chose comme `https://xxxxxx.ngrok-free.app`).
6. Mettez à jour l'URL du serveur WebSocket dans `js/client.js`  :
   ```javascript
   this.socket = new WebSocket('wss://xxxxxx.ngrok-free.app');
   ```
7. Dans un autre terminal, lancez le serveur Node.js :
   ```
   node js/server.js
   ```
8. Ouvrez le html `js/client.html` dans votre navigateur. 
9. Entrez votre nom, indiquez le nombre d'IA et cliquez sur "Se connecter".
10. Lancez la partie lorsque tous les joueurs sont connectés.

La ou les personnes qui se connectent au serveur :
1. Ouvrez le html `js/client.html` dans votre navigateur.
2. Entrez votre nom et cliquez sur "Se connecter".

3. Attendez que l'hôte lance la partie.
