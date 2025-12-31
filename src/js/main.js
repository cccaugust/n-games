// Main entry point logic
import { isFamilyLoggedIn, getCurrentPlayer } from './auth.js';

// Simple router check at root
// Note: In dev, custom pages are at /pages/...
// In prod, if using MPA, they are true HTML files.

function init() {
    if (!isFamilyLoggedIn()) {
        window.location.replace('/pages/login/login.html');
    } else if (!getCurrentPlayer()) {
        window.location.replace('/pages/select-player/select-player.html');
    } else {
        window.location.replace('/pages/portal/portal.html');
    }
}

init();
