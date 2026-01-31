const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class SessionNoteData extends Model {}

SessionNoteData.init({
  sessionNoteDataID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  sessionNotes: {
    type: DataTypes.TEXT,
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
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'Active'
  }
}, {
  sequelize,
  modelName: 'SessionNoteData',
  tableName: 'SessionNoteData',
  timestamps: false
});

module.exports = SessionNoteData;