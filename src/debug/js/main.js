import { requireAuth } from '../../js/auth.js';
import { resolvePath } from '../../js/config.js';

requireAuth();

const debugItems = [
    {
        title: '2D Sprite Emulator',
        desc: 'Upload and test sprite images',
        link: '/debug/emulator/'
    }
];

const list = document.getElementById('debugList');

debugItems.forEach(item => {
    const a = document.createElement('a');
    a.href = resolvePath(item.link);
    a.className = 'debug-link';
    a.innerHTML = `
        <h3>${item.title}</h3>
        <p>${item.desc}</p>
    `;
    list.appendChild(a);
});

// Update back link to use resolvePath
const backLink = document.querySelector('.back-link');
if (backLink) {
    backLink.href = resolvePath('/pages/portal/portal.html');
}
