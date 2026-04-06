const AUTH_KEY = 'cashflow_auth';
const CREDENTIALS_KEY = 'cashflow_credentials';

interface AuthState {
  isLoggedIn: boolean;
  username: string;
  loginTime: number;
}

interface Credentials {
  username: string;
  password: string;
}

const DEFAULT_CREDENTIALS: Credentials = {
  username: 'admin',
  password: 'cashflow123',
};

export function getCredentials(): Credentials {
  try {
    const stored = localStorage.getItem(CREDENTIALS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to load credentials:', e);
  }
  return { ...DEFAULT_CREDENTIALS };
}

export function setCredentials(username: string, password: string): void {
  try {
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify({ username, password }));
  } catch (e) {
    console.error('Failed to save credentials:', e);
  }
}

export function getAuthState(): AuthState {
  try {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to load auth state:', e);
  }
  return { isLoggedIn: false, username: '', loginTime: 0 };
}

export function setAuthState(state: AuthState): void {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save auth state:', e);
  }
}

export function login(username: string, password: string): boolean {
  const creds = getCredentials();
  if (username === creds.username && password === creds.password) {
    setAuthState({ isLoggedIn: true, username, loginTime: Date.now() });
    return true;
  }
  return false;
}

export function logout(): void {
  setAuthState({ isLoggedIn: false, username: '', loginTime: 0 });
}

export function isAuthenticated(): boolean {
  const state = getAuthState();
  return state.isLoggedIn;
}

export function changePassword(oldPassword: string, newUsername: string, newPassword: string): boolean {
  const creds = getCredentials();
  if (oldPassword !== creds.password) return false;
  setCredentials(newUsername, newPassword);
  setAuthState({ isLoggedIn: true, username: newUsername, loginTime: Date.now() });
  return true;
}
