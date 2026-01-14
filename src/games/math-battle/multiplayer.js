/**
 * 算数バトル - マルチプレイヤーモジュール
 * Supabaseを使ったリアルタイム対戦・交換機能
 */

import { supabase } from '../../js/supabaseClient.js';

// ===========================================
// 定数
// ===========================================
export const ROOM_TYPES = {
    BATTLE: 'battle',
    TRADE: 'trade'
};

export const ROOM_STATUS = {
    WAITING: 'waiting',    // ゲスト待ち
    READY: 'ready',        // 両者準備完了
    PLAYING: 'playing',    // 対戦中
    FINISHED: 'finished'   // 終了
};

export const BATTLE_DURATION = 180; // 3分 = 180秒

// ===========================================
// ルームコード生成
// ===========================================
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// ===========================================
// ルーム管理
// ===========================================

/**
 * 新しいルームを作成
 */
export async function createRoom(roomType, hostPlayer) {
    const roomCode = generateRoomCode();

    const { data, error } = await supabase
        .from('math_battle_rooms')
        .insert({
            room_code: roomCode,
            room_type: roomType,
            host_player_id: hostPlayer.id,
            host_player_name: hostPlayer.name,
            host_party: hostPlayer.party,
            status: ROOM_STATUS.WAITING
        })
        .select()
        .single();

    if (error) {
        console.error('ルーム作成エラー:', error);
        // ルームコード重複の場合はリトライ
        if (error.code === '23505') {
            return createRoom(roomType, hostPlayer);
        }
        throw error;
    }

    return data;
}

/**
 * ルームコードでルームに参加
 */
export async function joinRoom(roomCode, guestPlayer) {
    // まずルームを検索
    const { data: room, error: findError } = await supabase
        .from('math_battle_rooms')
        .select('*')
        .eq('room_code', roomCode.toUpperCase())
        .eq('status', ROOM_STATUS.WAITING)
        .single();

    if (findError || !room) {
        return { error: 'ルームが見つかりません' };
    }

    // 自分のルームには参加できない
    if (room.host_player_id === guestPlayer.id) {
        return { error: '自分のルームには参加できません' };
    }

    // ゲストとして参加
    const { data, error } = await supabase
        .from('math_battle_rooms')
        .update({
            guest_player_id: guestPlayer.id,
            guest_player_name: guestPlayer.name,
            guest_party: guestPlayer.party
        })
        .eq('id', room.id)
        .eq('status', ROOM_STATUS.WAITING)
        .select()
        .single();

    if (error) {
        console.error('ルーム参加エラー:', error);
        return { error: 'ルームへの参加に失敗しました' };
    }

    return { data };
}

/**
 * ルーム情報を取得
 */
