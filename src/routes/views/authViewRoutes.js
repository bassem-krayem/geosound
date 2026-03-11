const express = require('express');
const rateLimit = require('express-rate-limit');
const authViewController = require('../../controllers/views/authViewController');
const { loadUser } = require('../../middleware/viewAuth');

const router = express.Router();

const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.',
});

router.get('/register', loadUser, authViewController.showRegister);
router.post('/register', formLimiter, loadUser, ...authViewController.registerValidation, authViewController.handleRegister);

router.get('/login', loadUser, authViewController.showLogin);
router.post('/login', formLimiter, loadUser, ...authViewController.loginValidation, authViewController.handleLogin);

router.post('/logout', authViewController.handleLogout);

module.exports = router;
