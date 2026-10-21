let sentinel = null;
let wanted = false;
let onChange = () => {};

export const wakeLockSupported = 'wakeLock' in navigator;

async function acquire() {
  try {
    sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => {
      sentinel = null;
      onChange(isActive());
    });
  } catch {
    sentinel = null;
    wanted = false;
  }
  onChange(isActive());
}

export function isActive() {
  return !!sentinel;
}

export async function setWakeLock(enable, listener) {
  if (listener) onChange = listener;
  if (!wakeLockSupported) return;
  wanted = enable;
  if (enable && !sentinel) await acquire();
  if (!enable && sentinel) await sentinel.release();
}

export function releaseWakeLock() {
  wanted = false;
  if (sentinel) sentinel.release();
}

document.addEventListener('visibilitychange', () => {
  if (wanted && !sentinel && document.visibilityState === 'visible') acquire();
});
