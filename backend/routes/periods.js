const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const predictionService = require('../services/predictionService');
const Joi = require('joi');
const { pool } = require('../config/database');

// 验证规则
const periodSchema = Joi.object({
  date: Joi.date().required(),
  flowLevel: Joi.string().valid('light', 'medium', 'heavy').default('medium'),
  symptoms: Joi.array().items(Joi.string()).optional(),
  notes: Joi.string().max(500).optional()
});

// 获取用户的生理期记录
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, limit = 50 } = req.query;

    let query = `
      SELECT id, record_date as date, flow_level as flowLevel, 
             symptoms, notes, created_at as createdAt
      FROM period_records 
      WHERE user_id = $1 AND is_period_day = TRUE
    `;
    let params = [userId];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND record_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND record_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY record_date DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit));

    const records = await pool.query(query, params);

    res.json({
      success: true,
      data: records.rows,
      count: records.rows.length
    });
  } catch (error) {
    console.error('获取生理期记录失败:', error);
    res.status(500).json({
      success: false,
      error: '获取记录失败'
    });
  }
});

// 创建生理期记录
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { error, value } = periodSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: '数据验证失败',
        details: error.details
      });
    }

    const userId = req.user.id;
    const { date, flowLevel, symptoms, notes } = value;

    // 检查是否已存在该日期的记录
    const existing = await pool.query(
      'SELECT id FROM period_records WHERE user_id = $1 AND record_date = $2',
      [userId, date]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: '该日期已存在记录'
      });
    }

    // 插入记录
    const result = await pool.query(
      `INSERT INTO period_records (user_id, record_date, flow_level, symptoms, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userId, date, flowLevel, JSON.stringify(symptoms || []), notes]
    );

    // 更新用户周期统计
    await predictionService.updateUserCycleStats(userId);

    res.status(201).json({
      success: true,
      data: {
        id: result.rows[0].id,
        date,
        flowLevel,
        symptoms,
        notes
      }
    });
  } catch (error) {
    console.error('创建生理期记录失败:', error);
    res.status(500).json({
      success: false,
      error: '创建记录失败'
    });
  }
});

// 更新生理期记录
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { error, value } = periodSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: '数据验证失败',
        details: error.details
      });
    }

    const userId = req.user.id;
    const recordId = req.params.id;
    const { flowLevel, symptoms, notes } = value;

    const result = await pool.query(
      `UPDATE period_records 
       SET flow_level = $1, symptoms = $2, notes = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND user_id = $5`,
      [flowLevel, JSON.stringify(symptoms || []), notes, recordId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: '记录不存在'
      });
    }

    // 更新用户周期统计
    await predictionService.updateUserCycleStats(userId);

    res.json({
      success: true,
      message: '记录更新成功'
    });
  } catch (error) {
    console.error('更新生理期记录失败:', error);
    res.status(500).json({
      success: false,
      error: '更新记录失败'
    });
  }
});

// 删除生理期记录
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const recordId = req.params.id;

    const result = await pool.query(
      'DELETE FROM period_records WHERE id = $1 AND user_id = $2',
      [recordId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: '记录不存在'
      });
    }

    // 更新用户周期统计
    await predictionService.updateUserCycleStats(userId);

    res.json({
      success: true,
      message: '记录删除成功'
    });
  } catch (error) {
    console.error('删除生理期记录失败:', error);
    res.status(500).json({
      success: false,
      error: '删除记录失败'
    });
  }
});

// 获取周期统计
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await pool.query(
      `SELECT total_cycles, average_cycle_length, cycle_length_std,
              average_period_length, period_length_std, prediction_accuracy,
              data_sufficiency, last_period_start, last_period_end
       FROM user_cycle_stats
       WHERE user_id = $1`,
      [userId]
    );

    if (stats.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          total_cycles: 0,
          average_cycle_length: null,
          cycle_length_std: null,
          data_sufficiency: 'low'
        }
      });
    }

    res.json({
      success: true,
      data: stats.rows[0]
    });
  } catch (error) {
    console.error('获取周期统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计失败'
    });
  }
});

module.exports = router;