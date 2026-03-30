const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  hashtags: [{ type: String }],
  platform: { type: String, enum: ['Facebook', 'Instagram', 'Twitter', 'LinkedIn'], required: true },
  mediaUrl: { type: String }, // Can be base64 string or URL
  status: { type: String, enum: ['Published', 'Draft'], default: 'Published' }
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
