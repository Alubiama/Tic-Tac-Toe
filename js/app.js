// Infinite Tic-Tac-Toe — Entry Point

import { createGame, makeMove, resetGame, isValidMove } from './game.js';
import { initBoard, renderBoard, showWinOverlay, hideWinOverlay, animateScoreUpdate } from './board.js';
import { initTelegram, hapticPlace, hapticWin, hapticLose, hapticInvalid, hapticTap } from './telegram.js';
import { getAiMove } from './ai.js';

const AI_PLAYER = 'O';
const HUMAN_PLAYER = 'X';
const AI_DELAY = 400; // ms — feels natural, not instant

let game = createGame();
let aiThinking = false;

function init() {
  initTelegram();
  initBoard(handleCellClick);

  // Restart button
  document.getElementById('btn-restart').addEventListener('click', () => {
    hapticTap();
    restartGame();
  });

  renderBoard(game);
}

function handleCellClick(cellIndex) {
  // Ignore clicks during AI turn or if game is over
  if (aiThinking) return;
  if (game.winner) return;
  if (game.currentPlayer !== HUMAN_PLAYER) return;

  // Validate move
  if (!isValidMove(game.moves, game.currentPlayer, cellIndex)) {
    hapticInvalid();
    return;
  }

  // Make human move
  game = makeMove(game, cellIndex);
  hapticPlace();
  renderBoard(game);

  if (game.winner) {
    handleWin(game.winner);
    return;
  }

  // AI's turn
  scheduleAiMove();
}

function scheduleAiMove() {
  aiThinking = true;

  setTimeout(() => {
    const aiCell = getAiMove(game.moves, AI_PLAYER);
    if (aiCell === null) {
      aiThinking = false;
      return;
    }

    game = makeMove(game, aiCell);
    hapticTap();
    renderBoard(game);

    aiThinking = false;

    if (game.winner) {
      handleWin(game.winner);
    }
  }, AI_DELAY);
}

function handleWin(winner) {
  if (winner === HUMAN_PLAYER) {
    hapticWin();
  } else {
    hapticLose();
  }

  animateScoreUpdate(winner);

  // Slight delay before showing overlay so player sees the winning board
  setTimeout(() => {
    showWinOverlay(winner);
  }, 500);
}

function restartGame() {
  game = resetGame(game);
  hideWinOverlay();
  renderBoard(game);
}

// Start the game
init();
