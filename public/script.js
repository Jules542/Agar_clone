const socket = io();
const gameContainer = document.getElementById('gameContainer');

let players = {};
let food = [];
let currentPlayer = {};

let targetPosition = { x: 0, y: 0 }; //Position cible (souris)
let speed = 3; //Vitesse maximale

//Ajouter les éléments html pour les joueurs et les aliments
function createPlayerElement(player) {
    const playerElement = document.createElement('div');
    playerElement.className = 'player';
    playerElement.style.backgroundColor = player.color;
    gameContainer.appendChild(playerElement);
    return playerElement;
}

function createFoodElement(foodItem) {
    const foodElement = document.createElement('div');
    foodElement.className = 'food';
    foodElement.style.backgroundColor = foodItem.color;
    gameContainer.appendChild(foodElement);
    return foodElement;
}

socket.on('currentPlayers', (serverPlayers) => {
    players = serverPlayers;
    currentPlayer = players[socket.id];

    //Créer les éléments html pour chaque joueurs
    for (const id in players) {
        if (!players[id].element) {
            players[id].element = createPlayerElement(players[id]);
        }
    }
});

//Ajouter un nouveau joueur
socket.on('newPlayer', (data) => {
    players[data.id] = data.player;
    players[data.id].element = createPlayerElement(data.player);
});

//Gérer la nouvelle position d'un joueur
socket.on('playerMoved', (data) => {
    if (players[data.id]) {
        players[data.id].x = data.x;
        players[data.id].y = data.y;
        players[data.id].size = data.size;

        const playerElement = players[data.id].element;
        playerElement.style.width = `${data.size * 2}px`;
        playerElement.style.height = `${data.size * 2}px`;
        playerElement.style.left = `${data.x}px`;
        playerElement.style.top = `${data.y}px`;
    }
});

socket.on('foodUpdate', (serverFood) => {
    //Supprimer les anciens aliments
    food.forEach(f => f.element.remove());
    food = serverFood.map(f => {
        f.element = createFoodElement(f);
        f.element.style.width = `${f.size * 2}px`;
        f.element.style.height = `${f.size * 2}px`;
        f.element.style.left = `${f.x}px`;
        f.element.style.top = `${f.y}px`;
        return f;
    });
});

//Supprimer un joueur deconnecté
socket.on('playerDisconnected', (id) => {
    if (players[id] && players[id].element) {
        players[id].element.remove();
    }
    delete players[id];
});

window.addEventListener('mousemove', (event) => {
    targetPosition.x = event.clientX + window.scrollX;
    targetPosition.y = event.clientY + window.scrollY;
});

function updatePlayerPosition() {
    const dx = targetPosition.x - currentPlayer.x;
    const dy = targetPosition.y - currentPlayer.y;
    const distance = Math.sqrt(dx ** 2 + dy ** 2);
    let adjustedSpeed = speed / (currentPlayer.size / 10); //Vitesse réduite pour les joueurs plus gros
    adjustedSpeed = Math.max(1, adjustedSpeed); //Définir une vitesse minimale

    if (distance > adjustedSpeed) {
        const directionX = dx / distance;
        const directionY = dy / distance;

        currentPlayer.x += directionX * adjustedSpeed;
        currentPlayer.y += directionY * adjustedSpeed;

        //Envoyer la position mise à jour au serveur
        socket.emit('playerMove', { x: currentPlayer.x, y: currentPlayer.y });

        //Mettre à jour la position du div joueur
        const playerElement = players[socket.id].element;
        playerElement.style.left = `${currentPlayer.x}px`;
        playerElement.style.top = `${currentPlayer.y}px`;
    }
}

//Déplacer la caméra avec le joueur
function updateCamera() {
    const xOffset = window.innerWidth / 2 - currentPlayer.x;
    const yOffset = window.innerHeight / 2 - currentPlayer.y;
    gameContainer.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
}

//Boucle principale
function gameLoop() {
    updatePlayerPosition();
    updateCamera();
    requestAnimationFrame(gameLoop);
}

gameLoop();