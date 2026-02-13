
const { DataSource } = require('typeorm');
const dotenv = require('dotenv');

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'mini_game_db',
    entities: ['dist/**/*.entity.js'],
    synchronize: false,
});

async function checkPrizeType() {
    try {
        await AppDataSource.initialize();
        console.log('Database connected');

        const queryRunner = AppDataSource.createQueryRunner();
        const result = await queryRunner.query(`SELECT * FROM prize_types WHERE slug = 'cash'`);
        console.log('Cash Prize Type:', result);

        await AppDataSource.destroy();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkPrizeType();
