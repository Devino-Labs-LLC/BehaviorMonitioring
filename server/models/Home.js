const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Home extends Model {}

Home.init({
  homeID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  street_address: {
    type: DataTypes.STRING(255)
  },
  city: {
    type: DataTypes.STRING(100)
  },
  state: {
    type: DataTypes.STRING(2)
  },
  zip_code: {
    type: DataTypes.STRING(10)
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
    type: DataTypes.DATEONLY
  },
  time_entered: {
    type: DataTypes.TIME
  }
}, {
  sequelize,
  modelName: 'Home',
  tableName: 'Home',
  timestamps: false
});

module.exports = Home;