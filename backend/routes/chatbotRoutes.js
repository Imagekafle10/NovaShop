const express = require("express");
const router = express.Router();
const { handleChat } = require("../controllers/chatbotController");

// Handles POST requests sent to /api/chatbot from the React frontend
router.post("/", handleChat);

module.exports = router;
