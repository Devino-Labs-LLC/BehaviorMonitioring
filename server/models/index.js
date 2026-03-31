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

// Auto-sync database (creates/updates tables)
const syncDatabase = async () => {
  try {
    // Check if we're in production/Railway environment
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;
    
    if (isProduction) {
      console.log('🔄 Production environment detected - checking database schema...');
      
      // In production, only create tables that don't exist
      // This avoids "Too many keys" errors when trying to alter existing tables
      const queryInterface = sequelize.getQueryInterface();
      const existingTables = normalizeTableNames(await queryInterface.showAllTables());
      
      let tablesCreated = 0;
      let tablesSkipped = 0;
      
      // Check each model and only sync if table doesn't exist
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
    } else {
      // In development, skip auto-sync to avoid "Too many keys" errors
      // Use `npm run db:init` or `npm run db:sync` to manually sync when needed
      console.log('✓ Development mode - skipping auto-sync (use npm run db:sync to sync manually)');
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
