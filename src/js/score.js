import { supabase } from './supabaseClient.js';
import { appendLocalScore, localRankings, noticeSupabaseFailure } from './offline.js';

export async function saveScore(gameId, playerId, score) {
    // ローカルにも必ず残す。Supabase が落ちていてもランキングが見られるように。
    appendLocalScore(gameId, playerId, score);

    try {
        const { error } = await supabase
            .from('scores')
            .insert([{ game_id: gameId, player_id: playerId, score }]);
        if (error) throw error;
        return true;
    } catch (e) {
        noticeSupabaseFailure(e, 'saveScore');
        return false;
    }
}

export async function getRankings(gameId, limit = 5) {
    try {
        const { data, error } = await supabase
            .from('scores')
            .select(`
                score,
                created_at,
                players (
                    name,
                    avatar
                )
            `)
            .eq('game_id', gameId)
            .order('score', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return data.map((item) => ({
            score: item.score,
            name: item.players?.name || 'プレイヤー',
            avatar: item.players?.avatar || '❓',
            date: new Date(item.created_at).toLocaleDateString()
        }));
    } catch (e) {
        noticeSupabaseFailure(e, 'getRankings');
        return localRankings(gameId, limit);
    }
}
