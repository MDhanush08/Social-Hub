const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middleware/auth');

router.get('/history', auth, chatController.getChatHistory);
router.post('/send', auth, chatController.generateText);

module.exports = router;
