const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class RefreshToken extends Model {}

RefreshToken.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  token: {
    type: DataTypes.STRING(500),
    allowNull: false,
    unique: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  revoked: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  revoked_at: {
    type: DataTypes.DATE
  },
  replaced_by_token: {
    type: DataTypes.STRING(500)
  },
  user_agent: {
    type: DataTypes.STRING(500)
  },
  ip_address: {
    type: DataTypes.STRING(45)
  },
  device_id: {
    type: DataTypes.STRING(255)
  },
  last_used_at: {
    type: DataTypes.DATE
  }
}, {
  sequelize,
  modelName: 'RefreshToken',
  tableName: 'refresh_tokens',
  timestamps: false,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['token']
    }
  ]
});

module.exports = RefreshToken;