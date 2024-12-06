const socket = io();

//Récupérer les elements html
const loginScreen = document.getElementById('loginScreen');
const gameContainer = document.getElementById('gameContainer');
const joinButton = document.getElementById('joinButton');
const usernameInput = document.getElementById('usernameInput');

let players = {};
let food = [];
let currentPlayer = {};

let targetPosition = { x: 0, y: 0 }; //Position cible (souris)
let speed = 3; //Vitesse maximale


joinButton.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username) {
        socket.emit('joinGame', { username }); //Envoie du pseudo au  serv
        loginScreen.style.display = 'none';   // Cacher l'écran de connexion
        gameContainer.style.display = 'block'; // Afficher le jeu
    } else {
        alert('Veuillez entrer un pseudo.');
    }
});


//Ajouter les éléments html pour les joueurs et les aliments

function createPlayerElement(player) {
    const playerElement = document.createElement('div');
    playerElement.className = 'player';
    playerElement.style.backgroundColor = player.color;

    playerElement.style.width = `${player.size * 2}px`;
    playerElement.style.height = `${player.size * 2}px`;
    playerElement.style.left = `${player.x}px`;
    playerElement.style.top = `${player.y}px`;

    const playerName = document.createElement('span');
    playerName.className = 'player-name';
    playerName.textContent = player.username;

    playerElement.appendChild(playerName);
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

    //Tailles initiales des joueurs
    const playerElement = players[id].element;
    playerElement.style.width = `${players[id].size * 2}px`;
    playerElement.style.height = `${players[id].size * 2}px`;
    playerElement.style.left = `${players[id].x}px`;
    playerElement.style.top = `${players[id].y}px`;
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

//Alterter le joueur si il a perdu (a été mangé)
socket.on('gameOver', () => {
    alert('Vous avez perdu !');
    location.reload();
});

//Supprimer un joueur deconnecté
socket.on('playerDisconnected', (id) => {
    if (players[id] && players[id].element) {
        players[id].element.remove();
    }
    delete players[id];
});

let keysPressed = {};

window.addEventListener('keydown', (event) => {
    keysPressed[event.key] = true;
});

window.addEventListener('keyup', (event) => {
    delete keysPressed[event.key];
});

function updatePlayerPosition() {
    let dx = 0;
    let dy = 0;

    if (keysPressed['ArrowUp']) dy -= speed;
    if (keysPressed['ArrowDown']) dy += speed;
    if (keysPressed['ArrowLeft']) dx -= speed;
    if (keysPressed['ArrowRight']) dx += speed;

    const distance = Math.sqrt(dx ** 2 + dy ** 2);
    if (distance > 0) {
        const normalizedX = dx / distance;
        const normalizedY = dy / distance;

        let adjustedSpeed = speed / (currentPlayer.size / 10); //ajuster la vitesse pour les joueurs plus gros
        adjustedSpeed = Math.max(1, adjustedSpeed);

        currentPlayer.x += normalizedX * adjustedSpeed;
        currentPlayer.y += normalizedY * adjustedSpeed;

        socket.emit('playerMove', { x: currentPlayer.x, y: currentPlayer.y });

        //Mettre à jour la position de la div du joueur
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