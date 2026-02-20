// Minimal app for debugging
import { createGame, makeMove, isValidMove } from './game.js';
import { getAiMove } from './ai.js';
import { init, haptic } from './telegram.js';

let game = createGame();
let aiThinking = false;

console.log('App starting...');

// Init board
document.querySelectorAll('.cell').forEach(cell => {
  cell.addEventListener('click', () => {
    const idx = parseInt(cell.dataset.cell);
    console.log('Cell clicked:', idx);
    handleClick(idx);
  });
});

console.log('Board initialized');

function handleClick(idx) {
  if (aiThinking) return;
  if (game.winner) return;
  if (game.currentPlayer !== 'X') return;
  if (!isValidMove(game.moves, 'X', idx)) return;
  
  console.log('Making move:', idx);
  game = makeMove(game, idx);
  render();
  
  if (game.winner) {
    setTimeout(() => alert(`${game.winner} победил!`), 300);
    return;
  }
  
  // AI move
  aiThinking = true;
  setTimeout(() => {
    const ai = getAiMove(game.moves, 'O');
    if (ai !== null) {
      game = makeMove(game, ai);
      render();
      if (game.winner) setTimeout(() => alert(`${game.winner} победил!`), 300);
    }
    aiThinking = false;
  }, 400);
}

function render() {
  const board = Array(9).fill(null);
  const xMoves = game.moves.filter(m => m.player === 'X').slice(-3);
  const oMoves = game.moves.filter(m => m.player === 'O').slice(-3);
  [...xMoves, ...oMoves].forEach(m => board[m.cell] = m.player);
  
  document.querySelectorAll('.cell').forEach((el, i) => {
    el.innerHTML = board[i] ? `<span class="piece piece-${board[i].toLowerCase()}">${board[i]}</span>` : '';
  });
  
  document.getElementById('score-x').textContent = game.scoreX;
  document.getElementById('score-o').textContent = game.scoreO;
}

// Restart button
document.getElementById('btn-restart')?.addEventListener('click', () => {
  game = createGame();
  render();
});

// Init
try {
  init();
  console.log('Telegram initialized');
} catch (e) {
  console.log('No Telegram:', e);
}

render();
console.log('App ready!');
