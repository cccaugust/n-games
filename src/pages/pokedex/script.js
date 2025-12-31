// Import Shared Data
import { pokemonData } from '../../data/pokemonData.js';

// DOM Elements
const viewGrid = document.getElementById('view-grid');
const viewDetail = document.getElementById('view-detail');
const detailContent = document.getElementById('detail-content');
const grid = document.getElementById('pokedex-grid');
const searchInput = document.getElementById('searchInput');
const backBtn = document.getElementById('backBtn');

// Helper: Get Type Color Name
function getTypeColor(type) {
    return `var(--type-${type}, #777)`;
}

// Helper: Render Stats Radar Chart
function renderStats(stats) {
    // Return a canvas container instead of the old bars
    setTimeout(() => drawRadarChart(stats), 100); // Draw after insertion
    return '<div class="radar-chart-container"><canvas id="statsChart" class="radar-chart-canvas" width="300" height="300"></canvas></div>';
}

function drawRadarChart(stats) {
    const canvas = document.getElementById('statsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 100; // Radius of the chart

    const statValues = [
        stats.hp,
        stats.attack,
        stats.defense,
        stats.speed,
        stats.spDef,
        stats.spAtk
    ];

    // Ordered labels matching the polygon points (Clockwise from top)
    const statLabels = [
        'HP',
        'こうげき',
        'ぼうぎょ',
        'すばやさ',
        'とくぼう',
        'とくこう'
    ];

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw Background Hexagons
    ctx.strokeStyle = '#4466aa';
    ctx.lineWidth = 1;

    for (let r = 0.2; r <= 1; r += 0.2) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const x = centerX + Math.cos(angle) * (radius * r);
            const y = centerY + Math.sin(angle) * (radius * r);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
    }

    // Draw Axes
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);

        // Draw Labels
        const labelX = centerX + Math.cos(angle) * (radius + 25);
        const labelY = centerY + Math.sin(angle) * (radius + 15);
        ctx.fillStyle = '#8dbcd8';
        ctx.font = 'bold 12px "M PLUS Rounded 1c"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(statLabels[i], labelX, labelY);
    }
    ctx.stroke();

    // Draw Data Polygon
    ctx.fillStyle = 'rgba(230, 255, 60, 0.7)'; // Yellowish glow
    ctx.strokeStyle = '#ffff40';
    ctx.lineWidth = 2;
    ctx.beginPath();

    // Normalize stats (assuming max 160 for visual balance)
    const maxStat = 160;

    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const val = Math.min(statValues[i], maxStat);
        const r = (val / maxStat) * radius;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw dots at vertices
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const val = Math.min(statValues[i], maxStat);
        const r = (val / maxStat) * radius;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Render Grid
