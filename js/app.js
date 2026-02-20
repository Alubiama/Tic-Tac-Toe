import { createGame, makeMove, resetGame, isValidMove } from './game.js';
import { initBoard, renderBoard, showWinOverlay, hideWinOverlay, animateScoreUpdate } from './board.js';
import { init as initTg, getUser, haptic } from './telegram.js';
import { getAiMove } from './ai.js';
import { 
  init as initMp, create as createRoom, join as joinRoom, 
  startTest, move as mpMove, restart as mpRestart, cleanup,
  SINGLE, MULTI, TEST 
} from './multiplayer.js';

let game = createGame();
let mode = SINGLE;
let aiThinking = false;

function init() {
  initTg();
  initBoard(onClick);
  initMp();
  
  // Buttons
  on('btn-restart', restart);
  on('btn-mode-single', () => setMode(SINGLE));
  on('btn-mode-multi', () => show('modal-multiplayer'));
  on('btn-create-room', () => { hide('modal-multiplayer'); show('modal-create-room'); });
  on('btn-join-room', () => { hide('modal-multiplayer'); show('modal-join-room'); });
  on('btn-test-mode', () => { hide('modal-multiplayer'); startTest(); mode = TEST; updateUI(); });
  on('btn-quick-match', async () => { hide('modal-multiplayer'); await quickMatch(); });
  on('btn-create-confirm', createCustom);
  on('btn-create-random', async () => { hide('modal-create-room'); await createRoom(null); });
  on('btn-join-confirm', joinById);
  
  // Auto-uppercase
  q('#input-create-room-id').oninput = e => e.target.value = e.target.value.toUpperCase();
  q('#input-room-id').oninput = e => e.target.value = e.target.value.toUpperCase();
  
  // Enter keys
  q('#input-create-room-id').onkeypress = e => e.key === 'Enter' && createCustom();
  q('#input-room-id').onkeypress = e => e.key === 'Enter' && joinById();
  
  // Close modals
  all('.modal-close', btn => btn.onclick = () => btn.closest('.modal').classList.add('hidden'));
  
  renderBoard(game);
}

function onClick(cell) {
  if (mode === SINGLE) return vsBot(cell);
  if (mode === MULTI || mode === TEST) return mpMove(cell);
}

function vsBot(cell) {
  if (aiThinking || game.winner || game.currentPlayer !== 'X') return;
  if (!isValidMove(game.moves, 'X', cell)) return haptic('warn');
  
  game = makeMove(game, cell);
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

function showWin(w) {
  haptic(w === 'X' ? 'win' : 'lose');
  animateScoreUpdate(w);
  setTimeout(() => showWinOverlay(w), 400);
}

function restart() {
  if (mode === MULTI || mode === TEST) return mpRestart();
  game = resetGame(game);
  hideWinOverlay();
  renderBoard(game);
}

function setMode(m) {
  if (m === MULTI) return show('modal-multiplayer');
  mode = SINGLE;
  cleanup();
  game = createGame();
  renderBoard(game);
  updateUI();
}

async function createCustom() {
  const id = q('#input-create-room-id').value.trim().toUpperCase();
  if (id.length < 3) return alert('Минимум 3 символа');
  if (!/^[A-Z0-9]+$/.test(id)) return alert('Только буквы и цифры');
  hide('modal-create-room');
  const res = await createRoom(id);
  if (res?.error === 'exists') return alert('Код занят');
  if (res) { mode = MULTI; showRoom(res); updateUI(); }
}

async function joinById() {
  const id = q('#input-room-id').value.trim().toUpperCase();
  if (!id) return;
  hide('modal-join-room');
  const ok = await joinRoom(id);
  if (ok) { mode = MULTI; updateUI(); }
}

async function quickMatch() {
  const id = await createRoom(null);
  if (id) { mode = MULTI; showRoom(id); updateUI(); }
  else alert('Не удалось найти игру');
}

function showRoom(id) {
  q('#room-id-display').textContent = id;
  show('modal-room-info');
  on('btn-copy-room', () => {
    const link = `https://t.me/InfTicTacToeBot?startapp=game_${id}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Играй со мной!')}`;
    window.Telegram?.WebApp?.openTelegramLink(url);
    haptic('tap');
  });
  on('btn-close-room-info', () => hide('modal-room-info'));
}

function updateUI() {
  const single = q('#btn-mode-single');
  const multi = q('#btn-mode-multi');
  const status = q('#status');
  
  single.classList.toggle('active', mode === SINGLE);
  multi.classList.toggle('active', mode !== SINGLE);
  
  if (mode === SINGLE) {
    status.innerHTML = `Ход: <span class="turn-${game.currentPlayer.toLowerCase()}">${game.currentPlayer}</span>`;
  } else if (mode === TEST) {
    status.innerHTML = `<span class="my-turn">🧪 Тест: ${game.currentPlayer}</span>`;
  } else {
    const my = mode === MULTI;
    status.innerHTML = my 
      ? `<span class="my-turn">Твой ход</span>`
      : `<span class="opponent-turn">Ход соперника...</span>`;
  }
}

// Helpers
function q(sel) { return document.querySelector(sel); }
function all(sel, fn) { document.querySelectorAll(sel).forEach(fn); }
function on(id, fn) { const el = document.getElementById(id); if (el) el.onclick = fn; }
function show(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hide(id) { document.getElementById(id)?.classList.add('hidden'); }

init();
