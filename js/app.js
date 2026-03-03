import { createGame, makeMove, resetGame, isValidMove } from './game.js';
import { initBoard, renderBoard, showWinOverlay, hideWinOverlay, animateScoreUpdate } from './board.js';
import { init as initTg, getUser, haptic, isTg } from './telegram.js';
import { getAiMove } from './ai.js';
import { initFirebase, isReady, createRoom, joinRoom, listenRoom, updateGame, leaveRoom, checkRoomExists } from './firebase.js';
import { initYandexSDK, isYandex, showInterstitialAd, showRewardedAd, setLeaderboardScore, getPlayerName as getYaPlayerName, getPlayerUniqueID } from './yandex.js';

let game = createGame();
let aiThinking = false;
let mode = 'single';
let mySymbol = null;
let roomId = null;
let myId = null;
let unsub = null;
let gamesPlayed = 0;

console.log('App starting...');

// Platform detection & init
async function initApp() {
  // Try Telegram first
  try { initTg(); } catch (e) {}

  // Try Yandex Games SDK
  await initYandexSDK();

  // Init Firebase (for multiplayer)
  initFirebase();

  // Determine player ID
  if (isYandex() && getPlayerUniqueID()) {
    myId = 'ya_' + getPlayerUniqueID();
  } else {
    const user = getUser();
    myId = user?.id?.toString() || 'guest_' + Math.random().toString(36).slice(2, 8);
  }

  // Init board
  initBoard(handleClick);

  // Adapt UI for platform
  adaptUIForPlatform();

  renderBoard(game);
  updateUI();
  console.log('App ready! Platform:', isYandex() ? 'Yandex Games' : isTg() ? 'Telegram' : 'Web');
}

function adaptUIForPlatform() {
  // Update share button for Yandex Games
  const shareBtn = document.getElementById('btn-copy-room');
  if (shareBtn && isYandex()) {
    shareBtn.textContent = '📋 Скопировать код';
  }
}

function handleClick(idx) {
  if (mode === 'single') return vsBot(idx);
  if (mode === 'test') return testMove(idx);
  if (mode === 'multi') return multiMove(idx);
}

function vsBot(idx) {
  if (aiThinking || game.winner || game.currentPlayer !== 'X') return;
  if (!isValidMove(game.moves, 'X', idx)) return haptic('warn');

  game = makeMove(game, idx);
  haptic('place');
  renderBoard(game);
  if (game.winner) return showWin(game.winner);

  aiThinking = true;
  setTimeout(() => {
    const ai = getAiMove(game.moves, 'O');
    if (ai !== null) {
      game = makeMove(game, ai);
      haptic('tap');
      renderBoard(game);
      if (game.winner) showWin(game.winner);
    }
    aiThinking = false;
  }, 400);
}

function testMove(idx) {
  if (game.winner || !isValidMove(game.moves, game.currentPlayer, idx)) return;
  game = makeMove(game, idx);
  haptic('place');
  renderBoard(game);
  if (game.winner) showWin(game.winner);
}

function multiMove(idx) {
  if (game.winner || game.currentPlayer !== mySymbol) return;
  if (!isValidMove(game.moves, game.currentPlayer, idx)) return;

  game = makeMove(game, idx);
  haptic('place');
  renderBoard(game);

  updateGame(roomId, {
    moves: game.moves,
    currentPlayer: game.currentPlayer,
    winner: game.winner,
    winLine: game.winLine
  });

  if (game.winner) showWin(game.winner);
}

function showWin(w) {
  haptic(w === 'X' ? 'win' : 'lose');
  animateScoreUpdate(w);
  gamesPlayed++;

  // Update Yandex leaderboard
  if (isYandex()) {
    const totalWins = w === 'X' ? game.scoreX : game.scoreO;
    setLeaderboardScore('wins', totalWins);
  }

  setTimeout(() => showWinOverlay(w), 400);
}

async function restart() {
  // Show interstitial ad every 3 games on Yandex
  if (isYandex() && gamesPlayed > 0 && gamesPlayed % 3 === 0) {
    await showInterstitialAd();
  }

  game = resetGame(game);
  hideWinOverlay();
  renderBoard(game);
}

// === CREATE ROOM ===
async function createGameRoom(customId) {
  if (!isReady()) return alert('Firebase не подключён');

  if (customId && await checkRoomExists(customId)) {
    return alert('Код занят');
  }

  const playerName = getYaPlayerName() || getUser()?.first_name || 'Player';
  roomId = await createRoom(myId, playerName, customId);
  mySymbol = 'X';
  mode = 'multi';
  game = createGame();

  unsub = listenRoom(roomId, data => {
    if (!data) {
      alert('Соперник вышел');
      cleanup();
      return;
    }
    if (data.game) {
      game = { ...game, ...data.game };
      renderBoard(game);
      if (game.winner) showWin(game.winner);
    }
  });

  showRoomInfo(roomId);
}