function renderGrid(pokemons) {
    grid.innerHTML = '';
    pokemons.forEach(pokemon => {
        const card = document.createElement('div');
        card.className = 'pokemon-card';
        card.onclick = () => showDetail(pokemon);

        const typesHtml = pokemon.types.map((type, index) => {
            return `<span class="type-badge" style="background-color: ${getTypeColor(type)}">${pokemon.typeNames[index]}</span>`;
        }).join('');

        card.innerHTML = `
            <div class="card-image-container">
                <img src="${pokemon.image}" alt="${pokemon.name}" class="card-image">
            </div>
            <div class="card-info">
                <div class="card-id">No.${pokemon.id}</div>
                <h2 class="card-name">${pokemon.name}</h2>
                <div class="types">
                    ${typesHtml}
                </div>
                <div class="author-tag">作者: ${pokemon.author}</div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Show Detail View
function showDetail(pokemon) {
    // Update URL
    const url = new URL(window.location);
    url.searchParams.set('id', pokemon.id);
    window.history.pushState({}, '', url);

    const typesHtml = pokemon.types.map((type, index) => {
        return `<span class="type-badge" style="background-color: ${getTypeColor(type)}; font-size: 1rem; padding: 5px 15px;">${pokemon.typeNames[index]}</span>`;
    }).join(' ');

    const statsHtml = renderStats(pokemon.stats);

    // Evolution Links
    let evoHtml = '';
    if (pokemon.evolutions && pokemon.evolutions.length > 0) {
        evoHtml = '<div class="stats-section"><div class="section-title">進化・関連ポケモン</div><div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">';
        pokemon.evolutions.forEach(evoId => {
            const evoPoke = pokemonData.find(p => p.id === evoId);
            if (evoPoke) {
                evoHtml += `
                    <div style="cursor: pointer; text-align: center; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'" onclick="openDetailById('${evoPoke.id}')">
                        <div style="width: 80px; height: 80px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.1); margin: 0 auto 5px;">
                            <img src="${evoPoke.image}" style="width: 60px; height: 60px; object-fit: contain;">
                        </div>
                        <div style="font-size: 0.8rem; font-weight: bold; color: #555;">${evoPoke.name}</div>
                    </div>
                `;
            }
        });
        evoHtml += '</div></div>';
    }

    detailContent.innerHTML = `
        <div class="detail-card">
            <div class="modal-header-strip">
                <div class="header-left">
                    <span class="detail-id">No.${pokemon.id}</span>
                    <h2 class="detail-name">${pokemon.name}</h2>
                    <span class="detail-category">${pokemon.classification}</span>
                </div>
                <div class="header-right">
                    <div class="types">
                        ${typesHtml}
                    </div>
                    <div style="margin-top: 5px; text-align: right; font-size: 0.8rem; color: #888;">
                        作者: <strong>${pokemon.author}</strong>
                    </div>
                </div>
            </div>

            <div class="modal-content-split">
                <div class="detail-visual-section">
                    <div class="visual-bg-circle"></div>
                    <img src="${pokemon.image}" alt="${pokemon.name}" class="detail-img-large">
                </div>
                
                <div class="detail-data-section">
                    <div class="description-box">
                        <p>${pokemon.description}</p>
                    </div>

                    <div class="stats-section">
                        <div class="section-title">種族値</div>
                        ${statsHtml}
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px;">
                        <div>
                            <div class="section-title" style="font-size: 1rem; margin-bottom: 8px;">特性</div>
                            <div class="ability-box-compact">
                                <div class="ability-name">【${pokemon.abilityName}】</div>
                                <div style="font-size: 0.85rem; margin-top: 3px;">${pokemon.abilityDesc}</div>
                            </div>
                        </div>
                        <div>
                            <div class="section-title" style="font-size: 1rem; margin-bottom: 8px;">専用技</div>
                            <div class="ability-box-compact">
                                <div class="ability-name">【${pokemon.moveName}】</div>
                                <div style="font-size: 0.85rem; margin-top: 3px;">${pokemon.moveDesc}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="eco-box">
                        <div style="font-weight: bold; margin-bottom: 5px; color: #555;">生態・能力</div>
                        <p style="font-size: 0.9rem; margin: 0; color: #666;">${pokemon.ecology}</p>
                        <div style="margin-top: 8px; font-size: 0.85rem; color: #888;">Note: ${pokemon.extraInfo}</div>
                    </div>

                    ${evoHtml}
                </div>
            </div>
        </div>
    `;

    // View Switching
    viewGrid.classList.add('hidden');
    viewDetail.classList.remove('hidden');
    window.scrollTo(0, 0);
}

// Go Back to Grid
function hideDetail() {
    viewDetail.classList.add('hidden');
    viewGrid.classList.remove('hidden');

    // Clear URL param
    const url = new URL(window.location);
    url.searchParams.delete('id');
    window.history.pushState({}, '', url);
}

backBtn.onclick = hideDetail;

// Search Filter
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = pokemonData.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.id.includes(term) ||
        p.author.toLowerCase().includes(term)
    );
    renderGrid(filtered);
});

// Helper for evolution links
window.openDetailById = function (id) {
    const poke = pokemonData.find(p => p.id === id);
    if (poke) showDetail(poke);
};

// Initial Render & URL Check
renderGrid(pokemonData);

// Check URL params for deep linking
const urlParams = new URLSearchParams(window.location.search);
const initialId = urlParams.get('id');
if (initialId) {
    const poke = pokemonData.find(p => p.id === initialId);
    if (poke) showDetail(poke);
}

// Handle browser back button
window.onpopstate = () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
        const poke = pokemonData.find(p => p.id === id);
        if (poke) showDetail(poke);
    } else {
        viewDetail.classList.add('hidden');
        viewGrid.classList.remove('hidden');
    }
};
