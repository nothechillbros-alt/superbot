import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { saveMemory, getMemory } from "./services/supabase.js";

dotenv.config();
const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

// Enviar mensaje a Telegram
async function sendTelegram(chatId, text) {
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text,
    });
    console.log("✅ Enviado a Telegram");
  } catch (err) {
    console.error("❌ Error Telegram:", err.response?.data || err.message);
  }
}

// Llamada correcta a Claude 4.x
async function askClaude(memory, userText) {
  try {

    const messages = [];

    // Convertimos memoria a formato nuevo
    if (memory && memory.length > 0) {
      memory.forEach(m => {
        messages.push({ role: "user", content: m.message });
        messages.push({ role: "assistant", content: m.response });
      });
    }

    // Nuevo mensaje
    messages.push({ role: "user", content: userText });

    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-3-5-sonnet-20241022", 
        max_tokens: 1000,
        messages: messages
      },
      {
        headers: {
          "x-api-key": CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        }
      }
    );

    console.log("📦 Claude raw:", JSON.stringify(response.data, null, 2));

    return response.data.content[0].text;

  } catch (err) {
    console.error("❌ Error Claude:", err.response?.data || err.message);
    return "Error conectando con Claude";
  }
}

// Webhook
app.post(`/webhook/${TELEGRAM_TOKEN}`, async (req, res) => {
  try {

    console.log("📩 Update recibido:", JSON.stringify(req.body, null, 2));

    const message = req.body.message;
    if (!message || !message.text) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = message.text;

    const memory = await getMemory(chatId);

    const reply = await askClaude(memory, text);

    await saveMemory(chatId, text, reply);

    await sendTelegram(chatId, reply);

    res.sendStatus(200);

  } catch (err) {
    console.error("❌ Webhook error:", err);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Bot activo"));
