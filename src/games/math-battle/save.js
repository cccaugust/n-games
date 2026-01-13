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
        coins: 100, // 通常コイン（初期コイン）

        // 学年コイン（ステージクリアで獲得、学年ガチャに使用）
        gradeCoins: {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
            6: 0
        },

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
            totalGradeCoinsEarned: 0,
            totalGachaRolls: 0,
            playTime: 0
        },

        // 挑戦ステージデータ
        challengeData: {
            // dungeon: { clearedFloors: [], bestPoints: {} }
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
        if (!data) return null;

        const player = JSON.parse(data);

        // マイグレーション: 学年コインがない場合は初期化
        if (!player.gradeCoins) {
            player.gradeCoins = {
                1: 0,
                2: 0,
                3: 0,
                4: 0,
                5: 0,
                6: 0
            };
            // 既存のcoinsは通常コインとしてそのまま維持
        }

        // マイグレーション: 統計に学年コイン用フィールドがない場合
        if (player.stats && player.stats.totalGradeCoinsEarned === undefined) {
            player.stats.totalGradeCoinsEarned = 0;
        }

        // マイグレーション: 旧isShiny形式 → 新colorVariant形式
        let needsSave = false;
        player.monsters.forEach(monster => {
            if (monster.isShiny !== undefined && monster.colorVariant === undefined) {
                // 旧形式: isShiny: true → colorVariant: 4 (180度=従来の色違い)
                monster.colorVariant = monster.isShiny ? 4 : 0;
                delete monster.isShiny;
                needsSave = true;
            }
            // colorVariantがない場合は0（通常色）に
            if (monster.colorVariant === undefined) {
                monster.colorVariant = 0;
                needsSave = true;
            }
        });

        // 図鑑のマイグレーション: _shiny → _v4
        if (player.discoveredMonsters) {
            player.discoveredMonsters = player.discoveredMonsters.map(key => {
                if (key.endsWith('_shiny')) {
                    needsSave = true;
                    return key.replace('_shiny', '_v4');
                }
                return key;
            });
        }

        // マイグレーション: 挑戦ステージデータがない場合
        if (!player.challengeData) {
            player.challengeData = {};
            needsSave = true;
        }

        if (needsSave) {
            savePlayerData(player);
        }

        return player;
    } catch (e) {
        console.error('Failed to load player data:', e);
        return null;
    }
}

/**
 * 色違いバリアント数（通常色0 + 色違い1〜7 = 全8パターン）
 */
export const COLOR_VARIANT_COUNT = 8;

/**
 * 色違いバリアントの色相回転角度を取得
 * @param {number} variant - バリアント番号(0〜7)
 * @returns {number} 色相回転角度
 */
export function getColorVariantHue(variant) {
    if (variant === 0) return 0; // 通常色
    // バリアント1〜7: 45度ずつずらす（45, 90, 135, 180, 225, 270, 315）
    return variant * 45;
}

/**
 * モンスターをプレイヤーに追加
 * @param {Object} player - プレイヤーデータ
 * @param {string} monsterId - モンスターID
 * @param {number} colorVariant - 色違いバリアント（0=通常色、1〜7=色違い）
 */
export function addMonsterToPlayer(player, monsterId, colorVariant = 0) {
    // 色違いバリアントごとに別モンスターとして扱う
    const existingMonster = player.monsters.find(
        m => m.monsterId === monsterId && m.colorVariant === colorVariant
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
            colorVariant: colorVariant
        });
    }

    // 図鑑に登録（バリアントごとに別枠で記録）
    const discoveryKey = colorVariant > 0 ? `${monsterId}_v${colorVariant}` : monsterId;
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
 * @param {Object} player - プレイヤーデータ
 * @param {string} stageId - ステージID
 * @param {string} rank - 獲得ランク
 * @param {number} coinsEarned - 獲得した通常コイン
 * @param {number} gradeCoinsEarned - 獲得した学年コイン（オプション、省略時は0）
 * @param {number} grade - 学年（学年コインを付与する学年）
 */
