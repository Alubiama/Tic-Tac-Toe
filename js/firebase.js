import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getDatabase, 
  ref, 
  set, 
  push, 
  onValue, 
  onDisconnect, 
  remove, 
  serverTimestamp,
  get,
  update
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

let database = null;
let app = null;

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
  
  console.log('Firebase config:', config.databaseURL ? 'OK' : 'MISSING');
  
  if (!config.databaseURL) {
    console.warn('Firebase not configured. Multiplayer disabled.');
    return false;
  }
  
  try {
    app = initializeApp(config);
    database = getDatabase(app);
    console.log('Firebase initialized successfully');
    return true;
  } catch (error) {
    console.error('Firebase init error:', error);
    return false;
  }
}

export function isFirebaseReady() {
  return database !== null;
}

export function createRoom(hostId, hostName, customRoomId = null) {
  const roomsRef = ref(database, 'rooms');
  
  let roomId = customRoomId;
  let newRoomRef;
  
  if (customRoomId) {
    newRoomRef = ref(database, `rooms/${customRoomId}`);
  } else {
    newRoomRef = push(roomsRef);
    roomId = newRoomRef.key;
  }
  
  const roomData = {
    host: { id: hostId, name: hostName },
    guest: null,
    status: 'waiting',
    createdAt: serverTimestamp(),
    game: {
      moves: [],
      currentPlayer: 'X',
      winner: null,
      winLine: null
    }
  };
  
  return set(newRoomRef, roomData).then(() => {
    const presenceRef = ref(database, `rooms/${roomId}/host/presence`);
    set(presenceRef, 'online');
    onDisconnect(presenceRef).set('offline');
    onDisconnect(ref(database, `rooms/${roomId}`)).remove();
    
    return roomId;
  });
}

export function checkRoomExists(roomId) {
  const roomRef = ref(database, `rooms/${roomId}`);
  return get(roomRef).then(snapshot => snapshot.exists());
}

export function joinRoom(roomId, guestId, guestName) {
  const roomRef = ref(database, `rooms/${roomId}`);
  
  return get(roomRef).then(snapshot => {
    if (!snapshot.exists()) {
      return { success: false, error: 'room_not_found' };
    }
    
    const room = snapshot.val();
    if (room.guest) {
      return { success: false, error: 'room_full' };
    }
    
    update(roomRef, {
      guest: { id: guestId, name: guestName, presence: 'online' },
      status: 'playing'
    });
    
    const presenceRef = ref(database, `rooms/${roomId}/guest/presence`);
    set(presenceRef, 'online');
    onDisconnect(presenceRef).set('offline');
    
    return { success: true };
  });
}

export function listenToRoom(roomId, callback) {
  const roomRef = ref(database, `rooms/${roomId}`);
  
  const unsubscribe = onValue(roomRef, snapshot => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback(snapshot.val());
  });
  
  return unsubscribe;
}

export function updateGame(roomId, gameState) {
  const gameRef = ref(database, `rooms/${roomId}/game`);
  return set(gameRef, {
    moves: gameState.moves,
    currentPlayer: gameState.currentPlayer,
    winner: gameState.winner,
    winLine: gameState.winLine
  });
}

export function leaveRoom(roomId) {
  if (!roomId || !database) return;
  const roomRef = ref(database, `rooms/${roomId}`);
  remove(roomRef);
}

export function findOpenRoom() {
  const roomsRef = ref(database, 'rooms');
  
  return get(roomsRef).then(snapshot => {
    if (!snapshot.exists()) return null;
    
    const rooms = snapshot.val();
    for (const [roomId, room] of Object.entries(rooms)) {
      if (room.status === 'waiting' && !room.guest) {
        return roomId;
      }
    }
    return null;
  });
}

export function listenToOpenRooms(callback) {
  const roomsRef = ref(database, 'rooms');
  
  return onValue(roomsRef, snapshot => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const rooms = snapshot.val();
    const openRooms = [];
    
    for (const [roomId, room] of Object.entries(rooms)) {
      if (room.status === 'waiting' && !room.guest) {
        openRooms.push({
          id: roomId,
          hostName: room.host?.name || 'Player',
          createdAt: room.createdAt
        });
      }
    }
    
    callback(openRooms);
  });
}
