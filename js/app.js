import { createGame, makeMove, resetGame, isValidMove } from './game.js';
import { initBoard, renderBoard, showWinOverlay, hideWinOverlay, animateScoreUpdate } from './board.js';
import { init as initTg, getUser, haptic } from './telegram.js';
import { getAiMove } from './ai.js';

let game = createGame();
let aiThinking = false;
let mode = 'single'; // 'single', 'test', 'multi'

console.log('App starting...');

// Init board
initBoard(handleClick);
console.log('Board initialized');

function handleClick(idx) {
  if (mode === 'single') {
    vsBot(idx);
  } else if (mode === 'test') {
    testMove(idx);
  }
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

function showWin(w) {
  haptic(w === 'X' ? 'win' : 'lose');
  animateScoreUpdate(w);
  setTimeout(() => showWinOverlay(w), 400);
}

function restart() {
  game = resetGame(game);
  hideWinOverlay();
  renderBoard(game);
}

// === BUTTONS ===

document.getElementById('btn-restart').onclick = () => {
  haptic('tap');
  restart();
};

document.getElementById('btn-mode-single').onclick = () => {
  haptic('tap');
  mode = 'single';
  restart();
  updateUI();
};

document.getElementById('btn-mode-multi').onclick = () => {
  haptic('tap');
  show('modal-multiplayer');
};

// Multiplayer modal
document.getElementById('btn-quick-match').onclick = () => {
  haptic('tap');
  hide('modal-multiplayer');
  alert('Мультиплеер пока в разработке. Используй "Играть с собой"');
};

document.getElementById('btn-create-room').onclick = () => {
  haptic('tap');
  hide('modal-multiplayer');
  alert('Мультиплеер пока в разработке. Используй "Играть с собой"');
};

document.getElementById('btn-join-room').onclick = () => {
  haptic('tap');
  hide('modal-multiplayer');
  show('modal-join-room');
};

// Test mode button - add it
const testBtn = document.createElement('button');
testBtn.id = 'btn-test-mode';
testBtn.className = 'btn-secondary btn-block';
testBtn.textContent = '🧪 Играть с собой';
testBtn.style.opacity = '0.7';
testBtn.onclick = () => {
  haptic('tap');
  hide('modal-multiplayer');
  mode = 'test';
  restart();
  updateUI();
};

// Add test button to multiplayer modal
const modalBody = document.querySelector('#modal-multiplayer .modal-body');
if (modalBody) {
  const divider = document.createElement('div');
  divider.className = 'divider';
  divider.textContent = 'для теста';
  modalBody.appendChild(divider);
  modalBody.appendChild(testBtn);
}

// Join room
document.getElementById('btn-join-confirm').onclick = () => {
  const code = document.getElementById('input-room-id').value.trim();
  if (code) {
    hide('modal-join-room');
    alert('Комната ' + code + ' не найдена. Мультиплеер в разработке.');
  }
};

// Close modals
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.onclick = () => {
    haptic('tap');
    btn.closest('.modal').classList.add('hidden');
  };
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
  }
}

function show(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hide(id) { document.getElementById(id)?.classList.add('hidden'); }

// Init
try {
  initTg();
  console.log('Telegram OK');
} catch (e) {
  console.log('No Telegram');
}

renderBoard(game);
updateUI();
console.log('App ready!');
