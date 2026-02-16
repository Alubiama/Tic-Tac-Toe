# Настройка Infinite Tic-Tac-Toe

## 1. Создание Telegram-бота

1. Открой [@BotFather](https://t.me/BotFather) в Telegram
2. Отправь `/newbot`
3. Введи имя бота (например: `Infinite TicTacToe`)
4. Введи username бота (например: `InfTicTacToeBot`)
5. Скопируй **токен** — он понадобится дальше

### Настройка Mini App в BotFather

1. Отправь `/mybots` → выбери своего бота
2. `Bot Settings` → `Menu Button` → задай:
   - URL: `https://YOUR_USERNAME.github.io/Tic-Tac-Toe/`
   - Текст: `Играть`
3. `Bot Settings` → `Configure Mini App`:
   - URL: `https://YOUR_USERNAME.github.io/Tic-Tac-Toe/`

## 2. Деплой фронтенда (GitHub Pages)

1. Запушь репозиторий на GitHub
2. Перейди в `Settings` → `Pages`
3. Source: `Deploy from a branch`
4. Branch: `main` (или `master`), папка: `/ (root)`
5. Нажми `Save`
6. Через 1-2 минуты сайт будет доступен по адресу:
   `https://YOUR_USERNAME.github.io/Tic-Tac-Toe/`

## 3. Запуск бота (локально для тестирования)

```bash
cd bot
npm install
BOT_TOKEN=your_token_here MINI_APP_URL=https://YOUR_USERNAME.github.io/Tic-Tac-Toe/ npm start
```

## 4. Деплой бота на Vercel (продакшен)

### Подготовка

1. Зарегистрируйся на [vercel.com](https://vercel.com)
2. Установи Vercel CLI: `npm i -g vercel`

### Конвертация в webhook-режим

Для продакшена бот должен работать через webhook, а не polling.
Создай файл `bot/api/webhook.js`:

```js
import { Bot, webhookCallback } from 'grammy';

const bot = new Bot(process.env.BOT_TOKEN);
// ... (перенеси обработчики из index.js)

export default webhookCallback(bot, 'std/http');
```

### Деплой

```bash
cd bot
vercel --prod
```

### Установка webhook

```bash
curl "https://api.telegram.org/botYOUR_TOKEN/setWebhook?url=https://your-bot.vercel.app/api/webhook"
```

## 5. Firebase (для мультиплеера — следующая итерация)

### Создание проекта

1. Перейди на [console.firebase.google.com](https://console.firebase.google.com)
2. `Add project` → введи имя (например: `infinite-tictactoe`)
3. Отключи Google Analytics (не нужен для MVP)
4. `Create project`

### Включение Realtime Database

1. В консоли Firebase: `Build` → `Realtime Database`
2. `Create Database`
3. Регион: `europe-west1` (или ближайший)
4. Правила: `Start in test mode` (для MVP)

### Получение конфига

1. `Project settings` (шестерёнка) → `General`
2. `Your apps` → `Web` (иконка `</>`)
3. Зарегистрируй приложение
4. Скопируй объект `firebaseConfig`:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

5. Этот конфиг будет использован в `js/multiplayer.js`

### Security Rules (продакшен)

```json
{
  "rules": {
    "games": {
      "$gameId": {
        ".read": true,
        ".write": true,
        "moves": {
          ".validate": "newData.isString() || newData.hasChildren()"
        }
      }
    }
  }
}
```
