// Telegram Web App SDK wrapper

const tg = window.Telegram?.WebApp;

export function initTelegram() {
  if (!tg) {
    console.log('Telegram WebApp SDK not available — running in browser mode');
    return false;
  }

  tg.ready();
  tg.expand();

  // Apply Telegram theme colors as CSS custom properties
  applyTheme();

  // Prevent accidental close during game
  if (tg.enableClosingConfirmation) {
    tg.enableClosingConfirmation();
  }

  return true;
}

function applyTheme() {
  const root = document.documentElement;
  const tp = tg.themeParams;

  if (tp.bg_color) root.style.setProperty('--bg', tp.bg_color);
  if (tp.text_color) root.style.setProperty('--text', tp.text_color);
  if (tp.button_color) root.style.setProperty('--accent', tp.button_color);
  if (tp.button_text_color) root.style.setProperty('--btn-text', tp.button_text_color);
  if (tp.secondary_bg_color) root.style.setProperty('--bg-secondary', tp.secondary_bg_color);
  if (tp.hint_color) root.style.setProperty('--hint', tp.hint_color);
}

export function getUser() {
  return tg?.initDataUnsafe?.user || null;
}

export function getStartParam() {
  const param = tg?.initDataUnsafe?.start_param || tg?.initData?.start_param || null;
  console.log('Start param:', param);
  return param;
}

export function hapticTap() {
  tg?.HapticFeedback?.impactOccurred('light');
}

export function hapticPlace() {
  tg?.HapticFeedback?.impactOccurred('medium');
}

export function hapticWin() {
  tg?.HapticFeedback?.notificationOccurred('success');
}

export function hapticLose() {
  tg?.HapticFeedback?.notificationOccurred('error');
}

export function hapticInvalid() {
  tg?.HapticFeedback?.notificationOccurred('warning');
}

export function isTelegram() {
  return !!tg;
}
