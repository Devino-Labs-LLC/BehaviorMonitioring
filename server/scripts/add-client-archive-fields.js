#!/usr/bin/env node

/**
 * Script to execute the client archive fields migration
 * Usage: node server/scripts/add-client-archive-fields.js
 */

require('dotenv').config();
const sequelize = require('../config/database');
const migration = require('../migrations/20260129-add-client-archive-fields');

async function runMigration() {
  try {
    console.log('Starting client archive fields migration...\n');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✓ Database connection established\n');

    // Get QueryInterface
    const queryInterface = sequelize.getQueryInterface();

    // Run migration
    await migration.up(queryInterface);

    console.log('\n✓ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
