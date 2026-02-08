
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/minigame',
});

async function updateJackpotConfig() {
    try {
        await client.connect();
        console.log('Connected to database.');

        const res = await client.query(`SELECT "configSchema" FROM games WHERE slug = 'spin-wheel'`);
        if (res.rows.length === 0) {
            console.log('Spin Wheel game not found.');
            return;
        }

        let schema = res.rows[0].configSchema;
        let updated = false;

        // Find the Visuals & UI tab (usually index 1, but we search by name/label)
        const visualsTab = schema.find(s => s.name === 'visuals' || s.label === 'page.manage.game.tabs.visuals');

        if (visualsTab) {
            // Find the Jackpot section
            const jackpotSection = visualsTab.items.find(item => item.key === 'jackpot_section');

            if (jackpotSection) {
                // defined keys to check
                console.log('Replacing Jackpot Items entirely...');

                // Force overwrite with correct items
                jackpotSection.items = [
                    { key: 'jackpot_group_title', type: 'divider', label: 'page.manage.game.visuals.jackpotOutcome', span: 24 },
                    { key: 'jackpotResultBackground', type: 'image', label: 'page.manage.game.visuals.resultBackground', span: 24 },
                    { key: 'jackpotResultTitleImage', type: 'image', label: 'page.manage.game.visuals.resultTitleImage', span: 24 },
                    { key: 'jackpotResultTitle', type: 'input', label: 'page.manage.game.visuals.resultTitle', default: '🎉 JACKPOT!!! 🎉', span: 24 },
                    { key: 'jackpotResultSubtitle', type: 'input', label: 'page.manage.game.visuals.resultSubtitle', default: 'INCREDIBLE WIN!', span: 24 },
                    { key: 'jackpotResultButtonImage', type: 'image', label: 'page.manage.game.visuals.resultButtonImage', span: 24 }
                ];

                updated = true;
                console.log('Jackpot section reset with correct fields.');
            }

            // Find the Result Prompt section
            const resultPromptSection = visualsTab.items.find(item => item.key === 'result_prompt_section');

            if (resultPromptSection) {
                console.log('Found result_prompt_section.');

                // 1. Remove ANY existing jackpot-related keys to prevent duplication or orphans
                const jackpotKeysToRemove = [
                    'jackpot_group_title',
                    'jackpotTitle',
                    'jackpotSubtitle',
                    'resultJackpotBackground',
                    'resultJackpotTitleImage',
                    'resultJackpotButtonImage',
                    'jackpotResultBackground',
                    'jackpotResultTitleImage',
                    'jackpotResultTitle',
                    'jackpotResultSubtitle',
                    'jackpotResultButtonImage'
                ];

                resultPromptSection.items = resultPromptSection.items.filter(item => !jackpotKeysToRemove.includes(item.key));

                // 2. Add the clean, aligned Jackpot fields with SPECIFIC labels
                const jackpotFields = [
                    { key: 'jackpot_group_title', type: 'divider', label: 'page.manage.game.visuals.jackpotOutcome', span: 24 },
                    { key: 'jackpotResultBackground', type: 'image', label: 'page.manage.game.visuals.jackpotBackground', span: 12 },
                    { key: 'jackpotResultTitleImage', type: 'image', label: 'page.manage.game.visuals.jackpotTitleImage', span: 12 },
                    { key: 'jackpotResultTitle', type: 'text', label: 'page.manage.game.visuals.jackpotTitle', default: '🎉 JACKPOT!!! 🎉', span: 12 },
                    { key: 'jackpotResultSubtitle', type: 'text', label: 'page.manage.game.visuals.jackpotSubtitle', default: 'INCREDIBLE WIN!', span: 12 },
                    { key: 'jackpotResultButtonImage', type: 'image', label: 'page.manage.game.visuals.jackpotButtonImage', span: 24 }
                ];

                resultPromptSection.items.push(...jackpotFields);
                updated = true;
                console.log('Jackpot fields cleaned, consolidated and specifically labeled in result_prompt_section.');
            } else {
                console.log('result_prompt_section not found.');
            }
        }

        if (updated) {
            await client.query(`UPDATE games SET "configSchema" = $1 WHERE slug = 'spin-wheel'`, [JSON.stringify(schema)]);
            console.log('Successfully updated Spin Wheel schema in database.');
        } else {
            console.log('Schema is already up to date.');
        }

    } catch (err) {
        console.error('Error updating database:', err);
    } finally {
        await client.end();
    }
}

updateJackpotConfig();
