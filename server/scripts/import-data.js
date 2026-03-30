#!/usr/bin/env node
/**
 * Import Data from CSV Files
 * 
 * This script imports data from CSV files exported from your old database
 * into the new MySQL database using Sequelize models.
 * 
 * Usage:
 *   node scripts/import-data.js <csv-directory>
 * 
 * Example:
 *   node scripts/import-data.js ~/Downloads/BMetrics
 */

require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { sequelize } = require('../models');

// Import all models
const Employee = require('../models/Employee');
const Client = require('../models/Client');
const Home = require('../models/Home');
const BehaviorAndSkill = require('../models/BehaviorAndSkill');
const BehaviorData = require('../models/BehaviorData');
const SessionNoteData = require('../models/SessionNoteData');
const SkillData = require('../models/SkillData');
const CompanyData = require('../models/CompanyData');
const RefreshToken = require('../models/RefreshToken');

/**
 * Parse CSV file with semicolon delimiter
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) return [];
  
  // Parse header
  const headers = lines[0].split(';').map(h => h.replaceAll('"', '').trim());
  
  // Parse rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    const row = {};
    
    headers.forEach((header, index) => {
      let value = values[index] || '';
      // Remove quotes
      value = value.replace(/^"/, '').replace(/"$/, '').trim();
      // Convert empty strings to null
      row[header] = value === '' ? null : value;
    });
    
    rows.push(row);
  }
  
  return rows;
}

/**
 * Import data for a specific model
 */
async function importModel(Model, csvFile, transforms = {}) {
  const modelName = Model.name;
  
  if (!fs.existsSync(csvFile)) {
    console.log(`   ⏭️  Skipping ${modelName} (file not found)`);
    return;
  }
  
  const rows = parseCSV(csvFile);
  
  if (rows.length === 0) {
    console.log(`   ⏭️  Skipping ${modelName} (no data)`);
    return;
  }
  
  console.log(`   📥 Importing ${rows.length} ${modelName} record(s)...`);
  
  for (const row of rows) {
    try {
      // Apply any transforms
      const data = { ...row };
      
      Object.keys(transforms).forEach(field => {
        if (data[field] !== null && data[field] !== undefined) {
          data[field] = transforms[field](data[field]);
        }
      });
      
      await Model.create(data);
    } catch (error) {
      console.error(`   ❌ Error importing ${modelName} record:`, error.message);
      console.error('      Data:', row);
    }
  }
  
  console.log(`   ✓ ${modelName} imported successfully`);
}

async function importData(csvDir) {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✓ Database connection established\n');
    
    console.log('📂 CSV Directory:', csvDir);
    console.log('');
    
    // Import in order to respect foreign keys
    console.log('📊 Importing data...\n');
    
    // 1. Company Data (no dependencies)
    await importModel(
      CompanyData,
      path.join(csvDir, 'CompanyData.csv'),
      {
        companyDataID: val => Number.parseInt(val, 10)
      }
    );
    
    // 2. Employee (depends on company via companyID but doesn't enforce FK)
    await importModel(
      Employee,
      path.join(csvDir, 'employee.csv'),
      {
        employeeID: val => Number.parseInt(val, 10),
        companyID: val => Number.parseInt(val, 10)
      }
    );
    
    // 3. Home
    await importModel(
      Home,
      path.join(csvDir, 'Home.csv'),
      {
        homeID: val => Number.parseInt(val, 10),
        companyID: val => Number.parseInt(val, 10)
      }
    );
    
    // 4. Client
    await importModel(
      Client,
      path.join(csvDir, 'client.csv'),
      {
        clientID: val => Number.parseInt(val, 10),
        companyID: val => Number.parseInt(val, 10)
      }
    );
    
    // 5. Behavior and Skill (depends on client)
    await importModel(
      BehaviorAndSkill,
      path.join(csvDir, 'BehaviorAndSkill.csv'),
      {
        bsID: val => Number.parseInt(val, 10),
        clientID: val => Number.parseInt(val, 10),
        companyID: val => Number.parseInt(val, 10)
      }
    );
    
    // 6. Behavior Data (depends on behavior/skill)
    await importModel(
      BehaviorData,
      path.join(csvDir, 'BehaviorData.csv'),
      {
        behaviorDataID: val => Number.parseInt(val, 10),
        bsID: val => Number.parseInt(val, 10),
        clientID: val => Number.parseInt(val, 10),
        companyID: val => Number.parseInt(val, 10),
        count: val => val ? Number.parseInt(val, 10) : null,
        duration: val => val ? Number.parseFloat(val) : null,
        trial: val => val ? Number.parseInt(val, 10) : null
      }
    );
    
    // 7. Session Note Data
    await importModel(
      SessionNoteData,
      path.join(csvDir, 'SessionNoteData.csv'),
      {
        sessionNoteDataID: val => Number.parseInt(val, 10),
        clientID: val => Number.parseInt(val, 10),
        companyID: val => Number.parseInt(val, 10)
      }
    );
    
    // 8. Skill Data
    await importModel(
      SkillData,
      path.join(csvDir, 'SkillData.csv'),
      {
        skillDataID: val => Number.parseInt(val, 10),
        bsID: val => Number.parseInt(val, 10),
        clientID: val => Number.parseInt(val, 10),
        companyID: val => Number.parseInt(val, 10)
      }
    );
    
    // 9. Refresh Tokens
    await importModel(
      RefreshToken,
      path.join(csvDir, 'refresh_tokens.csv'),
      {
        id: val => Number.parseInt(val, 10),
        user_id: val => Number.parseInt(val, 10),
        revoked: val => Number.parseInt(val, 10),
        created_at: val => val ? new Date(val) : null,
        expires_at: val => val ? new Date(val) : null,
        revoked_at: val => val ? new Date(val) : null,
        last_used_at: val => val ? new Date(val) : null
      }
    );
    
    console.log('\n✅ Data import completed successfully!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Data import failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Get CSV directory from command line
const csvDir = process.argv[2];

if (!csvDir) {
  console.error('❌ Error: Please provide the CSV directory path\n');
  console.error('Usage:');
  console.error('  node scripts/import-data.js <csv-directory>\n');
  console.error('Example:');
  console.error('  node scripts/import-data.js ~/Downloads/BMetrics\n');
  process.exit(1);
}

if (!fs.existsSync(csvDir)) {
  console.error(`❌ Error: Directory not found: ${csvDir}\n`);
  process.exit(1);
}

importData(csvDir);
