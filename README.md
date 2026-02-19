# 🔥 Infinite Tic-Tac-Toe

Telegram Mini App — бесконечные крестики-нолики с уникальной механикой!

## 🎮 Особенности

- **Уникальная механика** — у каждого игрока только 3 фишки
- **Бесконечная игра** — 4-я фишка убирает самую старую
- **Мультиплеер** — играй с друзьями онлайн
- **Telegram интеграция** — темы, haptic feedback, шаринг

## 🚀 Быстрый старт

### Онлайн

1. Открой бота в Telegram
2. Нажми "Играть"
3. Выбери режим: с ботом или онлайн

### Локальная разработка

```bash
# Клонировать
git clone https://github.com/YOUR_USERNAME/Tic-Tac-Toe.git
cd Tic-Tac-Toe

# Настроить Firebase для мультиплеера
cp js/config.js.example js/config.js
# Отредактируй config.js своими данными Firebase

# Запустить локальный сервер
npx serve .
```

## 📱 Режимы игры

| Режим | Описание |
|-------|----------|
| 🤖 **С бот** | Тренировка против AI |
| 👥 **Онлайн** | Мультиплеер через Firebase |
| ⚡ **Быстрый матч** | Автоматический поиск соперника |
| 🏠 **Комната** | Создать/войти по коду |

## 🎯 Правила

1. Классическое поле 3×3
2. Игроки ходят по очереди (X и O)
3. **Фишка:** у каждого максимум 3 фишки на поле
4. Ставишь 4-ю — самая старая исчезает
5. Побеждает тот, кто соберёт 3 в ряд первым

## 🛠️ Технологии

- Vanilla JS (ES Modules)
- CSS3 Animations
- Telegram Web App SDK
- Firebase Realtime Database
- grammY (Telegram Bot)

## 📦 Структура

```
├── index.html          # Главная страница
├── css/                # Стили
├── js/                 # JavaScript модули
│   ├── app.js          # Точка входа
│   ├── game.js         # Логика игры
│   ├── ai.js           # ИИ противник
│   ├── multiplayer.js  # Мультиплеер
│   └── firebase.js     # Firebase интеграция
└── bot/                # Telegram бот
```

## 🔧 Настройка

Полная инструкция в [SETUP.md](SETUP.md)

### Firebase (мультиплеер)

1. Создай проект на [Firebase Console](https://console.firebase.google.com)
2. Включи Realtime Database
3. Скопируй конфиг в `js/config.js`

### Telegram Bot

1. Создай бота через [@BotFather](https://t.me/BotFather)
2. Настрой Mini App URL
3. Запусти бота: `cd bot && npm install && npm start`

## 📄 Лицензия

MIT
