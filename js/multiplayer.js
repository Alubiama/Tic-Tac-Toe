import { 
  createRoom, 
  joinRoom, 
  listenToRoom, 
  updateGame, 
  leaveRoom,
  findOpenRoom,
  listenToOpenRooms,
  isFirebaseReady,
  initFirebase,
  checkRoomExists,
  setTestMode,
  isInTestMode
} from './firebase.js';
import { getUser, getStartParam, hapticPlace, hapticWin, hapticLose } from './telegram.js';
import { createGame, makeMove as baseMakeMove, resetGame, isValidMove } from './game.js';
import { renderBoard, showWinOverlay, hideWinOverlay, animateScoreUpdate } from './board.js';

const MODE_SINGLE = 'single';
const MODE_MULTI = 'multi';
const MODE_TEST = 'test';

let currentMode = MODE_SINGLE;
let roomId = null;
let playerId = null;
let playerName = null;
let mySymbol = null;
let game = createGame();
let unsubscribeRoom = null;
let onModeChange = null;

export function initMultiplayer() {
  if (!initFirebase()) {
    console.warn('Firebase init failed, singleplayer only');
    return false;
  }
  
  const user = getUser();
  if (user) {
    playerId = user.id.toString();
    playerName = user.first_name;
  } else {
    playerId = 'guest_' + Math.random().toString(36).substr(2, 9);
    playerName = 'Guest';
  }
  
  const startParam = getStartParam();
  if (startParam && startParam.startsWith('game_')) {
    const inviteRoomId = startParam.replace('game_', '');
    autoJoinRoom(inviteRoomId);
  }
  
  return true;
}

export function setOnModeChange(callback) {
  onModeChange = callback;
}

export function getMode() {
  return currentMode;
}

export function getRoomId() {
  return roomId;
}

export function isMyTurn() {
  if (currentMode === MODE_SINGLE) return game.currentPlayer === 'X';
  if (currentMode === MODE_TEST) return true; // Always your turn in test mode
  return game.currentPlayer === mySymbol;
}

export function getMySymbol() {
  if (currentMode === MODE_TEST) return game.currentPlayer; // Current player in test
  return mySymbol;
}

export function isInTestMode() {
  return currentMode === MODE_TEST;
}

export async function createMultiplayerGame(customRoomId = null) {
  if (!isFirebaseReady()) {
    alert('Мультиплеер недоступен. Проверьте конфигурацию Firebase.');
    return null;
  }
  
  let roomId = customRoomId;
  
  if (customRoomId) {
    const exists = await checkRoomExists(customRoomId);
    if (exists) {
      return { error: 'already_exists' };
    }
  }
  
  roomId = await createRoom(playerId, playerName, customRoomId);
  mySymbol = 'X';
  currentMode = MODE_MULTI;
  game = createGame();
  
  listenToRoomChanges();
  
  if (onModeChange) onModeChange(currentMode, roomId);
  
  return roomId;
}

export async function joinMultiplayerGame(targetRoomId) {
  if (!isFirebaseReady()) {
    alert('Мультиплеер недоступен. Проверьте конфигурацию Firebase.');
    return false;
  }
  
  const result = await joinRoom(targetRoomId, playerId, playerName);
  
  if (!result.success) {
    if (result.error === 'room_not_found') {
      alert('❌ Комната не найдена. Проверьте код.');
    } else if (result.error === 'own_room') {
      alert('ℹ️ Это твоя комната! Поделись кодом с другом.');
    } else {
      alert('❌ Комната занята. Попробуйте другую.');
    }
    return false;
  }
  
  roomId = targetRoomId;
  mySymbol = 'O';
  currentMode = MODE_MULTI;
  game = createGame();
  
  listenToRoomChanges();
  
  if (onModeChange) onModeChange(currentMode, roomId);
  
  return true;
}

export async function quickMatch() {
  if (!isFirebaseReady()) return null;
  
  const openRoomId = await findOpenRoom();
  
  if (openRoomId) {
    const joined = await joinMultiplayerGame(openRoomId);
    return joined ? openRoomId : null;
  }
  
  return await createMultiplayerGame();
}

