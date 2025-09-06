const { getDb } = require('../config/database');
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
    const db = await getDb();
    const userCycleStats = db.collection('user_cycle_stats');
    return userCycleStats.findOne({ user_id: userId });
  }

  /**
   * 获取最后一次生理期记录
   */
  async getLastPeriod(userId) {
    const db = await getDb();
    const periodRecords = db.collection('period_records');
    const result = await periodRecords.find({ 
      user_id: userId, 
      is_period_day: true 
    })
    .sort({ record_date: -1 })
    .limit(1)
    .toArray();
    
    return result[0] ? { start_date: result[0].record_date } : null;
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
      const db = await getDb();
      const periodRecords = db.collection('period_records');
      
      // 获取所有经期记录
      const periods = await periodRecords.find({ 
        user_id: userId, 
        is_period_day: true 
      })
      .sort({ record_date: 1 })
      .toArray();

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

      // 获取最后一条经期记录
      const lastPeriod = periods[periods.length - 1];
      const lastPeriodDate = lastPeriod.record_date;

      // 更新或插入统计数据
      const userCycleStats = db.collection('user_cycle_stats');
      await userCycleStats.updateOne(
        { user_id: userId },
        {
          $set: {
            user_id: userId,
            total_cycles: totalCycles,
            average_cycle_length: avgCycleLength.toFixed(2),
            cycle_length_std: cycleStd.toFixed(2),
            average_period_length: avgPeriodLength.toFixed(2),
            period_length_std: periodLengthStd.toFixed(2),
            last_period_start: lastPeriodDate,
            last_period_end: lastPeriodDate,
            updated_at: new Date()
          }
        },
        { upsert: true }
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
      const db = await getDb();
      const predictions = db.collection('predictions');
      await predictions.insertOne({
        user_id: userId,
        prediction_date: new Date().toISOString().split('T')[0],
        predicted_start_date: prediction.nextPeriodStart,
        predicted_end_date: prediction.nextPeriodEnd,
        confidence_level: prediction.accuracy / 100,
        algorithm_version: prediction.algorithm,
        created_at: new Date()
      });
    } catch (error) {
      console.error('保存预测记录失败:', error);
    }
  }
}

module.exports = new PredictionService();
