// ===== PAINT WARS - Characters Data =====
// 3Dアセットライブラリから動的にキャラクターを読み込む

// カタログをキャッシュ
let catalogCache = null;

/**
 * 3Dアセットカタログからキャラクターを読み込む
 * @returns {Promise<Array>} キャラクター配列
 */
export async function loadCharactersFromCatalog() {
  if (catalogCache) {
    return getCharactersFromCatalog(catalogCache);
  }

  try {
    const response = await fetch('/assets/3d/catalog.json');
    if (!response.ok) {
      throw new Error('Failed to load catalog');
    }
    catalogCache = await response.json();
    return getCharactersFromCatalog(catalogCache);
  } catch (error) {
    console.warn('Failed to load 3D catalog, using fallback characters:', error);
    return FALLBACK_CHARACTERS;
  }
}

/**
 * カタログからキャラクターを抽出
 */
function getCharactersFromCatalog(catalog) {
  const characters = catalog.assets
    .filter(asset => asset.category === 'characters')
    .map(asset => ({
      id: asset.id,
      name: asset.name,
      description: asset.description,
      icon: getIconForCharacter(asset.id),
      modelId: asset.id,
      variants: asset.variants || [],
      defaultVariant: asset.variants?.[0] || 'default',
      animations: asset.animations || [],
      tags: asset.tags || []
    }));

  return characters;
}

/**
 * キャラクターIDに対応するアイコンを取得
 */
function getIconForCharacter(id) {
  const iconMap = {
    // スプラトゥーン風
    'inkling': '🦑',
    'squid': '🦑',
    'octoling': '🐙',
    'octopus': '🐙',
    // ゼルダ風
    'link': '🗡️',
    'zelda': '👸',
    'ganondorf': '👹',
    'bokoblin': '👺',
    'lizalfos': '🦎',
    'lynel': '🦁',
    'hinox': '👁️',
    'zora': '🐟',
    'goron': '🪨',
    'gerudo': '⚔️',
    'rito': '🦅',
    'korok': '🌿',
    'great-fairy': '🧚',
    // マリオ風
    'mario': '🍄',
    'luigi': '💚',
    'peach': '🍑',
    'bowser': '🐢',
    'toad': '🍄',
    'yoshi': '🦖',
    'wario': '💛',
    'waluigi': '💜',
    'donkey-kong': '🦍',
    'goomba': '🍄',
    'koopa': '🐢',
    // ファンタジー
    'robot': '🤖',
    'slime': '🟢',
    'knight': '⚔️',
    'mage': '🧙',
    'ghost': '👻',
    // 動物
    'dog': '🐕',
    'cat': '🐱',
    'horse': '🐴',
    'frog': '🐸'
  };
  return iconMap[id] || '🎮';
}

/**
 * カタログキャッシュをクリア（ホットリロード用）
 */
export function clearCatalogCache() {
  catalogCache = null;
}

/**
 * フォールバック用キャラクター（カタログ読み込み失敗時）
 */
export const FALLBACK_CHARACTERS = [
  {
    id: 'inkling',
    name: 'インクリング',
    icon: '🦑',
    modelId: 'inkling',
    variants: ['orange', 'cyan', 'purple', 'pink', 'lime', 'yellow'],
    defaultVariant: 'orange',
    description: 'スプラトゥーン風キャラクター'
  },
  {
    id: 'octoling',
    name: 'オクトリング',
    icon: '🐙',
    modelId: 'octoling',
    variants: ['pink', 'teal', 'purple', 'gold'],
    defaultVariant: 'pink',
    description: 'タコのキャラクター'
  },
  {
    id: 'robot',
    name: 'ロボット',
    icon: '🤖',
    modelId: 'robot',
    variants: ['blue', 'red', 'green', 'gold'],
    defaultVariant: 'blue',
    description: '汎用ロボット'
  },
  {
    id: 'slime',
    name: 'スライム',
    icon: '🟢',
    modelId: 'slime',
    variants: ['green', 'blue', 'red', 'gold', 'rainbow'],
    defaultVariant: 'green',
    description: 'かわいいスライム'
  }
];

// 互換性のため、同期的なCHARACTERS配列も用意（フォールバック）
export const CHARACTERS = FALLBACK_CHARACTERS;
