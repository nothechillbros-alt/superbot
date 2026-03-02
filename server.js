import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { saveMemory, getMemory } from "./services/supabase.js";

dotenv.config();
const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

async function sendTelegram(chatId, text) {
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: text.substring(0, 4000)
    });
    console.log("✅ Telegram enviado");
  } catch (err) {
    console.error("❌ Telegram error:", err.response?.data || err.message);
  }
}

async function askClaude(memory, userText) {
  try {

    const messages = [];

    if (memory && memory.length > 0) {
      memory.forEach(m => {
        messages.push({ role: "user", content: m.message });
        messages.push({ role: "assistant", content: m.response });
      });
    }

    messages.push({ role: "user", content: userText });

    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-6",
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

    console.log("📦 Claude respuesta:", JSON.stringify(response.data, null, 2));

    return response.data.content[0].text;

  } catch (err) {
    console.error("❌ Claude error:", err.response?.data || err.message);
    return "Error conectando con Claude";
  }
}

app.post(`/webhook/${TELEGRAM_TOKEN}`, async (req, res) => {

  console.log("📩 Update:", JSON.stringify(req.body, null, 2));

  const message = req.body.message;
  if (!message || !message.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const text = message.text;

  const memory = await getMemory(chatId);

  const reply = await askClaude(memory, text);

  await saveMemory(chatId, text, reply);

  await sendTelegram(chatId, reply);

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Conchipro_bot activo"));
