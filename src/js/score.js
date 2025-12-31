import { supabase } from './supabaseClient.js';

export async function saveScore(gameId, playerId, score) {
    const { data, error } = await supabase
        .from('scores')
        .insert([{ game_id: gameId, player_id: playerId, score }]);

    if (error) {
        console.error('Error saving score:', error);
        return false;
    }
    return true;
}

export async function getRankings(gameId, limit = 5) {
    // Supabase can join tables!
    // We select scores and join with players to get name and avatar.
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

    if (error) {
        console.error('Error fetching rankings:', error);
        return [];
    }

    // Flatten structure for easier usage
    return data.map(item => ({
        score: item.score,
        name: item.players.name,
        avatar: item.players.avatar || '❓', // Fallback
        date: new Date(item.created_at).toLocaleDateString()
    }));
}
