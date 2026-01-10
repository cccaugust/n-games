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
      bomb_up: 2.5,
      fire_up: 2.5,
      speed_up: 2,
      penetrate: 1,
      kick: 1,
      life: 1
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
      bomb_up: 2.5,
      fire_up: 2.5,
      speed_up: 2,
      penetrate: 1,
      kick: 1,
      life: 1
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
      bomb_up: 2,
      fire_up: 2.5,
      speed_up: 2.5,
      penetrate: 1,
      kick: 1,
      life: 1
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
      bomb_up: 2,
      fire_up: 2.5,
      speed_up: 2,
      penetrate: 1.5,
      kick: 1,
      life: 1
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
      bomb_up: 2,
      fire_up: 2,
      speed_up: 2.5,
      penetrate: 1.5,
      kick: 1,
      life: 1
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
      bomb_up: 2,
      fire_up: 2.5,
      speed_up: 2,
      penetrate: 1.5,
      kick: 1,
      life: 1
    }
  },
  // World 3 - Ice World
  {
    id: 'stage_3_1',
    name: '氷の洞窟',
    world: 3,
    level: 1,
    width: 17,
    height: 13,
    timeLimit: 200,
    map: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,3,0,0,2,2,0,0,0,0,0,2,2,0,0,0,1],
      [1,0,1,0,1,2,1,0,1,0,1,2,1,0,1,0,1],
      [1,0,0,2,2,2,2,0,0,0,2,2,2,2,0,0,1],
      [1,2,1,2,1,0,1,2,1,2,1,0,1,2,1,2,1],
      [1,0,2,2,0,0,0,0,0,0,0,0,0,2,2,0,1],
      [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
      [1,0,2,2,0,0,0,0,0,0,0,0,0,2,2,0,1],
      [1,2,1,2,1,0,1,2,1,2,1,0,1,2,1,2,1],
      [1,0,0,2,2,2,2,0,0,0,2,2,2,2,0,0,1],
      [1,0,1,0,1,2,1,0,1,0,1,2,1,0,1,0,1],
      [1,0,0,0,2,2,0,0,0,0,0,2,2,0,0,4,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    enemies: [
      { x: 15, y: 1, type: 'ice_golem' },
      { x: 1, y: 11, type: 'ice_golem' },
      { x: 8, y: 6, type: 'skeleton' },
      { x: 4, y: 4, type: 'slime' },
      { x: 12, y: 8, type: 'slime' },
      { x: 8, y: 3, type: 'bat' }
    ],
    itemRates: {
      bomb_up: 2,
      fire_up: 2.5,
      speed_up: 2,
      penetrate: 1,
      kick: 1,
      life: 1,
      shield: 0.5
    }
  },
  {
    id: 'stage_3_2',
    name: '影の回廊',
    world: 3,
    level: 2,
    width: 17,
    height: 13,
    timeLimit: 220,
    map: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,3,0,0,0,0,2,0,0,0,2,0,0,0,0,0,1],
      [1,0,1,2,1,0,1,2,1,2,1,0,1,2,1,0,1],
      [1,0,2,0,2,0,2,0,0,0,2,0,2,0,2,0,1],
      [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
      [1,2,2,0,0,0,0,0,0,0,0,0,0,0,2,2,1],
      [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
      [1,2,2,0,0,0,0,0,0,0,0,0,0,0,2,2,1],
      [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
      [1,0,2,0,2,0,2,0,0,0,2,0,2,0,2,0,1],
      [1,0,1,2,1,0,1,2,1,2,1,0,1,2,1,0,1],
      [1,0,0,0,0,0,2,0,0,0,2,0,0,0,0,4,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    enemies: [
      { x: 15, y: 1, type: 'shadow' },
      { x: 1, y: 11, type: 'shadow' },
      { x: 8, y: 6, type: 'wizard' },
      { x: 4, y: 5, type: 'skeleton' },
      { x: 12, y: 7, type: 'skeleton' },
      { x: 8, y: 3, type: 'ghost' }
    ],
    itemRates: {
      bomb_up: 2,
      fire_up: 2,
      speed_up: 2.5,
      penetrate: 1.5,
      kick: 1,
      life: 0.5,
      shield: 0.5
    }
  },
  {
    id: 'stage_3_3',
    name: '魔王の城',
    world: 3,
    level: 3,
    width: 19,
    height: 15,
    timeLimit: 300,
    map: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,3,0,0,2,2,2,2,0,0,0,2,2,2,2,0,0,0,1],
      [1,0,1,0,1,0,1,2,1,0,1,2,1,0,1,0,1,0,1],
      [1,0,0,0,0,0,2,2,2,0,2,2,2,0,0,0,0,0,1],
      [1,2,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,2,1],
      [1,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,1],
      [1,0,1,0,1,0,1,0,0,0,0,0,1,0,1,0,1,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,0,1,0,1,0,0,0,0,0,1,0,1,0,1,0,1],
      [1,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,1],
      [1,2,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,2,1],
      [1,0,0,0,0,0,2,2,2,0,2,2,2,0,0,0,0,0,1],
      [1,0,1,0,1,0,1,2,1,0,1,2,1,0,1,0,1,0,1],
      [1,0,0,0,2,2,2,2,0,0,0,2,2,2,2,0,0,4,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    enemies: [
      { x: 9, y: 7, type: 'dragon' },
      { x: 4, y: 3, type: 'demon' },
      { x: 14, y: 3, type: 'demon' },
      { x: 4, y: 11, type: 'fire_spirit' },
      { x: 14, y: 11, type: 'fire_spirit' },
      { x: 1, y: 7, type: 'wizard' },
      { x: 17, y: 7, type: 'wizard' },
      { x: 9, y: 4, type: 'shadow' },
      { x: 9, y: 10, type: 'shadow' }
    ],
    itemRates: {
      bomb_up: 2,
      fire_up: 2.5,
      speed_up: 2,
      penetrate: 1.5,
      kick: 1,
      life: 0.5,
      shield: 0.5
    }
  },
  // World 4 - Fire World
  {
    id: 'stage_4_1',
    name: '灼熱の荒野',
    world: 4,
    level: 1,
    width: 15,
    height: 11,
    timeLimit: 180,
    map: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,3,0,0,2,0,0,0,0,0,2,0,0,0,1],
      [1,0,1,2,1,2,1,0,1,2,1,2,1,0,1],
      [1,0,2,2,2,2,0,0,0,2,2,2,2,0,1],
      [1,0,1,2,1,0,1,2,1,0,1,2,1,0,1],
      [1,0,0,0,0,0,2,2,2,0,0,0,0,0,1],
      [1,0,1,2,1,0,1,2,1,0,1,2,1,0,1],
      [1,0,2,2,2,2,0,0,0,2,2,2,2,0,1],
      [1,0,1,2,1,2,1,0,1,2,1,2,1,0,1],
      [1,0,0,0,2,0,0,0,0,0,2,0,0,4,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    enemies: [
      { x: 13, y: 1, type: 'fire_spirit' },
      { x: 7, y: 5, type: 'fire_spirit' },
      { x: 3, y: 9, type: 'slime' },
      { x: 11, y: 3, type: 'bat' },
      { x: 5, y: 7, type: 'skeleton' }
    ],
    itemRates: {
      bomb_up: 2.5,
      fire_up: 3,
      speed_up: 2,
      penetrate: 1,
      kick: 1,
      life: 0.5
    }
  },
  {
    id: 'stage_4_2',
    name: '炎の神殿',
    world: 4,
    level: 2,
    width: 17,
    height: 13,
    timeLimit: 240,
    map: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,3,0,0,0,2,0,0,0,0,0,2,0,0,0,0,1],
      [1,0,1,0,1,2,1,0,1,0,1,2,1,0,1,0,1],
      [1,0,0,0,2,2,2,0,0,0,2,2,2,0,0,0,1],
      [1,0,1,2,1,0,1,0,1,0,1,0,1,2,1,0,1],
      [1,2,2,2,0,0,0,0,0,0,0,0,0,2,2,2,1],
      [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
      [1,2,2,2,0,0,0,0,0,0,0,0,0,2,2,2,1],
      [1,0,1,2,1,0,1,0,1,0,1,0,1,2,1,0,1],
      [1,0,0,0,2,2,2,0,0,0,2,2,2,0,0,0,1],
      [1,0,1,0,1,2,1,0,1,0,1,2,1,0,1,0,1],
      [1,0,0,0,0,2,0,0,0,0,0,2,0,0,0,4,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    enemies: [
      { x: 15, y: 1, type: 'fire_spirit' },
      { x: 1, y: 11, type: 'fire_spirit' },
      { x: 8, y: 6, type: 'demon' },
      { x: 4, y: 4, type: 'chaser' },
      { x: 12, y: 8, type: 'chaser' },
      { x: 8, y: 3, type: 'bat' },
      { x: 8, y: 9, type: 'skeleton' }
    ],
    itemRates: {
      bomb_up: 2,
      fire_up: 2.5,
      speed_up: 2,
      penetrate: 1.5,
      kick: 1,
      life: 0.5,
      time_bonus: 0.5
    }
  },
  {
    id: 'stage_4_3',
    name: '業火の竜',
    world: 4,
    level: 3,
    width: 19,
    height: 15,
    timeLimit: 300,
    map: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,3,0,0,0,2,2,2,0,0,0,2,2,2,0,0,0,0,1],
      [1,0,1,0,1,0,1,2,1,0,1,2,1,0,1,0,1,0,1],
      [1,0,0,2,0,0,2,2,0,0,0,2,2,0,0,2,0,0,1],
      [1,0,1,2,1,0,1,0,1,0,1,0,1,0,1,2,1,0,1],
      [1,2,2,2,0,0,0,0,0,0,0,0,0,0,0,2,2,2,1],
      [1,2,1,0,1,0,1,0,0,0,0,0,1,0,1,0,1,2,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,2,1,0,1,0,1,0,0,0,0,0,1,0,1,0,1,2,1],
      [1,2,2,2,0,0,0,0,0,0,0,0,0,0,0,2,2,2,1],
      [1,0,1,2,1,0,1,0,1,0,1,0,1,0,1,2,1,0,1],
      [1,0,0,2,0,0,2,2,0,0,0,2,2,0,0,2,0,0,1],
      [1,0,1,0,1,0,1,2,1,0,1,2,1,0,1,0,1,0,1],
      [1,0,0,0,0,2,2,2,0,0,0,2,2,2,0,0,0,4,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    enemies: [
      { x: 9, y: 7, type: 'dragon' },
      { x: 9, y: 4, type: 'dragon' },
      { x: 4, y: 5, type: 'demon' },
      { x: 14, y: 5, type: 'demon' },
      { x: 4, y: 9, type: 'fire_spirit' },
      { x: 14, y: 9, type: 'fire_spirit' },
      { x: 1, y: 7, type: 'wizard' },
      { x: 17, y: 7, type: 'wizard' }
    ],
    itemRates: {
      bomb_up: 2,
      fire_up: 2,
      speed_up: 2,
      penetrate: 1.5,
      kick: 1,
      life: 0.5,
      shield: 0.5,
      time_bonus: 0.5
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
  },
  skeleton: {
    id: 'skeleton',
    name: 'スケルトン',
    speed: 0.9,
    pattern: 'patrol',
    wallPass: false,
    bombPass: false,
    color: '#f5f5dc',
    points: 150
  },
  fire_spirit: {
    id: 'fire_spirit',
    name: 'ファイアスピリット',
    speed: 1.3,
    pattern: 'chase',
    wallPass: false,
    bombPass: false,
    color: '#ff6b00',
    points: 350
  },
  ice_golem: {
    id: 'ice_golem',
    name: 'アイスゴーレム',
    speed: 0.5,
    pattern: 'random',
    wallPass: false,
    bombPass: true,
    color: '#87ceeb',
    points: 250
  },
  shadow: {
    id: 'shadow',
    name: 'シャドウ',
    speed: 1.4,
    pattern: 'random',
    wallPass: true,
    bombPass: false,
    color: '#2d2d2d',
    points: 500
  },
  wizard: {
    id: 'wizard',
    name: 'ウィザード',
    speed: 0.8,
    pattern: 'smart',
    wallPass: false,
    bombPass: false,
    color: '#9333ea',
    points: 450
  },
  demon: {
    id: 'demon',
    name: 'デーモン',
    speed: 1.1,
    pattern: 'chase',
    wallPass: true,
    bombPass: true,
    color: '#dc2626',
    points: 600
  },
  dragon: {
    id: 'dragon',
    name: 'ドラゴン',
    speed: 0.6,
    pattern: 'smart',
    wallPass: false,
    bombPass: false,
    color: '#b91c1c',
    points: 800,
    size: 1.3
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
