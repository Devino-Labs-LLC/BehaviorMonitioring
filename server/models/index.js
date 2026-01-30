const sequelize = require('../config/database');
const Employee = require('./Employee');
const Client = require('./Client');
const Home = require('./Home');
const BehaviorAndSkill = require('./BehaviorAndSkill');
const BehaviorData = require('./BehaviorData');
const SessionNoteData = require('./SessionNoteData');
const SkillData = require('./SkillData');
const CompanyData = require('./CompanyData');
const RefreshToken = require('./RefreshToken');
const AuthLog = require('./AuthLog');

const models = {
  Employee,
  Client,
  Home,
  BehaviorAndSkill,
  BehaviorData,
  SessionNoteData,
  SkillData,
  CompanyData,
  RefreshToken,
  AuthLog
};

// Define associations here if needed
// Example:
// Client.hasMany(BehaviorAndSkill, { foreignKey: 'clientID' });
// BehaviorAndSkill.belongsTo(Client, { foreignKey: 'clientID' });

// Auto-sync database (creates/updates tables)
const syncDatabase = async () => {
  try {
    // Disable auto-sync to avoid "Too many keys" errors on existing databases
    // Use `npm run db:init` or `npm run db:sync` to manually sync when needed
    console.log('✓ Skipping database sync (use npm run db:init to sync manually)');
    return;
    
    // alter: true - will update existing tables without dropping data
    // force: false - will NOT drop tables (safer for production)
    // await sequelize.sync({ alter: true });
    // console.log('✓ Database synchronized successfully');
  } catch (error) {
    console.error('✗ Database sync failed:', error);
    throw error;
  }
};

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully');
  } catch (error) {
    console.error('✗ Unable to connect to the database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  models,
  syncDatabase,
  testConnection,
  // Export individual models for direct access
  Employee,
  Client,
  Home,
  BehaviorAndSkill,
  BehaviorData,
  SessionNoteData,
  SkillData,
  CompanyData,
  RefreshToken,
  AuthLog
};