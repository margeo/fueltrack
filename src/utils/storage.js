export function loadValue(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value !== null ? value : fallback;
  } catch {
    return fallback;
  }
}

export function saveValue(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function loadJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}