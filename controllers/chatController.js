const Chat = require('../models/Chat');
const { GoogleGenAI } = require("@google/genai");

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

    // Build history for Gemini (if it's an existing chat)
    let contents = [];
    if (chat && chat.messages) {
      // Take last few messages for context to keep it efficient
      const recentMessages = chat.messages.slice(-10);
      recentMessages.forEach(msg => {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
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
          mimeType: mimeType,
          data: base64Data
        }
      });
    }

    contents.push({ role: "user", parts: parts });

    // Using the user's preferred new version method
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents
    });

    // Extract text safely using the user's logic
    let aiText = "";
    if (response.candidates?.length) {
      aiText = response.candidates[0]?.content?.parts
        ?.map(part => part.text)
        ?.join("") || "";
    } else if (typeof response.text === "string") {
      aiText = response.text;
    } else {
      aiText = "No response from AI.";
    }


    // --- Save to History ---
    if (!chat) {
      // Create new chat session
      // Simple title generation: first few words of prompt
      let title = prompt ? (prompt.substring(0, 30) + (prompt.length > 30 ? "..." : "")) : "New Image Chat";
      chat = new Chat({ userId, title, messages: [] });
    }

    const userMsg = { role: 'user', content: prompt || "Image Upload", image };

    let chips = [];
    if (image) {
      chips = ["Title", "Keywords", "Enhance Image"];
    }

    const aiMsg = {
      role: 'assistant',
      content: aiText,
      data: { chips: chips }
    };

    chat.messages.push(userMsg);
    chat.messages.push(aiMsg);
    await chat.save();

    // --- Respond ---
    res.json({
      chatId: chat._id,
      title: chat.title,
      reply: aiText,
      userMessage: userMsg,
      assistantMessage: aiMsg
    });

  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Gemini API failed" });
  }
};

