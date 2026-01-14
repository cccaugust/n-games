-- ===========================================
-- 算数バトル マルチプレイヤー機能用テーブル
-- 対戦・交換機能のためのリアルタイム同期
-- ===========================================

-- 1. ルームテーブル（対戦・交換の部屋）
CREATE TABLE IF NOT EXISTS math_battle_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_code VARCHAR(6) NOT NULL UNIQUE,  -- 6桁のルームコード
    room_type VARCHAR(20) NOT NULL,        -- 'battle' or 'trade'
    status VARCHAR(20) DEFAULT 'waiting',  -- 'waiting', 'ready', 'playing', 'finished'

    -- ホスト情報
    host_player_id VARCHAR(100) NOT NULL,
    host_player_name VARCHAR(50) NOT NULL,
    host_party JSONB,                      -- パーティデータ
    host_ready BOOLEAN DEFAULT FALSE,

    -- ゲスト情報
    guest_player_id VARCHAR(100),
    guest_player_name VARCHAR(50),
    guest_party JSONB,
    guest_ready BOOLEAN DEFAULT FALSE,

    -- 対戦設定
    battle_settings JSONB,                 -- { dungeons: [...], floors: [...], duration: 180 }

    -- 対戦状態
    host_score INTEGER DEFAULT 0,
    guest_score INTEGER DEFAULT 0,
    battle_start_time TIMESTAMPTZ,
    battle_end_time TIMESTAMPTZ,
    winner VARCHAR(20),                    -- 'host', 'guest', 'draw'

    -- タイムスタンプ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes')
);

-- 2. 交換テーブル
CREATE TABLE IF NOT EXISTS math_battle_trades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES math_battle_rooms(id) ON DELETE CASCADE,

    -- ホストの交換モンスター
    host_monster_index INTEGER,            -- 所持モンスターのインデックス
    host_monster_data JSONB,               -- モンスターデータのスナップショット
    host_confirmed BOOLEAN DEFAULT FALSE,

    -- ゲストの交換モンスター
    guest_monster_index INTEGER,
    guest_monster_data JSONB,
    guest_confirmed BOOLEAN DEFAULT FALSE,

    -- 交換状態
    status VARCHAR(20) DEFAULT 'selecting', -- 'selecting', 'pending', 'completed', 'cancelled'
    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 対戦ログテーブル（リアルタイム同期用）
CREATE TABLE IF NOT EXISTS math_battle_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES math_battle_rooms(id) ON DELETE CASCADE,

    player_role VARCHAR(10) NOT NULL,      -- 'host' or 'guest'
    event_type VARCHAR(30) NOT NULL,       -- 'answer_correct', 'answer_wrong', 'skill_used', etc.
    event_data JSONB,                      -- イベント詳細
    score_delta INTEGER DEFAULT 0,         -- スコア変動

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_rooms_code ON math_battle_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON math_battle_rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_expires ON math_battle_rooms(expires_at);
CREATE INDEX IF NOT EXISTS idx_events_room ON math_battle_events(room_id, created_at);

-- RLSを有効化
ALTER TABLE math_battle_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE math_battle_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE math_battle_events ENABLE ROW LEVEL SECURITY;

-- 全アクセス許可ポリシー（ファミリーアプリ向け）
CREATE POLICY "Enable all access for math_battle_rooms" ON math_battle_rooms
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for math_battle_trades" ON math_battle_trades
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for math_battle_events" ON math_battle_events
    FOR ALL TO anon USING (true) WITH CHECK (true);

-- リアルタイム有効化
ALTER PUBLICATION supabase_realtime ADD TABLE math_battle_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE math_battle_trades;
ALTER PUBLICATION supabase_realtime ADD TABLE math_battle_events;

-- 更新時刻自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_math_battle_rooms_updated_at ON math_battle_rooms;
CREATE TRIGGER update_math_battle_rooms_updated_at
    BEFORE UPDATE ON math_battle_rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_math_battle_trades_updated_at ON math_battle_trades;
CREATE TRIGGER update_math_battle_trades_updated_at
    BEFORE UPDATE ON math_battle_trades
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 期限切れルーム自動削除（cron jobで実行するか、アプリ側で処理）
-- DELETE FROM math_battle_rooms WHERE expires_at < NOW();

-- ルームコード生成用関数
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS VARCHAR(6) AS $$
DECLARE
    chars VARCHAR(36) := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result VARCHAR(6) := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INTEGER, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;
