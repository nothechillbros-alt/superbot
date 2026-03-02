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
  try {
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      { chat_id: chatId, text }
    );
    console.log("✅ Mensaje enviado a Telegram:", text);
  } catch (err) {
    console.error("❌ Error enviando a Telegram:", err.message);
  }
}

// Webhook Telegram
app.post(`/webhook/${TELEGRAM_TOKEN}`, async (req, res) => {
  try {
    const message = req.body.message;
    if (!message || !message.text) return res.sendStatus(200);

    const chatId = message.chat.id.toString();
    const text = message.text;

    console.log("📩 Mensaje recibido de Telegram:", text);

    // Obtener memoria
    const memory = await getMemory(chatId);

    console.log("🧠 Memoria obtenida:", memory.length, "mensajes");

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

    const reply = response.data?.content?.[0]?.text || response.data?.completion || "Claude no respondió";

    console.log("💬 Respuesta de Claude:", reply);

    // Guardar en Supabase
    await saveMemory(chatId, text, reply);

    // Enviar respuesta a Telegram
    await sendTelegram(chatId, reply);

    res.sendStatus(200);

  } catch (error) {
    console.error("❌ Error en webhook:", error.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 SuperBot activo en puerto ${PORT}`));
