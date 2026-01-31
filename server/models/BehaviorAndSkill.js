const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class BehaviorAndSkill extends Model {}

BehaviorAndSkill.init({
  bsID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  definition: {
    type: DataTypes.TEXT
  },
  measurement: {
    type: DataTypes.STRING(100)
  },
  category: {
    type: DataTypes.STRING(100)
  },
  type: {
    type: DataTypes.STRING(50)
  },
  clientID: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  clientName: {
    type: DataTypes.STRING(255)
  },
  entered_by: {
    type: DataTypes.STRING(100)
  },
  companyID: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  companyName: {
    type: DataTypes.STRING(255)
  },
  date_entered: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  time_entered: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'Active'
  },
  archived_date: {
    type: DataTypes.STRING(50)
  },
  archived_deletion_date: {
    type: DataTypes.STRING(50)
  }
}, {
  sequelize,
  modelName: 'BehaviorAndSkill',
  tableName: 'BehaviorAndSkill',
  timestamps: false
});

module.exports = BehaviorAndSkill;