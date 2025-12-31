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
    const colors = {
        normal: '#A8A77A',
        fire: '#EE8130',
        water: '#6390F0',
        electric: '#F7D02C',
        grass: '#7AC74C',
        ice: '#96D9D6',
        fighting: '#C22E28',
        poison: '#A33EA1',
        ground: '#E2BF65',
        flying: '#A98FF3',
        psychic: '#F95587',
        bug: '#A6B91A',
        rock: '#B6A136',
        ghost: '#735797',
        dragon: '#6F35FC',
        dark: '#705746',
        steel: '#B7B7CE',
        fairy: '#D685AD'
    };
    return colors[type] || '#777';
}

// Helper: Render Stats Bars
function renderStats(stats) {
    const statLabels = {
        hp: 'HP',
        attack: 'こうげき',
        defense: 'ぼうぎょ',
        spAtk: 'とくこう',
        spDef: 'とくぼう',
        speed: 'すばやさ'
    };

    let html = '<div class="stats-grid">';

    for (const [key, label] of Object.entries(statLabels)) {
        const value = stats[key];
        // Scale 0-150 to 1-15 bars
        const filledCount = Math.min(15, Math.max(1, Math.round(value / 10)));

        let barsHtml = '';
        for (let i = 0; i < 15; i++) {
            barsHtml += `<div class="stat-point ${i < filledCount ? 'filled' : ''}"></div>`;
        }

        html += `
            <div class="stat-row">
                <div class="stat-label">${label}</div>
                <div class="stat-bar-container">
                    ${barsHtml}
                </div>
            </div>
        `;
    }

    html += '</div>';
    return html;
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
                            <div class="ability-box-compact" style="background: #fff8f8; border-color: #ffecec;">
                                <div class="ability-name" style="color: ${getTypeColor(pokemon.moveType)}">【${pokemon.moveName}】</div>
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
