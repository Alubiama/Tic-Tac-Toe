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
  checkRoomExists
} from './firebase.js';
import { getUser, getStartParam, hapticPlace, hapticWin, hapticLose } from './telegram.js';
import { createGame, makeMove as baseMakeMove, resetGame, isValidMove } from './game.js';
import { renderBoard, showWinOverlay, hideWinOverlay, animateScoreUpdate } from './board.js';

const MODE_SINGLE = 'single';
const MODE_MULTI = 'multi';

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
  return game.currentPlayer === mySymbol;
}

export function getMySymbol() {
  return mySymbol;
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
    alert(result.error === 'room_not_found' 
      ? 'Комната не найдена' 
      : 'Комната уже занята');
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
    
    if (roomData.guest?.presence === 'offline' || roomData.host?.presence === 'offline') {
      if (currentMode === MODE_MULTI) {
        handleOpponentLeft();
        return;
      }
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

export function restartMultiplayerGame() {
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
  
  if (roomId) {
    leaveRoom(roomId);
    roomId = null;
  }
  
  currentMode = MODE_SINGLE;
  mySymbol = null;
  prevWinner = null;
}

async function autoJoinRoom(targetRoomId) {
  const joined = await joinMultiplayerGame(targetRoomId);
  if (!joined) {
    console.warn('Auto-join failed for room:', targetRoomId);
  }
}

export { MODE_SINGLE, MODE_MULTI };
