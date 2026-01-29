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

async function verifyLevels() {
    try {
        await AppDataSource.initialize();
        console.log('Connected to database');

        const queryRunner = AppDataSource.createQueryRunner();
        const rows = await queryRunner.query('SELECT name, slug, level FROM roles');
        console.log('Current Roles in DB:', rows);

        await AppDataSource.destroy();
    } catch (error) {
        console.error('Error:', error);
    }
}

verifyLevels();
