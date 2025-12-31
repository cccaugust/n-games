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

export function selectPlayer(name) {
    const player = { name, lastActive: new Date().toISOString() };
    localStorage.setItem(PLAYER_KEY, JSON.stringify(player));
}

export function logout() {
    localStorage.removeItem(FAMILY_AUTH_KEY);
    localStorage.removeItem(PLAYER_KEY);
    window.location.href = '/pages/login/login.html'; // Adjust path if needed
}

export function requireAuth() {
    const isLoginPage = window.location.pathname.includes('/login.html');
    const isSelectPage = window.location.pathname.includes('/select-player.html');

    if (!isFamilyLoggedIn()) {
        if (!isLoginPage) {
            // Go to login using relative path from root or current depth
            // Best to use absolute path from site root if possible, but for GH Pages relative is safer?
            // Vite handles absolute paths '/src/...' in dev, but in prod it depends on base.
            // Let's rely on standard navigation.
            redirectTo('/pages/login/login.html');
        }
    } else if (!getCurrentPlayer()) {
        if (!isLoginPage && !isSelectPage) {
            redirectTo('/pages/select-player/select-player.html');
        }
    }
}

function redirectTo(path) {
    // Handle deployment base path if necessary. For now assume root.
    // In Vite dev: /src/pages/...
    // In Build: /pages/... (if flat) or maintained structure.

    // A simple hack for now to support both standard vite dev /src/ structure and robust navigation.
    // We'll trust the caller passes a path relative to 'src' or root.

    // If we are in dev (localhost), we usually need '/pages/...' if we are already in src root context?
    // Let's use relative path finding or just hardcode for the MVP.

    const currentPath = window.location.pathname;

    // Check if we are already there to avoid loop
    if (currentPath.endsWith(path)) return;

    // For now, let's try to construct the path. 
    // If running via `vite` (dev), root is `src`. So `/pages/login/login.html` works if we use absolute path.

    // If we are at `.../n-games/src/index.html` and we want `.../n-games/src/pages/...`
    // An absolute path `/src/pages/...` works in Vite dev.
    // In production (GH Pages), base is `/n-games/`.

    const isDev = window.location.hostname === 'localhost';
    const repoName = '/n-games'; // Update this if repo name changes

    let target = path;
    if (!path.startsWith('/')) target = '/' + path;

    // In production, prepend repo name if not present
    if (!isDev && !target.startsWith(repoName)) {
        target = repoName + target;
    }

    // In Dev, Vite serves `src` as root if configured? 
    // We configured `root: 'src'`.
    // So `http://localhost:5173/index.html` is `src/index.html`.
    // `http://localhost:5173/pages/login/login.html` should be `src/pages/login/login.html`.
    // So the path `/pages/login/login.html` is correct for Dev if root is src.

    // But wait, my implementation plan had `src/pages/...`.
    // If root is 'src', then url is just `/pages/...`.

    if (isDev) {
        // Strip '/src' if present because root is src
        target = target.replace('/src', '');
    }

    window.location.href = target;
}
