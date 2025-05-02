const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path'); // Add this line
const http = require('http');
const socketIo = require('socket.io');
const db = require('./db');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const chatController = require('./controllers/chatController');
const postRoutes = require('./routes/posts');
const profileRoutes = require('./routes/profile');
const flash = require('connect-flash');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.json()); // For parsing application/json
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Flash messages middleware
app.use(flash());

// Database access in routes
app.use((req, res, next) => {
    req.db = db;

    next();
});

// Pug Setup
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views')); // Absolute path

// Static files
app.use(express.static(path.join(__dirname, 'public'))); // For CSS/JS
app.use('/socket.io', express.static(path.join(__dirname, 'node_modules/socket.io/client-dist')));

// Home route
app.get('/', (req, res) => {
    res.render('home', { user: req.session.user });
});

// Then your other route mounts
app.use('/posts', postRoutes);  // All posts routes will be under /posts
app.use('/', authRoutes);
app.use('/profile', profileRoutes);
app.use('/', chatRoutes);


// Socket.IO
chatController(io);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { message: 'Something broke!' });
});

// Start Server
server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});