const express = require('express');
const router = express.Router();


// Homepage - List all posts
router.get('/', async (req, res) => {
    try {
        const [posts] = await req.db.query(`
      SELECT p.*, COUNT(l.id) AS like_count 
      FROM posts p
      LEFT JOIN likes l ON p.id = l.post_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

        res.render('posts/index', {
            user: req.session.user,
            posts,
            title: 'Game Tips'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Failed to load tips' });
    }
});

// Form to create new post
router.get('/create', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('posts/create', {
        user: req.session.user,
        title: 'Share Your Game Tip'
    });
});

// Handle new post submission
router.post('/create', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const { title, content } = req.body;
    try {
        await req.db.query(
            'INSERT INTO posts (user_id, username, title, content) VALUES (?, ?, ?, ?)',
            [req.session.user.id, req.session.user.username, title, content]
        );
        res.redirect('/posts');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', {
            message: 'Failed to create post',
            user: req.session.user
        });
    }
});

// View single post with comments
router.get('/:id', async (req, res) => {
    try {
        const [[post]] = await req.db.query(`
      SELECT p.*, COUNT(l.id) AS like_count 
      FROM posts p
      LEFT JOIN likes l ON p.id = l.post_id
      WHERE p.id = ?
      GROUP BY p.id
    `, [req.params.id]);

        if (!post) return res.status(404).render('error', {
            message: 'Post not found',
            user: req.session.user
        });

        const [comments] = await req.db.query(
            'SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC',
            [req.params.id]
        );

        res.render('posts/view', {
            user: req.session.user,
            post,
            comments,
            title: post.title
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', {
            message: 'Failed to load post',
            user: req.session.user
        });
    }
});

// Handle like action
router.post('/:id/like', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });

    try {
        await req.db.query(
            'INSERT IGNORE INTO likes (post_id, user_id) VALUES (?, ?)',
            [req.params.id, req.session.user.id]
        );
        const [[{ count }]] = await req.db.query(
            'SELECT COUNT(*) AS count FROM likes WHERE post_id = ?',
            [req.params.id]
        );
        res.json({ success: true, count });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to like post' });
    }
});

// Handle comment submission
router.post('/:id/comment', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    try {
        await req.db.query(
            'INSERT INTO comments (post_id, user_id, username, content) VALUES (?, ?, ?, ?)',
            [req.params.id, req.session.user.id, req.session.user.username, req.body.content]
        );
        res.redirect(`/posts/${req.params.id}`);
    } catch (err) {
        console.error(err);
        res.status(500).render('error', {
            message: 'Failed to add comment',
            user: req.session.user
        });
    }
});

module.exports = router;