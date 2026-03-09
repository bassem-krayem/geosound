const { doubleCsrf } = require('csrf-csrf');

const { generateCsrfToken, doubleCsrfProtection: _csrfMiddleware } = doubleCsrf({
  getSecret: () => process.env.JWT_SECRET || 'geosound-csrf-secret',
  // Use the auth token (or a fallback) as the session identifier
  getSessionIdentifier: (req) => (req.cookies && req.cookies.gs_token) || 'anonymous',
  cookieName: 'gs_csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  // Read CSRF token from POST body field _csrf (HTML forms) or x-csrf-token header (fetch)
  getCsrfTokenFromRequest: (req) =>
    (req.body && req.body._csrf) || req.headers['x-csrf-token'],
});

/**
 * CSRF protection middleware.
 * API routes using Bearer tokens are excluded – they are not susceptible to CSRF.
 */
const doubleCsrfProtection = (req, res, next) => {
  // Skip CSRF for API routes — they use Authorization headers (Bearer), not cookies
  if (req.path.startsWith('/api/')) return next();
  return _csrfMiddleware(req, res, next);
};

/**
 * Middleware that generates a CSRF token and makes it available as res.locals.csrfToken
 * so EJS views can embed it in forms.
 */
const attachCsrfToken = (req, res, next) => {
  res.locals.csrfToken = generateCsrfToken(req, res);
  next();
};

module.exports = { doubleCsrfProtection, attachCsrfToken };
