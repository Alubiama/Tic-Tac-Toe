import { Bot, InlineKeyboard } from 'grammy';

const BOT_TOKEN = process.env.BOT_TOKEN;
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://your-username.github.io/Tic-Tac-Toe/';

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN is not set');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

bot.command('start', async (ctx) => {
  const startParam = ctx.match;

  if (startParam && startParam.startsWith('game_')) {
    const roomId = startParam.replace('game_', '');
    const keyboard = new InlineKeyboard()
      .webApp('🎮 Присоединиться к игре', `${MINI_APP_URL}?startapp=game_${roomId}`);
    
    await ctx.reply('🎯 Тебя пригласили в игру Infinite Tic-Tac-Toe!', { reply_markup: keyboard });
    return;
  }

  const keyboard = new InlineKeyboard()
    .webApp('🎮 Играть', MINI_APP_URL)
    .row()
    .text('📖 Правила', 'rules');

  await ctx.reply(
    `🔥 *Infinite Tic-Tac-Toe*\n\n` +
    `Бесконечные крестики-нолики!\n\n` +
    `• Поле 3×3\n` +
    `• У каждого максимум 3 фишки\n` +
    `• 4-я фишка убирает самую старую\n` +
    `• Побеждает тот, кто соберёт 3 в ряд\n\n` +
    `Нажми *Играть* чтобы начать!`,
    { 
      parse_mode: 'Markdown',
      reply_markup: keyboard 
    }
  );
});

bot.callbackQuery('rules', async (ctx) => {
  const rulesText = `
📖 **Правила игры**

1️⃣ Классическое поле 3×3

2️⃣ Игроки ходят по очереди (X и O)

3️⃣ **Главная фишка:** у каждого игрока может быть только 3 фишки на поле

4️⃣ Когда ставишь 4-ю фишку — самая старая исчезает

5️⃣ Побеждает тот, кто первым соберёт 3 в ряд

💡 **Стратегия:** думай наперёд! Твоя "лишняя" фишка может разрушить собственную линию.
  `.trim();

  await ctx.answerCallbackQuery();
  await ctx.reply(rulesText, { parse_mode: 'Markdown' });
});

bot.callbackQuery('stats', async (ctx) => {
  await ctx.answerCallbackQuery('📊 Статистика скоро будет!');
});

bot.command('play', async (ctx) => {
  const keyboard = new InlineKeyboard()
    .webApp('🎮 Открыть игру', MINI_APP_URL);
  
  await ctx.reply('Готов играть?', { reply_markup: keyboard });
});

bot.command('help', async (ctx) => {
  await ctx.reply(`
🆘 **Справка**

/start — Главное меню
/play — Быстрый старт игры
/help — Эта справка

**Режимы игры:**
• 🤖 С бот — играй против AI
• 👥 Онлайн — мультиплеер с друзьями

**Как играть онлайн:**
1. Нажми "Онлайн" в игре
2. Создай комнату или используй быстрый матч
3. Поделись кодом с другом
4. Игра начнётся автоматически!
  `.trim(), { parse_mode: 'Markdown' });
});

bot.command('invite', async (ctx) => {
  const args = ctx.match;
  
  if (!args) {
    await ctx.reply('Использование: /invite КОМНАТЫ\n\nПример: /invite abc123');
    return;
  }
  
  const roomId = args.trim();
  const keyboard = new InlineKeyboard()
    .webApp('🎮 Присоединиться', `${MINI_APP_URL}?start=game_${roomId}`)
    .row()
    .url('📤 Поделиться', `https://t.me/share/url?url=https://t.me/${ctx.me.username}?start=game_${roomId}&text=Играй со мной в Infinite Tic-Tac-Toe!`);
  
  await ctx.reply(`🎯 Комната: ${roomId}`, { reply_markup: keyboard });
});

bot.api.setMyCommands([
  { command: 'start', description: 'Главное меню' },
  { command: 'play', description: 'Начать игру' },
  { command: 'help', description: 'Справка' },
  { command: 'invite', description: 'Пригласить в комнату' }
]);

bot.start();
console.log('🤖 Bot is running...');
