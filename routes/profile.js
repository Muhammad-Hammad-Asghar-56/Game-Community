const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController.js');
const { ensureAuthenticated } = require('../middleware/auth');

// Get profile page
router.get('/', ensureAuthenticated, profileController.getProfile);

// Update profile
router.post('/update', ensureAuthenticated, profileController.updateProfile);

// Delete post
router.post('/posts/delete/:id', ensureAuthenticated, profileController.deletePost);
module.exports = router;