export function recordStageClear(player, stageId, rank, coinsEarned, gradeCoinsEarned = 0, grade = null) {
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

    // 通常コイン追加
    player.coins += coinsEarned;
    player.stats.totalCoinsEarned += coinsEarned;

    // 学年コイン追加
    if (gradeCoinsEarned > 0 && grade !== null && player.gradeCoins) {
        player.gradeCoins[grade] = (player.gradeCoins[grade] || 0) + gradeCoinsEarned;
        player.stats.totalGradeCoinsEarned = (player.stats.totalGradeCoinsEarned || 0) + gradeCoinsEarned;
    }

    savePlayerData(player);
    return { player, isFirstClear };
}

/**
 * 通常コインを消費
 */
export function spendCoins(player, amount) {
    if (player.coins < amount) return false;
    player.coins -= amount;
    savePlayerData(player);
    return true;
}

/**
 * 学年コインを消費
 * @param {Object} player - プレイヤーデータ
 * @param {number} grade - 学年
 * @param {number} amount - 消費量
 * @returns {boolean} 消費成功/失敗
 */
export function spendGradeCoins(player, grade, amount) {
    if (!player.gradeCoins) return false;
    if ((player.gradeCoins[grade] || 0) < amount) return false;
    player.gradeCoins[grade] -= amount;
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

// ===========================================
// 挑戦ステージ関連
// ===========================================

/**
 * 挑戦ステージの階層がアンロックされているか
 * @param {Object} player - プレイヤーデータ
 * @param {string} dungeon - ダンジョンID
 * @param {number} floor - 階層（1-9）
 */
export function isChallengeFloorUnlocked(player, dungeon, floor) {
    if (floor === 1) return true;

    const challengeData = player.challengeData || {};
    const dungeonData = challengeData[dungeon] || {};
    const clearedFloors = dungeonData.clearedFloors || [];

    return clearedFloors.includes(floor - 1);
}

/**
 * 挑戦ステージのベストポイントを取得
 */
export function getChallengeFloorBestPoints(player, dungeon, floor) {
    const challengeData = player.challengeData || {};
    const dungeonData = challengeData[dungeon] || {};
    const bestPoints = dungeonData.bestPoints || {};
    return bestPoints[`floor_${floor}`] || 0;
}

/**
 * 挑戦ステージの階層クリアを記録
 * @param {Object} player - プレイヤーデータ
 * @param {string} dungeon - ダンジョンID
 * @param {number} floor - 階層
 * @param {number} points - 獲得ポイント
 * @param {number} coinsEarned - 獲得した通常コイン
 * @param {number} gradeCoinsEarned - 獲得した学年コイン
 * @param {number} grade - 学年コインの学年
 */
export function recordChallengeFloorClear(player, dungeon, floor, points, coinsEarned, gradeCoinsEarned = 0, grade = null) {
    if (!player.challengeData) {
        player.challengeData = {};
    }
    if (!player.challengeData[dungeon]) {
        player.challengeData[dungeon] = {
            clearedFloors: [],
            bestPoints: {}
        };
    }

    const dungeonData = player.challengeData[dungeon];

    // クリア記録
    if (!dungeonData.clearedFloors.includes(floor)) {
        dungeonData.clearedFloors.push(floor);
    }

    // ベストポイント更新
    const bestKey = `floor_${floor}`;
    const isNewBest = !dungeonData.bestPoints[bestKey] || points > dungeonData.bestPoints[bestKey];
    if (isNewBest) {
        dungeonData.bestPoints[bestKey] = points;
    }

    // 通常コイン追加
    player.coins += coinsEarned;
    player.stats.totalCoinsEarned += coinsEarned;

    // 学年コイン追加
    if (gradeCoinsEarned > 0 && grade !== null && player.gradeCoins) {
        player.gradeCoins[grade] = (player.gradeCoins[grade] || 0) + gradeCoinsEarned;
        player.stats.totalGradeCoinsEarned = (player.stats.totalGradeCoinsEarned || 0) + gradeCoinsEarned;
    }

    savePlayerData(player);
    return { isNewBest };
}
