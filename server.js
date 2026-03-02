import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const TELEGRAM_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

// 🧠 Memoria en RAM
const userMemory = {};

app.post("/webhook", async (req, res) => {
  try {
    const message = req.body.message;
    if (!message || !message.text) {
      return res.sendStatus(200);
    }

    const chatId = message.chat.id;
    const userText = message.text;

    // Inicializar memoria si no existe
    if (!userMemory[chatId]) {
      userMemory[chatId] = [];
    }

    // Guardamos mensaje usuario
    userMemory[chatId].push({
      role: "user",
      content: userText
    });

    // Limitamos memoria a últimos 10 mensajes
    if (userMemory[chatId].length > 10) {
      userMemory[chatId].shift();
    }

    console.log("Enviando a Claude...");

    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-3-sonnet-20240229",
        max_tokens: 500,
        messages: userMemory[chatId]
      },
      {
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        }
      }
    );

    const reply = response.data.content[0].text;

    // Guardamos respuesta IA
    userMemory[chatId].push({
      role: "assistant",
      content: reply
    });

    console.log("Respuesta enviada a Telegram");

    await axios.post(TELEGRAM_URL, {
      chat_id: chatId,
      text: reply
    });

    res.sendStatus(200);

  } catch (error) {
    console.error("ERROR:", error.response?.data || error.message);
    res.sendStatus(200);
  }
});

app.listen(3000, () => {
  console.log("Servidor funcionando en puerto 3000");
});
