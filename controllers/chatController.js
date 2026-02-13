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
    const { prompt, image } = req.body; // Frontend sends 'prompt' now (will update frontend)
    const userId = req.user.id;

    if (!prompt && !image) {
      return res.status(400).json({ error: "Prompt or Image is required" });
    }

    let contents = [];
    if (prompt) contents.push({ text: prompt });
    // Note: Simple image handling if supported by the simple user example. 
    // If the user wants image support, we need to format it for GoogleGenAI.
    // For now, assuming text-based as primary request, but allowing for expansion.

    // Adjusting input for gemini-2.5-flash which likely supports multimodal
    // But sticking to the user's simple text sample for safety unless image is present.
    let inputForGemini = prompt;

    if (image) {
      // If image is present, we might need a more complex structure, 
      // but user's sample was text-only. I will stick to text for the call 
      // to ensure the sample code works, or try to support basic text.
      // For now, let's just send the text prompt to the model.
      // If the user uploads an image, we'll just save it to history but maybe not send to AI 
      // in this specific simple 'generateText' function unless we parse it.
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: inputForGemini
    });

    // Robust text extraction to handle different SDK versions or response structures
    let aiText = "";
    if (typeof response.text === 'function') {
      aiText = response.text();
    } else if (response.text) {
      aiText = response.text;
    } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
      aiText = response.candidates[0].content.parts[0].text;
    } else {
      aiText = JSON.stringify(response); // Fallback debug
    }

    // --- Save to History ---
    let chat = await Chat.findOne({ userId });
    if (!chat) {
      chat = new Chat({ userId, messages: [] });
    }

    const userMsg = { role: 'user', content: prompt || "Image Upload", image };
    const aiMsg = { role: 'assistant', content: aiText };

    chat.messages.push(userMsg);
    chat.messages.push(aiMsg);
    await chat.save();

    // --- Respond ---
    res.json({
      reply: aiText,
      // Sending back these mainly for the frontend to update UI immediately
      userMessage: userMsg,
      assistantMessage: aiMsg
    });

  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Gemini API failed" });
  }
};
