/**
 * セーブ/ロード機能
 * LocalStorageを使用したプレイヤーデータの永続化
 */

const SAVE_KEY = 'mathBattle_saveData_v1';
const PLAYERS_KEY = 'mathBattle_players_v1';

/**
 * 初期プレイヤーデータ
 */
export function createNewPlayer(name) {
    return {
        id: generatePlayerId(),
        name: name,
        createdAt: Date.now(),
        lastPlayedAt: Date.now(),

        // 所持金
        coins: 100, // 初期コイン

        // パーティ（最大4体）
        party: [],

        // 所持モンスター
        monsters: [], // { monsterId, level, exp }

        // クリア済みステージ
        clearedStages: [], // stageId の配列

        // ステージのベストランク
        stageRanks: {}, // { stageId: rank }

        // 図鑑（発見済みモンスター）
        discoveredMonsters: [], // monsterId の配列

        // 統計
        stats: {
            totalQuestionsAnswered: 0,
            totalCorrectAnswers: 0,
            totalStagesCleared: 0,
            totalCoinsEarned: 0,
            totalGachaRolls: 0,
            playTime: 0
        }
    };
}

/**
 * プレイヤーIDを生成
 */
function generatePlayerId() {
    return 'player_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * プレイヤーリストを取得
 */
export function getPlayerList() {
    try {
        const data = localStorage.getItem(PLAYERS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Failed to load player list:', e);
        return [];
    }
}

/**
 * プレイヤーリストを保存
 */
function savePlayerList(players) {
    try {
        localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
    } catch (e) {
        console.error('Failed to save player list:', e);
    }
}

/**
 * プレイヤーを追加
 */
export function addPlayer(name) {
    const player = createNewPlayer(name);
    const players = getPlayerList();
    players.push({ id: player.id, name: player.name });
    savePlayerList(players);
    savePlayerData(player);
    return player;
}

/**
 * プレイヤーを削除
 */
export function deletePlayer(playerId) {
    const players = getPlayerList().filter(p => p.id !== playerId);
    savePlayerList(players);
    try {
        localStorage.removeItem(`${SAVE_KEY}_${playerId}`);
    } catch (e) {
        console.error('Failed to delete player data:', e);
    }
}

/**
 * プレイヤーデータを保存
 */
export function savePlayerData(player) {
    try {
        player.lastPlayedAt = Date.now();
        localStorage.setItem(`${SAVE_KEY}_${player.id}`, JSON.stringify(player));

        // プレイヤーリストも更新
        const players = getPlayerList();
        const idx = players.findIndex(p => p.id === player.id);
        if (idx >= 0) {
            players[idx].name = player.name;
        }
        savePlayerList(players);
    } catch (e) {
        console.error('Failed to save player data:', e);
    }
}

/**
 * プレイヤーデータを読み込み
 */
export function loadPlayerData(playerId) {
    try {
        const data = localStorage.getItem(`${SAVE_KEY}_${playerId}`);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Failed to load player data:', e);
        return null;
    }
}

/**
 * モンスターをプレイヤーに追加
 * @param {Object} player - プレイヤーデータ
 * @param {string} monsterId - モンスターID
 * @param {boolean} isShiny - 色違いかどうか
 */
export function addMonsterToPlayer(player, monsterId, isShiny = false) {
    // 色違いかどうかで別モンスターとして扱う
    const existingMonster = player.monsters.find(
        m => m.monsterId === monsterId && m.isShiny === isShiny
    );

    if (existingMonster) {
        // 既に持っている場合は経験値を付与（重複ボーナス）
        existingMonster.exp += 50;
    } else {
        // 新規追加
        player.monsters.push({
            monsterId: monsterId,
            level: 1,
            exp: 0,
            isShiny: isShiny
        });
    }

    // 図鑑に登録（色違いは別枠で記録）
    const discoveryKey = isShiny ? `${monsterId}_shiny` : monsterId;
    if (!player.discoveredMonsters.includes(discoveryKey)) {
        player.discoveredMonsters.push(discoveryKey);
    }

    savePlayerData(player);
    return player;
}

/**
 * モンスターの経験値を追加
 */
export function addExpToMonster(player, monsterIndex, exp) {
    const monster = player.monsters[monsterIndex];
    if (!monster) return player;

    monster.exp += exp;

    // レベルアップ判定
    // 必要経験値: level * 100
    const requiredExp = monster.level * 100;
    while (monster.exp >= requiredExp && monster.level < 99) {
        monster.exp -= requiredExp;
        monster.level++;
    }

    savePlayerData(player);
    return player;
}

/**
 * パーティにモンスターを追加
 */
export function addToParty(player, monsterIndex) {
    if (player.party.length >= 4) return player;
    if (player.party.includes(monsterIndex)) return player;

    player.party.push(monsterIndex);
    savePlayerData(player);
    return player;
}

/**
 * パーティからモンスターを削除
 */
export function removeFromParty(player, partyIndex) {
    player.party.splice(partyIndex, 1);
    savePlayerData(player);
    return player;
}

/**
 * ステージクリアを記録
 */
export function recordStageClear(player, stageId, rank, coinsEarned) {
    const isFirstClear = !player.clearedStages.includes(stageId);

    if (isFirstClear) {
        player.clearedStages.push(stageId);
        player.stats.totalStagesCleared++;
    }

    // ベストランクを更新
    const currentRank = player.stageRanks[stageId] || '';
    const rankOrder = { '': 0, 'C': 1, 'B': 2, 'A': 3, 'S': 4 };
    if (rankOrder[rank] > rankOrder[currentRank]) {
        player.stageRanks[stageId] = rank;
    }

    // コイン追加
    player.coins += coinsEarned;
    player.stats.totalCoinsEarned += coinsEarned;

    savePlayerData(player);
    return { player, isFirstClear };
}

/**
 * コインを消費
 */
export function spendCoins(player, amount) {
    if (player.coins < amount) return false;
    player.coins -= amount;
    savePlayerData(player);
    return true;
}

/**
 * 統計を更新
 */
export function updateStats(player, questionsAnswered, correctAnswers) {
    player.stats.totalQuestionsAnswered += questionsAnswered;
    player.stats.totalCorrectAnswers += correctAnswers;
    savePlayerData(player);
    return player;
}

/**
 * ガチャを回した回数を記録
 */
export function recordGachaRoll(player, count) {
    player.stats.totalGachaRolls += count;
    savePlayerData(player);
    return player;
}

/**
 * 進化可能かチェック
 */
export function canEvolve(player, monsterIndex, monsterData) {
    const ownedMonster = player.monsters[monsterIndex];
    if (!ownedMonster) return false;

    const baseMonster = monsterData.find(m => m.id === ownedMonster.monsterId);
    if (!baseMonster || !baseMonster.evolution) return false;

    return ownedMonster.level >= baseMonster.evolutionLevel;
}

/**
 * モンスターを進化
 */
export function evolveMonster(player, monsterIndex, monsterData) {
    const ownedMonster = player.monsters[monsterIndex];
    if (!ownedMonster) return { success: false };

    const baseMonster = monsterData.find(m => m.id === ownedMonster.monsterId);
    if (!baseMonster || !baseMonster.evolution) return { success: false };

    if (ownedMonster.level < baseMonster.evolutionLevel) return { success: false };

    // 進化実行
    const oldMonsterId = ownedMonster.monsterId;
    ownedMonster.monsterId = baseMonster.evolution;

    // 図鑑に登録
    if (!player.discoveredMonsters.includes(baseMonster.evolution)) {
        player.discoveredMonsters.push(baseMonster.evolution);
    }

    savePlayerData(player);
    return { success: true, oldMonsterId, newMonsterId: baseMonster.evolution };
}

/**
 * 初期モンスターを付与（新規プレイヤー用）
 */
export function giveStarterMonster(player, monsterId) {
    return addMonsterToPlayer(player, monsterId);
}
