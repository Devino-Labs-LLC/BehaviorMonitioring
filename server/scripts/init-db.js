/**
 * Database initialization script
 * Syncs Sequelize models with the database
 */

require('dotenv').config();

async function initDatabase() {
  const { loadSecrets } = require('../config/loadSecrets');
  await loadSecrets();

  const sequelize = require('../config/database');
  require('../models/Employee');
  require('../models/Client');
  require('../models/Home');
  require('../models/BehaviorAndSkill');
  require('../models/BehaviorData');
  require('../models/SkillData');
  require('../models/SessionNoteData');
  require('../models/CompanyData');
  require('../models/RefreshToken');
  require('../models/AuthLog');

  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully.');

    const args = new Set(process.argv.slice(2));
    const force = args.has('--force');
    const alter = args.has('--alter');

    if (force) {
      console.log('⚠️  WARNING: Dropping all tables and recreating...');
      await sequelize.sync({ force: true });
      console.log('✓ Database reset complete. All tables recreated.');
    } else if (alter) {
      console.log('Syncing database with model changes...');
      await sequelize.sync({ alter: true });
      console.log('✓ Database schema updated successfully.');
    } else {
      console.log('Syncing database (safe mode)...');
      await sequelize.sync();
      console.log('✓ Database synced successfully.');
    }

    console.log('\nAvailable models:');
    console.log('- Employee');
    console.log('- Client');
    console.log('- Home');
    console.log('- BehaviorAndSkill');
    console.log('- BehaviorData');
    console.log('- SkillData');
    console.log('- SessionNoteData');
    console.log('- CompanyData');
    console.log('- RefreshToken');
    console.log('- AuthLog');

    console.log('\n✅ Database initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initDatabase();
