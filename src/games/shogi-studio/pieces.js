// 駒データ（将棋＋拡張）
// ルール判定は「対応している駒のみ」に限定できるよう、moves は任意。

/**
 * @typedef {{ dx:number, dy:number, repeat?:boolean }} Move
 * @typedef {{
 *   id: string,
 *   name: string,
 *   label: string,
 *   pack: 'standard'|'makadaidai-lite',
 *   description: string,
 *   moves?: Move[],
 *   promoteTo?: string,
 *   demoteTo?: string
 * }} PieceDef
 */

/** @type {Record<string, PieceDef>} */
export const PIECES = {
  // === Standard Shogi ===
  K: { id: 'K', name: '玉', label: '玉', pack: 'standard', description: 'どの方向にも1マス動ける。', moves: [
    { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 0 }, { dx: 1, dy: 1 },
    { dx: 0, dy: 1 }, { dx: -1, dy: 1 }, { dx: -1, dy: 0 }, { dx: -1, dy: -1 }
  ]},
  R: { id: 'R', name: '飛車', label: '飛', pack: 'standard', description: '縦横に何マスでも動ける。', moves: [
    { dx: 0, dy: -1, repeat: true }, { dx: 1, dy: 0, repeat: true }, { dx: 0, dy: 1, repeat: true }, { dx: -1, dy: 0, repeat: true }
  ], promoteTo: 'R+' },
  B: { id: 'B', name: '角', label: '角', pack: 'standard', description: '斜めに何マスでも動ける。', moves: [
    { dx: 1, dy: -1, repeat: true }, { dx: 1, dy: 1, repeat: true }, { dx: -1, dy: 1, repeat: true }, { dx: -1, dy: -1, repeat: true }
  ], promoteTo: 'B+' },
  G: { id: 'G', name: '金', label: '金', pack: 'standard', description: '前・前斜め・横・後ろに1マス（後ろ斜めは×）。', moves: [
    { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: -1 },
    { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
    { dx: 0, dy: 1 }
  ]},
  S: { id: 'S', name: '銀', label: '銀', pack: 'standard', description: '前・前斜め・後ろ斜めに1マス。', moves: [
    { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: -1 }, { dx: 1, dy: 1 }, { dx: -1, dy: 1 }
  ], promoteTo: 'S+' },
  N: { id: 'N', name: '桂馬', label: '桂', pack: 'standard', description: '前方向に2マス進んで左右に1マス（ジャンプ）。', moves: [
    { dx: -1, dy: -2 }, { dx: 1, dy: -2 }
  ], promoteTo: 'N+' },
  L: { id: 'L', name: '香車', label: '香', pack: 'standard', description: '前方向に何マスでも動ける。', moves: [{ dx: 0, dy: -1, repeat: true }], promoteTo: 'L+' },
  P: { id: 'P', name: '歩', label: '歩', pack: 'standard', description: '前に1マス。', moves: [{ dx: 0, dy: -1 }], promoteTo: 'P+' },

  'R+': { id: 'R+', name: '龍王', label: '龍', pack: 'standard', description: '飛車＋斜めに1マス。', moves: [
    { dx: 0, dy: -1, repeat: true }, { dx: 1, dy: 0, repeat: true }, { dx: 0, dy: 1, repeat: true }, { dx: -1, dy: 0, repeat: true },
    { dx: 1, dy: -1 }, { dx: 1, dy: 1 }, { dx: -1, dy: 1 }, { dx: -1, dy: -1 }
  ], demoteTo: 'R' },
  'B+': { id: 'B+', name: '龍馬', label: '馬', pack: 'standard', description: '角＋縦横に1マス。', moves: [
    { dx: 1, dy: -1, repeat: true }, { dx: 1, dy: 1, repeat: true }, { dx: -1, dy: 1, repeat: true }, { dx: -1, dy: -1, repeat: true },
    { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
  ], demoteTo: 'B' },
  'S+': { id: 'S+', name: '成銀', label: '全', pack: 'standard', description: '金と同じ動き。', moves: [
    { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: -1 },
    { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
    { dx: 0, dy: 1 }
  ], demoteTo: 'S' },
  'N+': { id: 'N+', name: '成桂', label: '圭', pack: 'standard', description: '金と同じ動き。', moves: [
    { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: -1 },
    { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
    { dx: 0, dy: 1 }
  ], demoteTo: 'N' },
  'L+': { id: 'L+', name: '成香', label: '杏', pack: 'standard', description: '金と同じ動き。', moves: [
    { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: -1 },
    { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
    { dx: 0, dy: 1 }
  ], demoteTo: 'L' },
  'P+': { id: 'P+', name: 'と金', label: 'と', pack: 'standard', description: '金と同じ動き。', moves: [
    { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: -1 },
    { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
    { dx: 0, dy: 1 }
  ], demoteTo: 'P' },

  // === Makadaidai (lite) ===
  // ここは「選べる＋図鑑がある」ことを優先し、移動チェックは moves がある駒のみ対応。
  // ※実在ルールの完全再現ではなく、遊びやすい簡易版の説明/図にしています。
  LI: { id: 'LI', name: '獅子', label: '獅', pack: 'makadaidai-lite', description: '強い駒。近く（最大2マス）へ動ける簡易ルール。', moves: [
    { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 0 }, { dx: 1, dy: 1 },
    { dx: 0, dy: 1 }, { dx: -1, dy: 1 }, { dx: -1, dy: 0 }, { dx: -1, dy: -1 },
    { dx: 0, dy: -2 }, { dx: 2, dy: -2 }, { dx: 2, dy: 0 }, { dx: 2, dy: 2 },
    { dx: 0, dy: 2 }, { dx: -2, dy: 2 }, { dx: -2, dy: 0 }, { dx: -2, dy: -2 },
    { dx: 1, dy: -2 }, { dx: -1, dy: -2 }, { dx: 2, dy: -1 }, { dx: 2, dy: 1 },
    { dx: 1, dy: 2 }, { dx: -1, dy: 2 }, { dx: -2, dy: -1 }, { dx: -2, dy: 1 }
  ]},
  KI: { id: 'KI', name: '麒麟', label: '麒', pack: 'makadaidai-lite', description: '斜めに1マス＋縦横に2マス（ジャンプ）で動ける簡易ルール。', moves: [
    { dx: 1, dy: -1 }, { dx: 1, dy: 1 }, { dx: -1, dy: 1 }, { dx: -1, dy: -1 },
    { dx: 0, dy: -2 }, { dx: 2, dy: 0 }, { dx: 0, dy: 2 }, { dx: -2, dy: 0 }
  ]},
  HO: { id: 'HO', name: '鳳凰', label: '鳳', pack: 'makadaidai-lite', description: '縦横に1マス＋斜めに2マス（ジャンプ）で動ける簡易ルール。', moves: [
    { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 },
    { dx: 2, dy: -2 }, { dx: 2, dy: 2 }, { dx: -2, dy: 2 }, { dx: -2, dy: -2 }
  ]},
  DR: { id: 'DR', name: '龍', label: '龍', pack: 'makadaidai-lite', description: '縦横に何マスでも動ける。', moves: [
    { dx: 0, dy: -1, repeat: true }, { dx: 1, dy: 0, repeat: true }, { dx: 0, dy: 1, repeat: true }, { dx: -1, dy: 0, repeat: true }
  ]},
  TB: { id: 'TB', name: '天馬', label: '天', pack: 'makadaidai-lite', description: '斜めに何マスでも動ける。', moves: [
    { dx: 1, dy: -1, repeat: true }, { dx: 1, dy: 1, repeat: true }, { dx: -1, dy: 1, repeat: true }, { dx: -1, dy: -1, repeat: true }
  ]},
  EL: { id: 'EL', name: '象', label: '象', pack: 'makadaidai-lite', description: '前斜めと横に1マス。', moves: [
    { dx: 1, dy: -1 }, { dx: -1, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }
  ]},
  WF: { id: 'WF', name: '狼', label: '狼', pack: 'makadaidai-lite', description: '前後左右に1マス。', moves: [
    { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
  ]},
  BE: { id: 'BE', name: '熊', label: '熊', pack: 'makadaidai-lite', description: '斜めに1マス。', moves: [
    { dx: 1, dy: -1 }, { dx: 1, dy: 1 }, { dx: -1, dy: 1 }, { dx: -1, dy: -1 }
  ]},
};

export const PIECE_PACKS = {
  standard: {
    id: 'standard',
    name: '通常（将棋）',
    pieces: ['K', 'R', 'B', 'G', 'S', 'N', 'L', 'P', 'R+', 'B+', 'S+', 'N+', 'L+', 'P+']
  },
  'makadaidai-lite': {
    id: 'makadaidai-lite',
    name: '拡張（摩訶大大将棋から一部）',
    pieces: [
      'K', 'R', 'B', 'G', 'S', 'N', 'L', 'P', 'R+', 'B+', 'S+', 'N+', 'L+', 'P+',
      'LI', 'KI', 'HO', 'DR', 'TB', 'EL', 'WF', 'BE'
    ]
  }
};

export function getPieceDef(id) {
  return PIECES[id] || null;
}

export function listPiecesByPack(packId) {
  const pack = PIECE_PACKS[packId];
  if (!pack) return [];
  return pack.pieces.map((id) => PIECES[id]).filter(Boolean);
}

export function listAllPieces() {
  return Object.values(PIECES);
}

export function toHandKind(kind) {
  const def = getPieceDef(kind);
  return def?.demoteTo || kind;
}

