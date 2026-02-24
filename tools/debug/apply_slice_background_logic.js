
const fs = require('fs');
const path = require('path');

const filePath = 'd:\\Google_Antigravity_project\\Mini_Game\\Mini_Game\\apps\\api\\src\\modules\\game-instances\\templates\\spin-wheel.template.ts';

try {
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Replace Gradient Definitions Loop logic
    const defsIndex = content.indexOf("svg += '<defs>';");
    if (defsIndex === -1) { console.error('Defs start not found'); process.exit(1); }

    const loopStartStr = "prizeList.forEach((p, i) => {";
    const loopStartIndex = content.indexOf(loopStartStr, defsIndex);
    if (loopStartIndex === -1) { console.error('Loop start not found'); process.exit(1); }

    const loopEndIndex = content.indexOf("});", loopStartIndex);
    if (loopEndIndex === -1) { console.error('Loop end not found'); process.exit(1); }

    const bodyStartIndex = loopStartIndex + loopStartStr.length;
    const bodyEndIndex = loopEndIndex;

    // CORRECT ESCAPING STRATEGY:
    // The target file content is inside a backticked string (template literal).
    // Therefore, any backticks inside intended for the inner JS code MUST be escaped with a backslash.
    // e.g. the file should contain: svg += \`<pattern ... \`;
    //
    // To generate this string using our Node script (which also uses template literals for 'newBodyContent'),
    // we must escape the backslash AND the backtick.
    // \\` in Node string -> \` in file.
    //
    // Also, ${vars} that are meant for the inner JS runtime (like ${i}, ${rotate}) must be escaped in the file as \${i}.
    // To generate \${i} in the file, we need \\${i} in Node string?
    // Node string `\${i}` -> `${i}` (escaped $).
    // Node string `\\${i}` -> `\${i}` (escaped slash, then dollar).

    const newBodyContent = `
                if (p.backgroundImage) {
                    const imgUrl = getUrlLocal(p.backgroundImage);
                    const midAngle = (i + 0.5) * angle;
                    const rotate = midAngle; 
                    
                    svg += \\\`<pattern id="fill-\\\${i}" patternUnits="userSpaceOnUse" width="400" height="400" patternTransform="rotate(\\\${rotate}, 200, 200)">
                        <image href="\\\${imgUrl}" x="0" y="0" width="400" height="400" preserveAspectRatio="none" />
                    </pattern>\\\`;
                } else {
                    const color = p.color || ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'][i % 6];
                    svg += \\\`<linearGradient id="fill-\\\${i}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="\\\${color}" stop-opacity="1"/>
                        <stop offset="100%" stop-color="\\\${color}" stop-opacity="0.7"/>
                    </linearGradient>\\\`;
                }
            `;

    let newContent = content.substring(0, bodyStartIndex) + newBodyContent + content.substring(bodyEndIndex);

    // 2. Replace Slice Path Fill
    // File content has: svg += \`<path ... fill="url(#g\${i})" ... \`;
    // We want:          svg += \`<path ... fill="url(#fill-\${i})" ... \`;

    // Search for: fill="url(#g\${i})"
    // In node string: fill="url(#g\\${i})"  (to match \${i})
    // No, we need to match the LITERAL string in the file.
    // The file has: ... fill="url(#g\${i})" ...
    // Note: Node's readFileSync returns proper strings.
    // If file has `\` then `$`, the string has `\` then `$`.

    // Let's try to match the generic pattern `url(#g` and replace with `url(#fill-`
    // This is safer.

    // We need to replace ALL occurrences if there are multiple? Usually one path loop.
    if (newContent.indexOf('fill="url(#g') !== -1) {
        newContent = newContent.split('fill="url(#g').join('fill="url(#fill-');
        console.log('Replaced fill URL (simple)');
    } else {
        // Inspecting debug output:
        // svg += \`<path ... fill="url(#g\${i})"/>\`;
        // So it definitely contains fill="url(#g
        console.warn('Could not find fill="url(#g to replace');
    }

    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Successfully applied double-escaped slice logic');

} catch (err) {
    console.error(err);
    process.exit(1);
}
