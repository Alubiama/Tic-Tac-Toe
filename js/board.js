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

    cellEl.className = 'cell';
    cellEl.innerHTML = '';

    if (game.winner) {
      cellEl.classList.add('disabled');
    }

    if (piece) {
      const pieceEl = document.createElement('span');
      pieceEl.className = `piece piece-${piece.toLowerCase()}`;
      pieceEl.textContent = piece;

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

    if (threat && !piece && !game.winner) {
      cellEl.classList.add(`threat-${threat.player.toLowerCase()}`);
    }
  });

  const turnEl = document.getElementById('turn-indicator');
  if (turnEl) {
    turnEl.textContent = game.currentPlayer;
    turnEl.className = `turn-${game.currentPlayer.toLowerCase()}`;
  }

  const statusEl = document.getElementById('status');
  if (statusEl && !statusEl.querySelector('.my-turn') && !statusEl.querySelector('.opponent-turn')) {
    statusEl.innerHTML = `Ход: <span id="turn-indicator" class="turn-${game.currentPlayer.toLowerCase()}">${game.currentPlayer}</span>`;
  }

  document.getElementById('score-x').textContent = game.scoreX;
  document.getElementById('score-o').textContent = game.scoreO;

  document.getElementById('pieces-x').textContent = getActivePieceCount(game.moves, 'X');
  document.getElementById('pieces-o').textContent = getActivePieceCount(game.moves, 'O');
  
  updatePieceDots('x', getActivePieceCount(game.moves, 'X'));
  updatePieceDots('o', getActivePieceCount(game.moves, 'O'));

  game._rendered = true;
}

function updatePieceDots(player, count) {
  const dots = document.querySelectorAll(`.piece-count-${player} .piece-dot`);
  dots.forEach((dot, i) => {
    if (i < count) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

export function showWinOverlay(winner, customText) {
  const overlay = document.getElementById('win-overlay');
  const winText = document.getElementById('win-text');

  const text = customText || `${winner} победил!`;
  winText.textContent = text;
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
  void scoreEl.offsetWidth;
  scoreEl.classList.add('score-pop');
}

export function showModeSelector() {
  document.getElementById('mode-selector').classList.remove('hidden');
}

export function hideModeSelector() {
  document.getElementById('mode-selector').classList.add('hidden');
}

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
