const db = require('../db');

module.exports = {
    getProfile: async (req, res) => {
        try {
            // Get user profile with their posts
            const [user] = await db.query(
                'SELECT * FROM users WHERE id = ?',
                [req.session.user.id]
            );

            const [posts] = await db.query(
                'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC',
                [req.session.user.id]
            );

            res.render('profile', {
                user: user[0],
                posts
                // Removed direct flash references since we're using res.locals
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