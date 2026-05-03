import { navigateTo } from './config.js';

export const FAMILY_AUTH_KEY = 'n-games-family-auth';
export const FAMILY_ID = 'nakao';
export const FAMILY_PIN = '0818';

export const PLAYER_KEY = 'n-games-player';

const DEFAULT_PLAYER = Object.freeze({
    id: 'guest',
    name: 'プレイヤー',
    avatar: '🎮'
});

export function isFamilyLoggedIn() {
    return localStorage.getItem(FAMILY_AUTH_KEY) === 'true';
}

export function loginFamily(id, pin) {
    if (id === FAMILY_ID && pin === FAMILY_PIN) {
        localStorage.setItem(FAMILY_AUTH_KEY, 'true');
        return true;
    }
    return false;
}

export function getCurrentPlayer() {
    const json = localStorage.getItem(PLAYER_KEY);
    if (json) {
        try {
            return JSON.parse(json);
        } catch {
            // fall through to default
        }
    }
    return { ...DEFAULT_PLAYER };
}

export function selectPlayer(player) {
    const session = { ...player, lastActive: new Date().toISOString() };
    localStorage.setItem(PLAYER_KEY, JSON.stringify(session));
}

export function logout() {
    localStorage.removeItem(FAMILY_AUTH_KEY);
    localStorage.removeItem(PLAYER_KEY);
    navigateTo('/pages/login/login.html');
}

export function requireAuth() {
    const isLoginPage = window.location.pathname.includes('/login.html');
    if (!isFamilyLoggedIn() && !isLoginPage) {
        navigateTo('/pages/login/login.html');
    }
}
