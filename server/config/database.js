const { Sequelize } = require('sequelize');
require('dotenv').config();

const isDevelopment = process.env.NODE_ENV !== 'production';

const sequelize = new Sequelize(
    process.env.MYSQL_DATABASE,
    process.env.MYSQL_USER,
    process.env.MYSQL_PASSWORD,
    {
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT,
        dialect: 'mysql',
        logging: false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        define: {
            timestamps: false // Set to true if you want automatic createdAt/updatedAt
        }
    }
  );

module.exports = sequelize;