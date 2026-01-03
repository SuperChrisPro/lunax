-- LunaX 月汐应用数据库设计
-- 基于 PostgreSQL

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    user_uuid VARCHAR(36) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE,
    nickname VARCHAR(100),
    password VARCHAR(255) NOT NULL,
    birth_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_uuid ON users(user_uuid);

-- 创建更新 updated_at 的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为 users 表创建触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 生理期记录表
CREATE TABLE IF NOT EXISTS period_records (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    record_date DATE NOT NULL,
    is_period_day BOOLEAN DEFAULT TRUE,
    flow_level VARCHAR(10) DEFAULT 'medium' CHECK (flow_level IN ('light', 'medium', 'heavy')),
    symptoms JSONB,
    notes TEXT,
    cycle_day INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, record_date)
);

CREATE INDEX IF NOT EXISTS idx_user_date ON period_records(user_id, record_date);
CREATE INDEX IF NOT EXISTS idx_record_date ON period_records(record_date);
CREATE INDEX IF NOT EXISTS idx_periods_user_cycle ON period_records(user_id, cycle_day);

-- 为 period_records 表创建触发器
CREATE TRIGGER update_period_records_updated_at BEFORE UPDATE ON period_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 用户周期统计表
CREATE TABLE IF NOT EXISTS user_cycle_stats (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    total_cycles INT DEFAULT 0,
    average_cycle_length DECIMAL(5,2),
    cycle_length_std DECIMAL(5,2),
    average_period_length DECIMAL(5,2),
    period_length_std DECIMAL(5,2),
    last_period_start DATE,
    last_period_end DATE,
    prediction_accuracy DECIMAL(5,2) DEFAULT 0.00,
    data_sufficiency VARCHAR(10) DEFAULT 'low' CHECK (data_sufficiency IN ('low', 'medium', 'high')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id)
);

-- 为 user_cycle_stats 表创建触发器
CREATE TRIGGER update_user_cycle_stats_updated_at BEFORE UPDATE ON user_cycle_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 预测记录表
CREATE TABLE IF NOT EXISTS predictions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    prediction_date DATE NOT NULL,
    predicted_start_date DATE NOT NULL,
    predicted_end_date DATE NOT NULL,
    confidence_level DECIMAL(5,2) DEFAULT 0.80,
    algorithm_version VARCHAR(20) DEFAULT 'v1.0',
    actual_start_date DATE NULL,
    actual_end_date DATE NULL,
    accuracy_score DECIMAL(5,2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_prediction ON predictions(user_id, prediction_date);
CREATE INDEX IF NOT EXISTS idx_predicted_start ON predictions(predicted_start_date);
CREATE INDEX IF NOT EXISTS idx_predictions_user_date ON predictions(user_id, prediction_date);

-- 算法参数配置表
CREATE TABLE IF NOT EXISTS algorithm_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(50) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 为 algorithm_config 表创建触发器
CREATE TRIGGER update_algorithm_config_updated_at BEFORE UPDATE ON algorithm_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入默认算法配置
INSERT INTO algorithm_config (config_key, config_value, description) VALUES
('basic_algorithm', json_build_object('min_cycles', 3, 'max_deviation', 7, 'default_cycle_length', 28, 'default_period_length', 5), '基础算法配置'),
('ml_threshold', json_build_object('min_cycles', 50, 'min_data_points', 100000), '机器学习启用阈值'),
('prediction_range', json_build_object('days_before', 3, 'days_after', 2), '预测时间范围配置')
ON CONFLICT (config_key) DO NOTHING;

-- 用户隐私设置表
CREATE TABLE IF NOT EXISTS user_privacy (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    allow_data_analytics BOOLEAN DEFAULT TRUE,
    allow_ml_training BOOLEAN DEFAULT TRUE,
    data_retention_days INT DEFAULT 365,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id)
);

-- 为 user_privacy 表创建触发器
CREATE TRIGGER update_user_privacy_updated_at BEFORE UPDATE ON user_privacy
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 数据清理任务日志表
CREATE TABLE IF NOT EXISTS data_cleanup_log (
    id BIGSERIAL PRIMARY KEY,
    cleanup_type VARCHAR(50) NOT NULL,
    affected_rows INT NOT NULL,
    execution_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(10) DEFAULT 'success' CHECK (status IN ('success', 'failed')),
    error_message TEXT NULL
);

-- 创建视图：用户预测汇总
CREATE OR REPLACE VIEW user_prediction_summary AS
SELECT 
    u.id as user_id,
    u.user_uuid,
    u.nickname,
    ucs.total_cycles,
    ucs.average_cycle_length,
    ucs.cycle_length_std,
    ucs.prediction_accuracy,
    ucs.data_sufficiency,
    ucs.last_period_start,
    ucs.last_period_end,
    CASE 
        WHEN ucs.total_cycles >= 50 THEN 'ML_READY'
        WHEN ucs.total_cycles >= 3 THEN 'BASIC_ALGORITHM'
        ELSE 'INSUFFICIENT_DATA'
    END as algorithm_status
FROM users u
LEFT JOIN user_cycle_stats ucs ON u.id = ucs.user_id
WHERE u.is_active = TRUE;

-- 创建函数：更新用户周期统计
CREATE OR REPLACE FUNCTION update_user_cycle_stats(p_user_id BIGINT)
RETURNS VOID AS $$
DECLARE
    cycle_count INT := 0;
    avg_cycle DECIMAL(5,2) := 28.00;
    std_cycle DECIMAL(5,2) := 0.00;
    avg_period DECIMAL(5,2) := 5.00;
    last_start DATE;
    last_end DATE;
BEGIN
    -- 计算周期统计
    SELECT COUNT(DISTINCT cycle_day) INTO cycle_count
    FROM period_records 
    WHERE user_id = p_user_id AND is_period_day = TRUE;
    
    -- 更新统计信息
    IF cycle_count >= 3 THEN
        UPDATE user_cycle_stats 
        SET 
            total_cycles = cycle_count,
            average_cycle_length = 28.00,
            cycle_length_std = 2.00,
            average_period_length = 5.00,
            period_length_std = 1.00,
            data_sufficiency = CASE 
                WHEN cycle_count >= 50 THEN 'high'
                WHEN cycle_count >= 10 THEN 'medium'
                ELSE 'low'
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
