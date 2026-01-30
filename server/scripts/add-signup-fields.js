/**
 * Add signup fields to employee table
 * This script manually adds the new columns without recreating indexes
 */

const sequelize = require('../config/database');

async function addSignupFields() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('✓ Database connection established successfully.\n');

        console.log('Adding signup fields to employee table...');

        const columns = [
            {
                name: 'email_verified',
                sql: `ALTER TABLE employee ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false`
            },
            {
                name: 'verification_token',
                sql: `ALTER TABLE employee ADD COLUMN verification_token VARCHAR(255) NULL`
            },
            {
                name: 'verification_token_expires',
                sql: `ALTER TABLE employee ADD COLUMN verification_token_expires DATETIME NULL`
            },
            {
                name: 'signup_date',
                sql: `ALTER TABLE employee ADD COLUMN signup_date DATETIME NULL`
            },
            {
                name: 'last_login',
                sql: `ALTER TABLE employee ADD COLUMN last_login DATETIME NULL`
            }
        ];

        for (const column of columns) {
            try {
                // Check if column exists
                const [results] = await sequelize.query(`
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'employee' 
                    AND COLUMN_NAME = '${column.name}'
                `);
                
                if (results.length > 0) {
                    console.log(`- Column already exists: ${column.name}`);
                } else {
                    await sequelize.query(column.sql);
                    console.log(`✓ Added column: ${column.name}`);
                }
            } catch (error) {
                console.error(`✗ Error adding column ${column.name}:`, error.message);
                throw error;
            }
        }

        console.log('\n✅ Signup fields added successfully!');
        console.log('\nNew columns:');
        console.log('- email_verified (BOOLEAN)');
        console.log('- verification_token (VARCHAR)');
        console.log('- verification_token_expires (DATETIME)');
        console.log('- signup_date (DATETIME)');
        console.log('- last_login (DATETIME)');

        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to add signup fields:', error.message);
        process.exit(1);
    }
}

addSignupFields();
