-- LunaX 月汐应用数据库设计
-- 基于阿里云RDS MySQL

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_uuid VARCHAR(36) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE,
    nickname VARCHAR(100),
    birth_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_phone (phone_number),
    INDEX idx_email (email),
    INDEX idx_uuid (user_uuid)
);

-- 生理期记录表
CREATE TABLE IF NOT EXISTS period_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    record_date DATE NOT NULL,
    is_period_day BOOLEAN DEFAULT TRUE,
    flow_level ENUM('light', 'medium', 'heavy') DEFAULT 'medium',
    symptoms JSON,
    notes TEXT,
    cycle_day INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, record_date),
    INDEX idx_user_date (user_id, record_date),
    INDEX idx_record_date (record_date)
);

-- 用户周期统计表
CREATE TABLE IF NOT EXISTS user_cycle_stats (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    total_cycles INT DEFAULT 0,
    average_cycle_length DECIMAL(5,2),
    cycle_length_std DECIMAL(5,2),
    average_period_length DECIMAL(5,2),
    period_length_std DECIMAL(5,2),
    last_period_start DATE,
    last_period_end DATE,
    prediction_accuracy DECIMAL(5,2) DEFAULT 0.00,
    data_sufficiency ENUM('low', 'medium', 'high') DEFAULT 'low',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user (user_id)
);

-- 预测记录表
CREATE TABLE IF NOT EXISTS predictions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_prediction (user_id, prediction_date),
    INDEX idx_predicted_start (predicted_start_date)
);

-- 算法参数配置表
CREATE TABLE IF NOT EXISTS algorithm_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(50) UNIQUE NOT NULL,
    config_value JSON NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 插入默认算法配置
INSERT INTO algorithm_config (config_key, config_value, description) VALUES
('basic_algorithm', JSON_OBJECT('min_cycles', 3, 'max_deviation', 7, 'default_cycle_length', 28, 'default_period_length', 5), '基础算法配置'),
('ml_threshold', JSON_OBJECT('min_cycles', 50, 'min_data_points', 100000), '机器学习启用阈值'),
('prediction_range', JSON_OBJECT('days_before', 3, 'days_after', 2), '预测时间范围配置');

-- 用户隐私设置表
CREATE TABLE IF NOT EXISTS user_privacy (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    allow_data_analytics BOOLEAN DEFAULT TRUE,
    allow_ml_training BOOLEAN DEFAULT TRUE,
    data_retention_days INT DEFAULT 365,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user (user_id)
);

-- 数据清理任务日志表
CREATE TABLE IF NOT EXISTS data_cleanup_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    cleanup_type VARCHAR(50) NOT NULL,
    affected_rows INT NOT NULL,
    execution_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('success', 'failed') DEFAULT 'success',
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

-- 创建存储过程：更新用户周期统计
DELIMITER //
CREATE PROCEDURE update_user_cycle_stats(IN p_user_id BIGINT)
BEGIN
    DECLARE cycle_count INT DEFAULT 0;
    DECLARE avg_cycle DECIMAL(5,2) DEFAULT 28.00;
    DECLARE std_cycle DECIMAL(5,2) DEFAULT 0.00;
    DECLARE avg_period DECIMAL(5,2) DEFAULT 5.00;
    DECLARE last_start DATE;
    DECLARE last_end DATE;
    
    -- 计算周期统计
    SELECT 
        COUNT(DISTINCT cycle_day) INTO cycle_count
    FROM period_records 
    WHERE user_id = p_user_id AND is_period_day = TRUE;
    
    -- 更新统计信息
    IF cycle_count >= 3 THEN
        -- 这里简化处理，实际应该计算真实的周期长度和方差
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
END//
DELIMITER ;

-- 创建索引优化查询性能
CREATE INDEX idx_periods_user_cycle ON period_records(user_id, cycle_day);
CREATE INDEX idx_predictions_user_date ON predictions(user_id, prediction_date);