function listenToRoomChanges() {
  if (unsubscribeRoom) unsubscribeRoom();
  
  unsubscribeRoom = listenToRoom(roomId, roomData => {
    if (!roomData) {
      handleOpponentLeft();
      return;
    }
    
    console.log('Room update:', roomData);
    
    // Check if opponent left (not us)
    if (mySymbol === 'X' && roomData.guest?.presence === 'offline') {
      // We are host, guest left
      handleOpponentLeft();
      return;
    }
    if (mySymbol === 'O' && roomData.host?.presence === 'offline') {
      // We are guest, host left
      handleOpponentLeft();
      return;
    }
    
    if (roomData.game) {
      const wasMyTurn = game.currentPlayer === mySymbol;
      const prevMovesCount = game.moves.length;
      
      game = {
        ...game,
        moves: roomData.game.moves || [],
        currentPlayer: roomData.game.currentPlayer || 'X',
        winner: roomData.game.winner,
        winLine: roomData.game.winLine
      };
      
      const newMovesCount = game.moves.length;
      if (newMovesCount > prevMovesCount && !wasMyTurn) {
        hapticPlace();
      }
      
      renderBoard(game);
      
      if (game.winner && game.winner !== prevWinner) {
        handleMultiplayerWin(game.winner);
      }
    }
  });
}

let prevWinner = null;

function handleMultiplayerWin(winner) {
  if (winner === mySymbol) {
    hapticWin();
  } else {
    hapticLose();
  }
  
  animateScoreUpdate(winner);
  
  setTimeout(() => {
    const winText = winner === mySymbol ? 'Ты победил!' : 'Ты проиграл...';
    showWinOverlay(winner, winText);
  }, 500);
  
  prevWinner = winner;
}

function handleOpponentLeft() {
  if (currentMode !== MODE_MULTI) return;
  
  cleanup();
  
  if (onModeChange) onModeChange(MODE_SINGLE, null);
  
  alert('Соперник покинул игру');
}

export function makeMove(cellIndex) {
  if (currentMode === MODE_SINGLE) {
    return false;
  }
  
  if (currentMode === MODE_TEST) {
    return makeTestMove(cellIndex);
  }
  
  if (!isMyTurn()) return false;
  if (game.winner) return false;
  if (!isValidMove(game.moves, game.currentPlayer, cellIndex)) return false;
  
  game = baseMakeMove(game, cellIndex);
  
  updateGame(roomId, {
    moves: game.moves,
    currentPlayer: game.currentPlayer,
    winner: game.winner,
    winLine: game.winLine
  });
  
  hapticPlace();
  renderBoard(game);
  
  if (game.winner) {
    handleMultiplayerWin(game.winner);
  }
  
  return true;
}

// Test mode - play both sides locally
function makeTestMove(cellIndex) {
  if (game.winner) return false;
  if (!isValidMove(game.moves, game.currentPlayer, cellIndex)) return false;
  
  game = baseMakeMove(game, cellIndex);
  hapticPlace();
  renderBoard(game);
  
  if (game.winner) {
    handleTestWin(game.winner);
  }
  
  return true;
}

function handleTestWin(winner) {
  hapticWin();
  animateScoreUpdate(winner);
  
  setTimeout(() => {
    showWinOverlay(winner, `${winner} победил!`);
  }, 500);
  
  prevWinner = winner;
}

export function restartTestGame() {
  if (currentMode !== MODE_TEST) return;
  
  game = resetGame(game);
  hideWinOverlay();
  renderBoard(game);
}

export function startTestMode() {
  currentMode = MODE_TEST;
  mySymbol = null;
  game = createGame();
  renderBoard(game);
  
  if (onModeChange) onModeChange(currentMode, null);
  
  return true;
}

export function restartMultiplayerGame() {
  if (currentMode === MODE_TEST) {
    restartTestGame();
    return;
  }
  
  if (currentMode !== MODE_MULTI) return;
  
  game = resetGame(game);
  hideWinOverlay();
  
  updateGame(roomId, {
    moves: [],
    currentPlayer: 'X',
    winner: null,
    winLine: null
  });
  
  renderBoard(game);
}

export function cleanup() {
  if (unsubscribeRoom) {
    unsubscribeRoom();
    unsubscribeRoom = null;
  }
  
  if (roomId && currentMode !== MODE_TEST) {
    leaveRoom(roomId);
    roomId = null;
  }
  
  currentMode = MODE_SINGLE;
  mySymbol = null;
  prevWinner = null;
}

// ... rest of file

export { MODE_SINGLE, MODE_MULTI, MODE_TEST };
