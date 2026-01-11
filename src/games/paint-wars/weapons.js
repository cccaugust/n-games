// ===== PAINT WARS - Weapons Data =====

export const WEAPONS = [
  {
    id: 'shooter',
    name: 'シューター',
    type: 'shooter',
    icon: '🔫',
    description: 'バランスの良い基本武器',
    stats: {
      range: 3,
      rate: 4,
      paint: 3,
      mobility: 3
    },
    damage: 20,
    fireRate: 10,
    inkCost: 2,
    range: 15,
    optimalRange: 10,
    moveSpeedMod: 1.0,
    canSlide: false
  },
  {
    id: 'roller',
    name: 'ローラー',
    type: 'roller',
    icon: '🖌️',
    description: '転がして広く塗れる',
    stats: {
      range: 1,
      rate: 0,
      paint: 5,
      mobility: 2
    },
    damage: 70,
    fireRate: 0,
    inkCost: 5,
    range: 3,
    optimalRange: 2,
    moveSpeedMod: 0.8,
    canSlide: false
  },
  {
    id: 'charger',
    name: 'チャージャー',
    type: 'charger',
    icon: '🎯',
    description: 'チャージで長射程狙撃',
    stats: {
      range: 5,
      rate: 1,
      paint: 2,
      mobility: 2
    },
    damage: 100,
    fireRate: 1,
    inkCost: 25,
    range: 25,
    optimalRange: 20,
    moveSpeedMod: 0.9,
    canSlide: false
  },
  {
    id: 'blaster',
    name: 'ブラスター',
    type: 'blaster',
    icon: '💥',
    description: '爆発で範囲攻撃',
    stats: {
      range: 2,
      rate: 2,
      paint: 4,
      mobility: 3
    },
    damage: 50,
    fireRate: 2,
    inkCost: 8,
    range: 12,
    optimalRange: 8,
    moveSpeedMod: 1.0,
    canSlide: false
  },
  {
    id: 'dual',
    name: 'デュアル',
    type: 'dual',
    icon: '🔫🔫',
    description: '二丁拳銃でスライド可能',
    stats: {
      range: 2,
      rate: 5,
      paint: 2,
      mobility: 5
    },
    damage: 15,
    fireRate: 16,
    inkCost: 1.5,
    range: 10,
    optimalRange: 6,
    moveSpeedMod: 1.1,
    canSlide: true
  }
];

export const SUB_WEAPONS = [
  {
    id: 'bomb',
    name: 'スプラッシュボム',
    type: 'bomb',
    icon: '💣',
    description: '投げて爆発する爆弾',
    cooldown: 8,
    damage: 60,
    radius: 3
  },
  {
    id: 'shield',
    name: 'シールド',
    type: 'shield',
    icon: '🛡️',
    description: '3秒間ダメージ無効',
    cooldown: 15,
    duration: 3
  },
  {
    id: 'sensor',
    name: 'センサー',
    type: 'sensor',
    icon: '📡',
    description: '敵の位置を表示',
    cooldown: 12,
    duration: 5,
    radius: 10
  }
];

export const SPECIAL_WEAPONS = [
  {
    id: 'inkstrike',
    name: 'インクストライク',
    type: 'inkstrike',
    icon: '🌧️',
    description: '指定地点に大量のインクを降らせる',
    radius: 8
  },
  {
    id: 'barrier',
    name: 'バリア',
    type: 'barrier',
    icon: '✨',
    description: '自分と周囲の味方を無敵化',
    duration: 5,
    radius: 5
  },
  {
    id: 'megalaser',
    name: 'メガホンレーザー',
    type: 'megalaser',
    icon: '📢',
    description: '極太レーザーで貫通塗り',
    duration: 3,
    width: 3
  }
];
