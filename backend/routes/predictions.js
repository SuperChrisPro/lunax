const express = require('express');
const router = express.Router();
const predictionService = require('../services/predictionService');
const { authenticateToken } = require('../middleware/auth');
const Joi = require('joi');

// 获取用户预测
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const prediction = await predictionService.predictWithBasicAlgorithm(userId);
    
    // 保存预测记录
    await predictionService.savePrediction(userId, prediction);
    
    res.json({
      success: true,
      data: prediction,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取预测失败:', error);
    res.status(500).json({
      success: false,
      error: '获取预测失败',
      message: error.message
    });
  }
});

// 获取历史预测
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 30 } = req.query;
    
    const predictions = await require('../config/database').pool.query(
      `SELECT prediction_date, predicted_start_date, predicted_end_date, 
              confidence_level, algorithm_version, actual_start_date, actual_end_date,
              accuracy_score
       FROM predictions 
       WHERE user_id = $1 
       ORDER BY prediction_date DESC 
       LIMIT $2`,
      [userId, parseInt(limit)]
    );
    
    res.json({
      success: true,
      data: predictions.rows,
      count: predictions.rows.length
    });
  } catch (error) {
    console.error('获取历史预测失败:', error);
    res.status(500).json({
      success: false,
      error: '获取历史预测失败'
    });
  }
});

// 更新用户周期统计
router.post('/update-stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await predictionService.updateUserCycleStats(userId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('更新周期统计失败:', error);
    res.status(500).json({
      success: false,
      error: '更新周期统计失败'
    });
  }
});

module.exports = router;