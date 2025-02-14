const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://https://simple-ludo-beta.vercel.app"], // Replace with your Vercel URL
    methods: ["GET", "POST"]
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Game state storage
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // Previous backend logic (createRoom, joinRoom, startGame, etc.)
  // ... [Keep all the existing socket.io logic from previous answer] ...
});

function generateRoomId() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
