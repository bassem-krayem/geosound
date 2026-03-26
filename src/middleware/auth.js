const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { expandRole } = require('../utils/roles');

exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.gs_token) {
    // Allow browser-native fetches (same-origin) to authenticate via the httpOnly cookie
    // so the quiz submit API works without needing a readable token in sessionStorage.
    token = req.cookies.gs_token;
  }

  if (!token) {
    return res.status(401).json({ status: 'fail', message: 'Not authenticated. Please log in.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ status: 'fail', message: 'Invalid or expired token.' });
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return res.status(401).json({ status: 'fail', message: 'User no longer exists.' });
  }

  req.user = user;
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    const allowedRoles = roles.flatMap((r) => expandRole(r));
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action.',
      });
    }
    next();
  };
};
