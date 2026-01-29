import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'minigame',
    synchronize: false,
    logging: false,
    entities: [],
});

async function checkSchema() {
    try {
        await AppDataSource.initialize();
        console.log('Connected to database');

        const queryRunner = AppDataSource.createQueryRunner();
        const table = await queryRunner.getTable('roles');

        if (table) {
            console.log('Columns in "roles" table:');
            table.columns.forEach(c => console.log(`- ${c.name} (${c.type})`));

            const levelCol = table.columns.find(c => c.name === 'level');
            if (!levelCol) {
                console.log('WARNING: "level" column is MISSING!');

                // Attempt to fix manually
                console.log('Attempting to add "level" column manually...');
                await queryRunner.query('ALTER TABLE roles ADD COLUMN level integer DEFAULT 1');
                console.log('Column added. Please restart the application.');
            } else {
                console.log('SUCCESS: "level" column exists.');

                // Check sample data
                const rows = await queryRunner.query('SELECT name, slug, level FROM roles');
                console.log('Sample data:', rows);
            }
        } else {
            console.log('Table "roles" does not exist!');
        }

        await AppDataSource.destroy();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkSchema();
