import { createGame, makeMove, resetGame, isValidMove } from './game.js';
import { initBoard, renderBoard, showWinOverlay, hideWinOverlay, animateScoreUpdate, showModeSelector } from './board.js';
import { initTelegram, hapticPlace, hapticWin, hapticLose, hapticInvalid, hapticTap, getUser } from './telegram.js';
import { getAiMove } from './ai.js';
import { 
  initMultiplayer, 
  createMultiplayerGame, 
  joinMultiplayerGame, 
  quickMatch,
  makeMove as multiplayerMove,
  restartMultiplayerGame,
  getMode, 
  isMyTurn,
  getMySymbol,
  cleanup,
  startTestMode,
  isInTestMode,
  MODE_SINGLE,
  MODE_MULTI,
  MODE_TEST
} from './multiplayer.js';

const AI_PLAYER = 'O';
const HUMAN_PLAYER = 'X';
const AI_DELAY = 400;

let game = createGame();
let aiThinking = false;
let currentMode = MODE_SINGLE;

function init() {
  initTelegram();
  initBoard(handleCellClick);
  initMultiplayer();
  
  document.getElementById('btn-restart').addEventListener('click', () => {
    hapticTap();
    restartGame();
  });
  
  document.getElementById('btn-mode-single').addEventListener('click', () => {
    hapticTap();
    setMode(MODE_SINGLE);
  });
  
  document.getElementById('btn-mode-multi').addEventListener('click', () => {
    hapticTap();
    showMultiplayerOptions();
  });
  
  document.getElementById('btn-create-room').addEventListener('click', () => {
    hapticTap();
    hideModal('modal-multiplayer');
    showCreateRoomInput();
  });
  
  document.getElementById('btn-create-confirm').addEventListener('click', async () => {
    hapticTap();
    const customId = document.getElementById('input-create-room-id').value.trim().toUpperCase();
    if (!customId) {
      alert('Введите код комнаты');
      return;
    }
    if (customId.length < 3) {
      alert('Код должен быть минимум 3 символа');
      return;
    }
    if (!/^[A-Z0-9]+$/.test(customId)) {
      alert('Только латинские буквы и цифры');
      return;
    }
    hideModal('modal-create-room');
    await handleCreateRoom(customId);
  });
  
  document.getElementById('btn-create-random').addEventListener('click', async () => {
    hapticTap();
    hideModal('modal-create-room');
    await handleCreateRoom(null);
  });
  
  document.getElementById('btn-quick-match').addEventListener('click', async () => {
    hapticTap();
    hideModal('modal-multiplayer');
    await handleQuickMatch();
  });
  
  document.getElementById('btn-join-room').addEventListener('click', () => {
    hapticTap();
    showJoinRoomInput();
  });
  
  document.getElementById('btn-test-mode').addEventListener('click', () => {
    hapticTap();
    hideModal('modal-multiplayer');
    handleTestMode();
  });
  
  document.getElementById('btn-join-confirm').addEventListener('click', async () => {
    hapticTap();
    const roomId = document.getElementById('input-room-id').value.trim();
    if (roomId) {
      hideModal('modal-join-room');
      await handleJoinRoom(roomId);
    }
  });
  
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      hapticTap();
      btn.closest('.modal').classList.add('hidden');
    });
  });
  
  // Auto uppercase for room code inputs
  document.getElementById('input-create-room-id').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
  });
  document.getElementById('input-room-id').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
  });
  
  // Enter key handlers
  document.getElementById('input-create-room-id').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('btn-create-confirm').click();
    }
  });
  document.getElementById('input-room-id').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('btn-join-confirm').click();
    }
  });
  
  renderBoard(game);
  updateModeUI();
}

function setMode(mode) {
  if (mode === MODE_MULTI) {
    showMultiplayerOptions();
    return;
  }
  
  currentMode = MODE_SINGLE;
  cleanup();
  game = createGame();
  renderBoard(game);
  updateModeUI();
}

