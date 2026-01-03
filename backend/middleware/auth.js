const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: '访问令牌缺失'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 验证用户是否存在且活跃
    const users = await pool.query(
      'SELECT id, user_uuid, phone_number, email, nickname FROM users WHERE id = $1 AND is_active = TRUE',
      [decoded.userId]
    );

    if (users.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: '用户不存在或已禁用'
      });
    }

    req.user = users.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: '访问令牌无效'
    });
  }
};

module.exports = { authenticateToken };