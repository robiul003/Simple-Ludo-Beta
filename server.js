const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const rooms = new Map();

io.on('connection', (socket) => {
    socket.on('createRoom', ({ playerName }) => {
        const roomId = Math.random().toString(36).substr(2, 6);
        rooms.set(roomId, {
            players: [{ id: socket.id, name: playerName, isHost: true }],
            gameState: null,
            currentTurn: null
        });
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
    });

    socket.on('joinRoom', ({ roomId, playerName }) => {
        const room = rooms.get(roomId);
        if (!room) return socket.emit('error', 'Room not found');
        if (room.players.length >= 4) return socket.emit('error', 'Room full');
        
        room.players.push({ id: socket.id, name: playerName, isHost: false });
        socket.join(roomId);
        io.to(roomId).emit('playerJoined', room.players);
    });

    socket.on('startGame', (roomId) => {
        const room = rooms.get(roomId);
        if (!room) return;
        room.gameState = initializeGameState(room.players);
        io.to(roomId).emit('gameStarted', room.gameState);
    });

    socket.on('rollDice', (roomId) => {
        const room = rooms.get(roomId);
        if (!room || !room.gameState) return;
        
        const diceValue = Math.floor(Math.random() * 6) + 1;
        io.to(roomId).emit('diceRolled', diceValue);
    });

    socket.on('movePiece', ({ roomId, pieceIndex }) => {
        // Add game logic validation here
        io.to(roomId).emit('pieceMoved', pieceIndex);
    });

    socket.on('sendMessage', ({ roomId, message, sender }) => {
        io.to(roomId).emit('newMessage', { message, sender });
    });

    socket.on('disconnect', () => {
        rooms.forEach((room, roomId) => {
            room.players = room.players.filter(p => p.id !== socket.id);
            if (room.players.length === 0) rooms.delete(roomId);
            else io.to(roomId).emit('playerLeft', room.players);
        });
    });
});

function initializeGameState(players) {
    return {
        players: players.map((p, i) => ({
            ...p,
            color: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'][i],
            pieces: Array(4).fill({ position: 'base', pathIndex: -1 })
        })),
        currentTurn: 0,
        diceValue: 0
    };
}

server.listen(3000, () => console.log('Server running on port 3000'));
