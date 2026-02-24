
const fs = require('fs');
const path = require('path');

const filePath = 'd:\\Google_Antigravity_project\\Mini_Game\\Mini_Game\\apps\\api\\src\\modules\\game-instances\\templates\\spin-wheel.template.ts';

try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Define the start marker
    const startMarker = '// WIN / JACKPOT Case';
    const startIndex = content.indexOf(startMarker);

    if (startIndex === -1) {
        // Maybe I already replaced it?
        // If my previous run succeeded (it did), the file NOW contains my new content (with broken escaping).
        // I should look for the BROKEN content or matching the start of my inserted block.
        // My inserted block starts with `// WIN / JACKPOT Case`.
        // So `indexOf` should still find it!
        // But maybe I should search for the ENTIRE block I inserted to be safe?
        // Or just overwrite it again using the same markers.
        // But I need to be sure I'm replacing the BAD block.
        // The previous run replaced from `// WIN / JACKPOT Case` to `if (wonIcon...`.
        // So the markers are still valid boundaries!
        // The StartMarker is `// WIN / JACKPOT Case`.
        // The EndMarker is `if (wonIcon...`.
        // So I can just re-run the logic!
    }

    if (startIndex === -1) {
        console.error('Start marker not found!');
        process.exit(1);
    }

    // Define the end marker
    const endMarker = "if (wonIcon && (wonIcon.startsWith('http')";
    const endIndex = content.indexOf(endMarker);

    if (endIndex === -1) {
        console.error('End marker not found!');
        process.exit(1);
    }

    // Construct new content with FIXED ESCAPING
    // We use \\ before ` and ${ to ensure \ is written to file
    const newContent = `// WIN / JACKPOT Case
                    if (isJackpot) {
                        // JACKPOT Case
                        if (config.resultJackpotBackground) {
                            resultCard.style.backgroundImage = 'url("' + getUrlLocal(config.resultJackpotBackground) + '")';
                            resultCard.classList.add('has-bg');
                        } else if (config.resultWinBackground) {
                            resultCard.style.backgroundImage = 'url("' + getUrlLocal(config.resultWinBackground) + '")';
                            resultCard.classList.add('has-bg');
                        } else {
                            resultCard.style.backgroundImage = '';
                            resultCard.classList.remove('has-bg');
                        }

                        if (config.resultJackpotTitleImage) {
                            resultTitleImg.src = getUrlLocal(config.resultJackpotTitleImage);
                            resultTitleImg.style.display = 'block';
                            resultBadge.style.display = 'none';
                            winnerMsg.style.display = 'none';
                        } else if (config.resultWinTitleImage) {
                            resultTitleImg.src = getUrlLocal(config.resultWinTitleImage);
                            resultTitleImg.style.display = 'block';
                            resultBadge.style.display = 'none';
                            winnerMsg.style.display = 'none';
                        } else {
                            resultTitleImg.style.display = 'none';
                            resultBadge.style.display = 'block';
                            winnerMsg.style.display = 'block';
                            resultBadge.innerText = config.jackpotTitle || '🌟 JACKPOT! 🌟';
                            winnerMsg.innerText = config.jackpotSubtitle || \\\`You've won \\\${won}!\\\`;
                        }

                        if (config.resultJackpotButtonImage) {
                            collectBtn.style.backgroundImage = 'url("' + getUrlLocal(config.resultJackpotButtonImage) + '")';
                            collectBtn.classList.add('has-img');
                            collectBtn.innerText = '';
                        } else if (config.resultWinButtonImage) {
                             collectBtn.style.backgroundImage = 'url("' + getUrlLocal(config.resultWinButtonImage) + '")';
                             collectBtn.classList.add('has-img');
                             collectBtn.innerText = '';
                        } else {
                             collectBtn.style.backgroundImage = '';
                             collectBtn.classList.remove('has-img');
                             collectBtn.innerText = 'COLLECT';
                        }
                    } else {
                        // STANDARD WIN Case
                        if (config.resultWinBackground) {
                            resultCard.style.backgroundImage = 'url("' + getUrlLocal(config.resultWinBackground) + '")';
                            resultCard.classList.add('has-bg');
                        } else {
                            resultCard.style.backgroundImage = '';
                            resultCard.classList.remove('has-bg');
                        }

                        if (config.resultWinTitleImage) {
                            resultTitleImg.src = getUrlLocal(config.resultWinTitleImage);
                            resultTitleImg.style.display = 'block';
                            resultBadge.style.display = 'none';
                            winnerMsg.style.display = 'none';
                        } else {
                            resultTitleImg.style.display = 'none';
                            resultBadge.style.display = 'block';
                            winnerMsg.style.display = 'block';
                            resultBadge.innerText = config.winTitle || '🎉 CONGRATULATIONS 🎉';
                            winnerMsg.innerText = config.winSubtitle || \\\`You've won \\\${won}!\\\`;
                        }

                        if (config.resultWinButtonImage) {
                            collectBtn.style.backgroundImage = 'url("' + getUrlLocal(config.resultWinButtonImage) + '")';
                            collectBtn.classList.add('has-img');
                            collectBtn.innerText = '';
                        } else {
                            collectBtn.style.backgroundImage = '';
                            collectBtn.classList.remove('has-img');
                            collectBtn.innerText = 'COLLECT';
                        }
                    }
                }
                
                `;

    const pre = content.substring(0, startIndex);
    const post = content.substring(endIndex);

    const finalContent = pre + newContent + post;

    fs.writeFileSync(filePath, finalContent, 'utf8');
    console.log('Successfully updated spin-wheel.template.ts with fixed escaping');

} catch (err) {
    console.error(err);
}