// === JOIN ROOM ===
async function joinGameRoom(id) {
  if (!isReady()) return alert('Firebase не подключён');

  const playerName = getYaPlayerName() || getUser()?.first_name || 'Player';
  const res = await joinRoom(id, myId, playerName);

  if (!res.ok) {
    const msgs = { not_found: 'Комната не найдена', full: 'Комната занята', own_room: 'Это твоя комната' };
    return alert(msgs[res.error] || 'Ошибка');
  }

  roomId = id;
  mySymbol = 'O';
  mode = 'multi';
  game = createGame();

  unsub = listenRoom(roomId, data => {
    if (!data) {
      alert('Соперник вышел');
      cleanup();
      return;
    }
    if (data.game) {
      game = { ...game, ...data.game };
      renderBoard(game);
      if (game.winner) showWin(game.winner);
    }
  });

  updateUI();
}

function cleanup() {
  if (unsub) unsub();
  if (roomId) leaveRoom(roomId);
  mode = 'single';
  mySymbol = null;
}

function showRoomInfo(id) {
  document.getElementById('room-id-display').textContent = id;
  show('modal-room-info');
  updateUI();
}

// === BUTTONS ===

document.getElementById('btn-restart').onclick = () => { haptic('tap'); restart(); };
document.getElementById('btn-mode-single').onclick = () => { haptic('tap'); cleanup(); restart(); updateUI(); };
document.getElementById('btn-mode-multi').onclick = () => { haptic('tap'); show('modal-multiplayer'); };

document.getElementById('btn-quick-match').onclick = async () => {
  haptic('tap');
  hide('modal-multiplayer');
  await createGameRoom(null);
};

document.getElementById('btn-create-room').onclick = () => {
  haptic('tap');
  hide('modal-multiplayer');
  show('modal-create-room');
};

document.getElementById('btn-join-room').onclick = () => {
  haptic('tap');
  hide('modal-multiplayer');
  show('modal-join-room');
};

document.getElementById('btn-create-confirm').onclick = async () => {
  const id = document.getElementById('input-create-room-id').value.trim().toUpperCase();
  if (!id || id.length < 3) return alert('Минимум 3 символа');
  hide('modal-create-room');
  await createGameRoom(id);
};

document.getElementById('btn-create-random').onclick = async () => {
  hide('modal-create-room');
  await createGameRoom(null);
};

document.getElementById('btn-join-confirm').onclick = async () => {
  const id = document.getElementById('input-room-id').value.trim().toUpperCase();
  if (!id) return;
  hide('modal-join-room');
  await joinGameRoom(id);
};

document.getElementById('btn-copy-room').onclick = () => {
  if (isYandex()) {
    // On Yandex Games — copy room code to clipboard
    navigator.clipboard?.writeText(roomId).then(() => {
      const btn = document.getElementById('btn-copy-room');
      btn.textContent = '✅ Скопировано!';
      setTimeout(() => { btn.textContent = '📋 Скопировать код'; }, 2000);
    });
  } else {
    // On Telegram — share via Telegram link
    const link = `https://t.me/InfTicTacToeBot?startapp=game_${roomId}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Играй со мной!')}`;
    window.Telegram?.WebApp?.openTelegramLink(url);
  }
  haptic('tap');
};

document.getElementById('btn-close-room-info').onclick = () => hide('modal-room-info');

// Test mode button
const testBtn = document.createElement('button');
testBtn.className = 'btn-secondary btn-block';
testBtn.textContent = '🧪 Играть с собой';
testBtn.style.opacity = '0.7';
testBtn.onclick = () => {
  haptic('tap');
  hide('modal-multiplayer');
  mode = 'test';
  mySymbol = null;
  restart();
  updateUI();
};
const divider = document.createElement('div');
divider.className = 'divider';
divider.textContent = 'для теста';
document.querySelector('#modal-multiplayer .modal-body').appendChild(divider);
document.querySelector('#modal-multiplayer .modal-body').appendChild(testBtn);

// Close modals
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.onclick = () => { haptic('tap'); btn.closest('.modal').classList.add('hidden'); };
});

function updateUI() {
  const singleBtn = document.getElementById('btn-mode-single');
  const multiBtn = document.getElementById('btn-mode-multi');
  const status = document.getElementById('status');

  singleBtn.classList.toggle('active', mode === 'single');
  multiBtn.classList.toggle('active', mode !== 'single');

  if (mode === 'single') {
    status.innerHTML = `Ход: <span id="turn-indicator" class="turn-${game.currentPlayer.toLowerCase()}">${game.currentPlayer}</span>`;
  } else if (mode === 'test') {
    status.innerHTML = `<span class="my-turn">🧪 Тест: ${game.currentPlayer}</span>`;
  } else {
    status.innerHTML = mySymbol === 'X'
      ? `<span class="my-turn">Твой ход (X)</span>`
      : `<span class="opponent-turn">Ход соперника...</span>`;
  }
}

function show(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hide(id) { document.getElementById(id)?.classList.add('hidden'); }

// Start the app
initApp();
