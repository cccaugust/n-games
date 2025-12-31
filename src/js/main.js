// Main entry point logic
import { isFamilyLoggedIn, getCurrentPlayer } from './auth.js';
import { replaceLocation } from './config.js';

// Simple router check at root
// Note: In dev, custom pages are at /src/pages/... or /pages/... depending on vite root.
// In prod, files are flattened or kept in structure.

function init() {
    if (!isFamilyLoggedIn()) {
        replaceLocation('/pages/login/login.html');
    } else if (!getCurrentPlayer()) {
        replaceLocation('/pages/select-player/select-player.html');
    } else {
        replaceLocation('/pages/portal/portal.html');
    }
}

init();
