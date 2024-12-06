const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();

const server = http.createServer(app);

const io = new Server(server);

const PORT = 3000;

app.use(express.static('public'));

let players = {};
let food = [];

//Constantes pour le nombre d'aliments et la taille de la map
const FOOD_COUNT = 400;
const MAP_WIDTH = 3000;
const MAP_HEIGHT = 3000;

//Fonction pour générer une couleur aléatoire
function getRandomColor() {
    const randomColor = Math.floor(Math.random() * 16777215).toString(16);
    return `#${randomColor}`;
}

//Fonction pour créer un aliment unique
function generateSingleFood() {
    return {
        x: Math.random() * MAP_WIDTH, //position X aléatoire
        y: Math.random() * MAP_HEIGHT, //position Y aléatoire
        size: 5,
        color: getRandomColor(),
    };
}

//Fonction pour générer plusieurs aliments au début
function generateFood() {
    food = [];
    for (let i = 0; i < FOOD_COUNT; i++) {
        food.push(generateSingleFood());
    }
}

//Générer les aliments au démarrage
generateFood();

//Fonction pour vérifier si un joueur mange un aliment
function checkFoodCollision(player) {
    food = food.filter((f) => {
        const distance = Math.sqrt(
            (player.x - f.x) ** 2 + (player.y - f.y) ** 2
        );
        if (distance < player.size) {
            //augmenter la taille du joueur si il a mangé
            player.size += 1;

            //Générer un nouvel aliment pour remplacer celui qui a été mangé
            food.push(generateSingleFood());
            return false;
        }
        return true;
    });
}

//Ajouter de nouveaux aliments si besoin
setInterval(() => {
    while (food.length < FOOD_COUNT) {
        food.push(generateSingleFood());
    }
    io.emit('foodUpdate', food);
}, 1000);

//Gérer les connexions des joueurs
io.on('connection', (socket) => {
    console.log(`Un joueur s'est connecté : ${socket.id}`);

    //Ajouter le joueur à la liste avec une position aléatoire et une couleur aléatoire
    players[socket.id] = {
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT,
        size: 10,
        color: getRandomColor(),
    };

    //Envoyer les informations actuelles du jeu (joueurs, nourriture) au nouveau joueur
    socket.emit('currentPlayers', players);
    socket.emit('foodUpdate', food);

    //Informer les autres joueurs qu'un nouveau joueur s'est connecté
    socket.broadcast.emit('newPlayer', {
        id: socket.id,
        player: players[socket.id],
    });

    //Gérer les mouvements du joueur
    socket.on('playerMove', (data) => {
        if (players[socket.id]) {
            //Mettre à jour la position du joueur
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;

            //Vérifier si le joueur mange un aliment
            checkFoodCollision(players[socket.id]);

            io.emit('playerMoved', {
                id: socket.id,
                ...players[socket.id],
            });

            //Envoyer les aliments mis à jour au joueur
            socket.emit('foodUpdate', food);
        }
    });

    //Gérer la déconnexion du joueur
    socket.on('disconnect', () => {
        console.log(`Un joueur s'est déconnecté : ${socket.id}`);

        //Supprimer le joueur de la liste
        delete players[socket.id];

        //Informer qu'un joueur est parti
        io.emit('playerDisconnected', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Le serveur tourne sur http://localhost:${PORT}`);
});