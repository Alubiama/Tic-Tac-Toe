// Core game logic for Infinite Tic-Tac-Toe
// Rules: 3x3 grid, max 3 pieces per player, oldest disappears on 4th placement

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6]              // diagonals
];

export function createGame() {
  return {
    moves: [],
    currentPlayer: 'X',
    winner: null,
    winLine: null,
    scoreX: 0,
    scoreO: 0
  };
}

export function deriveBoard(moves) {
  const board = Array(9).fill(null);
  const fadingCells = [];

  const xMoves = moves.filter(m => m.player === 'X');
  const oMoves = moves.filter(m => m.player === 'O');

  const activeX = xMoves.slice(-3);
  const activeO = oMoves.slice(-3);

  // Mark fading cells (oldest piece when player has 3)
  if (xMoves.length >= 3) {
    fadingCells.push(activeX[0].cell);
  }
  if (oMoves.length >= 3) {
    fadingCells.push(activeO[0].cell);
  }

  [...activeX, ...activeO].forEach(m => {
    board[m.cell] = m.player;
  });

  return { board, fadingCells };
}

export function isValidMove(moves, player, cell) {
  const { board } = deriveBoard(moves);
  // Cell must be empty
  if (board[cell] !== null) return false;
  return true;
}

export function makeMove(game, cell) {
  if (game.winner) return game;
  if (!isValidMove(game.moves, game.currentPlayer, cell)) return game;

  const newMoves = [...game.moves, {
    player: game.currentPlayer,
    cell,
    turn: game.moves.length + 1
  }];

  const { board } = deriveBoard(newMoves);
  const winResult = checkWinner(board);

  const newGame = {
    ...game,
    moves: newMoves,
    currentPlayer: game.currentPlayer === 'X' ? 'O' : 'X',
    winner: winResult ? winResult.winner : null,
    winLine: winResult ? winResult.line : null
  };

  if (winResult) {
    if (winResult.winner === 'X') newGame.scoreX++;
    else newGame.scoreO++;
  }

  return newGame;
}

export function checkWinner(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  return null;
}

export function getPlayerMoveCount(moves, player) {
  return moves.filter(m => m.player === player).length;
}

export function getActivePieceCount(moves, player) {
  return Math.min(moves.filter(m => m.player === player).length, 3);
}

export function resetGame(game) {
  return {
    ...game,
    moves: [],
    currentPlayer: 'X',
    winner: null,
    winLine: null
  };
}

export { WIN_LINES };
