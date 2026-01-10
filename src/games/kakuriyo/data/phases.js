/**
 * フェーズ（ステージ区分）データ定義
 * 幽世塔は7つのフェーズに分かれている
 */

export const PHASES = [
  {
    id: 1,
    name: '黄泉路',
    subtitle: 'よみじ',
    floors: [1, 10],
    description: '死者の魂が通る道。亡者がさまよう…',
    bgColor: '#1a1a2e',          // 背景色
    floorColor: '#3a3a4a',       // 床の色
    wallColor: '#2a2a3a',        // 壁の色
    ambientColor: 'rgba(100, 80, 180, 0.1)', // 環境光
    fogColor: 'rgba(30, 20, 50, 0.7)'
  },
  {
    id: 2,
    name: '古戦場',
    subtitle: 'こせんじょう',
    floors: [11, 25],
    description: '幾多の合戦が繰り広げられた地。武者の怨念が渦巻く',
    bgColor: '#1e1e28',
    floorColor: '#4a3a3a',
    wallColor: '#3a2a2a',
    ambientColor: 'rgba(180, 80, 80, 0.1)',
    fogColor: 'rgba(50, 20, 20, 0.7)'
  },
  {
    id: 3,
    name: '餓鬼道',
    subtitle: 'がきどう',
    floors: [26, 40],
    description: '飢えた亡者がさまよう道。すべてを喰らい尽くす…',
    bgColor: '#1a2018',
    floorColor: '#3a4a3a',
    wallColor: '#2a3a2a',
    ambientColor: 'rgba(80, 180, 80, 0.1)',
    fogColor: 'rgba(20, 50, 20, 0.7)'
  },
  {
    id: 4,
    name: '修羅道',
    subtitle: 'しゅらどう',
    floors: [41, 55],
    description: '終わりなき戦いの世界。鬼神が猛る',
    bgColor: '#2a1a1a',
    floorColor: '#5a3a3a',
    wallColor: '#4a2a2a',
    ambientColor: 'rgba(200, 50, 50, 0.15)',
    fogColor: 'rgba(60, 10, 10, 0.7)'
  },
  {
    id: 5,
    name: '畜生道',
    subtitle: 'ちくしょうどう',
    floors: [56, 70],
    description: '獣と化した魂がうごめく。本能に従い襲い来る',
    bgColor: '#1a1a20',
    floorColor: '#4a4a5a',
    wallColor: '#3a3a4a',
    ambientColor: 'rgba(80, 80, 180, 0.1)',
    fogColor: 'rgba(20, 20, 50, 0.7)'
  },
  {
    id: 6,
    name: '人道・天道',
    subtitle: 'じんどう・てんどう',
    floors: [71, 99],
    description: '光と闇が交差する場所。輪廻の守護者が待ち受ける',
    bgColor: '#1a1820',
    floorColor: '#4a4050',
    wallColor: '#3a3040',
    ambientColor: 'rgba(180, 150, 200, 0.12)',
    fogColor: 'rgba(40, 30, 50, 0.7)'
  },
  {
    id: 7,
    name: '輪廻の間',
    subtitle: 'りんねのま',
    floors: [100, 100],
    description: '最深部。輪廻守が現世への道を阻む',
    bgColor: '#0a0a15',
    floorColor: '#2a2a4a',
    wallColor: '#1a1a3a',
    ambientColor: 'rgba(150, 100, 200, 0.2)',
    fogColor: 'rgba(20, 10, 40, 0.6)',
    isBossFloor: true
  }
];

/**
 * 指定階層のフェーズを取得
 */
export function getPhaseForFloor(floor) {
  for (const phase of PHASES) {
    if (floor >= phase.floors[0] && floor <= phase.floors[1]) {
      return phase;
    }
  }
  // フォールバック: 最後のフェーズ
  return PHASES[PHASES.length - 1];
}

/**
 * フェーズIDからフェーズを取得
 */
export function getPhaseById(id) {
  return PHASES.find(p => p.id === id) || PHASES[0];
}

/**
 * 次のフェーズかどうかチェック
 * @param {number} currentFloor 現在の階層
 * @param {number} nextFloor 次の階層
 * @returns {Object|null} フェーズが変わる場合は新しいフェーズ、そうでなければnull
 */
export function checkPhaseChange(currentFloor, nextFloor) {
  const currentPhase = getPhaseForFloor(currentFloor);
  const nextPhase = getPhaseForFloor(nextFloor);

  if (currentPhase.id !== nextPhase.id) {
    return nextPhase;
  }
  return null;
}
