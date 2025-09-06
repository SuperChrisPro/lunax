const { MongoClient } = require('mongodb');

let db;
let client;

async function connect() {
  if (db) return db;
  
  const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/lunax_db?authSource=admin`;
  
  client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000
  });

  try {
    await client.connect();
    db = client.db('lunax_db');
    console.log('MongoDB连接成功');
    return db;
  } catch (error) {
    console.error('MongoDB连接失败:', error);
    process.exit(1);
  }
}

async function close() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

// 测试数据库连接
async function testConnection() {
  try {
    const testDb = await connect();
    await testDb.command({ ping: 1 });
    console.log('MongoDB连接测试成功');
    return true;
  } catch (error) {
    console.error('MongoDB连接测试失败:', error);
    return false;
  }
}

module.exports = { 
  connect, 
  close,
  testConnection,
  getDb: () => {
    if (!db) throw new Error('数据库未连接');
    return db;
  }
};
