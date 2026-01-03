const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/database');
const Joi = require('joi');

// 验证规则
const updateUserSchema = Joi.object({
  nickname: Joi.string().min(2).max(20).optional(),
  email: Joi.string().email().optional(),
  birthDate: Joi.date().optional()
});

// 获取用户信息
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const users = await pool.query(
      'SELECT user_uuid as id, phone_number as phoneNumber, email, nickname, birth_date as birthDate, created_at as createdAt, last_login_at as lastLoginAt FROM users WHERE id = $1',
      [userId]
    );

    if (users.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    const privacy = await pool.query(
      'SELECT allow_data_analytics as allowDataAnalytics, allow_ml_training as allowMlTraining, data_retention_days as dataRetentionDays FROM user_privacy WHERE user_id = $1',
      [userId]
    );

    const user = users.rows[0];
    user.privacy = privacy.rows[0] || {
      allowDataAnalytics: true,
      allowMlTraining: true,
      dataRetentionDays: 365
    };

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户信息失败'
    });
  }
});

// 更新用户信息
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: '数据验证失败',
        details: error.details
      });
    }

    const userId = req.user.id;
    const { nickname, email, birthDate } = value;

    const result = await pool.query(
      'UPDATE users SET nickname = $1, email = $2, birth_date = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
      [nickname, email, birthDate, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    res.json({
      success: true,
      message: '用户信息更新成功'
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({
      success: false,
      error: '更新用户信息失败'
    });
  }
});

// 更新隐私设置
router.put('/privacy', authenticateToken, async (req, res) => {
  try {
    const privacySchema = Joi.object({
      allowDataAnalytics: Joi.boolean().optional(),
      allowMlTraining: Joi.boolean().optional(),
      dataRetentionDays: Joi.number().integer().min(30).max(3650).optional()
    });

    const { error, value } = privacySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: '数据验证失败',
        details: error.details
      });
    }

    const userId = req.user.id;
    const { allowDataAnalytics, allowMlTraining, dataRetentionDays } = value;

    const result = await pool.query(
      `UPDATE user_privacy 
       SET allow_data_analytics = COALESCE($1, allow_data_analytics),
           allow_ml_training = COALESCE($2, allow_ml_training),
           data_retention_days = COALESCE($3, data_retention_days),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $4`,
      [allowDataAnalytics, allowMlTraining, dataRetentionDays, userId]
    );

    res.json({
      success: true,
      message: '隐私设置更新成功'
    });
  } catch (error) {
    console.error('更新隐私设置失败:', error);
    res.status(500).json({
      success: false,
      error: '更新隐私设置失败'
    });
  }
});

// 获取用户统计概览
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 获取周期统计
    const cycleStats = await pool.query(
      `SELECT total_cycles as totalCycles, average_cycle_length as avgCycleLength,
              cycle_length_std as cycleStd, prediction_accuracy as predictionAccuracy,
              data_sufficiency as dataSufficiency, last_period_start as lastPeriodStart,
              last_period_end as lastPeriodEnd
       FROM user_cycle_stats WHERE user_id = $1`,
      [userId]
    );

    // 获取最近记录数量
    const recentRecords = await pool.query(
      'SELECT COUNT(*) as count FROM period_records WHERE user_id = $1 AND record_date >= CURRENT_DATE - INTERVAL \'30 days\'',
      [userId]
    );

    // 获取连续记录天数
    const streakData = await pool.query(
      `SELECT 
         EXTRACT(DAY FROM (CURRENT_DATE - MAX(record_date)))::INTEGER as "daysSinceLastRecord",
         COUNT(DISTINCT record_date) as "totalRecords"
       FROM period_records 
       WHERE user_id = $1`,
      [userId]
    );

    const dashboard = {
      cycleStats: cycleStats.rows[0] || {
        totalCycles: 0,
        avgCycleLength: null,
        cycleStd: null,
        predictionAccuracy: 0,
        dataSufficiency: 'low'
      },
      recentRecords: parseInt(recentRecords.rows[0].count),
      streak: {
        daysSinceLastRecord: streakData.rows[0].daysSinceLastRecord,
        totalRecords: parseInt(streakData.rows[0].totalRecords)
      }
    };

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('获取用户统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计失败'
    });
  }
});

module.exports = router;