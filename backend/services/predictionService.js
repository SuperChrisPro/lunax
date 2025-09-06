const { pool } = require('../config/database');
const moment = require('moment');

class PredictionService {
  /**
   * 基础算法：使用平均周期 ± 标准差进行预测
   * @param {number} userId - 用户ID
   * @returns {Object} 预测结果
   */
  async predictWithBasicAlgorithm(userId) {
    try {
      const userStats = await this.getUserCycleStats(userId);
      
      if (!userStats || userStats.total_cycles < 3) {
        return this.getDefaultPrediction(userId);
      }

      const lastPeriod = await this.getLastPeriod(userId);
      if (!lastPeriod) {
        return this.getDefaultPrediction(userId);
      }

      const averageCycleLength = parseFloat(userStats.average_cycle_length);
      const cycleStd = parseFloat(userStats.cycle_length_std);
      
      // 计算预测时间范围
      const lastPeriodStart = moment(lastPeriod.start_date);
      const predictedStart = lastPeriodStart.clone().add(averageCycleLength, 'days');
      
      // 使用标准差确定时间范围
      const rangeDays = Math.max(Math.ceil(cycleStd * 2), 3); // 至少3天范围
      const predictedStartRange = predictedStart.clone().subtract(Math.floor(rangeDays/2), 'days');
      const predictedEndRange = predictedStart.clone().add(Math.ceil(rangeDays/2), 'days');

      // 计算准确率
      const accuracy = this.calculateAccuracy(userStats.total_cycles, cycleStd);

      return {
        nextPeriodStart: predictedStartRange.format('YYYY-MM-DD'),
        nextPeriodEnd: predictedEndRange.format('YYYY-MM-DD'),
        accuracy: accuracy,
        algorithm: 'basic',
        confidenceLevel: this.getConfidenceLevel(accuracy),
        lastPeriodStart: lastPeriod.start_date,
        averageCycleLength: averageCycleLength,
        cycleStd: cycleStd
      };

    } catch (error) {
      console.error('基础算法预测失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户周期统计数据
   */
  async getUserCycleStats(userId) {
    const [rows] = await pool.execute(
      'SELECT * FROM user_cycle_stats WHERE user_id = ?',
      [userId]
    );
    return rows[0];
  }

  /**
   * 获取最后一次生理期记录
   */
  async getLastPeriod(userId) {
    const [rows] = await pool.execute(
      `SELECT record_date as start_date 
       FROM period_records 
       WHERE user_id = ? AND is_period_day = TRUE 
       ORDER BY record_date DESC LIMIT 1`,
      [userId]
    );
    return rows[0];
  }

  /**
   * 获取默认预测（当数据不足时）
   */
  async getDefaultPrediction(userId) {
    const lastPeriod = await this.getLastPeriod(userId);
    const lastStart = lastPeriod ? moment(lastPeriod.start_date) : moment();
    
    const predictedStart = lastStart.clone().add(28, 'days');
    const predictedEnd = predictedStart.clone().add(5, 'days');

    return {
      nextPeriodStart: predictedStart.format('YYYY-MM-DD'),
      nextPeriodEnd: predictedEnd.format('YYYY-MM-DD'),
      accuracy: 60,
      algorithm: 'default',
      confidenceLevel: 'low',
      message: '基于28天平均周期的默认预测'
    };
  }

  /**
   * 计算预测准确率
   */
  calculateAccuracy(totalCycles, cycleStd) {
    if (totalCycles < 3) return 60;
    if (totalCycles < 10) return 70;
    
    // 基于标准差调整准确率
    let accuracy = 85;
    accuracy -= Math.min(cycleStd * 5, 20); // 标准差越大，准确率越低
    accuracy += Math.min(totalCycles * 0.5, 10); // 数据越多，准确率越高
    
    return Math.max(Math.min(Math.round(accuracy), 95), 60);
  }

  /**
   * 获取置信度级别
   */
  getConfidenceLevel(accuracy) {
    if (accuracy >= 90) return 'high';
    if (accuracy >= 80) return 'medium';
    return 'low';
  }

  /**
   * 更新用户周期统计
   */
  async updateUserCycleStats(userId) {
    try {
      const [periods] = await pool.execute(
        `SELECT record_date, 
                ROW_NUMBER() OVER (ORDER BY record_date) as rn
         FROM period_records 
         WHERE user_id = ? AND is_period_day = TRUE 
         ORDER BY record_date`,
        [userId]
      );

      if (periods.length < 2) {
        return { message: '数据不足，需要至少2次生理期记录' };
      }

      // 计算周期长度
      const cycleLengths = [];
      for (let i = 1; i < periods.length; i++) {
        const prevDate = moment(periods[i-1].record_date);
        const currDate = moment(periods[i].record_date);
        const cycleLength = currDate.diff(prevDate, 'days');
        cycleLengths.push(cycleLength);
      }

      // 计算统计数据
      const totalCycles = cycleLengths.length;
      const avgCycleLength = cycleLengths.reduce((a, b) => a + b, 0) / totalCycles;
      
      // 计算标准差
      const variance = cycleLengths.reduce((sum, length) => {
        return sum + Math.pow(length - avgCycleLength, 2);
      }, 0) / totalCycles;
      const cycleStd = Math.sqrt(variance);

  // 计算平均经期长度（应用层计算）
  let periodDurations = [];
  let currentLength = 0;
  let lastDate = null;

  for (const record of periods) {
    const currentDate = moment(record.record_date);
    if (lastDate && currentDate.diff(lastDate, 'days') === 1) {
      currentLength++;
    } else {
      if (currentLength > 0) {
        periodDurations.push(currentLength);
      }
      currentLength = 1;
    }
    lastDate = currentDate;
  }
  if (currentLength > 0) {
    periodDurations.push(currentLength);
  }

  const avgPeriodLength = periodDurations.length > 0 
    ? periodDurations.reduce((a, b) => a + b, 0) / periodDurations.length 
    : 5;

  // 计算经期长度标准差
  let periodLengthStd = 0;
  if (periodDurations.length > 1) {
    const mean = avgPeriodLength;
    const variance = periodDurations.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / periodDurations.length;
    periodLengthStd = Math.sqrt(variance);
  }

      // 更新或插入统计数据
      await pool.execute(
        `INSERT INTO user_cycle_stats 
         (user_id, total_cycles, average_cycle_length, cycle_length_std, 
          average_period_length, period_length_std, last_period_start, last_period_end)
         VALUES (?, ?, ?, ?, ?, ?, 
                 (SELECT MAX(record_date) FROM period_records WHERE user_id = ? AND is_period_day = TRUE),
                 (SELECT MAX(record_date) FROM period_records WHERE user_id = ? AND is_period_day = TRUE))
         ON DUPLICATE KEY UPDATE
         total_cycles = VALUES(total_cycles),
         average_cycle_length = VALUES(average_cycle_length),
         cycle_length_std = VALUES(cycle_length_std),
         average_period_length = VALUES(average_period_length),
         period_length_std = VALUES(period_length_std),
         last_period_start = VALUES(last_period_start),
         last_period_end = VALUES(last_period_end),
         updated_at = CURRENT_TIMESTAMP`,
        [userId, totalCycles, avgCycleLength.toFixed(2), cycleStd.toFixed(2), 
         avgPeriodLength.toFixed(2), periodLengthStd.toFixed(2), userId, userId]
      );

      return { 
        success: true, 
        totalCycles, 
        avgCycleLength: avgCycleLength.toFixed(2),
        cycleStd: cycleStd.toFixed(2)
      };

    } catch (error) {
      console.error('更新用户周期统计失败:', error);
      throw error;
    }
  }

  /**
   * 保存预测记录
   */
  async savePrediction(userId, prediction) {
    try {
      await pool.execute(
        `INSERT INTO predictions 
         (user_id, prediction_date, predicted_start_date, predicted_end_date, 
          confidence_level, algorithm_version)
         VALUES (?, CURDATE(), ?, ?, ?, ?)`,
        [
          userId,
          prediction.nextPeriodStart,
          prediction.nextPeriodEnd,
          prediction.accuracy / 100,
          prediction.algorithm
        ]
      );
    } catch (error) {
      console.error('保存预测记录失败:', error);
    }
  }
}

module.exports = new PredictionService();
