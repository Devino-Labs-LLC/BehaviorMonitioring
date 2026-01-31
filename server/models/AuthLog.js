const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class AuthLog extends Model {}

AuthLog.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  timestamp: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  event: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER
  },
  email: {
    type: DataTypes.TEXT
  },
  ip: {
    type: DataTypes.TEXT
  },
  userAgent: {
    type: DataTypes.TEXT
  },
  details: {
    type: DataTypes.TEXT
  }
}, {
  sequelize,
  modelName: 'AuthLog',
  tableName: 'auth_logs',
  timestamps: false
});

module.exports = AuthLog;