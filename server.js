// server.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
// Render provides the PORT environment variable
const PORT = process.env.PORT || 3000;

// --- Configuration ---
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("💥 Error: GEMINI_API_KEY environment variable not set.");
  process.exit(1); // Exit if API key is missing
}

const genAI = new GoogleGenerativeAI(apiKey);
// Use a specific model, e.g., 'gemini-1.5-flash' or 'gemini-pro'
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Choose your model

// --- Middleware ---
app.use(express.json()); // Parse JSON request bodies
app.use(express.static('public')); // Serve static files from the 'public' directory

// --- Routes ---

// Basic route for checking if the server is up
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Gemini Wrapper is running!' });
});

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required in the request body' });
    }

    console.log(`Received prompt: "${prompt}"`); // Log received prompt

    // Send prompt to Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log(`Gemini response length: ${text.length}`); // Log response length

    res.json({ response: text });

  } catch (error) {
    console.error("Error processing chat request:", error);
    // Provide a more informative error message if possible
    let errorMessage = 'An error occurred while processing your request.';
    if (error.message) {
        errorMessage += ` Details: ${error.message}`;
    }
     // Check for specific Gemini API error structures if known
     if (error.response && error.response.promptFeedback) {
        errorMessage += ` Prompt Feedback: ${JSON.stringify(error.response.promptFeedback)}`;
     }

    res.status(500).json({ error: errorMessage });
  }
});

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`✨ Server listening on port ${PORT}`);
  console.log(`Access the test frontend at http://localhost:${PORT}`);
  console.log(`API endpoint: POST http://localhost:${PORT}/api/chat`);
});