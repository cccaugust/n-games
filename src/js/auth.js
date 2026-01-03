import { BASE_PATH, navigateTo } from './config.js';

export const FAMILY_AUTH_KEY = 'n-games-family-auth';
export const FAMILY_ID = 'nakao';
export const FAMILY_PIN = '0818';

export const PLAYER_KEY = 'n-games-player';

export const NEXT_PATH_KEY = 'n-games-next-path';

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
    rememberCurrentPathAsNext();
    localStorage.removeItem(FAMILY_AUTH_KEY);
    localStorage.removeItem(PLAYER_KEY);
    navigateTo('/pages/login/login.html');
}

export function switchPlayer() {
    rememberCurrentPathAsNext();
    localStorage.removeItem(PLAYER_KEY);
    navigateTo('/pages/select-player/select-player.html');
}

function stripBasePath(pathnameWithQueryHash) {
    if (!BASE_PATH) return pathnameWithQueryHash;
    if (pathnameWithQueryHash.startsWith(BASE_PATH)) {
        const stripped = pathnameWithQueryHash.slice(BASE_PATH.length);
        return stripped.startsWith('/') ? stripped : '/' + stripped;
    }
    return pathnameWithQueryHash;
}

export function setNextPath(nextPath) {
    if (!nextPath) return;
    sessionStorage.setItem(NEXT_PATH_KEY, String(nextPath));
}

export function consumeNextPath() {
    const next = sessionStorage.getItem(NEXT_PATH_KEY);
    if (next) sessionStorage.removeItem(NEXT_PATH_KEY);
    return next;
}

export function rememberCurrentPathAsNext() {
    const full = window.location.pathname + window.location.search + window.location.hash;
    const appPath = stripBasePath(full);
    const isLoginPage = appPath.includes('/pages/login/login.html');
    const isSelectPage = appPath.includes('/pages/select-player/select-player.html');
    if (isLoginPage || isSelectPage) return;
    setNextPath(appPath);
}

export function requireAuth() {
    const isLoginPage = window.location.pathname.includes('/login.html');
    const isSelectPage = window.location.pathname.includes('/select-player.html');

    if (!isFamilyLoggedIn()) {
        if (!isLoginPage) {
            rememberCurrentPathAsNext();
            navigateTo('/pages/login/login.html');
        }
    } else if (!getCurrentPlayer()) {
        if (!isLoginPage && !isSelectPage) {
            rememberCurrentPathAsNext();
            navigateTo('/pages/select-player/select-player.html');
        }
    }
}
