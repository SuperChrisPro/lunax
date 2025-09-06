const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const Joi = require('joi');

// 验证规则
const registerSchema = Joi.object({
  phoneNumber: Joi.string().pattern(/^1[3-9]\d{9}$/).required(),
  email: Joi.string().email().optional(),
  nickname: Joi.string().min(2).max(20).optional(),
  password: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
  phoneNumber: Joi.string().pattern(/^1[3-9]\d{9}$/).required(),
  password: Joi.string().required()
});

// 注册
router.post('/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: '数据验证失败',
        details: error.details
      });
    }

    const { phoneNumber, email, nickname, password } = value;

    // 检查手机号是否已存在
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE phone_number = ?',
      [phoneNumber]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: '手机号已注册'
      });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    const userUuid = uuidv4();

    // 插入用户
    const [result] = await pool.execute(
      `INSERT INTO users (user_uuid, phone_number, email, nickname, password)
       VALUES (?, ?, ?, ?, ?)`,
      [userUuid, phoneNumber, email, nickname || phoneNumber, hashedPassword]
    );

    // 创建用户周期统计记录
    await pool.execute(
      'INSERT INTO user_cycle_stats (user_id) VALUES (?)',
      [result.insertId]
    );

    // 创建用户隐私设置
    await pool.execute(
      'INSERT INTO user_privacy (user_id) VALUES (?)',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        userId: userUuid,
        phoneNumber,
        nickname: nickname || phoneNumber
      }
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({
      success: false,
      error: '注册失败'
    });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: '数据验证失败',
        details: error.details
      });
    }

    const { phoneNumber, password } = value;

    const [users] = await pool.execute(
      'SELECT id, user_uuid, phone_number, nickname, password FROM users WHERE phone_number = ? AND is_active = TRUE',
      [phoneNumber]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: '用户不存在或密码错误'
      });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: '用户不存在或密码错误'
      });
    }

    // 更新最后登录时间
    await pool.execute(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    // 生成JWT
    const token = jwt.sign(
      { userId: user.id, phoneNumber: user.phone_number },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.user_uuid,
          phoneNumber: user.phone_number,
          nickname: user.nickname
        }
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({
      success: false,
      error: '登录失败'
    });
  }
});

// 验证令牌
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: '令牌缺失'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const [users] = await pool.execute(
      'SELECT user_uuid, phone_number, nickname FROM users WHERE id = ? AND is_active = TRUE',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: '用户不存在或已禁用'
      });
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: '令牌无效'
    });
  }
});

module.exports = router;