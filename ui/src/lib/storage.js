export function getStored(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setStored(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function removeStored(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function clearStored() {
  try {
    localStorage.clear();
  } catch {
    // ignore
  }
}
