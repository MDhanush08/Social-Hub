const Post = require('../models/Post');

exports.createPost = async (req, res) => {
  try {
    const { title, description, hashtags, platform, mediaUrl } = req.body;
    const userId = req.user.id;

    const newPost = new Post({
      userId,
      title,
      description,
      hashtags: hashtags ? hashtags.split(',').map(tag => tag.trim()) : [],
      platform,
      mediaUrl
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Server error creating post' });
  }
};

exports.getPosts = async (req, res) => {
  try {
    const userId = req.user.id;
    const posts = await Post.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Server error fetching posts' });
  }
};
