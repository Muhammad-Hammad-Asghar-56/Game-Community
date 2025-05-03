
const ensureAuthenticated = (req, res, next) => {
    if (!req.session.user) {
        req.flash('error', 'Please log in to view this page');
        return res.redirect('/login');
    }
    next();
}
const ensureAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.isAdmin) {
        return next();
    }
    res.status(403).send('Access denied. Admins only.');
};

module.exports = { ensureAuthenticated, ensureAdmin };