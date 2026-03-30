require('dotenv').config();
const sequelize = require('../config/database');

async function addPasswordResetFields() {
    try {
        console.log('Adding password reset fields to employee table...');
        
        // Check if columns exist before adding them
        const [existingColumns] = await sequelize.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'employee'
            AND COLUMN_NAME IN ('password_reset_token', 'password_reset_expires')
        `);
        
        const columnNames = new Set(existingColumns.map((col) => col.COLUMN_NAME));
        
        // Add password_reset_token if it already exists
        if (columnNames.has('password_reset_token')) {
            console.log('✓ password_reset_token column already exists');
        } else {
            await sequelize.query(`
                ALTER TABLE employee 
                ADD COLUMN password_reset_token VARCHAR(255) NULL AFTER last_login
            `);
            console.log('✓ Added password_reset_token column');
        }
        
        // Add password_reset_expires if it already exists
        if (columnNames.has('password_reset_expires')) {
            console.log('✓ password_reset_expires column already exists');
        } else {
            await sequelize.query(`
                ALTER TABLE employee 
                ADD COLUMN password_reset_expires DATETIME NULL AFTER password_reset_token
            `);
            console.log('✓ Added password_reset_expires column');
        }
        
        console.log('Password reset fields migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error adding password reset fields:', error.message);
        process.exit(1);
    }
}

addPasswordResetFields();
