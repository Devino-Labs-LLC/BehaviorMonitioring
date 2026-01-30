const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class BehaviorData extends Model {}

BehaviorData.init({
  behaviorDataID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  bsID: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  clientID: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  clientName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  sessionDate: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  sessionTime: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  duration: {
    type: DataTypes.STRING(50),
    defaultValue: '0'
  },
  trial: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  entered_by: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  companyID: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  companyName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  date_entered: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  time_entered: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'BehaviorData',
  tableName: 'BehaviorData',
  timestamps: false
});

module.exports = BehaviorData;