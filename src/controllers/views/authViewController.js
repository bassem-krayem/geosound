const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../../models/User');
const { normalizeRole } = require('../../utils/roles');

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  secure: process.env.NODE_ENV === 'production',
};

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// ── Register ──────────────────────────────────────────────────────────────────

exports.registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['teacher', 'pupil', 'student']).withMessage('Role must be teacher or pupil'),
];

exports.showRegister = (req, res) => {
  if (req.user) return res.redirect(req.user.role === 'teacher' ? '/teacher/dashboard' : '/dashboard');
  res.render('auth/register', { title: 'تسجيل حساب', user: null });
};

exports.handleRegister = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/register', {
      title: 'تسجيل حساب',
      user: null,
      flash: { error: errors.array()[0].msg },
      formData: req.body,
    });
  }

  const { name, email, password, role } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return res.render('auth/register', {
      title: 'تسجيل حساب',
      user: null,
      flash: { error: 'An account with this email already exists.' },
      formData: req.body,
    });
  }

  const user = await User.create({ name, email, password, role: normalizeRole(role) });
  const token = signToken(user._id);
  res.cookie('gs_token', token, COOKIE_OPTS);

  res.redirect(user.role === 'teacher' ? '/teacher/dashboard' : '/dashboard');
};

// ── Login ─────────────────────────────────────────────────────────────────────

exports.loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

exports.showLogin = (req, res) => {
  if (req.user) return res.redirect(req.user.role === 'teacher' ? '/teacher/dashboard' : '/dashboard');
  res.render('auth/login', { title: 'تسجيل الدخول', user: null });
};

exports.handleLogin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/login', {
      title: 'تسجيل الدخول',
      user: null,
      flash: { error: errors.array()[0].msg },
      formData: req.body,
    });
  }

  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password))) {
    return res.render('auth/login', {
      title: 'تسجيل الدخول',
      user: null,
      flash: { error: 'Invalid email or password.' },
      formData: { email },
    });
  }

  const token = signToken(user._id);
  res.cookie('gs_token', token, COOKIE_OPTS);

  res.redirect(user.role === 'teacher' ? '/teacher/dashboard' : '/dashboard');
};

// ── Logout ────────────────────────────────────────────────────────────────────

exports.handleLogout = (_req, res) => {
  res.clearCookie('gs_token');
  res.redirect('/');
};
