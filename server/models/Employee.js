const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Employee extends Model {}

Employee.init({
  employeeID: {
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
  username: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  phone_number: {
    type: DataTypes.STRING(20)
  },
  role: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  password: {
    type: DataTypes.STRING(255)
  },
  account_status: {
    type: DataTypes.STRING(20),
    defaultValue: 'In verification'
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
  email_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  verification_token: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  verification_token_expires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  signup_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  password_reset_token: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  password_reset_expires: {
    type: DataTypes.DATE,
    allowNull: true
  }}, {
  sequelize,
  modelName: 'Employee',
  tableName: 'employee',
  timestamps: false
});

module.exports = Employee;