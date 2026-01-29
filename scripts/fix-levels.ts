import { DataSource } from 'typeorm';

const AppDataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'minigame',
    synchronize: false,
    logging: false,
    entities: [],
});

async function fixLevels() {
    try {
        await AppDataSource.initialize();
        console.log('Connected to database');
        const queryRunner = AppDataSource.createQueryRunner();

        console.log('Parameters:', {
            host: process.env.DB_HOST,
            db: process.env.DB_DATABASE
        });

        // Update levels manually
        await queryRunner.query(`UPDATE roles SET level = 100 WHERE slug = 'super_admin'`);
        await queryRunner.query(`UPDATE roles SET level = 80 WHERE slug = 'company_admin'`);
        await queryRunner.query(`UPDATE roles SET level = 10 WHERE slug = 'staff'`);
        await queryRunner.query(`UPDATE roles SET level = 1 WHERE slug = 'player'`);

        const rows = await queryRunner.query('SELECT name, slug, level FROM roles');
        console.log('Updated roles:', rows);

        await AppDataSource.destroy();
    } catch (error) {
        console.error('Error:', error);
    }
}

fixLevels();
