const express = require('express');
const { signup, verifyEmail, login, forgotPassword, logout } = require('../controllers/authController');

const router = express.Router();

router.post('/signup', signup);
router.get('/verifyEmail/:token', verifyEmail);
router.post('/login', login);
router.get('/logout', logout);
router.post('/forgotPassword', forgotPassword);

module.exports = router;
