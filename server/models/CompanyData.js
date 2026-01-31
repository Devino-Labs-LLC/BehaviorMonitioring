const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class CompanyData extends Model {}

CompanyData.init({
  companyDataID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  companyName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  companyStreetAddress: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  companyUnitSuite: {
    type: DataTypes.STRING(100)
  },
  companyCity: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  companyState: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  companyZipCode: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  companyContact: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  companyFinanceContact: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  entered_by: {
    type: DataTypes.STRING(100),
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
  modelName: 'CompanyData',
  tableName: 'CompanyData',
  timestamps: false
});

module.exports = CompanyData;