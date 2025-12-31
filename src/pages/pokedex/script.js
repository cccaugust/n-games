// Imports for assets
import kaikefupotoriImg from './assets/kaikefupotori.png';
import godangiruImg from './assets/godangiru.png';
import cameramanImg from './assets/cameraman.png';

// Pokemon Data
const pokemonData = [
    {
        id: '0001',
        name: 'カイケフポトリ',
        classification: 'じげんトラベラーポケモン',
        types: ['psychic', 'fairy'],
        typeNames: ['エスパー', 'フェアリー'],
        image: kaikefupotoriImg,
        description: '宇宙の彼方にある異次元の門から、純粋なエネルギー体として現れた存在。彼が微笑みながら輪をくぐり抜けるとき、その場所の重力は消滅し、すべての物体は空へと昇っていくという。',
        ecology: '実体を持たず、光の屈折によって姿を現しているという説がある。背後の巨大なリングは「事象の地平線」と繋がっており、そこから取り出されるエネルギーは、一つの街の電力を100年分賄えるほど強大。',
        abilityName: 'マジックゲート',
        abilityDesc: '場に出ている間、相手の「設置技（ステルスロック等）」の効果を無効化し、さらに相手の能力ランク上昇を無視して攻撃できる。',
        moveName: 'ポータルバースト',
        moveType: 'psychic',
        moveDesc: 'タイプ：エスパー / 威力：90 / 命中：100<br>空間の輪から攻撃する。相手の「まもる」「みきり」を貫通してダメージを与える。',
        extraInfo: '古代の壁画には、飢饉の際に別次元から食料を運び込み、人々を救った「光の使者」として描かれている。'
    },
    {
        id: '0002',
        name: 'ゴダンギル',
        classification: 'せんりつ騎士ポケモン',
        types: ['steel', 'ghost'],
        typeNames: ['はがね', 'ゴースト'],
        image: godangiruImg,
        description: '5本の魔剣に宿る魂が完全に同調した姿。一振りで巨岩を両断し、二振りで嵐を呼び寄せる。このポケモンを従えた王は、一夜にして大陸を統一したが、最後はその強大すぎる力に精神を食いつくされたと伝わる。',
        ecology: '5本の剣はそれぞれ独立した意識を持っており、中央の盾がそれらを統率する脳の役割を果たす。戦闘時以外は、5本の剣を自身の周囲に円状に配置し、絶対的な防御陣形を崩さない。',
        abilityName: 'クインテットブレード',
        abilityDesc: '連続技（2〜5回攻撃）の威力が1.5倍になり、必ず5回当たるようになる。',
        moveName: '五戒の神鎖',
        moveType: 'steel',
        moveDesc: 'タイプ：はがね / 威力：25×5回 / 命中：90<br>5本の剣で連続攻撃し、相手を「バインド」状態にして交代できなくさせる。',
        extraInfo: 'かつて、このポケモンを無理に従えようとした軍隊が、一夜にして影も形もなく消え去ったという伝説が残っている。'
    },
    {
        id: '0003',
        name: 'カメラマン',
        classification: 'スクープ記録ポケモン',
        types: ['grass', 'electric'],
        typeNames: ['くさ', 'でんき'],
        image: cameramanImg,
        description: '首のカメラは数キロ先のプランクトンの動きさえ捉える超高性能。野生の個体は、珍しい現象を見つけるとドローンを飛ばして記録する習性がある。撮影されたデータは、背中の甲羅の中で暗号化され保存されているらしい。',
        ecology: 'カメのような堅実さと、ラマのような好奇心を併せ持つ。頭部の双眼鏡ユニットで広範囲をスキャンし、珍しいポケモンや戦いの様子を見つけると、即座に自律型ドローンを射出して空中撮影を開始する。',
        abilityName: 'フラッシュシャッター',
        abilityDesc: '場に出た時、相手全員の命中率を1段階下げる。',
        moveName: 'パパラッチ・ドローン',
        moveType: 'electric',
        moveDesc: 'タイプ：でんき / 威力：80 / 命中：100<br>攻撃後、相手が次に使う技を3ターンの間「封印」状態にする。',
        extraInfo: '自然写真家たちの憧れの的。このポケモンのドローンが撮影した写真は、数億円の価値がつくと言われている。'
    }
];

// DOM Elements
const grid = document.getElementById('pokedex-grid');
const modal = document.getElementById('pokemon-modal');
const modalBody = document.getElementById('modal-body');
const closeBtn = document.querySelector('.close-btn');
const searchInput = document.getElementById('searchInput');

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

// Render Grid
function renderGrid(pokemons) {
    grid.innerHTML = '';
    pokemons.forEach(pokemon => {
        const card = document.createElement('div');
        card.className = 'pokemon-card';
        card.onclick = () => openModal(pokemon);

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
            </div>
        `;
        grid.appendChild(card);
    });
}

// Open Modal
function openModal(pokemon) {
    const typesHtml = pokemon.types.map((type, index) => {
        return `<span class="type-badge" style="background-color: ${getTypeColor(type)}; font-size: 1rem; padding: 5px 15px;">${pokemon.typeNames[index]}</span>`;
    }).join(' ');

    modalBody.innerHTML = `
        <div class="detail-image-section">
            <img src="${pokemon.image}" alt="${pokemon.name}" class="detail-img">
        </div>
        <div class="detail-info-section">
            <div class="detail-header">
                <span class="detail-id">No.${pokemon.id}</span>
                <h2 class="detail-name">${pokemon.name}</h2>
            </div>
            <div class="detail-category">${pokemon.classification}</div>
            <div class="types" style="margin-bottom: 30px;">
                ${typesHtml}
            </div>

            <div class="description-box">
                <h3>図鑑説明</h3>
                <p>${pokemon.description}</p>
            </div>

             <div class="description-box" style="border-left-color: #7AC74C; background: #fdfdfd;">
                <h3>生態・能力</h3>
                <p>${pokemon.ecology}</p>
                <div style="margin-top: 10px; font-size: 0.9em; color: #555;">${pokemon.extraInfo}</div>
            </div>

            <div class="stats-section">
                <div class="section-title">特性</div>
                <div class="ability-box">
                    <div class="ability-name">【${pokemon.abilityName}】</div>
                    <div style="margin-top: 5px;">${pokemon.abilityDesc}</div>
                </div>
            </div>

             <div class="moves-section">
                <div class="section-title">専用技</div>
                <div class="ability-box" style="background: #fff8f8; border: 1px solid #ffecec;">
                    <div class="ability-name" style="color: ${getTypeColor(pokemon.moveType)}">【${pokemon.moveName}】</div>
                    <div style="margin-top: 5px;">${pokemon.moveDesc}</div>
                </div>
            </div>
        </div>
    `;
    modal.classList.add('visible');
    modal.classList.remove('hidden');
}

// Close Modal
closeBtn.onclick = () => {
    modal.classList.remove('visible');
    setTimeout(() => modal.classList.add('hidden'), 300);
};

window.onclick = (event) => {
    if (event.target == modal) {
        modal.classList.remove('visible');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
};

// Search Filter
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = pokemonData.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.id.includes(term)
    );
    renderGrid(filtered);
});

// Initial Render
renderGrid(pokemonData);
