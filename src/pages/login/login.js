import { loginFamily, isFamilyLoggedIn } from '../../js/auth.js';
import { navigateTo } from '../../js/config.js';

// Redirect if already logged in
if (isFamilyLoggedIn()) {
    navigateTo('/pages/select-player/select-player.html');
}

const pinDisplay = document.getElementById('pinDisplay');
const errorMsg = document.getElementById('errorMsg');
const keys = document.querySelectorAll('.key-btn[data-val]');
const clearBtn = document.getElementById('clearBtn');
const backBtn = document.getElementById('backBtn');

let currentPin = '';

function updateDisplay() {
    if (currentPin.length === 0) {
        pinDisplay.innerHTML = '<span class="pin-placeholder">4つのすうじ</span>';
    } else {
        // Show dots instead of numbers
        pinDisplay.textContent = '•'.repeat(currentPin.length);
    }
}

function handleInput(val) {
    if (currentPin.length < 4) {
        currentPin += val;
        updateDisplay();
        errorMsg.style.opacity = '0';

        if (currentPin.length === 4) {
            // Auto submit
            setTimeout(attemptLogin, 300);
        }
    }
}

function attemptLogin() {
    // Hardcoded family ID 'nakao' since we removed the input
    // The user said "0818 de haireru youni" (enter with 0818)
    if (loginFamily('nakao', currentPin)) {
        pinDisplay.style.color = '#00b894';
        navigateTo('/pages/select-player/select-player.html');
    } else {
        // Error
        errorMsg.style.opacity = '1';
        currentPin = '';
        updateDisplay();

        // Shake
        const card = document.querySelector('.card');
        card.animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(0)' }
        ], { duration: 300 });
    }
}

keys.forEach(key => {
    key.addEventListener('click', () => {
        handleInput(key.dataset.val);
    });
});

clearBtn.addEventListener('click', () => {
    currentPin = '';
    updateDisplay();
});

backBtn.addEventListener('click', () => {
    currentPin = currentPin.slice(0, -1);
    updateDisplay();
});