export async function getRoom(roomId) {
    const { data, error } = await supabase
        .from('math_battle_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

    if (error) {
        console.error('ルーム取得エラー:', error);
        return null;
    }

    return data;
}

/**
 * ルームを更新
 */
export async function updateRoom(roomId, updates) {
    const { data, error } = await supabase
        .from('math_battle_rooms')
        .update(updates)
        .eq('id', roomId)
        .select()
        .single();

    if (error) {
        console.error('ルーム更新エラー:', error);
        return null;
    }

    return data;
}

/**
 * ルームを削除（退出時）
 */
export async function deleteRoom(roomId) {
    const { error } = await supabase
        .from('math_battle_rooms')
        .delete()
        .eq('id', roomId);

    if (error) {
        console.error('ルーム削除エラー:', error);
    }
}

/**
 * ゲストがルームから退出
 */
export async function leaveRoom(roomId) {
    const { data, error } = await supabase
        .from('math_battle_rooms')
        .update({
            guest_player_id: null,
            guest_player_name: null,
            guest_party: null,
            guest_ready: false,
            status: ROOM_STATUS.WAITING
        })
        .eq('id', roomId)
        .select()
        .single();

    if (error) {
        console.error('ルーム退出エラー:', error);
    }

    return data;
}

// ===========================================
// 対戦関連
// ===========================================

/**
 * 準備完了を設定
 */
export async function setReady(roomId, isHost, ready) {
    const field = isHost ? 'host_ready' : 'guest_ready';

    const { data, error } = await supabase
        .from('math_battle_rooms')
        .update({ [field]: ready })
        .eq('id', roomId)
        .select()
        .single();

    if (error) {
        console.error('準備状態更新エラー:', error);
        return null;
    }

    return data;
}

/**
 * 対戦設定を更新
 */
export async function setBattleSettings(roomId, settings) {
    const { data, error } = await supabase
        .from('math_battle_rooms')
        .update({ battle_settings: settings })
        .eq('id', roomId)
        .select()
        .single();

    if (error) {
        console.error('対戦設定更新エラー:', error);
        return null;
    }

    return data;
}

/**
 * 対戦開始
 */
export async function startBattle(roomId) {
    const now = new Date();
    const endTime = new Date(now.getTime() + BATTLE_DURATION * 1000);

    const { data, error } = await supabase
        .from('math_battle_rooms')
        .update({
            status: ROOM_STATUS.PLAYING,
            battle_start_time: now.toISOString(),
            battle_end_time: endTime.toISOString(),
            host_score: 0,
            guest_score: 0
        })
        .eq('id', roomId)
        .select()
        .single();

    if (error) {
        console.error('対戦開始エラー:', error);
        return null;
    }

    return data;
}

/**
 * スコアを更新
 */
export async function updateScore(roomId, isHost, scoreDelta) {
    // 現在のスコアを取得して加算
    const room = await getRoom(roomId);
    if (!room) return null;

    const field = isHost ? 'host_score' : 'guest_score';
    const currentScore = isHost ? room.host_score : room.guest_score;
    const newScore = currentScore + scoreDelta;

    const { data, error } = await supabase
        .from('math_battle_rooms')
        .update({ [field]: newScore })
        .eq('id', roomId)
        .select()
        .single();

    if (error) {
        console.error('スコア更新エラー:', error);
        return null;
    }

    return data;
}

/**
 * 対戦終了
 */
export async function endBattle(roomId) {
    const room = await getRoom(roomId);
    if (!room) return null;

    let winner = 'draw';
    if (room.host_score > room.guest_score) {
        winner = 'host';
    } else if (room.guest_score > room.host_score) {
        winner = 'guest';
    }

    const { data, error } = await supabase
        .from('math_battle_rooms')
        .update({
            status: ROOM_STATUS.FINISHED,
            winner
        })
        .eq('id', roomId)
        .select()
        .single();

    if (error) {
        console.error('対戦終了エラー:', error);
        return null;
    }

    return data;
}

/**
 * イベントを記録
 */
export async function recordEvent(roomId, playerRole, eventType, eventData, scoreDelta = 0) {
    const { error } = await supabase
        .from('math_battle_events')
        .insert({
            room_id: roomId,
            player_role: playerRole,
            event_type: eventType,
            event_data: eventData,
            score_delta: scoreDelta
        });

    if (error) {
        console.error('イベント記録エラー:', error);
    }
}

// ===========================================
// 交換関連
// ===========================================

/**
 * 交換を作成/取得
 */
export async function getOrCreateTrade(roomId) {
    // 既存の交換を探す
    let { data: trade, error } = await supabase
        .from('math_battle_trades')
        .select('*')
        .eq('room_id', roomId)
        .single();

    if (!trade) {
        // なければ作成
        const { data: newTrade, error: createError } = await supabase
            .from('math_battle_trades')
            .insert({ room_id: roomId })
            .select()
            .single();

        if (createError) {
            console.error('交換作成エラー:', createError);
            return null;
        }
        trade = newTrade;
    }

    return trade;
}

/**
 * 交換するモンスターを選択
 */
export async function selectTradeMonster(tradeId, isHost, monsterIndex, monsterData) {
    const updates = isHost
        ? { host_monster_index: monsterIndex, host_monster_data: monsterData, host_confirmed: false }
        : { guest_monster_index: monsterIndex, guest_monster_data: monsterData, guest_confirmed: false };

    const { data, error } = await supabase
        .from('math_battle_trades')
        .update(updates)
        .eq('id', tradeId)
        .select()
        .single();

    if (error) {
        console.error('モンスター選択エラー:', error);
        return null;
    }

    return data;
}

/**
 * 交換を確認
 */
export async function confirmTrade(tradeId, isHost) {
    const field = isHost ? 'host_confirmed' : 'guest_confirmed';

    const { data, error } = await supabase
        .from('math_battle_trades')
        .update({ [field]: true })
        .eq('id', tradeId)
        .select()
        .single();

    if (error) {
        console.error('交換確認エラー:', error);
        return null;
    }

    // 両者が確認したら交換完了
    if (data.host_confirmed && data.guest_confirmed) {
        await supabase
            .from('math_battle_trades')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', tradeId);
    }

    return data;
}

/**
 * 交換をキャンセル
 */
export async function cancelTrade(tradeId) {
    const { error } = await supabase
        .from('math_battle_trades')
        .update({ status: 'cancelled' })
        .eq('id', tradeId);

    if (error) {
        console.error('交換キャンセルエラー:', error);
    }
}

// ===========================================
// リアルタイム購読
// ===========================================

/**
 * ルームの変更を購読
 */
export function subscribeToRoom(roomId, callback) {
    const subscription = supabase
        .channel(`room-${roomId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'math_battle_rooms',
                filter: `id=eq.${roomId}`
            },
            (payload) => {
                callback(payload.new);
            }
        )
        .subscribe();

    return subscription;
}

/**
 * 交換の変更を購読
 */
export function subscribeToTrade(roomId, callback) {
    const subscription = supabase
        .channel(`trade-${roomId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'math_battle_trades',
                filter: `room_id=eq.${roomId}`
            },
            (payload) => {
                callback(payload.new);
            }
        )
        .subscribe();

    return subscription;
}

/**
 * イベントの変更を購読
 */
export function subscribeToEvents(roomId, callback) {
    const subscription = supabase
        .channel(`events-${roomId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'math_battle_events',
                filter: `room_id=eq.${roomId}`
            },
            (payload) => {
                callback(payload.new);
            }
        )
        .subscribe();

    return subscription;
}

/**
 * 購読を解除
 */
export function unsubscribe(subscription) {
    if (subscription) {
        supabase.removeChannel(subscription);
    }
}

// ===========================================
// ユーティリティ
// ===========================================

/**
 * パーティの攻撃力合計を計算
 */
export function calculatePartyPower(party, monsters, calculateStats) {
    if (!party || party.length === 0) return 0;

    return party.reduce((total, monsterIndex) => {
        const owned = monsters[monsterIndex];
        if (!owned) return total;
        const stats = calculateStats(owned.monsterId, owned.level);
        return total + stats.attack;
    }, 0);
}

/**
 * 問題正解時のスコア計算
 * パーティの攻撃力やスキルに応じて点数が決まる
 */
export function calculateAnswerScore(party, monsters, monsterData, calculateStats) {
    if (!party || party.length === 0) return 10; // 基本スコア

    // パーティの平均攻撃力をベースにスコア計算
    let totalAttack = 0;
    let skillBonus = 1.0;

    for (const monsterIndex of party) {
        const owned = monsters[monsterIndex];
        if (!owned) continue;

        const data = monsterData.find(m => m.id === owned.monsterId);
        if (!data) continue;

        const stats = calculateStats(data, owned.level);
        totalAttack += stats.attack;

        // スキルによるボーナス（確率系は平均値で計算）
        if (data.skill) {
            switch (data.skill.id) {
                case 'power_up_2':
                    skillBonus = Math.max(skillBonus, 1.5);
                    break;
                case 'power_up_1_5':
                    skillBonus = Math.max(skillBonus, 1.3);
                    break;
                case 'power_up_1_2':
                    skillBonus = Math.max(skillBonus, 1.15);
                    break;
                case 'plus_20':
                    totalAttack += 10;
                    break;
                case 'plus_10':
                    totalAttack += 5;
                    break;
                case 'lucky_50':
                    skillBonus = Math.max(skillBonus, 1.25); // 平均1.5倍
                    break;
                case 'lucky_70':
                    skillBonus = Math.max(skillBonus, 1.35); // 平均1.7倍
                    break;
            }
        }
    }

    // スコア計算: 基本10点 + 攻撃力 * スキルボーナス
    const baseScore = 10;
    const attackScore = Math.floor(totalAttack * 0.5 * skillBonus);

    return baseScore + attackScore;
}
