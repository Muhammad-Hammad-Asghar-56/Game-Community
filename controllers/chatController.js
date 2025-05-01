const db = require('../db');

module.exports = (io) => {
    io.on('connection', async (socket) => {
        console.log('New user connected');

        try {
            // Load previous messages (using promises)
            const [messages] = await db.query(
                'SELECT * FROM messages ORDER BY created_at DESC LIMIT 50'
            );
            socket.emit('load_messages', messages.reverse());

            // Handle new messages
            socket.on('send_message', async (data) => {
                const { username, message } = data;

                try {
                    await db.query(
                        'INSERT INTO messages (username, message) VALUES (?, ?)',
                        [username, message]
                    );
                    io.emit('receive_message', { username, message });
                } catch (err) {
                    console.error('Error saving message:', err);
                    socket.emit('error', 'Failed to send message');
                }
            });

            socket.on('disconnect', () => {
                console.log('User disconnected');
            });

        } catch (err) {
            console.error('Connection error:', err);
            socket.emit('error', 'Failed to load chat history');
        }
    });
};