const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Client extends Model {}

Client.init({
  clientID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  lName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  DOB: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  intake_Date: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  group_home_name: {
    type: DataTypes.STRING(255)
  },
  medicaid_id_number: {
    type: DataTypes.STRING(100)
  },
  behavior_plan_due_date: {
    type: DataTypes.DATEONLY
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
    defaultValue: 'Active'
  },
  archived_date: {
    type: DataTypes.STRING(50)
  },
  archived_deletion_date: {
    type: DataTypes.STRING(50)
  },
  archived_by: {
    type: DataTypes.STRING(100)
  },
  reminder_90_sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  reminder_60_sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  reminder_30_sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  sequelize,
  modelName: 'Client',
  tableName: 'client',
  timestamps: false
});

module.exports = Client;