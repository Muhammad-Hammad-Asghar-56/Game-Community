const express = require('express');
const router = express.Router();


// Homepage - List all posts
router.get('/', async (req, res) => {
    try {
        const [posts] = await req.db.query(`
            SELECT 
                p.*,
                COALESCE(AVG(r.rating), 0) AS average_rating,
                COUNT(r.id) AS rating_count
            FROM posts p
            LEFT JOIN ratings r ON p.id = r.post_id
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

router.post('/:id/rate', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });

    try {
        // Parse the JSON body
        const { rating } = req.body;
        if (!rating || isNaN(rating)) {
            return res.status(400).json({ error: 'Invalid rating value' });
        }

        const postId = req.params.id;
        const numericRating = parseInt(rating);

        console.log({ postId, numericRating })
        // Validate rating is between 1-5
        if (numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1-5' });
        }

        // Upsert rating
        await req.db.query(`
            INSERT INTO ratings (post_id, user_id, rating)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE rating = VALUES(rating)
        `, [postId, req.session.user.id, numericRating]);

        // Get updated average
        const [[{ avg }]] = await req.db.query(
            'SELECT AVG(rating) AS avg FROM ratings WHERE post_id = ?',
            [postId]
        );

        res.json({
            success: true,
            averageRating: parseFloat(avg).toFixed(1),
            userRating: numericRating
        });

    } catch (err) {
        console.error('Rating error:', err);
        res.status(500).json({ error: 'Failed to submit rating' });
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

        // Get comments with reaction counts and user's reaction
        const [comments] = await req.db.query(`
            SELECT c.*,
                   SUM(CASE WHEN cr.reaction = 1 THEN 1 ELSE 0 END) AS likeCount,
                   SUM(CASE WHEN cr.reaction = -1 THEN 1 ELSE 0 END) AS dislikeCount,
                   (SELECT reaction FROM comment_reactions 
                    WHERE comment_id = c.id AND user_id = ? LIMIT 1) AS userReaction
            FROM comments c
            LEFT JOIN comment_reactions cr ON c.id = cr.comment_id
            WHERE c.post_id = ?
            GROUP BY c.id
            ORDER BY c.created_at ASC
        `, [req.session.user?.id || 0, req.params.id]);

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
// Like comment
router.post('/comments/:id/like', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });

    try {
        console.log(req.params.id);
        await req.db.query(`
            INSERT INTO comment_reactions (comment_id, user_id, reaction)
            VALUES (?, ?, 1)
            ON DUPLICATE KEY UPDATE reaction = IF(reaction = 1, NULL, 1)
        `, [req.params.id, req.session.user.id]);

        const [[{ likeCount, dislikeCount }]] = await req.db.query(`
            SELECT 
                SUM(CASE WHEN reaction = 1 THEN 1 ELSE 0 END) AS likeCount,
                SUM(CASE WHEN reaction = -1 THEN 1 ELSE 0 END) AS dislikeCount
            FROM comment_reactions
            WHERE comment_id = ?
        `, [req.params.id]);

        res.json({ success: true, likeCount, dislikeCount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to like comment' });
    }
});

// Dislike comment
router.post('/comments/:id/dislike', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });

    try {
        await req.db.query(`
            INSERT INTO comment_reactions (comment_id, user_id, reaction)
            VALUES (?, ?, -1)
            ON DUPLICATE KEY UPDATE reaction = IF(reaction = -1, NULL, -1)
        `, [req.params.id, req.session.user.id]);

        const [[{ likeCount, dislikeCount }]] = await req.db.query(`
            SELECT 
                SUM(CASE WHEN reaction = 1 THEN 1 ELSE 0 END) AS likeCount,
                SUM(CASE WHEN reaction = -1 THEN 1 ELSE 0 END) AS dislikeCount
            FROM comment_reactions
            WHERE comment_id = ?
        `, [req.params.id]);

        res.json({ success: true, likeCount, dislikeCount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to dislike comment' });
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
router.delete('/', async (req, res) => {
    try {
        const postId = req.params.id;

        // Verify post belongs to user
        const [post] = await db.query(
            'SELECT * FROM posts WHERE id = ? AND user_id = ?',
            [postId, req.session.user.id]
        );

        if (!post.length) {
            req.flash('error', 'Post not found or unauthorized');
            return res.redirect('/profile');
        }

        // This will now work due to ON DELETE CASCADE
        await db.query(
            'DELETE FROM posts WHERE id = ?',
            [postId]
        );

        req.flash('success', 'Post deleted successfully!');
        res.redirect('/profile');

    } catch (err) {
        console.error(err);
        req.flash('error', 'Failed to delete post');
        res.redirect('/profile');
    }
})

module.exports = router;