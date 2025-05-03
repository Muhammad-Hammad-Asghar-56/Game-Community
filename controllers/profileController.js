const db = require('../db');

module.exports = {
    // getProfile: async (req, res) => {
    //     try {
    //         // Get user profile with XP calculations
    //         const [user] = await db.query(`
    //         SELECT u.*, 
    //         COALESCE(SUM(p.xp_earned), 0) + 
    //         COALESCE((
    //             SELECT SUM(c.xp_earned) 
    //             FROM comments c 
    //             WHERE c.user_id = u.id
    //         ), 0) AS total_xp
    //         FROM users u
    //         LEFT JOIN posts p ON p.user_id = u.id
    //         WHERE u.id = ?
    //         GROUP BY u.id
    //     `, [req.session.user.id]);

    //         // Get posts with XP details
    //         const [posts] = await db.query(`
    //         SELECT p.*, 
    //         COALESCE(COUNT(r.id), 0) AS rating_count,
    //         p.xp_earned + COALESCE(COUNT(r.id), 0) AS post_xp
    //         FROM posts p
    //         LEFT JOIN ratings r ON p.id = r.post_id
    //         WHERE p.user_id = ?
    //         GROUP BY p.id
    //         ORDER BY p.created_at DESC
    //     `, [req.session.user.id]);

    //         // Get comments with reaction XP
    //         const [comments] = await db.query(`
    //         SELECT c.*,
    //         COALESCE(SUM(CASE WHEN cr.reaction = 1 THEN 1 ELSE 0 END), 0) AS like_count,
    //         COALESCE(SUM(CASE WHEN cr.reaction = -1 THEN 1 ELSE 0 END), 0) AS dislike_count,
    //         c.xp_earned + 
    //         COALESCE(SUM(CASE WHEN cr.reaction = 1 THEN 2 ELSE 0 END), 0) - 
    //         COALESCE(SUM(CASE WHEN cr.reaction = -1 THEN 1 ELSE 0 END), 0) AS comment_xp
    //         FROM comments c
    //         LEFT JOIN comment_reactions cr ON c.id = cr.comment_id
    //         WHERE c.user_id = ?
    //         GROUP BY c.id
    //     `, [req.session.user.id]);

    //         res.render('profile', {
    //             user: {
    //                 ...user[0],
    //                 xp_points: user[0].total_xp // Add this line
    //             },
    //             posts,
    //             comments,
    //             success: req.flash('success'),
    //             error: req.flash('error')
    //         });

    //     } catch (err) {
    //         console.error(err);
    //         res.status(500).render('error', { message: 'Failed to load profile' });
    //     }
    // },

    getProfile: async (req, res) => {
        try {
            // Get basic user info
            const [user] = await db.query('SELECT * FROM users WHERE id = ?', [req.session.user.id]);

            // Get all posts with their ratings
            const [posts] = await db.query(`
            SELECT p.*, COUNT(r.id) as rating_count 
            FROM posts p
            LEFT JOIN ratings r ON p.id = r.post_id
            WHERE p.user_id = ?
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `, [req.session.user.id]);

            // Get all comments with their reactions
            const [comments] = await db.query(`
            SELECT c.*,
            SUM(CASE WHEN cr.reaction = 1 THEN 1 ELSE 0 END) as like_count,
            SUM(CASE WHEN cr.reaction = -1 THEN 1 ELSE 0 END) as dislike_count
            FROM comments c
            LEFT JOIN comment_reactions cr ON c.id = cr.comment_id
            WHERE c.user_id = ?
            GROUP BY c.id
        `, [req.session.user.id]);

            // Calculate XP manually
            let totalXp = 0;

            // Calculate posts XP
            const postsWithXp = posts.map(post => {
                const postXp = (post.xp_earned || 0) + (post.rating_count || 0);
                totalXp += postXp;
                return {
                    ...post,
                    post_xp: postXp
                };
            });

            // Calculate comments XP
            const commentsWithXp = comments.map(comment => {
                const commentXp = (comment.xp_earned || 0) +
                    ((comment.like_count || 0) * 2) -
                    (comment.dislike_count || 0);
                totalXp += commentXp;
                return {
                    ...comment,
                    comment_xp: commentXp
                };
            });

            res.render('profile', {
                user: {
                    ...user[0],
                    xp_points: totalXp
                },
                posts: postsWithXp,
                comments: commentsWithXp,
                success: req.flash('success'),
                error: req.flash('error')
            });

        } catch (err) {
            console.error(err);
            res.status(500).render('error', { message: 'Failed to load profile' });
        }
    },

    updateProfile: async (req, res) => {
        try {
            const { bio, location, website } = req.body;

            await db.query(
                `UPDATE users 
                 SET bio = ?, location = ?, website = ?
                 WHERE id = ?`,
                [bio, location, website, req.session.user.id]
            );

            // Update session with new data
            const [updatedUser] = await db.query(
                'SELECT * FROM users WHERE id = ?',
                [req.session.user.id]
            );

            req.session.user = updatedUser[0];
            req.flash('success', 'Profile updated successfully!');
            res.redirect('/profile');

        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to update profile');
            res.redirect('/profile');
        }
    },

    deletePost: async (req, res) => {
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
    }
};