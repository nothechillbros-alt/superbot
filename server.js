import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

const TELEGRAM_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

app.post("/webhook", async (req, res) => {
  console.log("📩 WEBHOOK ACTIVADO");

  try {
    if (!req.body.message) {
      return res.sendStatus(200);
    }

    const chatId = req.body.message.chat.id;
    const userText = req.body.message.text || "";

    console.log("Mensaje recibido:", userText);

    await axios.post(TELEGRAM_URL, {
      chat_id: chatId,
      text: "🔥 El bot está funcionando correctamente"
    });

    console.log("Respuesta enviada a Telegram");

    res.sendStatus(200);

  } catch (error) {
    console.error("ERROR:", error.response?.data || error.message);
    res.sendStatus(200);
  }
});

app.get("/", (req, res) => {
  res.send("Servidor funcionando");
});

app.listen(3000, () => {
  console.log("Servidor iniciado en puerto 3000");
});
