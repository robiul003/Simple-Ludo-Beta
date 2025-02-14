const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static('public'));

// Game state storage
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    socket.on('createRoom', (playerName) => {
        const roomId = generateRoomId();
        rooms.set(roomId, {
            players: [{
                id: socket.id,
                name: playerName,
                isHost: true,
                color: null,
                pieces: Array(4).fill({ position: 'base', pathIndex: -1 })
            }],
            gameState: 'waiting',
            currentTurn: null,
            diceValue: 0
        });
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
        updateRoom(roomId);
    });

    socket.on('joinRoom', ({ roomId, playerName }) => {
        const room = rooms.get(roomId);
        if (!room) return socket.emit('error', 'Room not found');
        if (room.players.length >= 4) return socket.emit('error', 'Room full');

        room.players.push({
            id: socket.id,
            name: playerName,
            isHost: false,
            color: null,
            pieces: Array(4).fill({ position: 'base', pathIndex: -1 })
        });
        socket.join(roomId);
        updateRoom(roomId);
    });

    socket.on('startGame', (roomId) => {
        const room = rooms.get(roomId);
        if (!room || room.players.length < 2) return;
        
        // Assign colors
        const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'];
        room.players.forEach((player, index) => {
            player.color = colors[index];
        });
        
        room.gameState = 'playing';
        room.currentTurn = 0;
        io.to(roomId).emit('gameStarted', room.players);
    });

    socket.on('rollDice', (roomId) => {
        const room = rooms.get(roomId);
        if (!room || room.gameState !== 'playing') return;
        
        const diceValue = Math.floor(Math.random() * 6) + 1;
        room.diceValue = diceValue;
        io.to(roomId).emit('diceRolled', diceValue);
    });

    socket.on('movePiece', ({ roomId, playerId, pieceIndex }) => {
        const room = rooms.get(roomId);
        if (!room || room.gameState !== 'playing') return;
        
        // Basic move validation
        const currentPlayer = room.players[room.currentTurn];
        if (currentPlayer.id !== playerId) return;

        // Update piece position (simplified)
        currentPlayer.pieces[pieceIndex].pathIndex += room.diceValue;
        
        // Switch turns
        room.currentTurn = (room.currentTurn + 1) % room.players.length;
        io.to(roomId).emit('gameUpdate', room.players);
    });

    socket.on('chatMessage', ({ roomId, message, sender }) => {
        io.to(roomId).emit('newMessage', { message, sender });
    });

    socket.on('disconnect', () => {
        rooms.forEach((room, roomId) => {
            room.players = room.players.filter(p => p.id !== socket.id);
            if (room.players.length === 0) {
                rooms.delete(roomId);
            } else {
                updateRoom(roomId);
            }
        });
    });

    function updateRoom(roomId) {
        const room = rooms.get(roomId);
        io.to(roomId).emit('roomUpdate', {
            players: room.players,
            gameState: room.gameState,
            isHost: room.players[0].id === socket.id
        });
    }
});

function generateRoomId() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

server.listen(3000, () => {
    console.log('Server running on port 3000');
});
