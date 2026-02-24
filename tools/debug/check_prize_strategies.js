
const { DataSource } = require('typeorm');

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'minigame',
    synchronize: false,
});

async function checkPrizeTypes() {
    try {
        await AppDataSource.initialize();
        console.log('Database connected');

        const queryRunner = AppDataSource.createQueryRunner();
        const result = await queryRunner.query(`SELECT slug, name, strategy FROM prize_types`);
        console.log('Prize Types Configuration:', JSON.stringify(result, null, 2));

        await AppDataSource.destroy();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkPrizeTypes();
