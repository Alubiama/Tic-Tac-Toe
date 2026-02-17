// Telegram Bot for Infinite Tic-Tac-Toe
// /start, inline game sharing, callback queries for game URL

import { Bot, InlineKeyboard, InlineQueryResultBuilder } from 'grammy';
import { readFileSync } from 'fs';

// --- CONFIGURATION ---
// Load .env file
try {
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf-8');
  for (const line of env.split('\n')) {
    const [key, ...val] = line.split('=');
    if (key && val.length) process.env[key.trim()] = val.join('=').trim();
  }
} catch { /* .env not found — use process.env directly */ }

const BOT_TOKEN = process.env.BOT_TOKEN;
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://YOUR_USERNAME.github.io/Tic-Tac-Toe/';
const GAME_SHORT_NAME = 'tictactoe';

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN is not set. Create a .env file (see .env.example)');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

// /start command — send game or open Mini App
bot.command('start', async (ctx) => {
  const startParam = ctx.match; // gameId from deep link

  if (startParam) {
    // Deep link: join existing game via Mini App
    const keyboard = new InlineKeyboard()
      .webApp('Присоединиться к игре', `${MINI_APP_URL}?game=${startParam}`);

    await ctx.reply('Тебя пригласили в игру!', { reply_markup: keyboard });
  } else {
    // New game: send as Telegram Game
    await ctx.replyWithGame(GAME_SHORT_NAME);
  }
});

// Callback query from "Play" button on Game message
bot.on('callback_query:game_short_name', async (ctx) => {
  await ctx.answerCallbackQuery({ url: MINI_APP_URL });
});

// Inline mode: share game into any chat
bot.on('inline_query', async (ctx) => {
  const result = InlineQueryResultBuilder.game('play-tictactoe', GAME_SHORT_NAME);

  await ctx.answerInlineQuery([result], { cache_time: 0 });
});

// /help command
bot.command('help', async (ctx) => {
  await ctx.reply(
    'Правила:\n' +
    '• Поле 3×3\n' +
    '• Макс. 3 фигуры на игрока\n' +
    '• 4-я фигура убирает самую старую\n' +
    '• Побеждает тот, кто соберёт 3 в ряд\n\n' +
    'Нажми /start чтобы начать игру!'
  );
});

// Start the bot
bot.start();
console.log('Bot is running...');
