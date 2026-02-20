// Telegram SDK wrapper
const tg = window.Telegram?.WebApp;

export function init() {
  if (!tg) return false;
  tg.ready();
  tg.expand();
  applyTheme();
  return true;
}

function applyTheme() {
  const r = document.documentElement;
  const t = tg.themeParams || {};
  if (t.bg_color) r.style.setProperty('--bg', t.bg_color);
  if (t.text_color) r.style.setProperty('--text', t.text_color);
  if (t.button_color) r.style.setProperty('--accent', t.button_color);
  if (t.button_text_color) r.style.setProperty('--btn-text', t.button_text_color);
  if (t.secondary_bg_color) r.style.setProperty('--bg-secondary', t.secondary_bg_color);
  if (t.hint_color) r.style.setProperty('--hint', t.hint_color);
}

export function getUser() { return tg?.initDataUnsafe?.user || null; }
export function getStartParam() { return tg?.initDataUnsafe?.start_param || null; }
export function isTg() { return !!tg; }

export function haptic(type) {
  const h = tg?.HapticFeedback;
  if (!h) return;
  if (type === 'tap' || type === 'light') h.impactOccurred('light');
  else if (type === 'place' || type === 'medium') h.impactOccurred('medium');
  else if (type === 'win') h.notificationOccurred('success');
  else if (type === 'lose') h.notificationOccurred('error');
  else if (type === 'warn') h.notificationOccurred('warning');
}
