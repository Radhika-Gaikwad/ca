const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ✅ Authenticate any logged-in user (CA, Client, Admin)
exports.authenticate = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = header.split(' ')[1];

  try {
    // verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // fetch user without password
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user; // attach user info to req object
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// ✅ Restrict route access to specific roles (e.g. only CA, or only Client)
exports.authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. This route is restricted to: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};
