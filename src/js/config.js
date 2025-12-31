/**
 * Config for the application
 * Handles the base path difference between local dev and GitHub Pages production
 */

// Detect if we are on GitHub Pages (or any sub-path deployment)
// If hostname contains 'github.io', we assume our base is '/n-games'
export const IS_PROD = window.location.hostname.includes('github.io');
export const REPO_NAME = '/n-games'; // Ensure this matches your repo name
export const BASE_PATH = IS_PROD ? REPO_NAME : '';

/**
 * Resolves a path to the correct absolute path for the environment
 * @param {string} path - Path starting with /
 * @returns {string} - Correct absolute path
 */
export function resolvePath(path) {
    if (!path.startsWith('/')) {
        path = '/' + path;
    }
    // Avoid double prefixing
    if (path.startsWith(BASE_PATH)) {
        return path;
    }
    return BASE_PATH + path;
}

/**
 * Navigate to a path handling base URL
 * @param {string} path 
 */
export function navigateTo(path) {
    window.location.href = resolvePath(path);
}

/**
 * Replace location handling base URL
 * @param {string} path 
 */
export function replaceLocation(path) {
    window.location.replace(resolvePath(path));
}
