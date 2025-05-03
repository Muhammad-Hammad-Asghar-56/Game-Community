const express = require('express');
const router = express.Router();
const { ensureAdmin } = require('../middleware/auth');
const db = require('../db');

// Admin Dashboard
// In your admin route (routes/admin.js)
router.get('/dashboard', ensureAdmin, async (req, res) => {
    try {
        const [[{ users }]] = await db.query('SELECT COUNT(*) as users FROM users');
        const [[{ posts }]] = await db.query('SELECT COUNT(*) as posts FROM posts');
        const [[{ comments }]] = await db.query('SELECT COUNT(*) as comments FROM comments');

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            stats: { users, posts, comments },
            user: req.session.user // Make sure to pass the user object
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});
// Post Management
router.get('/posts', ensureAdmin, async (req, res) => {
    try {
        const [posts] = await db.query(`
            SELECT p.*, u.username 
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
        `);
        res.render('admin/posts', { posts, user: req.session.user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Delete Post
router.post('/posts/delete/:id', ensureAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM posts WHERE id = ?', [req.params.id]);
        await db.query('DELETE FROM comments WHERE post_id = ?', [req.params.id]);
        req.flash('success', 'Post and associated comments deleted successfully');
        res.redirect('/admin/posts');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error deleting post');
        res.redirect('/admin/posts');
    }
});

// Comment Management
router.get('/comments', ensureAdmin, async (req, res) => {
    try {
        const [comments] = await db.query(`
            SELECT c.*, u.username, p.title as post_title
            FROM comments c
            JOIN users u ON c.user_id = u.id
            JOIN posts p ON c.post_id = p.id
            ORDER BY c.created_at DESC
        `);
        res.render('admin/comments', { comments, user: req.session.user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Delete Comment
router.post('/comments/delete/:id', ensureAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM comments WHERE id = ?', [req.params.id]);
        req.flash('success', 'Comment deleted successfully');
        res.redirect('/admin/comments');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error deleting comment');
        res.redirect('/admin/comments');
    }
});

// Game Updates Management
router.get('/game-updates', ensureAdmin, async (req, res) => {
    try {
        const [updates] = await db.query(`
            SELECT * FROM game_updates
            ORDER BY created_at DESC
        `);
        res.render('admin/game-updates', { updates, user: req.session.user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Add Game Update Form
router.get('/game-updates/new', ensureAdmin, (req, res) => {
    res.render('admin/game-update-form', { update: null });
});

// Create Game Update
router.post('/game-updates', ensureAdmin, async (req, res) => {
    const { title, game, version, content } = req.body;

    try {
        await db.query(`
            INSERT INTO game_updates (title, game, version, content)
            VALUES (?, ?, ?, ?)
        `, [title, game, version, content]);

        req.flash('success', 'Game update published successfully');
        res.redirect('/admin/game-updates');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error publishing game update');
        res.redirect('/admin/game-updates/new');
    }
});

// Edit Game Update Form
router.get('/game-updates/edit/:id', ensureAdmin, async (req, res) => {
    try {
        const [[update]] = await db.query('SELECT * FROM game_updates WHERE id = ?', [req.params.id]);
        res.render('admin/game-update-form', { update, user: req.session.user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Update Game Update
router.post('/game-updates/update/:id', ensureAdmin, async (req, res) => {
    const { title, game, version, content } = req.body;

    try {
        await db.query(`
            UPDATE game_updates 
            SET title = ?, game = ?, version = ?, content = ?
            WHERE id = ?
        `, [title, game, version, content, req.params.id]);

        req.flash('success', 'Game update updated successfully');
        res.redirect('/admin/game-updates');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error updating game update');
        res.redirect(`/admin/game-updates/edit/${req.params.id}`);
    }
});

// Delete Game Update
router.post('/game-updates/delete/:id', ensureAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM game_updates WHERE id = ?', [req.params.id]);
        req.flash('success', 'Game update deleted successfully');
        res.redirect('/admin/game-updates');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error deleting game update');
        res.redirect('/admin/game-updates');
    }
});

module.exports = router;