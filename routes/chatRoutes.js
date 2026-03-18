const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middleware/auth');

router.get('/history', auth, chatController.getChatHistory);
router.get('/history/:id', auth, chatController.getChatDetails);
router.delete('/history/:id', auth, chatController.deleteChat);
router.put('/history/:id', auth, chatController.renameChat);
router.post('/send', auth, chatController.generateText);

module.exports = router;

