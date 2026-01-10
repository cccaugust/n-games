// ===== Stage Data Management =====

const STAGES_KEY = 'ngames.bomberman.custom_stages.v1';
const PROGRESS_KEY = 'ngames.bomberman.progress.v1';

// Tile types
export const TILE = {
  EMPTY: 0,
  WALL: 1,      // Indestructible
  BLOCK: 2,     // Destructible
  SPAWN: 3,     // Player spawn point
  EXIT: 4       // Exit door (hidden under block)
};

// Default stages
export const defaultStages = [
  {
    id: 'stage_1_1',
    name: 'はじまりの地',
    world: 1,
    level: 1,
    width: 15,
    height: 11,
    timeLimit: 180,
    map: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,3,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
      [1,0,0,2,2,2,0,2,0,2,2,2,0,0,1],
      [1,0,1,2,1,0,1,2,1,0,1,2,1,0,1],
      [1,0,0,2,0,2,2,2,2,2,0,2,0,0,1],
      [1,0,1,2,1,0,1,2,1,0,1,2,1,0,1],
      [1,0,0,2,2,2,0,2,0,2,2,2,0,0,1],
      [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,4,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    enemies: [
      { x: 13, y: 1, type: 'slime' },
      { x: 7, y: 5, type: 'slime' },
      { x: 3, y: 9, type: 'slime' }
    ],
    itemRates: {
      bomb_up: 20,
      fire_up: 20,
      speed_up: 15,
      penetrate: 5,
      kick: 5,
      life: 5
    }
  },
  {
    id: 'stage_1_2',
    name: 'ブロックの迷路',
    world: 1,
    level: 2,
    width: 15,
    height: 11,
    timeLimit: 180,
    map: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,3,0,2,2,2,2,2,2,2,2,2,2,0,1],
      [1,0,1,2,1,2,1,2,1,2,1,2,1,0,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,1,2,1,2,1,2,1,2,1,2,1,2,1],
      [1,2,2,2,2,2,2,0,2,2,2,2,2,2,1],
      [1,2,1,2,1,2,1,2,1,2,1,2,1,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,0,1,2,1,2,1,2,1,2,1,2,1,0,1],
      [1,0,2,2,2,2,2,2,2,2,2,2,2,4,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    enemies: [
      { x: 13, y: 1, type: 'slime' },
      { x: 1, y: 9, type: 'slime' },
      { x: 7, y: 5, type: 'bat' },
      { x: 11, y: 7, type: 'slime' }
    ],
    itemRates: {
      bomb_up: 20,
      fire_up: 20,
      speed_up: 15,
      penetrate: 8,
      kick: 8,
      life: 5
    }
  },
  {
    id: 'stage_1_3',
    name: '敵の巣窟',
    world: 1,
    level: 3,
    width: 15,
    height: 11,
    timeLimit: 200,
    map: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,3,0,0,2,0,0,0,0,0,2,0,0,0,1],
      [1,0,1,0,1,2,1,0,1,2,1,0,1,0,1],
      [1,0,2,2,2,2,2,0,2,2,2,2,2,0,1],
      [1,0,1,2,1,0,1,0,1,0,1,2,1,0,1],
      [1,0,0,0,2,0,0,0,0,0,2,0,0,0,1],
      [1,0,1,2,1,0,1,0,1,0,1,2,1,0,1],
      [1,0,2,2,2,2,2,0,2,2,2,2,2,0,1],
      [1,0,1,0,1,2,1,0,1,2,1,0,1,0,1],
      [1,0,0,0,2,0,0,0,0,0,2,0,0,4,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    enemies: [
      { x: 7, y: 1, type: 'ghost' },
      { x: 1, y: 5, type: 'slime' },
      { x: 13, y: 5, type: 'slime' },
      { x: 7, y: 9, type: 'bat' },
      { x: 5, y: 3, type: 'slime' },
      { x: 9, y: 7, type: 'slime' }
    ],
    itemRates: {
      bomb_up: 15,
      fire_up: 20,
      speed_up: 20,
      penetrate: 10,
      kick: 10,
      life: 8
    }
  },
  {
    id: 'stage_2_1',
    name: '炎の洞窟',
    world: 2,
    level: 1,
    width: 17,
    height: 13,
    timeLimit: 200,
    map: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,3,0,0,0,2,0,0,0,0,0,2,0,0,0,0,1],
      [1,0,1,0,1,2,1,0,1,0,1,2,1,0,1,0,1],
      [1,0,0,2,2,2,2,2,2,2,2,2,2,2,0,0,1],
      [1,0,1,2,1,0,1,2,1,2,1,0,1,2,1,0,1],
      [1,2,2,2,0,0,2,2,2,2,2,0,0,2,2,2,1],
      [1,2,1,2,1,0,1,0,1,0,1,0,1,2,1,2,1],
      [1,2,2,2,0,0,2,2,2,2,2,0,0,2,2,2,1],
      [1,0,1,2,1,0,1,2,1,2,1,0,1,2,1,0,1],
      [1,0,0,2,2,2,2,2,2,2,2,2,2,2,0,0,1],
      [1,0,1,0,1,2,1,0,1,0,1,2,1,0,1,0,1],
      [1,0,0,0,0,2,0,0,0,0,0,2,0,0,0,4,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    enemies: [
      { x: 15, y: 1, type: 'bat' },
      { x: 1, y: 11, type: 'bat' },
      { x: 8, y: 6, type: 'ghost' },
      { x: 4, y: 4, type: 'slime' },
      { x: 12, y: 8, type: 'slime' },
      { x: 8, y: 3, type: 'bat' }
    ],
    itemRates: {
      bomb_up: 18,
      fire_up: 22,
      speed_up: 18,
      penetrate: 12,
      kick: 12,
      life: 6
    }
  },
  {
    id: 'stage_2_2',
    name: '追跡者の廊下',
    world: 2,
    level: 2,
    width: 17,
    height: 13,
    timeLimit: 220,
    map: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,3,0,0,0,0,0,0,2,0,0,0,0,0,0,0,1],
      [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
      [1,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,1],
      [1,2,1,2,1,2,1,0,1,0,1,2,1,2,1,2,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,2,1,2,1,2,1,0,1,0,1,2,1,2,1,2,1],
      [1,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,1],
      [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
      [1,0,0,0,0,0,0,0,2,0,0,0,0,0,0,4,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    enemies: [
      { x: 15, y: 1, type: 'chaser' },
      { x: 1, y: 11, type: 'chaser' },
      { x: 8, y: 6, type: 'ghost' },
      { x: 4, y: 5, type: 'bat' },
      { x: 12, y: 7, type: 'bat' }
    ],
    itemRates: {
      bomb_up: 15,
      fire_up: 20,
      speed_up: 25,
      penetrate: 12,
      kick: 15,
      life: 8
    }
  },
  {
    id: 'stage_2_3',
    name: 'ボスの間',
    world: 2,
    level: 3,
    width: 17,
    height: 13,
    timeLimit: 240,
    map: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,3,0,0,2,2,2,2,0,2,2,2,2,0,0,0,1],
      [1,0,1,0,1,0,1,2,1,2,1,0,1,0,1,0,1],
      [1,0,0,0,0,0,2,2,2,2,2,0,0,0,0,0,1],
      [1,2,1,0,1,0,1,0,0,0,1,0,1,0,1,2,1],
      [1,2,2,0,0,0,0,0,0,0,0,0,0,0,2,2,1],
      [1,0,1,0,1,0,1,0,0,0,1,0,1,0,1,0,1],
      [1,2,2,0,0,0,0,0,0,0,0,0,0,0,2,2,1],
      [1,2,1,0,1,0,1,0,0,0,1,0,1,0,1,2,1],
      [1,0,0,0,0,0,2,2,2,2,2,0,0,0,0,0,1],
      [1,0,1,0,1,0,1,2,1,2,1,0,1,0,1,0,1],
      [1,0,0,0,2,2,2,2,0,2,2,2,2,0,0,4,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    enemies: [
      { x: 8, y: 6, type: 'boss_slime' },
      { x: 4, y: 3, type: 'chaser' },
      { x: 12, y: 3, type: 'chaser' },
      { x: 4, y: 9, type: 'ghost' },
      { x: 12, y: 9, type: 'ghost' },
      { x: 1, y: 6, type: 'bat' },
      { x: 15, y: 6, type: 'bat' }
    ],
    itemRates: {
      bomb_up: 20,
      fire_up: 25,
      speed_up: 20,
      penetrate: 15,
      kick: 15,
      life: 10
    }
  }
];

// Default enemy types
export const defaultEnemyTypes = {
  slime: {
    id: 'slime',
    name: 'スライム',
    speed: 0.8,
    pattern: 'random',
    wallPass: false,
    bombPass: false,
    color: '#4ade80',
    points: 100
  },
  bat: {
    id: 'bat',
    name: 'コウモリ',
    speed: 1.2,
    pattern: 'random',
    wallPass: false,
    bombPass: false,
    color: '#a855f7',
    points: 200
  },
  ghost: {
    id: 'ghost',
    name: 'ゴースト',
    speed: 0.7,
    pattern: 'random',
    wallPass: true,
    bombPass: true,
    color: '#94a3b8',
    points: 400
  },
  chaser: {
    id: 'chaser',
    name: 'チェイサー',
    speed: 1.0,
    pattern: 'chase',
    wallPass: false,
    bombPass: false,
    color: '#ef4444',
    points: 300
  },
  boss_slime: {
    id: 'boss_slime',
    name: 'キングスライム',
    speed: 0.5,
    pattern: 'smart',
    wallPass: false,
    bombPass: false,
    color: '#22c55e',
    points: 1000,
    size: 1.5
  }
};

// Save/Load custom stages
export function saveCustomStages(stages) {
  try {
    localStorage.setItem(STAGES_KEY, JSON.stringify(stages));
    return true;
  } catch (e) {
    console.error('Failed to save stages:', e);
    return false;
  }
}

export function loadCustomStages() {
  try {
    const data = localStorage.getItem(STAGES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load stages:', e);
    return [];
  }
}

export function saveCustomStage(stage) {
  const stages = loadCustomStages();
  const existingIndex = stages.findIndex(s => s.id === stage.id);

  if (existingIndex >= 0) {
    stages[existingIndex] = stage;
  } else {
    stages.push(stage);
  }

  return saveCustomStages(stages);
}

export function deleteCustomStage(stageId) {
  const stages = loadCustomStages();
  const filtered = stages.filter(s => s.id !== stageId);
  return saveCustomStages(filtered);
}

// Progress management
export function loadProgress() {
  try {
    const data = localStorage.getItem(PROGRESS_KEY);
    return data ? JSON.parse(data) : { clearedStages: [], highScores: {} };
  } catch (e) {
    return { clearedStages: [], highScores: {} };
  }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    return true;
  } catch (e) {
    return false;
  }
}

export function markStageCleared(stageId, score, time) {
  const progress = loadProgress();

  if (!progress.clearedStages.includes(stageId)) {
    progress.clearedStages.push(stageId);
  }

  const current = progress.highScores[stageId] || { score: 0, time: Infinity };
  if (score > current.score) {
    progress.highScores[stageId] = { score, time };
  }

  return saveProgress(progress);
}

export function isStageUnlocked(stageId, allStages) {
  const progress = loadProgress();

  // First stage is always unlocked
  const stageIndex = allStages.findIndex(s => s.id === stageId);
  if (stageIndex === 0) return true;

  // Check if previous stage is cleared
  const previousStage = allStages[stageIndex - 1];
  if (previousStage) {
    return progress.clearedStages.includes(previousStage.id);
  }

  return false;
}

// Generate empty stage map
export function generateEmptyMap(width, height) {
  const map = [];

  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        // Border walls
        row.push(TILE.WALL);
      } else if (x % 2 === 0 && y % 2 === 0) {
        // Fixed walls
        row.push(TILE.WALL);
      } else if (x === 1 && y === 1) {
        // Player spawn
        row.push(TILE.SPAWN);
      } else if ((x === 2 && y === 1) || (x === 1 && y === 2)) {
        // Safe zone around spawn
        row.push(TILE.EMPTY);
      } else {
        row.push(TILE.EMPTY);
      }
    }
    map.push(row);
  }

  return map;
}

// Create new custom stage
export function createNewStage() {
  const id = 'custom_' + Date.now();
  return {
    id,
    name: '新しいステージ',
    world: 0,
    level: 0,
    width: 15,
    height: 11,
    timeLimit: 180,
    map: generateEmptyMap(15, 11),
    enemies: [],
    itemRates: {
      bomb_up: 20,
      fire_up: 20,
      speed_up: 15,
      penetrate: 10,
      kick: 10,
      life: 5
    }
  };
}
