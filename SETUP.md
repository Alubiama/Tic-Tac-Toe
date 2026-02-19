# Infinite Tic-Tac-Toe Setup

## 🚀 Быстрый старт

### 1. Создание Telegram-бота

1. Открой [@BotFather](https://t.me/BotFather)
2. Отправь `/newbot`
3. Введи имя и username бота
4. Скопируй **токен**

### 2. Настройка Mini App

В BotFather:
```
/mybots → выбери бота → Bot Settings → Menu Button
```
- URL: `https://YOUR_USERNAME.github.io/Tic-Tac-Toe/`
- Текст: `🎮 Играть`

### 3. Деплой на GitHub Pages

```bash
git clone https://github.com/YOUR_USERNAME/Tic-Tac-Toe.git
cd Tic-Tac-Toe
```

1. Push на GitHub
2. Settings → Pages
3. Source: Deploy from branch `main`
4. Через минуту доступно по адресу `https://YOUR_USERNAME.github.io/Tic-Tac-Toe/`

---

## 🔥 Мультиплеер (Firebase)

Для онлайн-игр нужен Firebase Realtime Database.

### 1. Создай проект Firebase

1. [console.firebase.google.com](https://console.firebase.google.com)
2. **Add project** → имя: `infinite-tictactoe`
3. Отключи Google Analytics
4. **Create project**

### 2. Включи Realtime Database

1. Build → Realtime Database
2. Create Database
3. Регион: `europe-west1`
4. Правила: **Start in test mode**

### 3. Получи конфиг

1. Project settings (шестерёнка) → General
2. Your apps → Web (иконка `</>`)
3. Зарегистрируй приложение
4. Скопируй `firebaseConfig`

### 4. Настрой игру

Открой `setup-firebase.html` в браузере или создай `js/config.js`:

```javascript
window.FIREBASE_API_KEY = "AIzaSy...";
window.FIREBASE_AUTH_DOMAIN = "your-project.firebaseapp.com";
window.FIREBASE_DATABASE_URL = "https://your-project.firebaseio.com";
window.FIREBASE_PROJECT_ID = "your-project";
window.FIREBASE_STORAGE_BUCKET = "your-project.appspot.com";
window.FIREBASE_MESSAGING_SENDER_ID = "123456789";
window.FIREBASE_APP_ID = "1:123456789:web:abc123";
```

⚠️ **Не коммить config.js в репозиторий!**

Добавь в `.gitignore`:
```
js/config.js
.env
```

### 5. Security Rules (продакшен)

В Firebase Console → Realtime Database → Rules:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

---

## 🤖 Запуск бота

### Локально

```bash
cd bot
npm install
cp ../.env.example .env
# Отредактируй .env
npm start
```

### Vercel (продакшен)

```bash
npm i -g vercel
cd bot
vercel --prod
```

Установка webhook:
```bash
curl "https://api.telegram.org/botYOUR_TOKEN/setWebhook?url=https://your-bot.vercel.app/api/webhook"
```

---

## 📁 Структура проекта

```
Tic-Tac-Toe/
├── index.html          # Главная страница
├── setup-firebase.html # Помощник настройки Firebase
├── css/
│   ├── style.css       # Основные стили
│   └── animations.css  # Анимации
├── js/
│   ├── app.js          # Точка входа
│   ├── game.js         # Логика игры
│   ├── board.js        # Рендеринг
│   ├── ai.js           # ИИ противник
│   ├── telegram.js     # Telegram SDK
│   ├── firebase.js     # Firebase интеграция
│   ├── multiplayer.js  # Мультиплеер логика
│   └── config.js       # Firebase конфиг (не коммитить!)
└── bot/
    ├── index.js        # Telegram бот
    └── package.json
```

---

## 🎮 Режимы игры

| Режим | Описание |
|-------|----------|
| 🤖 С бот | Игра против AI с адаптивной сложностью |
| 👥 Онлайн | Мультиплеер через Firebase |
| 🔗 Быстрый матч | Автоматический поиск соперника |
| 🏠 Комната | Создать/войти в комнату по коду |

---

## 🧪 Тестирование

1. Открой `index.html` локально (нужен сервер для ES модулей)
2. Или используй Live Server в VS Code
3. Для мультиплеера нужен Firebase

```bash
# Простой сервер
npx serve .
```

---

## 📱 Telegram интеграция

Игра автоматически:
- Получает тему Telegram (светлая/тёмная)
- Использует haptic feedback
- Растягивается на весь экран
- Получает данные пользователя

---

## 🔗 Ссылки

- [Telegram Web Apps Docs](https://core.telegram.org/bots/webapps)
- [Firebase Realtime Database](https://firebase.google.com/docs/database)
- [grammY Docs](https://grammy.dev)
