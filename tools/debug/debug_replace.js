
const fs = require('fs');
const path = require('path');

const filePath = 'd:\\Google_Antigravity_project\\Mini_Game\\Mini_Game\\apps\\api\\src\\modules\\game-instances\\templates\\spin-wheel.template.ts';

try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    console.log(`Total lines: ${lines.length}`);

    // Print lines 1440-1455 to see exact chars
    for (let i = 1440; i < 1460; i++) {
        if (lines[i]) {
            console.log(`${i}: ${JSON.stringify(lines[i])}`);
        }
    }

} catch (err) {
    console.error(err);
}
