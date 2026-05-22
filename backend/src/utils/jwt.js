const jwt = require('jsonwebtoken');

const signToken = (user) =>
  jwt.sign({ userId: user._id.toString(), email: user.email }, process.env.JWT_SECRET || 'dev-secret', {
    expiresIn: '7d',
  });

module.exports = { signToken };
