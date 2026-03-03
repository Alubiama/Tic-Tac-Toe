// Yandex Games SDK integration
// Docs: https://yandex.ru/dev/games/doc/

let ysdk = null;
let player = null;
let leaderboards = null;

// Initialize Yandex Games SDK
export async function initYandexSDK() {
  if (!window.YaGames) {
    console.warn('Yandex Games SDK not found');
    return false;
  }

  try {
    ysdk = await window.YaGames.init();
    console.log('Yandex Games SDK initialized');

    // Signal that the game has loaded
    ysdk.features.LoadingAPI?.ready();

    // Try to get player info
    try {
      player = await ysdk.getPlayer({ scopes: false });
    } catch (e) {
      console.warn('Player auth skipped:', e.message);
    }

    // Try to get leaderboards
    try {
      leaderboards = await ysdk.getLeaderboards();
    } catch (e) {
      console.warn('Leaderboards not available:', e.message);
    }

    return true;
  } catch (e) {
    console.error('Yandex SDK init error:', e);
    return false;
  }
}

export function isYandex() {
  return !!ysdk;
}

// === ADS / РЕКЛАМА ===

// Interstitial ad (between games)
export function showInterstitialAd() {
  if (!ysdk) return Promise.resolve();

  return new Promise((resolve) => {
    ysdk.adv.showFullscreenAdv({
      callbacks: {
        onClose(wasShown) {
          console.log('Interstitial closed, shown:', wasShown);
          resolve(wasShown);
        },
        onError(error) {
          console.warn('Interstitial error:', error);
          resolve(false);
        }
      }
    });
  });
}

// Rewarded video ad (for bonuses)
export function showRewardedAd() {
  if (!ysdk) return Promise.resolve(false);

  return new Promise((resolve) => {
    ysdk.adv.showRewardedVideo({
      callbacks: {
        onRewarded() {
          console.log('Reward earned');
          resolve(true);
        },
        onClose() {
          // If onRewarded wasn't called, resolve false
        },
        onError(error) {
          console.warn('Rewarded ad error:', error);
          resolve(false);
        }
      }
    });
  });
}

// === PLAYER / ИГРОК ===

export function getPlayerName() {
  if (!player) return null;
  try {
    return player.getName() || null;
  } catch {
    return null;
  }
}

export function getPlayerPhoto() {
  if (!player) return null;
  try {
    return player.getPhoto('medium') || null;
  } catch {
    return null;
  }
}

export function getPlayerUniqueID() {
  if (!player) return null;
  try {
    return player.getUniqueID() || null;
  } catch {
    return null;
  }
}

// === LEADERBOARDS / ТАБЛИЦА ЛИДЕРОВ ===

export async function setLeaderboardScore(leaderboardName, score) {
  if (!leaderboards) return;
  try {
    await leaderboards.setLeaderboardScore(leaderboardName, score);
  } catch (e) {
    console.warn('Set leaderboard score error:', e);
  }
}

export async function getLeaderboardEntries(leaderboardName, topCount = 10) {
  if (!leaderboards) return null;
  try {
    return await leaderboards.getLeaderboardEntries(leaderboardName, {
      quantityTop: topCount,
      includeUser: true
    });
  } catch (e) {
    console.warn('Get leaderboard error:', e);
    return null;
  }
}

// === GAME READY / PAUSE ===

// Call when game should pause (ad is showing)
let onPauseCallback = null;
let onResumeCallback = null;

export function setGameCallbacks(onPause, onResume) {
  onPauseCallback = onPause;
  onResumeCallback = onResume;
}

// === ENVIRONMENT ===

export function getEnvironment() {
  if (!ysdk) return null;
  return ysdk.environment;
}

export function getLanguage() {
  if (!ysdk) return 'ru';
  return ysdk.environment?.i18n?.lang || 'ru';
}
