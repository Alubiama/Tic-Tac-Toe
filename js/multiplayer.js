import { initFirebase, isReady, createRoom, joinRoom, listenRoom, updateGame, leaveRoom, findOpenRoom, checkRoomExists } from './firebase.js';
import { getUser, getStartParam, haptic } from './telegram.js';
import { createGame, makeMove, resetGame, isValidMove } from './game.js';
import { render, showWin, hideWin, pulseScore } from './board.js';

export const SINGLE = 'single';
export const MULTI = 'multi';
export const TEST = 'test';

let mode = SINGLE;
let roomId = null;
let myId = null;
let myName = null;
let mySymbol = null;
let game = createGame();
let unsub = null;

export function init() {
  initFirebase();
  
  const user = getUser();
  myId = user?.id?.toString() || 'guest_' + Math.random().toString(36).slice(2, 8);
  myName = user?.first_name || 'Guest';
  
  // Auto-join from invite link
  const param = getStartParam();
  if (param?.startsWith('game_')) {
    join(param.slice(5));
  }
}

export function getMode() { return mode; }
export function getRoomId() { return roomId; }
export function isMyTurn() { 
  return mode === TEST ? true : game.currentPlayer === mySymbol; 
}
export function getMySymbol() { return mySymbol; }

// === CREATE ROOM ===

export async function create(customId = null) {
  if (!isReady()) return null;
  
  if (customId && await checkRoomExists(customId)) {
    return { error: 'exists' };
  }
  
  roomId = await createRoom(myId, myName, customId);
  mySymbol = 'X';
  mode = MULTI;
  game = createGame();
  listen();
  return roomId;
}

// === JOIN ROOM ===

export async function join(id) {
  if (!isReady()) return false;
  
  const res = await joinRoom(id, myId, myName);
  
  if (!res.ok) {
    const msgs = {
      'not_found': 'Комната не найдена',
      'full': 'Комната занята',
      'own_room': 'Это твоя комната'
    };
    alert(msgs[res.error] || 'Ошибка');
    return false;
  }
  
  roomId = id;
  mySymbol = 'O';
  mode = MULTI;
  game = createGame();
  listen();
  return true;
}

// === TEST MODE ===

export function startTest() {
  mode = TEST;
  mySymbol = null;
  game = createGame();
  render(game);
}

// === GAME LOGIC ===

function listen() {
  if (unsub) unsub();
  unsub = listenRoom(roomId, data => {
    if (!data) {
      alert('Соперник вышел');
      cleanup();
      return;
    }
    
    if (data.game) {
      const wasMyTurn = game.currentPlayer === mySymbol;
      game = { ...game, ...data.game };
      if (data.game.moves?.length > (game.moves?.length || 0) && !wasMyTurn) {
        haptic('medium');
      }
      render(game);
      if (data.game.winner) handleWin(data.game.winner);
    }
  });
}

export function move(cell) {
  if (mode === SINGLE) return false;
  if (!isMyTurn() || game.winner) return false;
  if (!isValidMove(game.moves, game.currentPlayer, cell)) return false;
  
  game = makeMove(game, cell);
  
  if (mode === TEST) {
    haptic('medium');
    render(game);
    if (game.winner) handleWin(game.winner);
    return true;
  }
  
  updateGame(roomId, {
    moves: game.moves,
    currentPlayer: game.currentPlayer,
    winner: game.winner,
    winLine: game.winLine
  });
  
  haptic('medium');
  render(game);
  if (game.winner) handleWin(game.winner);
  return true;
}

function handleWin(winner) {
  haptic(winner === mySymbol ? 'win' : 'lose');
  pulseScore(winner);
  setTimeout(() => {
    const text = mode === TEST ? `${winner} победил!` 
      : winner === mySymbol ? 'Ты победил!' : 'Ты проиграл...';
    showWin(winner, text);
  }, 400);
}

export function restart() {
  game = resetGame(game);
  hideWin();
  render(game);
  
  if (mode === MULTI) {
    updateGame(roomId, { moves: [], currentPlayer: 'X', winner: null, winLine: null });
  }
}

export function cleanup() {
  if (unsub) { unsub(); unsub = null; }
  if (roomId && mode !== TEST) { leaveRoom(roomId); roomId = null; }
  mode = SINGLE;
  mySymbol = null;
}

export async function quickMatch() {
  if (!isReady()) return null;
  const openId = await findOpenRoom();
  if (openId) return join(openId) ? openId : null;
  return create();
}
