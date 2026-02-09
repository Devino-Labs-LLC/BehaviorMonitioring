/**
 * Add capacity and current occupancy fields to Home table
 * Usage: node server/scripts/add-home-capacity-fields.js
 */

const sequelize = require('../config/database');

async function addHomeCapacityFields() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('✓ Database connection established successfully.\n');

        console.log('Adding capacity fields to Home table...');

        const columns = [
            {
                name: 'capacity',
                sql: 'ALTER TABLE Home ADD COLUMN capacity INT NOT NULL DEFAULT 0'
            },
            {
                name: 'current_occupancy',
                sql: 'ALTER TABLE Home ADD COLUMN current_occupancy INT NOT NULL DEFAULT 0'
            }
        ];

        for (const column of columns) {
            try {
                const [results] = await sequelize.query(`
                    SELECT COLUMN_NAME
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = 'Home'
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

        console.log('\n✅ Home capacity fields added successfully!');
        console.log('\nNew columns:');
        console.log('- capacity (INT)');
        console.log('- current_occupancy (INT)');

        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to add Home capacity fields:', error.message);
        process.exit(1);
    }
}

addHomeCapacityFields();
