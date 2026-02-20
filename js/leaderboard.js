import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  update,
  onValue,
  query,
  orderByChild,
  limitToLast,
  push
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getUser } from './telegram.js';

let database = null;
let playerId = null;
let playerName = null;

export function initLeaderboard(db) {
  database = db;
  
  const user = getUser();
  if (user) {
    playerId = user.id.toString();
    playerName = user.first_name;
  } else {
    playerId = 'guest_' + Math.random().toString(36).substr(2, 9);
    playerName = 'Guest';
  }
}

export function getPlayerId() {
  return playerId;
}

export function getPlayerName() {
  return playerName;
}

export async function recordGameResult(won, opponentRating = 1000) {
  if (!database || !playerId) return;
  
  const statsRef = ref(database, `players/${playerId}`);
  
  const snapshot = await get(statsRef);
  let stats = snapshot.exists() ? snapshot.val() : {
    name: playerName,
    wins: 0,
    losses: 0,
    rating: 1000,
    streak: 0,
    maxStreak: 0
  };
  
  if (won) {
    stats.wins++;
    stats.streak++;
    if (stats.streak > stats.maxStreak) {
      stats.maxStreak = stats.streak;
    }
    // ELO-like rating gain
    const ratingGain = Math.max(10, Math.min(30, Math.floor((opponentRating - stats.rating) / 10) + 15));
    stats.rating += ratingGain;
  } else {
    stats.losses++;
    stats.streak = 0;
    // ELO-like rating loss
    const ratingLoss = Math.max(5, Math.min(25, Math.floor((stats.rating - opponentRating) / 10) + 10));
    stats.rating = Math.max(0, stats.rating - ratingLoss);
  }
  
  stats.name = playerName;
  stats.updatedAt = Date.now();
  
  await set(statsRef, stats);
  
  return stats;
}

export async function getPlayerStats() {
  if (!database || !playerId) return null;
  
  const statsRef = ref(database, `players/${playerId}`);
  const snapshot = await get(statsRef);
  
  if (!snapshot.exists()) {
    return {
      name: playerName,
      wins: 0,
      losses: 0,
      rating: 1000,
      streak: 0,
      maxStreak: 0
    };
  }
  
  return snapshot.val();
}

export async function getLeaderboard(limit = 50) {
  if (!database) return [];
  
  const playersRef = ref(database, 'players');
  const leaderboardQuery = query(playersRef, orderByChild('rating'));
  
  const snapshot = await get(leaderboardQuery);
  
  if (!snapshot.exists()) return [];
  
  const players = [];
  snapshot.forEach(child => {
    players.push({
      id: child.key,
      ...child.val()
    });
  });
  
  // Sort by rating descending
  players.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  
  return players.slice(0, limit);
}

export function subscribeToLeaderboard(callback, limit = 20) {
  if (!database) return () => {};
  
  const playersRef = ref(database, 'players');
  
  const unsubscribe = onValue(playersRef, snapshot => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const players = [];
    snapshot.forEach(child => {
      players.push({
        id: child.key,
        ...child.val()
      });
    });
    
    players.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    callback(players.slice(0, limit));
  });
  
  return unsubscribe;
}

export function getRank(players, playerId) {
  const index = players.findIndex(p => p.id === playerId);
  return index >= 0 ? index + 1 : '-';
}

export function getRatingTitle(rating) {
  if (rating >= 2000) return '🏆 Гроссмейстер';
  if (rating >= 1600) return '⭐ Мастер';
  if (rating >= 1300) return '🔥 Эксперт';
  if (rating >= 1100) return '💪 Опытный';
  if (rating >= 900) return '🎯 Любитель';
  return '🌱 Новичок';
}
