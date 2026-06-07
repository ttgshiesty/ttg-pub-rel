/**
 * Shared authentication middleware.
 * Returns 401 if the request has no authenticated Discord user.
 */
export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Discord login required' });
  }
  next();
};

export default requireAuth;
