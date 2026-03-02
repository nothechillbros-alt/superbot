// server.js - Clawd Bot definitivo
import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { saveMemory, getMemory } from "./services/supabase.js";

dotenv.config();
const app = express();
app.use(express.json());

// Variables de entorno
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

async function sendTelegram(chatId, text) {
  try {
    const resp = await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text,
    });
    console.log("✅ Mensaje enviado a Telegram:", text);
    console.log("🔹 Telegram response:", resp.data);
  } catch (err) {
    console.error("❌ Error enviando mensaje a Telegram:", err.response?.data || err.message);
  }
}

async function askClaude(memory, userText) {
  try {
    // Construimos prompt concatenando la memoria
    let memoryText = "";
    if (memory && memory.length > 0) {
      memoryText = memory.map(m => `Human: ${m.message}\nAssistant: ${m.response}`).join("\n") + "\n";
    }

    const fullPrompt = `${memoryText}Human: ${userText}\nAssistant:`;

    // Llamada a Claude Sonnet 4.6
    const response = await axios.post(
      "https://api.anthropic.com/v1/complete",
      {
        model: "claude-sonnet-4.6", 
        prompt: fullPrompt,
        max_tokens_to_sample: 1000,
        stop_sequences: ["\n\nHuman:"]
      },
      {
        headers: {
          "x-api-key": CLAUDE_API_KEY,
          "Content-Type": "application/json"
        },
      }
    );

    console.log("📦 Respuesta completa de Claude:", JSON.stringify(response.data, null, 2));

    // Cambio clave para 4.6
    const reply = response.data?.completion?.text || "Claude no respondió correctamente";
    return reply;
  } catch (err) {
    console.error("❌ Error llamando a Claude 4.6:", err.response?.data || err.message);
    return "Error: no pude conectarme con Claude";
  }
}

// Webhook de Telegram
app.post(`/webhook/${TELEGRAM_TOKEN}`, async (req, res) => {
  try {
    const message = req.body.message || req.body.edited_message;
    console.log("🔹 Incoming Telegram request:", JSON.stringify(req.body, null, 2));

    if (!message || !message.text) return res.sendStatus(200);

    const chatId = message.chat.id.toString();
    const text = message.text;

    console.log("📩 Mensaje recibido:", text);

    const memory = await getMemory(chatId);
    console.log("🧠 Memoria obtenida:", memory.length, "mensajes");

    const reply = await askClaude(memory, text);
    console.log("💬 Respuesta de Claude:", reply);

    await saveMemory(chatId, text, reply);

    await sendTelegram(chatId, reply);

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error en webhook:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 SuperBot activo en puerto ${PORT}`));
