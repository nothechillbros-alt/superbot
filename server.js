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
      text,
    });
    console.log("✅ Mensaje enviado a Telegram:", text);
  } catch (err) {
    console.error("❌ Error enviando a Telegram:", err.message);
  }
}

// Función para llamar a Claude 4.6
async function askClaude(memory, prompt) {
  try {
    const messages = [
      ...memory.map((m) => ({ role: "user", content: `${m.message} → ${m.response}` })),
      { role: "user", content: prompt },
    ];

    const response = await axios.post(
      "https://api.anthropic.com/v1/complete",
      {
        model: "claude-4.6",  // Aquí tu modelo Sonnet 4.6
        max_tokens_to_sample: 1000,
        stop_sequences: ["\n\nHuman:"],
        prompt: messages.map(m => `Human: ${m.content}\nAssistant:`).join("\n"),
      },
      {
        headers: {
          "x-api-key": CLAUDE_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("📦 Respuesta completa de Claude:", response.data);

    const reply = response.data.completion || "Claude no respondió correctamente";
    return reply;
  } catch (err) {
    console.error("❌ Error llamando a Claude 4.6:", err.message);
    return "Error: no pude conectarme con Claude";
  }
}

app.post(`/webhook/${TELEGRAM_TOKEN}`, async (req, res) => {
  try {
    const message = req.body.message;
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
    console.error("❌ Error en webhook:", err.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 SuperBot activo en puerto ${PORT}`));
