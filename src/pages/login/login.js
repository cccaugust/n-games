import { loginFamily, isFamilyLoggedIn } from '../../js/auth.js';
import { navigateTo } from '../../js/config.js';

// Redirect if already logged in
if (isFamilyLoggedIn()) {
    navigateTo('/pages/select-player/select-player.html');
}

const form = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');

form.addEventListener('submit', (e) => {
    e.preventDefault();

    const id = document.getElementById('familyId').value.trim();
    const pin = document.getElementById('pin').value.trim();

    if (loginFamily(id, pin)) {
        // Success
        navigateTo('/pages/select-player/select-player.html');
    } else {
        // Fail
        errorMsg.style.display = 'block';
        // Shake animation
        const card = document.querySelector('.card');
        card.animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(0)' }
        ], { duration: 300 });
    }
});
