import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { saveMemory, getMemory } from "./services/supabase.js";

dotenv.config();
const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

// Función para enviar mensajes a Telegram
async function sendTelegram(chatId, text) {
  await axios.post(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
    { chat_id: chatId, text }
  );
}

// Webhook Telegram
app.post(`/webhook/${TELEGRAM_TOKEN}`, async (req, res) => {
  const message = req.body.message;
  if (!message || !message.text) return res.sendStatus(200);

  const chatId = message.chat.id.toString();
  const text = message.text;

  const memory = await getMemory(chatId);

  // Llamada a Claude
  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-3-sonnet-20240229",
      max_tokens: 800,
      messages: [
        ...memory.map(m => ({ role: "user", content: `${m.message} → ${m.response}` })),
        { role: "user", content: text }
      ]
    },
    {
      headers: {
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      }
    }
  );

  const reply = response.data.content[0].text;

  // Guardar en Supabase
  await saveMemory(chatId, text, reply);

  await sendTelegram(chatId, reply);

  res.sendStatus(200);
});

app.listen(process.env.PORT || 3000, () => {
  console.log("SuperBot activo");
});
