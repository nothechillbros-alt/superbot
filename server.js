import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { saveMemory, getMemory } from "./services/supabase.js";

dotenv.config();
const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY; // Desde entorno de Render

async function sendTelegram(chatId, text) {
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text,
    });
    console.log("✅ Mensaje enviado a Telegram:", text);
  } catch (err) {
    console.error("❌ Error enviando mensaje a Telegram:", err.message);
  }
}

async function askClaude(memory, userText) {
  try {
    let memoryText = "";
    if (memory && memory.length > 0) {
      memoryText = memory.map(m => `Human: ${m.message}\nAssistant: ${m.response}`).join("\n") + "\n";
    }

    const fullPrompt = `${memoryText}Human: ${userText}\nAssistant:`;

    const response = await axios.post(
      "https://api.anthropic.com/v1/complete",
      {
        model: "claude-sonnet-4.6", // Tu modelo exacto
        prompt: fullPrompt,
        max_tokens_to_sample: 1000,
        stop_sequences: ["\n\nHuman:"],
      },
      {
        headers: {
          "x-api-key": CLAUDE_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("📦 Respuesta de Claude 4.6:", response.data);

    return response.data.completion || "Claude no respondió correctamente";
  } catch (err) {
    console.error("❌ Error llamando a Claude 4.6:", err.message);
    return "Error: no pude conectarme con Claude";
  }
}

app.post(`/webhook/${TELEGRAM_TOKEN}`, async (req, res) => {
  try {
    const message = req.body.message || req.body.edited_message;
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
