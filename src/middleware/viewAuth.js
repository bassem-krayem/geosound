const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { expandRole } = require('../utils/roles');

/**
 * Reads JWT from the gs_token cookie and attaches req.user.
 * Soft: if no token / invalid, req.user stays undefined (no error thrown).
 */
exports.loadUser = async (req, res, next) => {
  const token = req.cookies && req.cookies.gs_token;
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
  } catch {
    // Expired or invalid – clear the cookie
    res.clearCookie('gs_token');
  }
  next();
};

/**
 * Hard: redirects to /login if not authenticated.
 */
exports.requireAuth = (req, res, next) => {
  if (!req.user) {
    req.session = req.session || {};
    res.redirect('/login');
    return;
  }
  next();
};

/**
 * Hard: redirects to /dashboard if not the required role.
 */
exports.requireRole = (...roles) => {
  return (req, res, next) => {
    const allowedRoles = roles.flatMap((r) => expandRole(r));
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.redirect(req.user ? (req.user.role === 'teacher' ? '/teacher/dashboard' : '/dashboard') : '/login');
    }
    next();
  };
};
