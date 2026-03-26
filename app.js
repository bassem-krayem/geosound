const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// API routes
const authRoutes = require('./src/routes/auth');
const courseRoutes = require('./src/routes/courses');
const moduleRoutes = require('./src/routes/modules');
const lessonRoutes = require('./src/routes/lessons');
const quizRoutes = require('./src/routes/quizzes');
const progressRoutes = require('./src/routes/progress');

// View routes
const authViewRoutes = require('./src/routes/views/authViewRoutes');
const studentViewRoutes = require('./src/routes/views/studentViewRoutes');
const teacherViewRoutes = require('./src/routes/views/teacherViewRoutes');

const { loadUser } = require('./src/middleware/viewAuth');
const { doubleCsrfProtection, attachCsrfToken } = require('./src/middleware/csrf');

const app = express();

// ── View engine ───────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Static assets ─────────────────────────────────────────────────────────────
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads/audio', express.static(path.join(__dirname, 'uploads/audio')));

// ── Parsers ───────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// Attach req.user from JWT cookie on every request so the navbar and error
// pages always have access to the current user, if any.
app.use(loadUser);

// ── Rate limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'fail', message: 'Too many requests, please try again later.' },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'fail', message: 'Too many requests, please try again later.' },
});

const viewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
app.use('/api/', generalLimiter);

// ── CSRF protection (validates on all state-changing requests) ─────────────────
// API routes are not affected since they use Bearer token auth, not cookies
app.use(doubleCsrfProtection);
// Make csrfToken available in all EJS views
app.use(/^(?!\/api\/)/, attachCsrfToken);

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/courses/:courseId/modules', moduleRoutes);
app.use('/api/courses/:courseId/modules/:moduleId/lessons', lessonRoutes);
app.use('/api/courses/:courseId/modules/:moduleId/lessons/:lessonId/quiz', quizRoutes);
app.use('/api/levels', courseRoutes);
app.use('/api/levels/:courseId/modules', moduleRoutes);
app.use('/api/levels/:courseId/modules/:moduleId/lessons', lessonRoutes);
app.use('/api/levels/:courseId/modules/:moduleId/lessons/:lessonId/quiz', quizRoutes);
app.use('/api/progress', progressRoutes);

// ── View (HTML) routes ────────────────────────────────────────────────────────
app.use('/', viewLimiter);
app.use('/', authViewRoutes);
app.use('/', studentViewRoutes);
app.use('/teacher', teacherViewRoutes);

// Landing page
app.get('/', (req, res) => {
  if (req.user) {
    return res.redirect(req.user.role === 'teacher' ? '/teacher/dashboard' : '/dashboard');
  }
  res.render('index', { title: 'الرئيسية', user: null });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ status: 'fail', message: 'Route not found.' });
  }
  res.status(404).render('error', { title: 'غير موجود', statusCode: 404, message: 'الصفحة غير موجودة.', user: req.user || null });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  // CSRF validation errors
  if (err.code === 'EBADCSRFTOKEN' || err.status === 403) {
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ status: 'fail', message: 'Invalid CSRF token.' });
    }
    return res.status(403).render('error', { title: 'ممنوع', statusCode: 403, message: 'رمز الحماية CSRF غير صالح أو مفقود. يرجى المحاولة مرة أخرى.', user: req.user || null });
  }
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  if (req.path.startsWith('/api/')) {
    return res.status(statusCode).json({ status: 'error', message });
  }
  res.status(statusCode).render('error', { title: 'خطأ', statusCode, message, user: req.user || null });
});

module.exports = app;
