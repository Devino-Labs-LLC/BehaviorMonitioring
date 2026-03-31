/**
 * Database initialization script
 * Syncs Sequelize models with the database
 */

const sequelize = require('../config/database');
const Employee = require('../models/Employee');
const Client = require('../models/Client');
const Home = require('../models/Home');
const BehaviorAndSkill = require('../models/BehaviorAndSkill');
const BehaviorData = require('../models/BehaviorData');
const SkillData = require('../models/SkillData');
const SessionNoteData = require('../models/SessionNoteData');
const CompanyData = require('../models/CompanyData');
const RefreshToken = require('../models/RefreshToken');
const AuthLog = require('../models/AuthLog');

async function initDatabase() {
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
