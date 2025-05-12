const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, './')));

// Store room users
const rooms = {};

// Run when client connects
io.on('connection', (socket) => {
    console.log(`New connection: ${socket.id}`);

    // Join room
    socket.on('joinRoom', ({ username, roomCode }) => {
        // Create room if doesn't exist
        if (!rooms[roomCode]) {
            rooms[roomCode] = [];
        }

        // Add user to room
        const user = { id: socket.id, username };
        rooms[roomCode].push(user);
        
        // Join Socket.io room
        socket.join(roomCode);

        // Welcome message to user
        socket.emit('message', {
            username: 'System',
            message: `Welcome to ChatApp, ${username}!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'system'
        });

        // Broadcast to others when a user joins
        socket.to(roomCode).emit('message', {
            username: 'System',
            message: `${username} has joined the chat`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'system'
        });

        // Send room users info
        io.to(roomCode).emit('roomUsers', {
            users: rooms[roomCode].map(u => u.username)
        });

        console.log(`${username} joined room ${roomCode}`);
    });

    // Listen for chat messages
    socket.on('chatMessage', ({ username, roomCode, message, timestamp }) => {
        io.to(roomCode).emit('message', { username, message, timestamp });
    });

    // User leaves chat
    socket.on('leaveRoom', ({ username, roomCode }) => {
        if (rooms[roomCode]) {
            // Remove user from room
            const index = rooms[roomCode].findIndex(user => user.id === socket.id);
            
            if (index !== -1) {
                rooms[roomCode].splice(index, 1);
                
                // Delete room if empty
                if (rooms[roomCode].length === 0) {
                    delete rooms[roomCode];
                } else {
                    // Notify others that a user left
                    socket.to(roomCode).emit('message', {
                        username: 'System',
                        message: `${username} has left the chat`,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        type: 'system'
                    });
                    
                    // Update room users info
                    io.to(roomCode).emit('roomUsers', {
                        users: rooms[roomCode].map(u => u.username)
                    });
                }
            }
        }
        
        // Leave socketio room
        socket.leave(roomCode);
        console.log(`${username} left room ${roomCode}`);
    });

    // Disconnection
    socket.on('disconnect', () => {
        console.log(`Disconnected: ${socket.id}`);
        
        // Find and remove user from all rooms
        for (const roomCode in rooms) {
            const index = rooms[roomCode].findIndex(user => user.id === socket.id);
            
            if (index !== -1) {
                const username = rooms[roomCode][index].username;
                rooms[roomCode].splice(index, 1);
                
                // Delete room if empty
                if (rooms[roomCode].length === 0) {
                    delete rooms[roomCode];
                } else {
                    // Notify others that a user left
                    io.to(roomCode).emit('message', {
                        username: 'System',
                        message: `${username} has disconnected`,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        type: 'system'
                    });
                    
                    // Update room users info
                    io.to(roomCode).emit('roomUsers', {
                        users: rooms[roomCode].map(u => u.username)
                    });
                }
            }
        }
    });
});

// Set port and start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
io.on('connection', socket => {
    socket.on('sendImage', (dataURL) => {
        socket.broadcast.emit('receiveImage', dataURL);
    });
});
