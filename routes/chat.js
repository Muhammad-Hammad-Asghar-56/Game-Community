const express = require('express');
const router = express.Router();
// GET Discussion Page
router.get('/discussion', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    try {
        // Using promise interface
        const [messages] = await req.db.query(
            'SELECT * FROM messages ORDER BY created_at DESC LIMIT 50'
        );

        res.render('discussion', {
            user: req.session.user,
            messages: messages.reverse()
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).render('error', {
            message: 'Failed to load messages'
        });
    }
});
// GET Profile Page
router.get('/profile', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('profile', { user: req.session.user });
});

// Home Page (redirect to login)
router.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/profile');
    res.redirect('/login');
});
module.exports = router;