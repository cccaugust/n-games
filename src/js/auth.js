import { navigateTo } from './config.js';

export const FAMILY_AUTH_KEY = 'n-games-family-auth';
export const FAMILY_ID = 'nakao';
export const FAMILY_PIN = '1234';

export const PLAYER_KEY = 'n-games-player';

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
    return json ? JSON.parse(json) : null;
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

export function switchPlayer() {
    localStorage.removeItem(PLAYER_KEY);
    navigateTo('/pages/select-player/select-player.html');
}

export function requireAuth() {
    const isLoginPage = window.location.pathname.includes('/login.html');
    const isSelectPage = window.location.pathname.includes('/select-player.html');

    if (!isFamilyLoggedIn()) {
        if (!isLoginPage) {
            navigateTo('/pages/login/login.html');
        }
    } else if (!getCurrentPlayer()) {
        if (!isLoginPage && !isSelectPage) {
            navigateTo('/pages/select-player/select-player.html');
        }
    }
}
