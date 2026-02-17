// Telegram Bot for Infinite Tic-Tac-Toe
// Minimal bot: /start command + Mini App button + inline sharing

import { Bot, InlineKeyboard } from 'grammy';

// --- CONFIGURATION ---
// Replace with your actual values:
const BOT_TOKEN = process.env.BOT_TOKEN || '8315899079:AAEygXPlEZh2Ht5Xcb_rgZ1XubvbjyKE0Q8';
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://YOUR_USERNAME.github.io/Tic-Tac-Toe/';

const bot = new Bot(BOT_TOKEN);

// /start command — opens Mini App
bot.command('start', async (ctx) => {
  const startParam = ctx.match; // gameId from deep link

  const keyboard = new InlineKeyboard();

  if (startParam) {
    // Deep link: join existing game
    keyboard.webApp('Присоединиться к игре', `${MINI_APP_URL}?game=${startParam}`);
  } else {
    // New game
    keyboard.webApp('Играть', MINI_APP_URL);
  }

  await ctx.reply(
    '🎮 *Бесконечные крестики\\-нолики*\n\n' +
    'Поле 3×3, но у каждого игрока максимум 3 фигуры\\.\n' +
    'При постановке 4\\-й — старейшая исчезает\\!\n\n' +
    'Ничьих не бывает — играй, пока кто\\-то не победит\\.',
    {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard
    }
  );
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
