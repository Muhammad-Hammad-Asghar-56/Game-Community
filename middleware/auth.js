module.exports = {
    ensureAuthenticated: (req, res, next) => {
        if (!req.session.user) {
            req.flash('error', 'Please log in to view this page');
            return res.redirect('/login');
        }
        next();
    }
};