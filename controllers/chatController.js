const Chat = require('../models/Chat');
const { GoogleGenAI } = require("@google/genai");
const axios = require("axios");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// Get list of all chat sessions for the user (summaries for sidebar)

exports.getChatHistory = async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user.id })
      .select('title createdAt updatedAt')
      .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (err) {
    console.error("History Error:", err);
    res.status(500).json({ message: 'Error fetching chat history', error: err.message });
  }
};

// Get messages for a specific chat ID
exports.getChatDetails = async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user.id });
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    res.json(chat.messages);
  } catch (err) {
    console.error("Details Error:", err);
    res.status(500).json({ message: 'Error fetching chat details', error: err.message });
  }
};

// Delete a specific chat session
exports.deleteChat = async (req, res) => {
  try {
    const chat = await Chat.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    res.json({ message: 'Chat deleted successfully' });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ message: 'Error deleting chat', error: err.message });
  }
};
exports.generateText = async (req, res) => {
  try {
    const { prompt, image, chatId } = req.body;
    const userId = req.user.id;

    if (!prompt && !image) {
      return res.status(400).json({ error: "Prompt or Image is required" });
    }

    let chat;
    if (chatId) {
      chat = await Chat.findOne({ _id: chatId, userId });
      if (!chat) {
        return res.status(404).json({ error: "Chat session not found" });
      }
    }

    // Detect image generation request
    const isImagePrompt =
      prompt &&
      (prompt.toLowerCase().includes("create image") ||
        prompt.toLowerCase().includes("generate image") ||
        prompt.toLowerCase().includes("draw"));

    let aiText = "";
    let generatedImage = null;

    // ==============================
    // IMAGE GENERATION
    // ==============================
    if (isImagePrompt) {

      console.log("image prompt >dd>>>>", prompt);

      // const response = await axios({
      //   url: "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-2-1",
      //   method: "POST",
      //   headers: {
      //     Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      //     "Content-Type": "application/json"
      //   },
      //   data: {
      //     inputs: prompt
      //   },
      //   responseType: "arraybuffer"
      // });

      // const base64Image = Buffer.from(response.data).toString("base64");

      // generatedImage = `data:image/png;base64,${base64Image}`;

      // aiText = "Here is your generated image.";

      const cleanPrompt = prompt
        .replace(/create image|generate image|draw/gi, "")
        .trim();

      const imageUrl =
        `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1024&height=1024`;

      console.log("imageurl >>>", imageUrl);

      generatedImage = imageUrl;

      aiText = "Here is your generated image.";



    } else {

      // ==============================
      // TEXT GENERATION
      // ==============================

      let contents = [];

      if (chat && chat.messages) {
        const recentMessages = chat.messages.slice(-10);

        recentMessages.forEach(msg => {
          contents.push({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }]
          });
        });
      }

      let parts = [];

      if (prompt) {
        parts.push({ text: prompt });
      }

      if (image) {
        const base64Data = image.split(",")[1];
        const mimeType = image.split(";")[0].split(":")[1];

        parts.push({
          inlineData: {
            mimeType,
            data: base64Data
          }
        });
      }

      contents.push({ role: "user", parts });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents
      });

      const responseParts = response.candidates?.[0]?.content?.parts || [];

      aiText = responseParts
        .map(p => p.text)
        .filter(Boolean)
        .join("") || "No response from AI.";
    }

    // ==============================
    // SAVE CHAT
    // ==============================

    if (!chat) {
      let title = prompt
        ? prompt.substring(0, 30) + (prompt.length > 30 ? "..." : "")
        : "New Chat";

      chat = new Chat({ userId, title, messages: [] });
    }

    const userMsg = {
      role: "user",
      content: prompt || "Image Upload",
      image
    };

    const aiMsg = {
      role: "assistant",
      content: aiText,
      image: generatedImage
    };

    chat.messages.push(userMsg);
    chat.messages.push(aiMsg);

    await chat.save();

    res.json({
      chatId: chat._id,
      title: chat.title,
      reply: aiText,
      image: generatedImage,
      userMessage: userMsg,
      assistantMessage: aiMsg
    });

  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Gemini API failed" });
  }
};



