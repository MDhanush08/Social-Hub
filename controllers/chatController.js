const Chat = require('../models/Chat');
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

exports.getChatHistory = async (req, res) => {
  try {
    let chat = await Chat.findOne({ userId: req.user.id });
    if (!chat) {
      chat = new Chat({ userId: req.user.id, messages: [] });
      await chat.save();
    }
    res.json(chat.messages);
  } catch (err) {
    console.error("History Error:", err);
    res.status(500).json({ message: 'Error fetching chat history', error: err.message });
  }
};

exports.generateText = async (req, res) => {
  try {
    const { prompt, image } = req.body;
    const userId = req.user.id;

    if (!prompt && !image) {
      return res.status(400).json({ error: "Prompt or Image is required" });
    }

    let contents = [];
    let parts = [];

    if (prompt) {
      parts.push({ text: prompt });
    }

    if (image) {
      // Image comes as data URL: "data:image/png;base64,..."
      const base64Data = image.split(",")[1];
      const mimeType = image.split(";")[0].split(":")[1];

      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
    }

    // Add instruction for structure if it's an image call without a specific prompt from chips
    // Or just let the model handle natural language.
    // The user wants chips to be available. We can send them in the response metadata.

    contents.push({ role: "user", parts: parts });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents
    });

    // Extract text
    let aiText = "";

    // Log response for debugging if needed
    // console.log("Gemini Response:", JSON.stringify(response, null, 2));

    if (response.text && typeof response.text === 'function') {
      aiText = response.text();
    } else if (typeof response.text === 'string') {
      aiText = response.text;
    } else if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts && response.candidates[0].content.parts[0].text) {
      aiText = response.candidates[0].content.parts[0].text;
    } else if (response.response && typeof response.response.text === 'function') {
      aiText = response.response.text();
    } else if (response.response && response.response.text) {
      aiText = response.response.text;
    } else if (response.response && response.response.candidates && response.response.candidates[0] && response.response.candidates[0].content && response.response.candidates[0].content.parts && response.response.candidates[0].content.parts[0].text) {
      aiText = response.response.candidates[0].content.parts[0].text;
    }


    // --- Save to History ---
    let chat = await Chat.findOne({ userId });
    if (!chat) {
      chat = new Chat({ userId, messages: [] });
    }

    const userMsg = { role: 'user', content: prompt || "Image Upload", image };

    // Determine if we should show chips. 
    // If the user uploaded an image (or referenced one), we encourage these chips.
    // We'll pass them in a 'data' field.
    let chips = [];
    if (image) {
      chips = ["Title", "Keywords", "Enhance Image"];
    }

    const aiMsg = {
      role: 'assistant',
      content: aiText,
      data: { chips: chips } // Store chips in the message data
    };

    chat.messages.push(userMsg);
    chat.messages.push(aiMsg);
    await chat.save();

    // --- Respond ---
    res.json({
      reply: aiText,
      userMessage: userMsg,
      assistantMessage: aiMsg
    });

  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Gemini API failed" });
  }
};
