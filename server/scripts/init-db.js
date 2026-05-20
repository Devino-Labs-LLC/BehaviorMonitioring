/**
 * Database initialization script.
 * Default: production-safe sync (create missing tables only).
 * Dev-only: --alter (db:sync) or --force (db:reset) — never use on production RDS.
 */

require('dotenv').config();

const MODEL_NAMES = [
  'Employee',
  'Client',
  'Home',
  'BehaviorAndSkill',
  'BehaviorData',
  'SkillData',
  'SessionNoteData',
  'CompanyData',
  'RefreshToken',
  'AuthLog',
];

function isProductionDatabaseTarget() {
  return (
    process.env.NODE_ENV === 'production'
    || process.env.IN_PROD === 'true'
    || Boolean(process.env.AWS_DB_SECRET_NAME)
  );
}

function assertDestructiveFlagsAllowed({ force, alter }) {
  if (!force && !alter) {
    return;
  }

  if (isProductionDatabaseTarget()) {
    throw new Error(
      'Refusing --alter or --force: production database target detected '
      + '(NODE_ENV=production, IN_PROD=true, or AWS_DB_SECRET_NAME is set). '
      + 'Use npm run db:init without flags for safe schema initialization.',
    );
  }
}

function loadModels() {
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
}

async function runDestructiveDevSync(sequelize, { force, alter }) {
  loadModels();

  console.log('Connecting to database...');
  await sequelize.authenticate();
  console.log('✓ Database connection established successfully.');

  if (force) {
    console.log('⚠️  DEV ONLY: Dropping all tables and recreating...');
    await sequelize.sync({ force: true });
    console.log('✓ Database reset complete. All tables recreated.');
    return;
  }

  console.log('⚠️  DEV ONLY: Syncing database with alter (may modify existing columns)...');
  await sequelize.sync({ alter: true });
  console.log('✓ Database schema updated successfully.');
}

async function runSafeSync() {
  const { testConnection, syncDatabaseSafe } = require('../models');

  console.log('Connecting to database...');
  await testConnection();
  await syncDatabaseSafe();
}

async function initDatabase() {
  const { loadSecrets } = require('../config/loadSecrets');
  await loadSecrets();

  const args = new Set(process.argv.slice(2));
  const force = args.has('--force');
  const alter = args.has('--alter');

  try {
    assertDestructiveFlagsAllowed({ force, alter });

    if (force || alter) {
      const sequelize = require('../config/database');
      await runDestructiveDevSync(sequelize, { force, alter });
    } else {
      await runSafeSync();
    }

    console.log('\nModels:');
    for (const name of MODEL_NAMES) {
      console.log(`- ${name}`);
    }

    console.log('\n✅ Database initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initDatabase();
