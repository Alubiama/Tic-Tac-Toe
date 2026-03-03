import { createGame, makeMove, resetGame, isValidMove } from './game.js';
import { initBoard, renderBoard, showWinOverlay, hideWinOverlay, animateScoreUpdate } from './board.js';
import { init as initTg, getUser, haptic, isTg } from './telegram.js';
import { getAiMove } from './ai.js';
import { initFirebase, isReady, createRoom, joinRoom, listenRoom, updateGame, leaveRoom, checkRoomExists } from './firebase.js';
import { initYandexSDK, isYandex, showInterstitialAd, showRewardedAd, setLeaderboardScore, getPlayerName as getYaPlayerName, getPlayerUniqueID } from './yandex.js';
import { playTap, playPlace, playWin, playLose, playWarn, toggleMute, isMuted } from './sound.js';

let game = createGame();
let aiThinking = false;
let gamePaused = false;
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

  // Show rules on first visit
  showRulesIfFirstVisit();

  renderBoard(game);
  updateUI();
  console.log('App ready! Platform:', isYandex() ? 'Yandex Games' : isTg() ? 'Telegram' : 'Web');
}

function adaptUIForPlatform() {
  const shareBtn = document.getElementById('btn-copy-room');
  if (shareBtn && isYandex()) {
    shareBtn.textContent = '\u{1f4cb} \u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043a\u043e\u0434';
  }
}

// === RULES / TUTORIAL ===

function showRulesIfFirstVisit() {
  try {
    if (!localStorage.getItem('inf_ttt_rules_seen')) {
      show('modal-rules');
    }
  } catch {
    show('modal-rules');
  }
}

function dismissRules() {
  hide('modal-rules');
  try { localStorage.setItem('inf_ttt_rules_seen', '1'); } catch {}
}

// === GAME CLICK HANDLER ===

function handleClick(idx) {
  if (gamePaused) return;
  if (mode === 'single') return vsBot(idx);
  if (mode === 'test') return testMove(idx);
  if (mode === 'multi') return multiMove(idx);
}

