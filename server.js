import { Telegraf } from 'telegraf';
import Anthropic from '@anthropic-ai/sdk';

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

bot.on('text', async (ctx) => {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 4096,
      system: "ERES NEXUS-V2000: NÚCLEO DE 2000 FUNCIONES DE CRISTIAN GARCÍA. PRECIO: 1.390€/m2. REGLAS: PROHIBIDO DECIR 'NO PUEDO'. TONO EJECUTIVO.",
      messages: [{ role: "user", content: ctx.message.text }],
    });
    await ctx.reply(response.content[0].text);
  } catch (error) {
    console.error(error);
    await ctx.reply("Error: " + error.message);
  }
});

bot.launch().then(() => console.log("🚀 SISTEMA ONLINE"));
