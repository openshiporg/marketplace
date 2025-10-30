/**
 * Multi-store session token storage using localStorage
 * Keyed by store ID
 */

const SESSION_STORAGE_KEY = 'openfront_marketplace_sessions';

export interface SessionInfo {
  token: string;
  email?: string;
  userId?: string;
  activeCartId?: string;
  savedAt: number;
}

export interface MultiStoreSessionStorage {
  [storeId: string]: SessionInfo;
}

export function getAllSessions(): MultiStoreSessionStorage {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Error reading sessions from localStorage:', e);
    return {};
  }
}

export function getSessionToken(storeId: string | undefined | null): string | null {
  if (!storeId) return null;
  const sessions = getAllSessions();
  return sessions[storeId]?.token || null;
}

export function setSession(
  storeId: string,
  session: { token: string; email?: string; userId?: string; activeCartId?: string }
): void {
  if (typeof window === 'undefined') return;
  try {
    const sessions = getAllSessions();
    sessions[storeId] = { ...session, savedAt: Date.now() };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
    // Optional: notify listeners
    window.dispatchEvent(
      new CustomEvent('sessionUpdated', { detail: { storeId, ...sessions[storeId] } })
    );
  } catch (e) {
    console.error('Error saving session to localStorage:', e);
  }
}

export function removeSession(storeId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const sessions = getAllSessions();
    delete sessions[storeId];
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Error removing session from localStorage:', e);
  }
}