function vsBot(idx) {
  if (aiThinking || game.winner || game.currentPlayer !== 'X') return;
  if (!isValidMove(game.moves, 'X', idx)) { playWarn(); return haptic('warn'); }

  game = makeMove(game, idx);
  playPlace();
  haptic('place');
  renderBoard(game);
  if (game.winner) return showWin(game.winner);

  aiThinking = true;
  setTimeout(() => {
    const ai = getAiMove(game.moves, 'O');
    if (ai !== null) {
      game = makeMove(game, ai);
      playPlace();
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
  playPlace();
  haptic('place');
  renderBoard(game);
  if (game.winner) showWin(game.winner);
}

function multiMove(idx) {
  if (game.winner || game.currentPlayer !== mySymbol) return;
  if (!isValidMove(game.moves, game.currentPlayer, idx)) return;

  game = makeMove(game, idx);
  playPlace();
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
  const isMyWin = (mode === 'single' && w === 'X') || (mode === 'multi' && w === mySymbol) || mode === 'test';
  if (isMyWin) {
    playWin();
  } else {
    playLose();
  }
  haptic(isMyWin ? 'win' : 'lose');
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
  // Show interstitial ad every 3 games on Yandex (with pause)
  if (isYandex() && gamesPlayed > 0 && gamesPlayed % 3 === 0) {
    gamePaused = true;
    await showInterstitialAd();
    gamePaused = false;
  }

  game = resetGame(game);
  hideWinOverlay();
  renderBoard(game);
}

// === CREATE ROOM ===
async function createGameRoom(customId) {
  if (!isReady()) return alert('\u0424\u0438\u0440\u0435\u0431\u0435\u0439\u0441 \u043d\u0435 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0451\u043d');

  if (customId && await checkRoomExists(customId)) {
    return alert('\u041a\u043e\u0434 \u0437\u0430\u043d\u044f\u0442');
  }

  const playerName = getYaPlayerName() || getUser()?.first_name || 'Player';
  roomId = await createRoom(myId, playerName, customId);
  mySymbol = 'X';
  mode = 'multi';
  game = createGame();

  unsub = listenRoom(roomId, data => {
    if (!data) {
      alert('\u0421\u043e\u043f\u0435\u0440\u043d\u0438\u043a \u0432\u044b\u0448\u0435\u043b');
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
  if (!isReady()) return alert('\u0424\u0438\u0440\u0435\u0431\u0435\u0439\u0441 \u043d\u0435 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0451\u043d');

  const playerName = getYaPlayerName() || getUser()?.first_name || 'Player';
  const res = await joinRoom(id, myId, playerName);

  if (!res.ok) {
    const msgs = { not_found: '\u041a\u043e\u043c\u043d\u0430\u0442\u0430 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430', full: '\u041a\u043e\u043c\u043d\u0430\u0442\u0430 \u0437\u0430\u043d\u044f\u0442\u0430', own_room: '\u042d\u0442\u043e \u0442\u0432\u043e\u044f \u043a\u043e\u043c\u043d\u0430\u0442\u0430' };
    return alert(msgs[res.error] || '\u041e\u0448\u0438\u0431\u043a\u0430');
  }

  roomId = id;
  mySymbol = 'O';
  mode = 'multi';
  game = createGame();

  unsub = listenRoom(roomId, data => {
    if (!data) {
      alert('\u0421\u043e\u043f\u0435\u0440\u043d\u0438\u043a \u0432\u044b\u0448\u0435\u043b');
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

document.getElementById('btn-restart').onclick = () => { playTap(); haptic('tap'); restart(); };
document.getElementById('btn-mode-single').onclick = () => { playTap(); haptic('tap'); cleanup(); restart(); updateUI(); };
document.getElementById('btn-mode-multi').onclick = () => { playTap(); haptic('tap'); show('modal-multiplayer'); };

// Rules button
document.getElementById('btn-rules').onclick = () => { playTap(); show('modal-rules'); };
document.getElementById('btn-rules-ok').onclick = () => { playTap(); dismissRules(); };

// Sound toggle button
const soundBtn = document.getElementById('btn-sound');
soundBtn.onclick = () => {
  const muted = toggleMute();
  soundBtn.textContent = muted ? '\u{1f507}' : '\u{1f50a}';
  soundBtn.classList.toggle('muted', muted);
  if (!muted) playTap();
};

document.getElementById('btn-quick-match').onclick = async () => {
  playTap(); haptic('tap');
  hide('modal-multiplayer');
  await createGameRoom(null);
};

document.getElementById('btn-create-room').onclick = () => {
  playTap(); haptic('tap');
  hide('modal-multiplayer');
  show('modal-create-room');
};

document.getElementById('btn-join-room').onclick = () => {
  playTap(); haptic('tap');
  hide('modal-multiplayer');
  show('modal-join-room');
};

document.getElementById('btn-create-confirm').onclick = async () => {
  const id = document.getElementById('input-create-room-id').value.trim().toUpperCase();
  if (!id || id.length < 3) return alert('\u041c\u0438\u043d\u0438\u043c\u0443\u043c 3 \u0441\u0438\u043c\u0432\u043e\u043b\u0430');
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
    navigator.clipboard?.writeText(roomId).then(() => {
      const btn = document.getElementById('btn-copy-room');
      btn.textContent = '\u2705 \u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u043e!';
      setTimeout(() => { btn.textContent = '\u{1f4cb} \u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043a\u043e\u0434'; }, 2000);
    });
  } else {
    const link = `https://t.me/InfTicTacToeBot?startapp=game_${roomId}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('\u0418\u0433\u0440\u0430\u0439 \u0441\u043e \u043c\u043d\u043e\u0439!')}`;
    window.Telegram?.WebApp?.openTelegramLink(url);
  }
  playTap(); haptic('tap');
};

document.getElementById('btn-close-room-info').onclick = () => hide('modal-room-info');

// Test mode button
const testBtn = document.createElement('button');
testBtn.className = 'btn-secondary btn-block';
testBtn.textContent = '\u{1f9ea} \u0418\u0433\u0440\u0430\u0442\u044c \u0441 \u0441\u043e\u0431\u043e\u0439';
testBtn.style.opacity = '0.7';
testBtn.onclick = () => {
  playTap(); haptic('tap');
  hide('modal-multiplayer');
  mode = 'test';
  mySymbol = null;
  restart();
  updateUI();
};
const divider = document.createElement('div');
divider.className = 'divider';
divider.textContent = '\u0434\u043b\u044f \u0442\u0435\u0441\u0442\u0430';
document.querySelector('#modal-multiplayer .modal-body').appendChild(divider);
document.querySelector('#modal-multiplayer .modal-body').appendChild(testBtn);

// Close modals
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.onclick = () => { playTap(); haptic('tap'); btn.closest('.modal').classList.add('hidden'); };
});

function updateUI() {
  const singleBtn = document.getElementById('btn-mode-single');
  const multiBtn = document.getElementById('btn-mode-multi');
  const status = document.getElementById('status');

  singleBtn.classList.toggle('active', mode === 'single');
  multiBtn.classList.toggle('active', mode !== 'single');

  if (mode === 'single') {
    status.innerHTML = `\u0425\u043e\u0434: <span id="turn-indicator" class="turn-${game.currentPlayer.toLowerCase()}">${game.currentPlayer}</span>`;
  } else if (mode === 'test') {
    status.innerHTML = `<span class="my-turn">\u{1f9ea} \u0422\u0435\u0441\u0442: ${game.currentPlayer}</span>`;
  } else {
    status.innerHTML = mySymbol === 'X'
      ? `<span class="my-turn">\u0422\u0432\u043e\u0439 \u0445\u043e\u0434 (X)</span>`
      : `<span class="opponent-turn">\u0425\u043e\u0434 \u0441\u043e\u043f\u0435\u0440\u043d\u0438\u043a\u0430...</span>`;
  }
}

function show(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hide(id) { document.getElementById(id)?.classList.add('hidden'); }

// Start the app
initApp();