function updateModeUI() {
  const singleBtn = document.getElementById('btn-mode-single');
  const multiBtn = document.getElementById('btn-mode-multi');
  const turnEl = document.getElementById('status');
  
  if (currentMode === MODE_SINGLE) {
    singleBtn.classList.add('active');
    multiBtn.classList.remove('active');
    turnEl.innerHTML = `Ход: <span id="turn-indicator" class="turn-${game.currentPlayer.toLowerCase()}">${game.currentPlayer}</span>`;
  } else if (currentMode === MODE_TEST) {
    singleBtn.classList.remove('active');
    multiBtn.classList.add('active');
    turnEl.innerHTML = `<span class="my-turn">🧪 Тест: ход ${game.currentPlayer}</span>`;
  } else {
    singleBtn.classList.remove('active');
    multiBtn.classList.add('active');
    
    const mySym = getMySymbol();
    const isMy = isMyTurn();
    turnEl.innerHTML = isMy 
      ? `<span class="my-turn">Твой ход (${mySym})</span>`
      : `<span class="opponent-turn">Ход соперника...</span>`;
  }
}

function handleTestMode() {
  startTestMode();
  currentMode = MODE_TEST;
  updateModeUI();
}

function showMultiplayerOptions() {
  document.getElementById('modal-multiplayer').classList.remove('hidden');
}

function showCreateRoomInput() {
  document.getElementById('modal-create-room').classList.remove('hidden');
  document.getElementById('input-create-room-id').focus();
}

function showJoinRoomInput() {
  hideModal('modal-multiplayer');
  document.getElementById('modal-join-room').classList.remove('hidden');
  document.getElementById('input-room-id').focus();
}

function hideModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

async function handleCreateRoom(customRoomId) {
  showLoading('Создание комнаты...');
  const result = await createMultiplayerGame(customRoomId);
  hideLoading();
  
  if (result && result.error === 'already_exists') {
    alert('Комната с таким кодом уже существует. Выбери другой код.');
    showCreateRoomInput();
    return;
  }
  
  if (result) {
    currentMode = MODE_MULTI;
    showRoomInfo(result);
    updateModeUI();
  } else {
    alert('Не удалось создать комнату');
  }
}

async function handleQuickMatch() {
  showLoading('Поиск соперника...');
  const foundRoomId = await quickMatch();
  hideLoading();
  
  if (foundRoomId) {
    currentMode = MODE_MULTI;
    updateModeUI();
  } else {
    alert('Не удалось найти игру. Попробуйте создать комнату.');
  }
}

async function handleJoinRoom(roomId) {
  showLoading('Подключение...');
  const joined = await joinMultiplayerGame(roomId);
  hideLoading();
  
  if (joined) {
    currentMode = MODE_MULTI;
    updateModeUI();
  }
}

function showRoomInfo(roomId) {
  document.getElementById('room-id-display').textContent = roomId;
  document.getElementById('modal-room-info').classList.remove('hidden');
  
  document.getElementById('btn-copy-room').onclick = () => {
    const botLink = `https://t.me/InfTicTacToeBot?startapp=game_${roomId}`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(botLink)}&text=${encodeURIComponent('Играй со мной в Infinite Tic-Tac-Toe!')}`;
    window.Telegram?.WebApp?.openTelegramLink(shareUrl);
    hapticTap();
  };
  
  document.getElementById('btn-close-room-info').onclick = () => {
    hideModal('modal-room-info');
    hapticTap();
  };
}

function showLoading(text) {
  document.getElementById('loading-text').textContent = text;
  document.getElementById('modal-loading').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('modal-loading').classList.add('hidden');
}

function handleCellClick(cellIndex) {
  if (currentMode === MODE_MULTI || currentMode === MODE_TEST) {
    handleMultiplayerClick(cellIndex);
    return;
  }
  
  handleSingleplayerClick(cellIndex);
}

function handleSingleplayerClick(cellIndex) {
  if (aiThinking) return;
  if (game.winner) return;
  if (game.currentPlayer !== HUMAN_PLAYER) return;
  
  if (!isValidMove(game.moves, game.currentPlayer, cellIndex)) {
    hapticInvalid();
    return;
  }
  
  game = makeMove(game, cellIndex);
  hapticPlace();
  renderBoard(game);
  
  if (game.winner) {
    handleWin(game.winner);
    return;
  }
  
  scheduleAiMove();
}

function handleMultiplayerClick(cellIndex) {
  if (!isMyTurn()) {
    hapticInvalid();
    return;
  }
  
  multiplayerMove(cellIndex);
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
  
  setTimeout(() => {
    showWinOverlay(winner);
  }, 500);
}

function restartGame() {
  if (currentMode === MODE_MULTI || currentMode === MODE_TEST) {
    restartMultiplayerGame();
    if (currentMode === MODE_TEST) {
      updateModeUI();
    }
  } else {
    game = resetGame(game);
    hideWinOverlay();
    renderBoard(game);
  }
}

init();
