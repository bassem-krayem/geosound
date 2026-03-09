const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./src/routes/auth');
const courseRoutes = require('./src/routes/courses');
const moduleRoutes = require('./src/routes/modules');
const lessonRoutes = require('./src/routes/lessons');
const quizRoutes = require('./src/routes/quizzes');
const progressRoutes = require('./src/routes/progress');

const app = express();

// Body parser
app.use(express.json());

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
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

// Apply rate limiting
app.use('/api/auth', authLimiter);
app.use('/api/', generalLimiter);

// Serve uploaded audio files as static assets
app.use('/uploads/audio', express.static(path.join(__dirname, 'uploads/audio')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/courses/:courseId/modules', moduleRoutes);
app.use('/api/courses/:courseId/modules/:moduleId/lessons', lessonRoutes);
app.use('/api/courses/:courseId/modules/:moduleId/lessons/:lessonId/quiz', quizRoutes);
app.use('/api/progress', progressRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ status: 'fail', message: 'Route not found.' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({ status: 'error', message });
});

module.exports = app;
