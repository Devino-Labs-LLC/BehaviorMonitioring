const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class SkillData extends Model {}

SkillData.init({
  skillDataID: {
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
  }
}, {
  sequelize,
  modelName: 'SkillData',
  tableName: 'SkillData',
  timestamps: false
});

module.exports = SkillData;