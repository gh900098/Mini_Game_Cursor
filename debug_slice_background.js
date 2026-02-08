
const fs = require('fs');
const filePath = 'd:\\Google_Antigravity_project\\Mini_Game\\Mini_Game\\apps\\api\\src\\modules\\game-instances\\templates\\spin-wheel.template.ts';
try {
    let content = fs.readFileSync(filePath, 'utf8');
    const gradientLoopStart = "prizeList.forEach((p, i) => {";
    const defsIndex = content.indexOf("svg += '<defs>';");
    if (defsIndex === -1) { console.log('Defs not found'); process.exit(1); }
    const loopStartIndex = content.indexOf(gradientLoopStart, defsIndex);
    if (loopStartIndex === -1) { console.log('Loop start not found'); process.exit(1); }

    console.log('--- Content starting at loopStartIndex ---');
    console.log(JSON.stringify(content.substring(loopStartIndex, loopStartIndex + 500)));
    console.log('------------------------------------------');
} catch (e) { console.error(e); }
