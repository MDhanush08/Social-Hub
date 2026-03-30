const express = require('express');
const router = express.Router();
const passport = require('passport');
const { register, login, googleLogin, facebookAuthCallback } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/google-login', googleLogin);

// Facebook OAuth routes
router.get('/facebook', passport.authenticate('facebook', { scope: ['email', 'public_profile'] }));
router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: 'http://localhost:4200/login?error=facebook_failed', session: false }),
  facebookAuthCallback
);

module.exports = router;
