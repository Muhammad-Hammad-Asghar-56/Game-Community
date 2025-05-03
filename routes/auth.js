const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db'); // Adjust path as needed
const profileController = require('../controllers/profileController.js');
const { ensureAuthenticated } = require('../middleware/auth');

// GET Signup Page
router.get('/signup', (req, res) => {
    if (req.session.user) return res.redirect('/profile');
    res.render('signup');
});
// Signup Route
router.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        db.query(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword],
            (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Error signing up!');
                }
                res.redirect('/login');
            }
        );
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error during signup');
    }
});

// login Page
router.get('/login', (req, res) => {

    if (req.session.user) return res.redirect('/profile');
    res.render('login');
});

// Login Route
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin@01') {
        req.session.user = {
            id: 0, // Special ID for admin
            username: 'admin',
            isAdmin: true
        };
        return res.redirect('/admin/dashboard');
    }
    try {
        // Get a connection from the pool
        const connection = await req.db.getConnection();

        try {
            // Execute query with promise interface
            const [users] = await connection.query(
                'SELECT * FROM users WHERE username = ?',
                [username]
            );

            if (!users || users.length === 0) {
                return res.render('login', {
                    error: 'Invalid username or password!'
                });
            }

            const user = users[0];

            // Compare passwords
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.render('login', {
                    error: 'Invalid username or password!'
                });
            }

            // Set session
            req.session.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: false
            };

            res.redirect('/profile');

        } catch (queryError) {
            console.error('Query error:', queryError);
            res.render('login', {
                error: 'Database error during login'
            });
        } finally {
            // Always release the connection
            if (connection) connection.release();
        }

    } catch (err) {
        console.error('Connection error:', err);
        res.render('login', {
            error: 'Server error during login'
        });
    }
});
// Logout Route
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error logging out');
        }
        res.redirect('/login');
    });
});



module.exports = router;