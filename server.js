// server.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const { GoogleGenAI } = require("@google/genai"); // Correct import source

const app = express();
const PORT = process.env.PORT || 3000;

// --- Configuration ---
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("💥 FATAL ERROR: GEMINI_API_KEY environment variable not set.");
  console.error("   Please set it in the Secrets tab on Replit.");
  process.exit(1);
}

// Initialize using the new GoogleGenAI class, passing the API key within an object
const ai = new GoogleGenAI({ apiKey: apiKey }); // Corrected initialization

// --- Model Configuration ---
const modelId = "gemini-2.0-flash"; // Using the requested model
console.log(`Attempting to use Gemini model: ${modelId}`);

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- Routes ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Gemini Wrapper is running!" });
});

// Main chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      console.warn("Received request with invalid or empty prompt.");
      return res
        .status(400)
        .json({ error: "Prompt is required and must be a non-empty string." });
    }

    console.log(
      `[${new Date().toISOString()}] Received prompt, attempting API call with model ${modelId}...`,
    );
    console.log(`   Prompt (start): "${prompt.substring(0, 80)}..."`);

    // *** CORE API CALL - Strictly Matching Documentation Snippet Structure ***
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });

    console.log(
      `[${new Date().toISOString()}] Received raw response structure from Gemini API.`,
    );

    // *** RESPONSE HANDLING ***
    if (!response || typeof response.text === "undefined") {
      console.error(
        "💥 Gemini API response structure unexpected or missing 'text'. Raw response:",
        JSON.stringify(response, null, 2),
      );
      let textContent = null;
      if (
        response &&
        response.response &&
        typeof response.response.text === "function"
      ) {
        textContent = response.response.text();
        console.warn("   Used 'response.response.text()' structure.");
      } else if (
        response &&
        response.candidates &&
        response.candidates.length > 0 &&
        response.candidates[0].content &&
        response.candidates[0].content.parts
      ) {
        textContent = response.candidates[0].content.parts
          .map((part) => part.text)
          .join("");
        console.warn("   Used candidate content structure.");
      }
      if (textContent !== null) {
        console.log(`   Gemini response length: ${textContent.length}`);
        res.json({ response: textContent });
        return;
      } else {
        throw new Error(
          "AI response structure unexpected, couldn't extract text content.",
        );
      }
    }
    const text = response.text;
    console.log(`   Gemini response length: ${text ? text.length : "N/A"}`);
    res.json({ response: text });
  } catch (error) {
    console.error(
      `💥 [${new Date().toISOString()}] Detailed Error in /api/chat:`,
      error,
    );
    let statusCode = 500;
    let clientErrorMessage =
      "An internal server error occurred while processing your request with the AI service.";
    // Keep the detailed error parsing logic
    if (error.message) {
      clientErrorMessage += ` Details: ${error.message}`;
      if (
        error.message.toLowerCase().includes("model not found") ||
        (error.details &&
          error.details.toLowerCase().includes("model not found"))
      ) {
        statusCode = 400;
        clientErrorMessage = `The requested AI model ('${modelId}') was not found or is not available for your API key.`;
        console.error(
          `   >> Hint: Check available models in Google AI Studio or try 'gemini-1.5-flash' or 'gemini-pro'.`,
        );
      } else if (
        error.message.includes("api key") ||
        error.message.toLowerCase().includes("permission denied") ||
        error.message.toLowerCase().includes("authenticate")
      ) {
        // Broader check for auth issues
        statusCode = 401; // Unauthorized / Forbidden
        clientErrorMessage =
          "API Key invalid, lacks permission, or authentication failed.";
        console.error(
          "   >> Hint: Double-check the GEMINI_API_KEY in Replit Secrets and its permissions in Google AI Studio.",
        );
      } else if (error.message.includes("Content generation blocked")) {
        statusCode = 400;
        clientErrorMessage = error.message;
      } else if (error.message.includes("contents invalid argument")) {
        statusCode = 400;
        clientErrorMessage = `Invalid format for 'contents' sent to the AI. Details: ${error.message}`;
        console.error(
          "   >> Hint: The API might require contents: [{ role: 'user', parts: [{ text: prompt }]}] structure.",
        );
      }
    }
    if (error.response && error.response.status) {
      statusCode = error.response.status;
      clientErrorMessage = `AI Service Error: ${error.response.statusText || error.message}`;
    } else if (error.code) {
      // Check error codes like ECONNREFUSED, etc.
      clientErrorMessage += ` (Code: ${error.code})`;
    } else if (error.status) {
      clientErrorMessage += ` (Status: ${error.status})`;
    }
    res.status(statusCode).json({ error: clientErrorMessage });
  }
});

// --- Server Start ---
const server = app.listen(PORT, () => {
  console.log(`✨ Server listening on port ${PORT}`);
  console.log(`   Frontend should be accessible in the Replit Webview panel.`);
  console.log(`   API endpoint: POST /api/chat`);
});

// --- Graceful Shutdown Handlers (Corrected) ---
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    // Correct syntax
    console.log("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  // Handle Ctrl+C locally
  console.log("SIGINT signal received: closing HTTP server");
  server.close(() => {
    // <<< CORRECTED THIS LINE >>>
    console.log("HTTP server closed");
    process.exit(0);
  });
});
