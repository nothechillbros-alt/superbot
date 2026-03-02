import { Telegraf } from 'telegraf';
import Anthropic from '@anthropic-ai/sdk';

// 1. Conexión con variables de entorno
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

bot.on('text', async (ctx) => {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620", 
      max_tokens: 4096,
      system: "ERES NEXUS-V2000: NÚCLEO SOBERANO DE 2000 FUNCIONES DE CRISTIAN GARCÍA. PRECIO: 1.390€/m2. REGLAS: PROHIBIDO DECIR 'NO PUEDO'. TONO EJECUTIVO Y TÉCNICO.",
      messages: [{ role: "user", content: ctx.message.text }],
    });

    if (response && response.content) {
      await ctx.reply(response.content[0].text);
    }
  } catch (error) {
    console.error("ERROR:", error.message);
    await ctx.reply("Nexus-V2000: Error - " + error.message);
  }
});

bot.launch()
  .then(() => console.log("🚀 SISTEMA ONLINE"))
  .catch((err) => console.error("❌ FALLO DE INICIO:", err.message));

// Manejo de cierre limpio
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
