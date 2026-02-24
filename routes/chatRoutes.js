const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middleware/auth');

router.get('/history', auth, chatController.getChatHistory);
router.get('/history/:id', auth, chatController.getChatDetails);
router.post('/send', auth, chatController.generateText);

module.exports = router;

