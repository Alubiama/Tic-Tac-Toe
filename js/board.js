// Board rendering and DOM interaction

import { deriveBoard, getActivePieceCount, WIN_LINES } from './game.js';

let onCellClick = null;

export function initBoard(clickHandler) {
  onCellClick = clickHandler;

  const cells = document.querySelectorAll('.cell');
  cells.forEach(cell => {
    cell.addEventListener('click', () => {
      const index = parseInt(cell.dataset.cell);
      if (onCellClick) onCellClick(index);
    });
  });
}

export function renderBoard(game) {
  const { board, fadingCells } = deriveBoard(game.moves);
  const cells = document.querySelectorAll('.cell');
  const threats = findThreats(board);

  cells.forEach((cellEl, i) => {
    const piece = board[i];
    const isFading = fadingCells.includes(i);
    const isWinCell = game.winLine && game.winLine.includes(i);
    const threat = threats.find(t => t.cell === i);

    // Clear classes
    cellEl.className = 'cell';
    cellEl.innerHTML = '';

    if (game.winner) {
      cellEl.classList.add('disabled');
    }

    if (piece) {
      const pieceEl = document.createElement('span');
      pieceEl.className = `piece piece-${piece.toLowerCase()}`;
      pieceEl.textContent = piece;

      // Check if this is a newly placed piece
      const lastMove = game.moves[game.moves.length - 1];
      if (lastMove && lastMove.cell === i && !game._rendered) {
        pieceEl.classList.add('appear');
      }

      cellEl.appendChild(pieceEl);

      if (isFading && !isWinCell) {
        cellEl.classList.add('fading');
      }
    }

    if (isWinCell) {
      cellEl.classList.add('win-cell');
    }

    // Show threat highlight (2 in a row — empty cell to complete)
    if (threat && !piece && !game.winner) {
      cellEl.classList.add(`threat-${threat.player.toLowerCase()}`);
    }
  });

  // Update turn indicator
  const turnEl = document.getElementById('turn-indicator');
  turnEl.textContent = game.currentPlayer;
  turnEl.className = `turn-${game.currentPlayer.toLowerCase()}`;

  // Update status text
  const statusEl = document.getElementById('status');
  if (game.winner) {
    statusEl.innerHTML = '';
  } else {
    statusEl.innerHTML = `Ход: <span id="turn-indicator" class="turn-${game.currentPlayer.toLowerCase()}">${game.currentPlayer}</span>`;
  }

  // Update scores
  document.getElementById('score-x').textContent = game.scoreX;
  document.getElementById('score-o').textContent = game.scoreO;

  // Update piece counts
  document.getElementById('pieces-x').textContent = getActivePieceCount(game.moves, 'X');
  document.getElementById('pieces-o').textContent = getActivePieceCount(game.moves, 'O');

  // Mark as rendered to prevent repeat animations
  game._rendered = true;
}

export function showWinOverlay(winner) {
  const overlay = document.getElementById('win-overlay');
  const winText = document.getElementById('win-text');

  winText.textContent = `${winner} победил!`;
  winText.className = `win-text winner-${winner.toLowerCase()} show`;

  overlay.classList.remove('hidden');
  overlay.classList.add('show');
}

export function hideWinOverlay() {
  const overlay = document.getElementById('win-overlay');
  overlay.classList.add('hidden');
  overlay.classList.remove('show');
}

export function animateScoreUpdate(player) {
  const scoreEl = document.getElementById(`score-${player.toLowerCase()}`);
  scoreEl.classList.remove('score-pop');
  // Force reflow to restart animation
  void scoreEl.offsetWidth;
  scoreEl.classList.add('score-pop');
}

// Find cells where a player has 2 in a row and could complete 3
function findThreats(board) {
  const threats = [];

  for (const [a, b, c] of WIN_LINES) {
    const cells = [board[a], board[b], board[c]];
    const indices = [a, b, c];

    const xCount = cells.filter(c => c === 'X').length;
    const oCount = cells.filter(c => c === 'O').length;
    const emptyCount = cells.filter(c => c === null).length;

    if (emptyCount === 1) {
      const emptyIdx = indices[cells.indexOf(null)];

      if (xCount === 2) {
        threats.push({ cell: emptyIdx, player: 'X' });
      } else if (oCount === 2) {
        threats.push({ cell: emptyIdx, player: 'O' });
      }
    }
  }

  return threats;
}
