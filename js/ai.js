// AI opponent for Infinite Tic-Tac-Toe
// Strategy priority: win > block > center > strategic position

import { deriveBoard, checkWinner, WIN_LINES } from './game.js';

export function getAiMove(moves, aiPlayer) {
  const opponent = aiPlayer === 'X' ? 'O' : 'X';
  const { board } = deriveBoard(moves);

  // Get empty cells
  const emptyCells = [];
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) emptyCells.push(i);
  }

  if (emptyCells.length === 0) return null;

  // 1. Win if possible
  const winMove = findWinningMove(board, aiPlayer, emptyCells);
  if (winMove !== null) return winMove;

  // 2. Block opponent's win
  const blockMove = findWinningMove(board, opponent, emptyCells);
  if (blockMove !== null) return blockMove;

  // 3. Look ahead: consider what happens AFTER our piece disappears
  const smartMove = findSmartMove(moves, aiPlayer, emptyCells);
  if (smartMove !== null) return smartMove;

  // 4. Take center if available
  if (emptyCells.includes(4)) return 4;

  // 5. Take corners
  const corners = [0, 2, 6, 8].filter(c => emptyCells.includes(c));
  if (corners.length > 0) {
    return corners[Math.floor(Math.random() * corners.length)];
  }

  // 6. Take any edge
  const edges = [1, 3, 5, 7].filter(c => emptyCells.includes(c));
  if (edges.length > 0) {
    return edges[Math.floor(Math.random() * edges.length)];
  }

  return emptyCells[0];
}

function findWinningMove(board, player, emptyCells) {
  for (const cell of emptyCells) {
    const testBoard = [...board];
    testBoard[cell] = player;
    if (checkWinner(testBoard)) return cell;
  }
  return null;
}

// Consider the "disappearing piece" mechanic for smarter play
function findSmartMove(moves, aiPlayer, emptyCells) {
  const aiMoves = moves.filter(m => m.player === aiPlayer);

  // If AI has < 3 pieces, no piece will disappear — use positional heuristic
  if (aiMoves.length < 3) return null;

  // AI has 3 pieces — placing will remove the oldest one
  // Simulate each possible move and evaluate the resulting board
  let bestScore = -Infinity;
  let bestMove = null;

  for (const cell of emptyCells) {
    const score = evaluateMove(moves, aiPlayer, cell);
    if (score > bestScore) {
      bestScore = score;
      bestMove = cell;
    }
  }

  return bestScore > 0 ? bestMove : null;
}

function evaluateMove(moves, player, cell) {
  const opponent = player === 'X' ? 'O' : 'X';

  // Simulate the move
  const newMoves = [...moves, { player, cell, turn: moves.length + 1 }];
  const { board } = deriveBoard(newMoves);

  let score = 0;

  // Check if this creates a win
  if (checkWinner(board)) return 100;

  // Count threats (2 in a row with empty third cell)
  for (const [a, b, c] of WIN_LINES) {
    const cells = [board[a], board[b], board[c]];

    const playerCount = cells.filter(c => c === player).length;
    const emptyCount = cells.filter(c => c === null).length;
    const opponentCount = cells.filter(c => c === opponent).length;

    // Our threats
    if (playerCount === 2 && emptyCount === 1) score += 10;
    if (playerCount === 1 && emptyCount === 2) score += 1;

    // Opponent threats (bad for us)
    if (opponentCount === 2 && emptyCount === 1) score -= 8;
  }

  // Center control bonus
  if (board[4] === player) score += 3;

  return score;
}
