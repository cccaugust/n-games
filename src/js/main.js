// Main entry point logic
import { isFamilyLoggedIn } from './auth.js';
import { replaceLocation } from './config.js';

function init() {
    if (!isFamilyLoggedIn()) {
        replaceLocation('/pages/login/login.html');
    } else {
        replaceLocation('/pages/portal/portal.html');
    }
}

init();
