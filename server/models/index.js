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

const normalizeTableNames = (tables) =>
  tables.map((table) => {
    if (typeof table === 'string') {
      return table;
    }

    if (table && typeof table === 'object') {
      return table.tableName || table.TABLE_NAME || Object.values(table)[0];
    }

    return table;
  });

const ensureHomeCapacityColumns = async (queryInterface, existingTables) => {
  if (!existingTables.includes(Home.tableName)) {
    return;
  }

  const existingColumns = await queryInterface.describeTable(Home.tableName);
  const homeAttributes = Home.getAttributes();

  for (const columnName of ['capacity', 'current_occupancy']) {
    if (existingColumns[columnName]) {
      continue;
    }

    const attribute = homeAttributes[columnName];
    console.log(`  -> Adding missing Home column: ${columnName}`);

    await queryInterface.addColumn(Home.tableName, columnName, {
      type: attribute.type,
      allowNull: attribute.allowNull,
      defaultValue: attribute.defaultValue
    });
  }
};

// Define associations here if needed
// Example:
// Client.hasMany(BehaviorAndSkill, { foreignKey: 'clientID' });
// BehaviorAndSkill.belongsTo(Client, { foreignKey: 'clientID' });

// Create missing tables only — safe for production/RDS (no alter, no force).
const syncDatabaseSafe = async () => {
  console.log('Checking database schema (create missing tables only)...');

  const queryInterface = sequelize.getQueryInterface();
  const existingTables = normalizeTableNames(await queryInterface.showAllTables());

  let tablesCreated = 0;
  let tablesSkipped = 0;

  for (const [, model] of Object.entries(models)) {
    const tableName = model.tableName;

    if (existingTables.includes(tableName)) {
      tablesSkipped++;
      continue;
    }

    console.log(`  → Creating table: ${tableName}`);
    await model.sync();
    tablesCreated++;
  }

  await ensureHomeCapacityColumns(queryInterface, existingTables);

  if (tablesCreated > 0) {
    console.log(`✓ Created ${tablesCreated} new table(s)`);
  }
  if (tablesSkipped > 0) {
    console.log(`✓ Skipped ${tablesSkipped} existing table(s) (use migrations for schema changes)`);
  }
  console.log('✓ Database schema check complete');
};

// Auto-sync on server startup (production only).
const syncDatabase = async () => {
  try {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;

    if (isProduction) {
      console.log('🔄 Production environment detected - checking database schema...');
      await syncDatabaseSafe();
    } else {
      console.log('✓ Development mode - skipping auto-sync (use npm run db:init to sync manually)');
    }
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
  syncDatabaseSafe,
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
