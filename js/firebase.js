import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getDatabase, ref, set, get, update, onValue, remove, push, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

let db = null;

export function initFirebase() {
  const config = {
    apiKey: window.FIREBASE_API_KEY || "",
    authDomain: window.FIREBASE_AUTH_DOMAIN || "",
    databaseURL: window.FIREBASE_DATABASE_URL || "",
    projectId: window.FIREBASE_PROJECT_ID || "",
    storageBucket: window.FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: window.FIREBASE_MESSAGING_SENDER_ID || "",
    appId: window.FIREBASE_APP_ID || ""
  };
  
  if (!config.databaseURL) {
    console.warn('Firebase: no databaseURL');
    return false;
  }
  
  try {
    const app = initializeApp(config);
    db = getDatabase(app);
    console.log('Firebase OK');
    return true;
  } catch (e) {
    console.error('Firebase error:', e);
    return false;
  }
}

export function isReady() { return !!db; }

// === ROOMS ===

export async function createRoom(hostId, hostName, customId = null) {
  const roomId = customId || push(ref(db, 'rooms')).key;
  const roomRef = ref(db, `rooms/${roomId}`);
  
  await set(roomRef, {
    host: { id: hostId, name: hostName, presence: 'online' },
    guest: null,
    status: 'waiting',
    game: { moves: [], currentPlayer: 'X', winner: null },
    createdAt: serverTimestamp()
  });
  
  // Auto-remove on disconnect
  onValue(ref(db, `rooms/${roomId}`), () => {}, { onlyOnce: true });
  
  return roomId;
}

export async function checkRoomExists(roomId) {
  const snap = await get(ref(db, `rooms/${roomId}`));
  return snap.exists();
}

export async function joinRoom(roomId, guestId, guestName) {
  const roomRef = ref(db, `rooms/${roomId}`);
  const snap = await get(roomRef);
  
  if (!snap.exists()) return { ok: false, error: 'not_found' };
  
  const room = snap.val();
  
  // Can join if: no guest OR guest is offline
  if (room.guest && room.guest.presence !== 'offline') {
    return { ok: false, error: 'full' };
  }
  
  // Can't join own room
  if (room.host && room.host.id === guestId) {
    return { ok: false, error: 'own_room' };
  }
  
  await update(roomRef, {
    guest: { id: guestId, name: guestName, presence: 'online' },
    status: 'playing'
  });
  
  return { ok: true };
}

export function listenRoom(roomId, callback) {
  return onValue(ref(db, `rooms/${roomId}`), snap => {
    callback(snap.exists() ? snap.val() : null);
  });
}

export function updateGame(roomId, game) {
  return set(ref(db, `rooms/${roomId}/game`), game);
}

export function leaveRoom(roomId) {
  return remove(ref(db, `rooms/${roomId}`));
}

export async function findOpenRoom() {
  const snap = await get(ref(db, 'rooms'));
  if (!snap.exists()) return null;
  
  const rooms = snap.val();
  for (const [id, room] of Object.entries(rooms)) {
    if (room.status === 'waiting' && !room.guest) return id;
  }
  return null;
}
