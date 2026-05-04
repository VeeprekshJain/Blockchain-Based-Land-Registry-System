// Centralized auth token helpers
const TOKEN_KEY = 'accessToken';

function looksLikeJwt(token: string): boolean {
  if (!token) return false;
  const parts = token.split('.');
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

function containsInvalidFragments(token: string): boolean {
  if (!token) return false;
  const bad = ["localStorage.setItem", "<PASTE_TOKEN>", "location.reload", "Bearer ", ';', '\n', '\r'];
  return bad.some((frag) => token.includes(frag));
}

export function isValidJwtShape(token?: string | null): token is string {
  if (!token) return false;
  const t = String(token).trim();
  if (t === '') return false;
  if (containsInvalidFragments(t)) return false;
  return looksLikeJwt(t);
}

export function getAuthToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return undefined;
  const token = String(raw).trim();
  if (!isValidJwtShape(token)) {
    // cleanup invalid token
    localStorage.removeItem(TOKEN_KEY);
    console.warn('Invalid token stored. Please login again.');
    return undefined;
  }
  return token;
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token.trim());
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

export function maskTokenForLog(token?: string | null): string {
  if (!token) return '<none>';
  const t = String(token);
  if (t.length <= 20) return `${t.slice(0, 6)}...${t.slice(-4)}`;
  return `${t.slice(0, 12)}...${t.slice(-6)}`;
}

// On app startup (dev-safety): remove obviously bad placeholder tokens
if (typeof window !== 'undefined') {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (raw && !isValidJwtShape(raw)) {
    localStorage.removeItem(TOKEN_KEY);
    // show a developer-friendly message in console
    // eslint-disable-next-line no-console
    console.warn('Removed invalid accessToken from localStorage. Please login again.');
  }
}

export default {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  isValidJwtShape,
  maskTokenForLog,
};
