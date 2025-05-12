document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loginPage = document.getElementById('login-page');
    const chatPage = document.getElementById('chat-page');
    const usernameInput = document.getElementById('username');
    const roomCodeInput = document.getElementById('room-code');
    const generateCodeBtn = document.getElementById('generate-code');
    const joinBtn = document.getElementById('join-btn');
    const leaveBtn = document.getElementById('leave-btn');
    const displayRoomCode = document.getElementById('display-room-code');
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');

    // Initialize socket connection
    const socket = io('http://localhost:3000');
    
    let currentUser = null;
    let currentRoom = null;

    // Generate random 5-digit code
    generateCodeBtn.addEventListener('click', () => {
        const randomCode = Math.floor(10000 + Math.random() * 90000).toString();
        roomCodeInput.value = randomCode;
    });

    // Join chat room
    joinBtn.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        const roomCode = roomCodeInput.value.trim();
        
        if (!username) {
            alert('Please enter a username');
            return;
        }
        
        if (!roomCode || roomCode.length !== 5 || !/^\d+$/.test(roomCode)) {
            alert('Please enter a valid 5-digit room code');
            return;
        }
        
        currentUser = username;
        currentRoom = roomCode;
        
        // Emit join room event
        socket.emit('joinRoom', { username, roomCode });
        
        // Update UI
        displayRoomCode.textContent = roomCode;
        loginPage.classList.remove('active');
        chatPage.classList.add('active');
    });

    // Leave chat room
    leaveBtn.addEventListener('click', () => {
        socket.emit('leaveRoom', { username: currentUser, roomCode: currentRoom });
        chatPage.classList.remove('active');
        loginPage.classList.add('active');
        chatMessages.innerHTML = '';
        currentUser = null;
        currentRoom = null;
    });

    // Send message
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message) {
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            socket.emit('chatMessage', { 
                username: currentUser, 
                roomCode: currentRoom, 
                message, 
                timestamp 
            });
            messageInput.value = '';
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Socket event listeners
    socket.on('message', (messageData) => {
        displayMessage(messageData);
    });

    socket.on('roomUsers', ({ users }) => {
        console.log('Room Users:', users);
        // You could display online users here if needed
    });

    // Display message in the chat
    function displayMessage({ username, message, timestamp, type }) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        
        if (type === 'system') {
            messageElement.classList.add('system');
            messageElement.innerHTML = `
                <div class="content">${message}</div>
            `;
        } else {
            const messageType = username === currentUser ? 'sent' : 'received';
            messageElement.classList.add(messageType);
            
            messageElement.innerHTML = `
                <div class="header">
                    <span>${username}</span>
                    <span class="timestamp">${timestamp}</span>
                </div>
                <div class="content">${message}</div>
            `;
        }
        
        chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Handle connection errors
    socket.on('connect_error', (error) => {
        console.error('Connection Error:', error);
        alert('Failed to connect to server. Please try again later.');
    });
});
const socket = io();

// Image preview elements
const fileInput = document.getElementById('file-input');
const imageModal = document.getElementById('image-preview-modal');
const imagePreview = document.getElementById('image-preview');
const sendImageBtn = document.getElementById('send-image-btn');
const cancelImageBtn = document.getElementById('cancel-image-btn');

let imageDataToSend = null;

// Preview Image
fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        imageDataToSend = e.target.result;
        imagePreview.src = imageDataToSend;
        imageModal.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
});

// Send Image
sendImageBtn.addEventListener('click', () => {
    if (imageDataToSend) {
        socket.emit('sendImage', imageDataToSend);
        addImageToChat(imageDataToSend, true);
    }
    closeImageModal();
});

// Cancel Preview
cancelImageBtn.addEventListener('click', () => {
    closeImageModal();
});

// Close Preview
function closeImageModal() {
    imageModal.classList.add('hidden');
    imagePreview.src = '';
    imageDataToSend = null;
    fileInput.value = '';
}

// Add image to chat
function addImageToChat(dataURL, isSender) {
    const chatMessages = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', isSender ? 'sent' : 'received');

    const img = document.createElement('img');
    img.src = dataURL;
    img.alt = "image";

    msgDiv.appendChild(img);
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Listen for image from others
socket.on('receiveImage', (dataURL) => {
    addImageToChat(dataURL, false);
});
