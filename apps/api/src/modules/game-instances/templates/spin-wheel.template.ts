/**
 * Premium Spin Wheel Template v2.0
 * Features:
 * - ✨ Entrance animations with stagger
 * - 🌟 Glow effects during spin
 * - 🎯 Pointer bounce on stop
 * - 💫 Floating particles background
 * - 🔊 Sound effects (tick + win)
 * - 📱 Haptic feedback
 * - ⭐ Premium result screen with rays
 * - 🎨 Shimmer effects
 */

export interface SpinWheelConfig {
    instanceName: string;
    prizeList: Array<{ icon: string; label: string; weight: number; color?: string }>;
    themeColor: string;
    secondaryColor: string;
    spinDuration: number;
    spinTurns: number;
    costPerSpin: number;
    
    // Background
    bgType: 'color' | 'gradient' | 'image';
    bgColor: string;
    bgGradient: string;
    bgImage: string;
    bgFit: string;
    bgBlur: number;
    bgOpacity: number;
    
    // Branding
    titleImage: string;
    logoWidth: number;
    logoTopMargin: number;
    logoOpacity: number;
    logoShadow: string;
    
    // Wheel
    wheelBorderImage: string;
    dividerType: 'line' | 'image';
    dividerColor: string;
    dividerStroke: number;
    dividerImage: string;
    dividerWidth: number;
    dividerHeight: number;
    dividerTop: number;
    
    // Pointer
    pointerImage: string;
    pointerSize: number;
    pointerTop: number;
    pointerShadow: boolean;
    pointerDirection: string;
    pointerRotation: number;
    
    // Center
    centerImage: string;
    centerType: 'emoji' | 'image';
    centerEmoji: string;
    centerSize: number;
    centerBorder: boolean;
    centerShadow: boolean;
    
    // Button
    spinBtnImage: string;
    spinBtnText: string;
    spinBtnSubtext: string;
    spinBtnColor: string;
    spinBtnTextColor: string;
    spinBtnShadow: boolean;
    spinBtnWidth: number;
    spinBtnHeight: number;
    
    // Token Bar
    tokenBarImage: string;
    tokenBarColor: string;
    tokenBarTextColor: string;
    tokenBarShadow: boolean;
    
    // Font
    gameFont: string;
    
    // Sound (new)
    enableSound: boolean;
    
    // Confetti effects
    enableConfetti: boolean;
    confettiParticles: number;
    confettiSpread: number;
    confettiColors: string;
    confettiShapeType: 'default' | 'emoji';
    confettiEmojis: string;
    
    // Preview mode
    isPreview: boolean;
    
    // Raw config for sync
    rawConfig: Record<string, any>;
    
    // LED Colors (for visual templates like Christmas Joy)
    ledColor1: string;
    ledColor2: string;
    ledColor3: string;
    
    // Background Gradient (alternative to bgGradient)
    bgGradStart: string;
    bgGradEnd: string;
}

export function generateSpinWheelHtml(cfg: SpinWheelConfig): string {
    // Font preset handling
    const fontPreset = (cfg.rawConfig?.fontPreset as string) || 'default';
    const googleFonts = ['Press Start 2P', 'Bangers', 'Bungee', 'Russo One', 'Black Ops One', 'Righteous', 'Permanent Marker', 'Creepster', 'Lobster'];
    const isGoogleFont = googleFonts.includes(fontPreset);
    const isCustomFont = fontPreset === 'custom' && cfg.gameFont;
    
    // Google Fonts URL
    const googleFontUrl = isGoogleFont 
        ? `https://fonts.googleapis.com/css2?family=${fontPreset.replace(/ /g, '+')}:wght@400;700;900&display=swap`
        : '';
    
    // Font family to use
    const selectedFont = isGoogleFont ? `'${fontPreset}'` : (isCustomFont ? "'CustomGameFont'" : "'Orbitron'");
    
    const fontCss = isCustomFont ? `
        @font-face {
            font-family: 'CustomGameFont';
            src: url('${cfg.gameFont}');
            font-weight: 400 900;
            font-display: swap;
        }
        :root, body, button, input, .token-bar, .default-title, .prize-text {
            font-family: 'CustomGameFont', 'Orbitron', 'Inter', sans-serif !important;
        }
    ` : (isGoogleFont ? `
        :root, body, button, input, .token-bar, .default-title, .prize-text {
            font-family: ${selectedFont}, 'Orbitron', 'Inter', sans-serif !important;
        }
    ` : '');

    // Get theme template slug for default audio
    const visualTemplate = (cfg.rawConfig?.visualTemplate as string) || 'Cyberpunk Elite';
    const themeSlugMap: Record<string, string> = {
        'Cyberpunk Elite': 'cyberpunk-elite',
        'Neon Night': 'neon-night',
        'Classic Arcade': 'classic-arcade',
        'Christmas Joy': 'christmas-joy',
        'Gold Royale': 'gold-royale'
    };
    const themeSlug = themeSlugMap[visualTemplate] || 'cyberpunk-elite';
    
    // Audio URL resolver - Handle three modes properly
    function resolveAudioUrl(audioUrl: string | undefined, themeSlug: string, audioType: string): string {
        // Mode 1: Explicitly empty string = User chose "none" - no audio
        if (audioUrl === '') {
            return '';
        }
        
        // Mode 2: __CUSTOM_PENDING__ = User chose custom but hasn't uploaded yet - no audio
        if (audioUrl === '__CUSTOM_PENDING__') {
            return '';
        }
        
        // Mode 3: __THEME_DEFAULT__ or undefined = Use theme default
        if (!audioUrl || audioUrl === '__THEME_DEFAULT__') {
            return `/api/uploads/templates/${themeSlug}/${audioType}`;
        }
        
        // Mode 4: Has URL = User uploaded custom audio
        return audioUrl;
    }
    
    // Resolve audio URLs - preserve empty strings (mode: none)
    const resolvedBgmUrl = resolveAudioUrl(cfg.rawConfig?.bgmUrl, themeSlug, 'bgm.mp3');
    const resolvedWinSound = resolveAudioUrl(cfg.rawConfig?.winSound, themeSlug, 'win.mp3');
    const resolvedLoseSound = resolveAudioUrl(cfg.rawConfig?.loseSound, themeSlug, 'lose.mp3');
    const resolvedJackpotSound = resolveAudioUrl(cfg.rawConfig?.jackpotSound, themeSlug, 'jackpot.mp3');
    
    // Override config with resolved URLs
    cfg.rawConfig = {
        ...cfg.rawConfig,
        bgmUrl: resolvedBgmUrl,
        winSound: resolvedWinSound,
        loseSound: resolvedLoseSound,
        jackpotSound: resolvedJackpotSound
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>${cfg.instanceName}</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;900&family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
    ${isGoogleFont ? `<link href="${googleFontUrl}" rel="stylesheet">` : ''}
    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"><\/script>
    <style>
        ${fontCss}
        :root {
            --primary: ${cfg.themeColor};
            --secondary: ${cfg.secondaryColor};
            --duration: ${cfg.spinDuration}ms;
            --gold: #eab308;
            --gold-light: #fde047;
            --gold-gradient: linear-gradient(180deg, #fceabb 0%, #fccd4d 50%, #f8b500 100%);
            --metallic-text: linear-gradient(180deg, #fff 0%, #eab308 40%, #854d0e 100%);
        }
        
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; outline: none; }
        
        html, body {
            margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden;
            background: #000; font-family: 'Inter', sans-serif;
        }
        
        /* ========== ENTRANCE ANIMATIONS ========== */
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInScale {
            from { opacity: 0; transform: scale(0.8); }
            to { opacity: 1; transform: scale(1); }
        }
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        @keyframes shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
        }
        @keyframes pulse-glow {
            0%, 100% { filter: drop-shadow(0 0 20px var(--primary)); }
            50% { filter: drop-shadow(0 0 40px var(--primary)) drop-shadow(0 0 60px var(--gold)); }
        }
        @keyframes spin-glow {
            0% { box-shadow: 0 0 0 4px var(--primary), 0 0 30px var(--primary); }
            50% { box-shadow: 0 0 0 4px var(--gold), 0 0 60px var(--gold), 0 0 100px var(--primary); }
            100% { box-shadow: 0 0 0 4px var(--primary), 0 0 30px var(--primary); }
        }
        @keyframes pointer-bounce {
            0%, 100% { transform: translateY(0); }
            20% { transform: translateY(-15px); }
            40% { transform: translateY(0); }
            60% { transform: translateY(-8px); }
            80% { transform: translateY(0); }
        }
        @keyframes particle-float {
            0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes led-chase {
            0%, 100% { opacity: 0.2; transform: scale(0.6); }
            50% { opacity: 1; transform: scale(1.5); box-shadow: 0 0 20px var(--gold); }
        }
        @keyframes ray-rotate {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes star-twinkle {
            0%, 100% { opacity: 0.3; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); }
        }
        
        /* ========== GAME CONTAINER ========== */
        .game-world {
            position: fixed; inset: 0;
            display: flex; flex-direction: column; align-items: center; justify-content: space-between;
            overflow: hidden; z-index: 1;
        }
        
        .bg-layer {
            position: absolute; inset: -20px; z-index: -1; 
            width: calc(100% + 40px); height: calc(100% + 40px);
            pointer-events: none; transition: all 0.5s ease;
            ${cfg.bgType === 'color' ? `background: ${cfg.bgColor};` : ''}
            ${cfg.bgType === 'gradient' ? `background: ${cfg.bgGradient || (cfg.bgGradStart && cfg.bgGradEnd ? `linear-gradient(135deg, ${cfg.bgGradStart} 0%, ${cfg.bgGradEnd} 100%)` : '')};` : ''}
            ${cfg.bgGradStart && cfg.bgGradEnd && cfg.bgType !== 'image' ? `background: linear-gradient(135deg, ${cfg.bgGradStart} 0%, ${cfg.bgGradEnd} 100%);` : ''}
            ${cfg.bgType === 'image' ? `
                background: url(${cfg.bgImage}) center/${cfg.bgFit} no-repeat;
                filter: blur(${cfg.bgBlur}px);
                opacity: ${cfg.bgOpacity};
            ` : ''}
        }
        
        /* ========== FLOATING PARTICLES ========== */
        .particles-container {
            position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 0;
        }
        .particle {
            position: absolute; border-radius: 50%;
            animation: particle-float linear infinite;
            opacity: 0;
        }
        
        /* ========== FLOATING HEXAGONS ========== */
        .hexagons-container {
            position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 1;
        }
        .hexagon {
            position: absolute;
            width: 30px; height: 34px;
            background: var(--primary);
            opacity: 0.15;
            clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
            animation: hexagon-float linear infinite;
        }
        @keyframes hexagon-float {
            0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
            10% { opacity: 0.15; }
            90% { opacity: 0.15; }
            100% { transform: translateY(-100px) rotate(180deg); opacity: 0; }
        }
        
        /* ========== CYBER GRID FLOOR ========== */
        .grid-floor {
            position: absolute; bottom: 0; left: 0; right: 0; height: 40%;
            background: 
                linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%),
                repeating-linear-gradient(90deg, var(--primary) 0px, var(--primary) 1px, transparent 1px, transparent 60px),
                repeating-linear-gradient(0deg, var(--primary) 0px, var(--primary) 1px, transparent 1px, transparent 60px);
            opacity: 0.3;
            transform: perspective(500px) rotateX(60deg);
            transform-origin: bottom;
            pointer-events: none; z-index: 0;
            animation: grid-scroll 20s linear infinite;
        }
        @keyframes grid-scroll {
            0% { background-position: 0 0, 0 0, 0 0; }
            100% { background-position: 0 0, 0 60px, 60px 0; }
        }
        
        /* ========== START SCREEN (Cyberpunk Style) ========== */
        .start-screen {
            position: fixed; inset: 0; z-index: 1000;
            background: linear-gradient(135deg, #0a0a12 0%, #1a1a2e 50%, #0f0f1a 100%);
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            cursor: pointer; overflow: hidden;
        }
        .start-screen::before {
            content: ''; position: absolute; inset: 0;
            background: 
                repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,245,255,0.03) 2px, rgba(0,245,255,0.03) 4px),
                repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,0,255,0.02) 2px, rgba(255,0,255,0.02) 4px);
            pointer-events: none;
            animation: scanlines 8s linear infinite;
        }
        @keyframes scanlines {
            0% { transform: translateY(0); }
            100% { transform: translateY(4px); }
        }
        .start-screen .cyber-frame {
            border: 2px solid var(--primary);
            padding: 40px 60px;
            position: relative;
            background: rgba(0,0,0,0.6);
            box-shadow: 0 0 30px rgba(0,245,255,0.3), inset 0 0 30px rgba(0,245,255,0.1);
            clip-path: polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px));
        }
        .start-screen .cyber-frame::before,
        .start-screen .cyber-frame::after {
            content: ''; position: absolute; width: 20px; height: 20px;
            border: 2px solid var(--gold);
        }
        .start-screen .cyber-frame::before {
            top: -5px; left: -5px;
            border-right: none; border-bottom: none;
        }
        .start-screen .cyber-frame::after {
            bottom: -5px; right: -5px;
            border-left: none; border-top: none;
        }
        .start-screen .tap-icon {
            font-size: 4rem; margin-bottom: 20px;
            filter: drop-shadow(0 0 20px var(--primary));
            animation: cyber-pulse 2s ease-in-out infinite;
        }
        @keyframes cyber-pulse {
            0%, 100% { transform: scale(1); filter: drop-shadow(0 0 20px var(--primary)); }
            50% { transform: scale(1.1); filter: drop-shadow(0 0 40px var(--primary)) drop-shadow(0 0 60px var(--secondary)); }
        }
        .start-screen h1 {
            font-size: 1.8rem; color: var(--primary);
            text-transform: uppercase; letter-spacing: 8px;
            margin-bottom: 10px;
            text-shadow: 0 0 10px var(--primary), 0 0 20px var(--primary), 0 0 40px var(--primary);
            animation: glitch-text 3s infinite;
        }
        @keyframes glitch-text {
            0%, 90%, 100% { text-shadow: 0 0 10px var(--primary), 0 0 20px var(--primary); transform: translate(0); }
            92% { text-shadow: -2px 0 var(--secondary), 2px 0 var(--gold); transform: translate(-2px, 1px); }
            94% { text-shadow: 2px 0 var(--secondary), -2px 0 var(--gold); transform: translate(2px, -1px); }
            96% { text-shadow: 0 0 10px var(--primary), 0 0 20px var(--primary); transform: translate(0); }
        }
        .start-screen p {
            color: var(--gold); font-size: 0.85rem;
            text-transform: uppercase; letter-spacing: 3px;
            opacity: 0.8;
        }
        .start-screen .corner-deco {
            position: absolute; width: 100px; height: 100px;
            border: 1px solid var(--primary); opacity: 0.3;
        }
        .start-screen .corner-deco.tl { top: 20px; left: 20px; border-right: none; border-bottom: none; }
        .start-screen .corner-deco.tr { top: 20px; right: 20px; border-left: none; border-bottom: none; }
        .start-screen .corner-deco.bl { bottom: 20px; left: 20px; border-right: none; border-top: none; }
        .start-screen .corner-deco.br { bottom: 20px; right: 20px; border-left: none; border-top: none; }
        
        /* ========== TOP HUD ========== */
        .hud-top {
            width: 100%; padding: env(safe-area-inset-top) 0; 
            display: flex; flex-direction: column; align-items: center;
            z-index: 50; margin-top: 10px;
            animation: fadeInUp 0.8s ease-out;
        }
        
        .token-bar {
            background: ${cfg.tokenBarImage ? `url(${cfg.tokenBarImage}) center/100% 100% no-repeat` : cfg.tokenBarColor};
            color: ${cfg.tokenBarTextColor};
            padding: 10px 28px; border-radius: 50px; font-weight: 700;
            font-family: ${cfg.gameFont ? "'CustomGameFont'" : "'Orbitron'"}, sans-serif;
            filter: ${cfg.tokenBarShadow ? 'drop-shadow(0 4px 15px rgba(0,0,0,0.4))' : 'none'};
            border: 2px solid rgba(255,255,255,0.3);
            min-width: 200px; text-align: center;
            backdrop-filter: blur(10px);
            position: relative;
            overflow: hidden;
        }
        .token-bar::after {
            content: '';
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            background-size: 200% 100%;
            animation: shimmer 3s infinite;
        }
        
        .branding { 
            width: 100%; text-align: center; margin-top: ${cfg.logoTopMargin}px;
            animation: fadeInUp 0.8s ease-out 0.1s both;
        }
        .branding img {
            width: ${cfg.logoWidth}%;
            max-width: 100%; max-height: 30vh;
            object-fit: contain;
            opacity: ${cfg.logoOpacity};
            filter: ${cfg.logoShadow};
            animation: float 4s ease-in-out infinite;
        }
        .default-title {
            font-family: ${cfg.gameFont ? "'CustomGameFont', " : ""}'Orbitron', sans-serif;
            font-size: clamp(1.8rem, 8vw, 3rem); font-weight: 950;
            background: var(--metallic-text); 
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            background-clip: text;
            filter: drop-shadow(0 0 20px rgba(234, 179, 8, 0.6));
            line-height: 1;
            animation: float 4s ease-in-out infinite;
        }
        
        /* ========== WHEEL STAGE ========== */
        .wheel-stage {
            position: relative; 
            width: min(85vw, 380px); height: min(85vw, 380px);
            display: flex; align-items: center; justify-content: center;
            z-index: 60;
            animation: fadeInScale 0.8s ease-out 0.2s both;
        }
        
        .wheel-glow {
            position: absolute; inset: -30px; border-radius: 50%;
            background: radial-gradient(circle, var(--primary) 0%, transparent 70%);
            opacity: 0; transition: opacity 0.5s;
            pointer-events: none;
        }
        .wheel-glow.active {
            opacity: 0.5;
            animation: pulse-glow 0.5s ease-in-out infinite;
        }
        
        .wheel-border-plate {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            z-index: 5; pointer-events: none;
            background-size: contain; background-repeat: no-repeat; background-position: center;
        }
        
        .pointer-wrapper {
            position: absolute; inset: 0; pointer-events: none; z-index: 60;
            display: flex; justify-content: center;
            transform: rotate(${cfg.pointerRotation}deg);
        }
        
        .outer-neon-ring {
            position: absolute; inset: -12px; border-radius: 50%;
            border: 5px solid #1e293b;
            box-shadow: inset 0 0 15px #000, 0 0 20px var(--primary);
            z-index: 10;
        }
        
        .led-dot {
            position: absolute; width: 10px; height: 10px; border-radius: 50%;
            background: var(--gold-light);
            box-shadow: 0 0 10px var(--gold);
        }
        .led-dot.spinning {
            animation: led-chase 0.15s ease-in-out infinite;
        }
        
        .wheel-container {
            width: 100%; height: 100%; border-radius: 50%;
            border: 8px solid #0f172a;
            box-shadow: 0 0 0 4px var(--primary), 0 0 30px rgba(0,0,0,0.5);
            overflow: hidden; background: #fff; position: relative; z-index: 10;
            transition: box-shadow 0.3s;
        }
        .wheel-container.spinning {
            animation: spin-glow 0.5s ease-in-out infinite;
        }
        
        #wheel {
            width: 100%; height: 100%; position: relative;
            transform-origin: center center;
            will-change: transform;
        }
        
        svg { width: 100%; height: 100%; display: block; }
        .slice-label-g { pointer-events: none; }
        .slice-label {
            font-family: 'Orbitron', sans-serif; font-weight: 900;
            text-transform: uppercase; text-anchor: middle;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
        }
        .slice-prefix { font-size: 5px; font-weight: 700; opacity: 0.7; letter-spacing: 1px; }
        .slice-text { font-size: 9px; letter-spacing: 0.5px; }
        .slice-icon-emoji { font-size: 22px; }
        
        .pointer-stage {
            position: absolute; top: ${cfg.pointerTop}px;
            width: ${cfg.pointerSize}px; height: ${cfg.pointerSize * 1.5}px; z-index: 60;
            filter: ${cfg.pointerShadow ? 'drop-shadow(0 10px 20px rgba(0,0,0,0.8))' : 'none'};
            transition: transform 0.3s;
        }
        .pointer-stage.bounce {
            animation: pointer-bounce 0.6s ease-out;
        }
        .pointer-asset {
            width: 100%; height: 100%;
            ${cfg.pointerImage ? 
                `background: url(${cfg.pointerImage}) center/contain no-repeat;` : 
                `background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
                 clip-path: polygon(0 0, 100% 0, 50% 100%);
                 border-radius: 4px;
                 box-shadow: inset 0 2px 4px rgba(255,255,255,0.3);`
            }
        }
        
        .center-hub {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: ${cfg.centerSize}px; height: ${cfg.centerSize}px;
            ${cfg.centerType === 'image' && cfg.centerImage ? 
                `background: url(${cfg.centerImage}) center/cover no-repeat;` : 
                `background: radial-gradient(circle at 30% 30%, #fff, #94a3b8);`
            }
            border: ${cfg.centerBorder ? '5px solid #1e293b' : 'none'};
            box-shadow: ${cfg.centerShadow ? '0 10px 30px rgba(0,0,0,0.8), inset 0 2px 5px #fff' : 'none'};
            z-index: 20; border-radius: 50%;
            display: flex; align-items: center; justify-content: center; font-size: 24px;
        }
        
        /* ========== BOTTOM HUD ========== */
        .hud-bottom {
            width: 100%; padding-bottom: calc(25px + env(safe-area-inset-bottom));
            display: flex; flex-direction: column; align-items: center; z-index: 50;
            animation: fadeInUp 0.8s ease-out 0.3s both;
        }
        
        .spin-btn {
            width: min(85vw, ${cfg.spinBtnWidth}px); height: ${cfg.spinBtnHeight}px;
            border: none; cursor: pointer; border-radius: 16px;
            position: relative; overflow: hidden;
            transition: all 0.15s ease;
            box-shadow: ${cfg.spinBtnShadow ? '0 8px 30px rgba(0,0,0,0.5), 0 4px 0 rgba(0,0,0,0.2)' : 'none'};
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            ${cfg.spinBtnImage ? 
                `background: url(${cfg.spinBtnImage}) center/100% 100% no-repeat;` : 
                `background: linear-gradient(180deg, ${cfg.spinBtnColor} 0%, ${adjustColor(cfg.spinBtnColor, -20)} 100%);`
            }
        }
        .spin-btn::before {
            content: '';
            position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transition: left 0.5s;
        }
        .spin-btn:hover::before { left: 100%; }
        .spin-btn:active:not(:disabled) { 
            transform: translateY(4px) scale(0.98);
            box-shadow: ${cfg.spinBtnShadow ? '0 2px 10px rgba(0,0,0,0.3)' : 'none'};
        }
        .spin-btn:disabled { 
            opacity: 0.6; filter: grayscale(0.5); cursor: not-allowed;
            transform: none;
        }
        
        .spin-label { 
            font-family: 'Orbitron', sans-serif; font-weight: 950; 
            font-size: 1.6rem; color: ${cfg.spinBtnTextColor}; 
            line-height: 1; text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .spin-sub { 
            font-family: 'Orbitron', sans-serif; font-size: 0.7rem; font-weight: 700;
            color: ${cfg.spinBtnTextColor}; margin-top: 4px; opacity: 0.8;
        }
        
        #status-msg { 
            margin-top: 15px; color: #fff; 
            font-family: 'Orbitron', sans-serif; font-weight: 700;
            letter-spacing: 3px; text-transform: uppercase;
            opacity: 0.7; font-size: 0.75rem;
            text-shadow: 0 0 10px rgba(255,255,255,0.3);
        }
        
        /* ========== RESULT SCREEN ========== */
        #result-screen {
            position: fixed; inset: 0; 
            background: rgba(0,0,0,0.9); backdrop-filter: blur(20px);
            display: none; align-items: center; justify-content: center; z-index: 100;
            padding: 20px;
        }
        
        .result-rays {
            position: absolute; top: 50%; left: 50%;
            width: 150vmax; height: 150vmax;
            background: conic-gradient(from 0deg, transparent, rgba(234, 179, 8, 0.1), transparent, rgba(234, 179, 8, 0.1), transparent, rgba(234, 179, 8, 0.1), transparent, rgba(234, 179, 8, 0.1), transparent);
            animation: ray-rotate 20s linear infinite;
            pointer-events: none;
        }
        
        .result-stars {
            position: absolute; inset: 0; pointer-events: none; overflow: hidden;
        }
        .star {
            position: absolute;
            width: 4px; height: 4px;
            background: var(--gold);
            border-radius: 50%;
            box-shadow: 0 0 10px var(--gold);
            animation: star-twinkle 1.5s ease-in-out infinite;
        }
        
        .result-card {
            background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
            border: 4px solid var(--gold);
            border-radius: 32px; width: 90vw; max-width: 380px;
            padding: 50px 25px 40px; text-align: center;
            box-shadow: 0 0 80px rgba(234, 179, 8, 0.3), inset 0 1px 0 rgba(255,255,255,0.1);
            animation: card-reveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
            display: flex; flex-direction: column; align-items: center;
            position: relative; z-index: 10;
        }
        @keyframes card-reveal { 
            from { transform: scale(0.5) translateY(50px); opacity: 0; } 
            to { transform: scale(1) translateY(0); opacity: 1; } 
        }
        
        .result-badge {
            font-family: 'Orbitron', sans-serif; font-size: 0.75rem;
            color: var(--gold); letter-spacing: 6px; text-transform: uppercase;
            font-weight: 900; margin-bottom: 15px;
        }
        
        .result-icon {
            font-size: 4rem; margin-bottom: 10px;
            animation: float 2s ease-in-out infinite;
        }
        
        .result-prize {
            font-family: 'Orbitron', sans-serif; 
            font-size: clamp(1.6rem, 8vw, 2.8rem);
            background: var(--metallic-text);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            background-clip: text;
            margin: 10px 0 20px;
            text-shadow: none;
            filter: drop-shadow(0 0 20px rgba(234, 179, 8, 0.5));
            line-height: 1.2; word-break: break-word;
        }
        
        .result-msg {
            color: rgba(255,255,255,0.7); margin-bottom: 30px;
            font-size: 0.9rem; line-height: 1.5;
        }
        
        .collect-btn {
            width: 100%; max-width: 280px; height: 56px;
            border: none; border-radius: 12px; cursor: pointer;
            background: linear-gradient(180deg, var(--gold) 0%, #ca8a04 100%);
            color: #1e1b4b; font-family: 'Orbitron', sans-serif;
            font-weight: 950; font-size: 1.3rem;
            box-shadow: 0 6px 20px rgba(234, 179, 8, 0.4);
            transition: all 0.15s;
        }
        .collect-btn:active {
            transform: translateY(3px);
            box-shadow: 0 2px 10px rgba(234, 179, 8, 0.3);
        }
    </style>
</head>
<body>
    <!-- Start Screen (Audio Unlock) - Cyberpunk Style -->
    <div id="start-screen" class="start-screen" style="display: none;">
        <div class="corner-deco tl"></div>
        <div class="corner-deco tr"></div>
        <div class="corner-deco bl"></div>
        <div class="corner-deco br"></div>
        <div class="cyber-frame">
            <div class="tap-icon">🎰</div>
            <h1>INITIALIZE</h1>
            <p>[ TAP TO ACTIVATE ]</p>
        </div>
    </div>
    
    <div id="game-container-el" class="game-world">
        <div id="bg-layer" class="bg-layer"></div>
        <div id="grid-floor" class="grid-floor" style="display: none;"></div>
        <div id="particles" class="particles-container"></div>
        <div id="hexagons" class="hexagons-container"></div>
        
        <div class="hud-top">
            <div id="token-bar-el" class="token-bar">
                <span id="token-value">TOKEN: ${cfg.costPerSpin}</span>
            </div>
            <div id="branding-el" class="branding">
                ${cfg.titleImage ? `<img src="${cfg.titleImage}" alt="Logo" />` : `<div class="default-title">SPIN & WIN</div>`}
            </div>
        </div>

        <div class="wheel-stage">
            <div id="wheel-glow" class="wheel-glow"></div>
            <div id="wheel-border-plate" class="wheel-border-plate"></div>
            <div class="outer-neon-ring" id="led-ring"></div>
            <div class="pointer-wrapper">
                <div class="pointer-stage" id="pointer-stage">
                    <div id="pointer-el" class="pointer-asset"></div>
                </div>
            </div>
            <div class="wheel-container" id="wheel-container-el">
                <div id="wheel"></div>
            </div>
            <div class="center-hub" id="center-hub">${cfg.centerType === 'emoji' ? cfg.centerEmoji : ''}</div>
        </div>

        <div class="hud-bottom">
            <button class="spin-btn" id="spin-btn" onclick="spin()">
                ${!cfg.spinBtnImage ? `
                <div class="spin-label">${cfg.spinBtnText}</div>
                <div class="spin-sub">${cfg.spinBtnSubtext}</div>` : ''}
            </button>
            <div id="status-msg">TAP TO SPIN</div>
        </div>

        <div id="result-screen">
            <div class="result-rays"></div>
            <div id="result-stars" class="result-stars"></div>
            <div class="result-card">
                <div class="result-badge">🎉 CONGRATULATIONS 🎉</div>
                <div id="winner-icon" class="result-icon">🎁</div>
                <div id="winner-text" class="result-prize"></div>
                <p id="winner-msg" class="result-msg">You've won an amazing prize!</p>
                <button class="collect-btn" onclick="closeOverlay()">COLLECT</button>
            </div>
        </div>
    </div>

    <script>
        // ========== STATE ==========
        let isSpinning = false;
        let currentRotation = 0;
        let canPlay = true; // Game rules status (updated by parent)
        let blockReason = null;
        let blockDetails = null;
        let config = ${JSON.stringify(cfg.rawConfig)};
        let prizeList = ${JSON.stringify(cfg.prizeList)};
        let weights = prizeList.map(p => Number(p.weight) || 100);
        let labels = prizeList.map(p => p.label);
        let icons = prizeList.map(p => p.icon || '🎁');
        
        const wheelEl = document.getElementById('wheel');
        const ledRing = document.getElementById('led-ring');
        const wheelGlow = document.getElementById('wheel-glow');
        const wheelContainer = document.getElementById('wheel-container-el');
        const pointerStage = document.getElementById('pointer-stage');
        
        // ========== SOUND EFFECTS ==========
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        let audioCtx = null;
        let bgmAudio = null;
        let soundEnabled = true; // 音效开关，默认开启
        let bgmPlaying = false;
        
        function initAudio() {
            if (!audioCtx) {
                audioCtx = new AudioContext();
            }
        }
        
        // ========== BGM (Background Music) ==========
        function initBGM() {
            console.log('[initBGM] enableBGM:', config.enableBGM, 'bgmUrl:', config.bgmUrl);
            if (!config.enableBGM || !config.bgmUrl || bgmAudio) {
                console.log('[initBGM] Skipping - enableBGM:', config.enableBGM, 'bgmUrl:', config.bgmUrl, 'bgmAudio exists:', !!bgmAudio);
                return;
            }
            
            // Build full URL to avoid relative path issues
            const fullUrl = config.bgmUrl.startsWith('http') ? config.bgmUrl : window.location.origin + config.bgmUrl;
            console.log('[initBGM] Creating audio element for:', fullUrl);
            bgmAudio = new Audio(fullUrl);
            bgmAudio.loop = config.bgmLoop !== false;
            bgmAudio.volume = (config.bgmVolume || 40) / 100;
            console.log('[initBGM] Volume set to:', bgmAudio.volume);
            
            // Try to play (may be blocked by autoplay policy)
            if (soundEnabled) {
                bgmAudio.play().then(() => {
                    bgmPlaying = true;
                    console.log('[BGM] Playing:', fullUrl);
                }).catch(err => {
                    console.log('[BGM] Autoplay blocked:', err.message);
                });
            }
        }
        
        function startBGM() {
            console.log('[startBGM] Called - enableBGM:', config.enableBGM, 'bgmUrl:', config.bgmUrl);
            if (!config.enableBGM || !config.bgmUrl) {
                console.log('[startBGM] Skipping - BGM disabled or no URL');
                return;
            }
            
            if (!bgmAudio) {
                // Build full URL to avoid relative path issues
                const fullUrl = config.bgmUrl.startsWith('http') ? config.bgmUrl : window.location.origin + config.bgmUrl;
                console.log('[startBGM] Creating audio with full URL:', fullUrl);
                
                bgmAudio = new Audio();
                bgmAudio.loop = config.bgmLoop !== false;
                bgmAudio.volume = (config.bgmVolume || 40) / 100;
                bgmAudio.preload = 'auto';
                
                // Add error listener
                bgmAudio.addEventListener('error', (e) => {
                    console.error('[startBGM] Audio error event:', bgmAudio.error);
                    console.error('[startBGM] Error code:', bgmAudio.error?.code, 'message:', bgmAudio.error?.message);
                });
                
                // Play when ready
                bgmAudio.addEventListener('canplay', () => {
                    console.log('[startBGM] Audio can play now!');
                    if (!bgmPlaying && soundEnabled) {
                        bgmAudio.play().then(() => {
                            bgmPlaying = true;
                            console.log('[startBGM] BGM started playing!');
                        }).catch(err => {
                            console.error('[startBGM] Play failed:', err.message);
                        });
                    }
                });
                
                // Set src after adding listeners
                bgmAudio.src = fullUrl;
                bgmAudio.load();
                console.log('[startBGM] Loading audio...');
            } else if (!bgmPlaying && soundEnabled) {
                console.log('[startBGM] Attempting to play existing BGM, readyState:', bgmAudio.readyState);
                bgmAudio.play().then(() => {
                    bgmPlaying = true;
                    console.log('[startBGM] BGM started playing!');
                }).catch(err => {
                    console.error('[startBGM] Play failed:', err.message);
                });
            } else {
                console.log('[startBGM] BGM already playing');
            }
        }
        
        function stopBGM() {
            if (bgmAudio && bgmPlaying) {
                bgmAudio.pause();
                bgmPlaying = false;
            }
        }
        
        function playTick() {
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.value = 800 + Math.random() * 200;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialDecayTo && gain.gain.exponentialDecayTo(0.01, audioCtx.currentTime + 0.05);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.05);
        }
        
        function playWinSound() {
            if (!audioCtx) return;
            const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
            notes.forEach((freq, i) => {
                setTimeout(() => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.frequency.value = freq;
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 0.3);
                }, i * 100);
            });
        }
        
        // Track current result sound for stopping
        let currentResultAudio = null;
        
        // Play custom result sound (win/lose/jackpot)
        function playResultSound(prize) {
            // Stop any existing result sound first
            stopResultSound();
            
            // Auto-detect prize type if flags not explicitly set
            const isJackpot = prize.isJackpot || 
                (prize.label && prize.label.toLowerCase().includes('jackpot')) ||
                (prize.value && prize.value >= 500);
            
            const isLose = prize.isLose || 
                (prize.value === 0 || prize.value === '0') ||
                (prize.label && /try again|lose|sorry|better luck|没中|再试/i.test(prize.label));
            
            let soundUrl = null;
            if (isJackpot && config.jackpotSound) {
                soundUrl = config.jackpotSound;
                console.log('[Sound] Playing JACKPOT sound');
            } else if (isLose && config.loseSound) {
                soundUrl = config.loseSound;
                console.log('[Sound] Playing LOSE sound');
            } else if (config.winSound) {
                soundUrl = config.winSound;
                console.log('[Sound] Playing WIN sound');
            }
            
            if (soundEnabled) {
                if (soundUrl) {
                    // Build full URL to avoid relative path issues
                    const fullUrl = soundUrl.startsWith('http') ? soundUrl : window.location.origin + soundUrl;
                    console.log('[playResultSound] Playing:', fullUrl);
                    currentResultAudio = new Audio(fullUrl);
                    currentResultAudio.volume = 0.7;
                    currentResultAudio.play().catch(e => console.log('[Sound] Play failed:', e));
                } else {
                    // Fallback to synthesized sound
                    console.log('[playResultSound] No sound URL, using synthesized sound');
                    playWinSound();
                }
            }
        }
        
        // Stop the current result sound
        function stopResultSound() {
            if (currentResultAudio) {
                currentResultAudio.pause();
                currentResultAudio.currentTime = 0;
                currentResultAudio = null;
            }
        }
        
        // ========== HAPTIC FEEDBACK ==========
        function vibrate(pattern) {
            if ('vibrate' in navigator) {
                navigator.vibrate(pattern);
            }
        }
        
        // ========== PARTICLES ==========
        function createParticles() {
            const container = document.getElementById('particles');
            const colors = ['var(--primary)', 'var(--gold)', '#fff', 'var(--secondary)'];
            
            for (let i = 0; i < 20; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.cssText = \`
                    left: \${Math.random() * 100}%;
                    width: \${3 + Math.random() * 5}px;
                    height: \${3 + Math.random() * 5}px;
                    background: \${colors[Math.floor(Math.random() * colors.length)]};
                    animation-duration: \${15 + Math.random() * 20}s;
                    animation-delay: \${Math.random() * 10}s;
                \`;
                container.appendChild(particle);
            }
        }
        
        // ========== FLOATING HEXAGONS ==========
        function createHexagons() {
            if (!config.enableHexagons) return;
            const container = document.getElementById('hexagons');
            const colors = [config.themeColor || 'var(--primary)', config.secondaryColor || 'var(--secondary)', 'var(--gold)'];
            
            for (let i = 0; i < 15; i++) {
                const hex = document.createElement('div');
                hex.className = 'hexagon';
                const size = 20 + Math.random() * 30;
                hex.style.cssText = \`
                    left: \${Math.random() * 100}%;
                    width: \${size}px;
                    height: \${size * 1.15}px;
                    background: \${colors[Math.floor(Math.random() * colors.length)]};
                    animation-duration: \${20 + Math.random() * 30}s;
                    animation-delay: \${Math.random() * 15}s;
                    opacity: \${0.05 + Math.random() * 0.15};
                \`;
                container.appendChild(hex);
            }
        }
        
        // ========== CYBER GRID FLOOR ==========
        function initGridFloor() {
            if (!config.enableGridFloor) return;
            const grid = document.getElementById('grid-floor');
            if (grid) grid.style.display = 'block';
        }
        
        // ========== START SCREEN ==========
        function initStartScreen() {
            console.log('[initStartScreen] enableStartScreen:', config.enableStartScreen);
            if (!config.enableStartScreen) {
                console.log('[initStartScreen] Start screen disabled, skipping');
                return;
            }
            const startScreen = document.getElementById('start-screen');
            const gameContainer = document.getElementById('game-container-el');
            
            console.log('[initStartScreen] Showing start screen');
            startScreen.style.display = 'flex';
            gameContainer.style.opacity = '0.3';
            gameContainer.style.pointerEvents = 'none';
            
            startScreen.addEventListener('click', () => {
                console.log('[initStartScreen] Start screen clicked, starting BGM');
                startScreen.style.display = 'none';
                gameContainer.style.opacity = '1';
                gameContainer.style.pointerEvents = 'auto';
                initAudio();
                startBGM();
            }, { once: true });
        }
        
        // ========== RESULT STARS ==========
        function createResultStars() {
            const container = document.getElementById('result-stars');
            container.innerHTML = '';
            for (let i = 0; i < 30; i++) {
                const star = document.createElement('div');
                star.className = 'star';
                star.style.cssText = \`
                    left: \${Math.random() * 100}%;
                    top: \${Math.random() * 100}%;
                    animation-delay: \${Math.random() * 2}s;
                \`;
                container.appendChild(star);
            }
        }
        
        // ========== UTILITIES ==========
        function getContrast(hex) {
            if (!hex || hex[0] !== '#') return '#ffffff';
            const r = parseInt(hex.substr(1, 2), 16);
            const g = parseInt(hex.substr(3, 2), 16);
            const b = parseInt(hex.substr(5, 2), 16);
            const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
            return (yiq >= 128) ? '#1e293b' : '#ffffff';
        }
        
        function getUrlLocal(val) {
            if (!val) return '';
            if (val.startsWith('http') || val.startsWith('/')) return val;
            return '/api/uploads/' + val;
        }
        
        // ========== CREATE WHEEL (Ultra Demo Style) ==========
        function createWheel() {
            const n = prizeList.length;
            const angle = 360 / n;
            let svg = '<svg viewBox="0 0 400 400">';
            
            // Gradient definitions
            svg += '<defs>';
            prizeList.forEach((p, i) => {
                const color = p.color || ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'][i % 6];
                svg += \`<linearGradient id="g\${i}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="\${color}" stop-opacity="1"/>
                    <stop offset="100%" stop-color="\${color}" stop-opacity="0.7"/>
                </linearGradient>\`;
            });
            svg += '</defs>';

            // Slices
            prizeList.forEach((p, i) => {
                const start = i * angle;
                const end = (i + 1) * angle;
                const x1 = 200 + 200 * Math.cos((start - 90) * Math.PI / 180);
                const y1 = 200 + 200 * Math.sin((start - 90) * Math.PI / 180);
                const x2 = 200 + 200 * Math.cos((end - 90) * Math.PI / 180);
                const y2 = 200 + 200 * Math.sin((end - 90) * Math.PI / 180);
                svg += \`<path d="M200,200 L\${x1},\${y1} A200,200 0 0,1 \${x2},\${y2} Z" fill="url(#g\${i})"/>\`;
            });
            
            // Dividers (image only, line dividers removed)
            const divType = config.dividerType || 'none';
            if (divType === 'image' && config.dividerImage) {
                prizeList.forEach((p, i) => {
                    const start = i * angle;
                    const w = config.dividerWidth || 20;
                    const offsetTop = config.dividerTop || 0;
                    // Start from outer edge (y=0), cap height to stop before center hub
                    const maxHeight = 200 - offsetTop - 5; // 5px buffer before center
                    const h = Math.min(config.dividerHeight || 195, maxHeight);
                    svg += \`<g transform="rotate(\${start}, 200, 200)">
                        <image href="\${getUrlLocal(config.dividerImage)}" x="\${200 - w/2}" y="\${offsetTop}" width="\${w}" height="\${h}" preserveAspectRatio="none" />
                    </g>\`;
                });
            }

            // Labels (label text above, emoji icon below)
            prizeList.forEach((p, i) => {
                const mid = (i + 0.5) * angle;
                const dist = 140;
                const tx = 200 + dist * Math.cos((mid - 90) * Math.PI / 180);
                const ty = 200 + dist * Math.sin((mid - 90) * Math.PI / 180);
                const textColor = p.textColor || '#fff';
                svg += \`<g transform="translate(\${tx},\${ty}) rotate(\${mid})">
                    <text fill="\${textColor}" font-size="10" font-weight="bold" text-anchor="middle" dy="-8">\${p.label}</text>
                    <text font-size="28" text-anchor="middle" dy="22">\${p.icon || '🎁'}</text>
                </g>\`;
            });
            
            svg += '</svg>';
            wheelEl.innerHTML = svg;
        }
        
        // ========== CREATE LEDS ==========
        function createLeds() {
            let html = '';
            const count = 24;
            // LED colors from config (Christmas Joy uses red/green/gold)
            const ledColors = [
                config.ledColor1 || '#fde047',  // Default gold-light
                config.ledColor2 || '#eab308',  // Default gold
                config.ledColor3 || '#fde047'   // Default gold-light
            ];
            for (let i = 0; i < count; i++) {
                const angle = (i * (360 / count)) * (Math.PI / 180);
                const x = 50 + 51 * Math.cos(angle);
                const y = 50 + 51 * Math.sin(angle);
                const color = ledColors[i % ledColors.length];
                html += \`<div class="led-dot" data-index="\${i}" style="left: \${x}%; top: \${y}%; background: \${color}; box-shadow: 0 0 10px \${color};"></div>\`;
            }
            ledRing.innerHTML = html;
        }
        
        // ========== SPIN ==========
        function spin() {
            if (isSpinning) return;
            
            // Check if player can play (game rules)
            if (!canPlay) {
                const btn = document.getElementById('spin-btn');
                const status = document.getElementById('status-msg');
                
                // Show error message
                let errorMsg = '无法游戏';
                if (blockReason === 'LEVEL_TOO_LOW') {
                    errorMsg = \`等级不足！需要等级 \${blockDetails?.required}\`;
                } else if (blockReason === 'NOT_STARTED') {
                    errorMsg = '活动尚未开始';
                } else if (blockReason === 'ENDED') {
                    errorMsg = '活动已结束';
                } else if (blockReason === 'INVALID_DAY') {
                    errorMsg = '今日不开放';
                }
                
                status.innerText = errorMsg;
                status.style.color = '#ef4444';
                vibrate(100);
                
                // Reset message after 3s
                setTimeout(() => {
                    status.innerText = 'TAP TO SPIN';
                    status.style.color = '';
                }, 3000);
                
                return;
            }
            
            initAudio();
            startBGM();  // Start BGM on first user interaction
            vibrate(50);
            
            window.parent.postMessage({ type: 'game-start', cost: ${cfg.costPerSpin}, isPreview: ${cfg.isPreview} }, '*');
            
            isSpinning = true;
            const btn = document.getElementById('spin-btn');
            const status = document.getElementById('status-msg');
            btn.disabled = true;
            status.innerText = 'SPINNING...';
            
            // Activate glow
            wheelGlow.classList.add('active');
            wheelContainer.classList.add('spinning');
            
            // Chase LEDs
            document.querySelectorAll('.led-dot').forEach((led, i) => {
                led.classList.add('spinning');
                led.style.animationDelay = (i * 0.03) + 's';
            });
            
            // Select winner
            const winnerIdx = (() => {
                const total = weights.reduce((a, b) => a + b, 0);
                let r = Math.random() * total;
                for (let i = 0; i < weights.length; i++) {
                    if (r < weights[i]) return i;
                    r -= weights[i];
                }
                return 0;
            })();
            
            const sliceAngle = 360 / prizeList.length;
            const pDir = config.pointerDirection || 'top';
            const dirMap = { 'top': 0, 'top-right': 45, 'right': 90, 'bottom-right': 135, 'bottom': 180, 'bottom-left': 225, 'left': 270, 'top-left': 315 };
            const pRot = dirMap[pDir] || 0;
            const targetPos = 360 - (winnerIdx * sliceAngle + sliceAngle / 2) + pRot;
            
            const duration = ${cfg.spinDuration};
            const turns = ${cfg.spinTurns};
            const delta = (turns * 360) + (targetPos - (currentRotation % 360) + 360) % 360;
            currentRotation += delta;
            
            // Tick sounds during spin
            let tickCount = 0;
            const tickInterval = setInterval(() => {
                playTick();
                vibrate(10);
                tickCount++;
                if (tickCount > turns * prizeList.length) {
                    clearInterval(tickInterval);
                }
            }, duration / (turns * prizeList.length * 1.5));
            
            wheelEl.style.transition = 'none';
            void wheelEl.offsetWidth;
            wheelEl.style.transition = \`transform \${duration}ms cubic-bezier(0.1, 0, 0, 1)\`;
            wheelEl.style.transform = \`rotate(\${currentRotation}deg)\`;
            
            setTimeout(() => {
                clearInterval(tickInterval);
                isSpinning = false;
                btn.disabled = false;
                
                // Stop effects
                wheelGlow.classList.remove('active');
                wheelContainer.classList.remove('spinning');
                document.querySelectorAll('.led-dot').forEach(led => led.classList.remove('spinning'));
                
                // Pointer bounce
                pointerStage.classList.add('bounce');
                setTimeout(() => pointerStage.classList.remove('bounce'), 600);
                
                const won = labels[winnerIdx];
                const wonIcon = icons[winnerIdx];
                status.innerText = 'YOU WON!';
                
                // Show result
                const prize = prizeList[winnerIdx];
                document.getElementById('winner-icon').innerText = wonIcon;
                document.getElementById('winner-text').innerText = won;
                document.getElementById('winner-msg').innerText = \`You've unlocked \${won}!\`;
                createResultStars();
                document.getElementById('result-screen').style.display = 'flex';
                
                // Effects - play custom sound based on prize type
                playResultSound(prize);
                vibrate([100, 50, 100, 50, 200]);
                
                // Confetti effect (if enabled)
                if (config.enableConfetti !== false) {
                    // Check if confetti library is loaded
                    if (typeof confetti === 'undefined') {
                        console.warn('🎉 Confetti library not loaded yet, skipping confetti effect');
                        return;
                    }
                    
                    console.log('🎉 Triggering confetti:', {
                        particles: config.confettiParticles,
                        spread: config.confettiSpread,
                        colors: config.confettiColors,
                        shapeType: config.confettiShapeType,
                        emojis: config.confettiEmojis
                    });
                    
                    try {
                        // ALWAYS fire colorful paper confetti (base layer)
                        const paperConfig = {
                            particleCount: config.confettiParticles || 150,
                            spread: config.confettiSpread || 80,
                            origin: { y: 0.6 },
                            colors: (config.confettiColors || '#eab308,#ffffff,#3b82f6,#22c55e').split(','),
                            startVelocity: 30,
                            gravity: 1,
                            drift: 0,
                            ticks: 200
                        };
                        
                        confetti(paperConfig);
                        console.log('🎉 Colorful paper confetti triggered');
                        
                        // IF emoji mode, ALSO fire emoji confetti (overlay layer)
                        if (config.confettiShapeType === 'emoji' && config.confettiEmojis && typeof confetti.shapeFromText === 'function') {
                            let emojis = config.confettiEmojis.split(',').map(e => e.trim()).filter(e => e);
                            
                            // Remove variation selectors (U+FE0F, U+FE0E)
                            emojis = emojis.map(e => e.replace(/[\uFE0E\uFE0F]/g, ''));
                            
                            if (emojis.length > 0) {
                                try {
                                    const emojiShapes = emojis.map(emoji => 
                                        confetti.shapeFromText({ text: emoji, scalar: 3 })
                                    );
                                    
                                    // Fire emoji confetti with fewer particles (40% of total)
                                    const emojiConfig = {
                                        particleCount: Math.floor((config.confettiParticles || 150) * 0.4),
                                        spread: config.confettiSpread || 80,
                                        origin: { y: 0.6 },
                                        shapes: emojiShapes,
                                        scalar: 3,
                                        startVelocity: 30,
                                        gravity: 1,
                                        drift: 0,
                                        ticks: 200
                                    };
                                    
                                    confetti(emojiConfig);
                                    console.log('🎉 Emoji confetti triggered (MIXED with paper):', emojis);
                                } catch (err) {
                                    console.warn('🎉 Failed to create emoji confetti', err);
                                }
                            }
                        }
                        
                        setTimeout(() => {
                            // ALWAYS fire paper confetti from sides
                            const sidePaperConfig = {
                                particleCount: (config.confettiParticles || 150) / 1.5,
                                spread: (config.confettiSpread || 80) + 20,
                                colors: (config.confettiColors || '#eab308,#ffffff').split(',').slice(0, 2),
                                startVelocity: 30,
                                gravity: 1,
                                drift: 0,
                                ticks: 200
                            };
                            
                            confetti({ ...sidePaperConfig, origin: { x: 0.2, y: 0.5 } });
                            confetti({ ...sidePaperConfig, origin: { x: 0.8, y: 0.5 } });
                            console.log('🎉 Side paper confetti triggered');
                            
                            // IF emoji mode, ALSO fire emoji from sides
                            if (config.confettiShapeType === 'emoji' && config.confettiEmojis && typeof confetti.shapeFromText === 'function') {
                                let emojis = config.confettiEmojis.split(',').map(e => e.trim()).filter(e => e);
                                emojis = emojis.map(e => e.replace(/[\uFE0E\uFE0F]/g, ''));
                                
                                if (emojis.length > 0) {
                                    try {
                                        const emojiShapes = emojis.map(emoji => confetti.shapeFromText({ text: emoji, scalar: 3 }));
                                        
                                        const sideEmojiConfig = {
                                            particleCount: Math.floor((config.confettiParticles || 150) / 1.5 * 0.4),
                                            spread: (config.confettiSpread || 80) + 20,
                                            shapes: emojiShapes,
                                            scalar: 3,
                                            startVelocity: 30,
                                            gravity: 1,
                                            drift: 0,
                                            ticks: 200
                                        };
                                        
                                        confetti({ ...sideEmojiConfig, origin: { x: 0.2, y: 0.5 } });
                                        confetti({ ...sideEmojiConfig, origin: { x: 0.8, y: 0.5 } });
                                        console.log('🎉 Side emoji confetti triggered (MIXED)');
                                    } catch (err) {
                                        console.warn('🎉 Failed to create side emoji shapes', err);
                                    }
                                }
                            }
                        }, 300);
                    } catch (error) {
                        console.error('🎉 Confetti error:', error);
                    }
                }
                
                window.parent.postMessage({ type: 'score-submit', score: 10, metadata: { prize: won } }, '*');
            }, duration + 200);
        }
        
        function closeOverlay() {
            document.getElementById('result-screen').style.display = 'none';
            stopResultSound(); // Stop any playing result sound
            vibrate(30);
        }
        
        // ========== SWIPE TO SPIN ==========
        function initSwipeToSpin() {
            if (!config.swipeToSpin) return;
            
            const wheelStage = document.querySelector('.wheel-stage');
            const wheelContainer = document.getElementById('wheel-container-el');
            
            // Add animated hand gesture overlay
            const gestureOverlay = document.createElement('div');
            gestureOverlay.id = 'gesture-overlay';
            gestureOverlay.innerHTML = \`
                <div class="gesture-hand">👆</div>
                <div class="gesture-arrow">↻</div>
                <div class="gesture-text">滑动旋转<br>Swipe to Spin</div>
            \`;
            gestureOverlay.style.cssText = \`
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                pointer-events: none;
                z-index: 200;
                opacity: 0;
                transition: opacity 0.3s;
            \`;
            
            // Add styles for animation
            const style = document.createElement('style');
            style.textContent = \`
                #gesture-overlay .gesture-hand {
                    font-size: 48px;
                    animation: swipeGesture 1.5s ease-in-out infinite;
                    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));
                }
                #gesture-overlay .gesture-arrow {
                    font-size: 32px;
                    color: #ffd700;
                    margin-top: -10px;
                    animation: rotateArrow 1.5s ease-in-out infinite;
                    text-shadow: 0 0 10px #ffd700;
                }
                #gesture-overlay .gesture-text {
                    margin-top: 10px;
                    font-size: 14px;
                    font-weight: 700;
                    color: #fff;
                    text-align: center;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.8);
                    background: rgba(0,0,0,0.6);
                    padding: 8px 16px;
                    border-radius: 12px;
                    line-height: 1.3;
                }
                @keyframes swipeGesture {
                    0%, 100% { transform: translateX(-20px) rotate(-10deg); }
                    50% { transform: translateX(20px) rotate(10deg); }
                }
                @keyframes rotateArrow {
                    0%, 100% { transform: rotate(0deg) scale(1); }
                    50% { transform: rotate(180deg) scale(1.2); }
                }
                .wheel-container.can-swipe {
                    cursor: grab !important;
                }
                .wheel-container.can-swipe:active {
                    cursor: grabbing !important;
                }
            \`;
            document.head.appendChild(style);
            wheelStage.appendChild(gestureOverlay);
            
            // Mark wheel as swipeable
            wheelContainer.classList.add('can-swipe');
            
            // Add swipe hint indicator (bottom text)
            const swipeHint = document.createElement('div');
            swipeHint.id = 'swipe-hint';
            swipeHint.innerHTML = '👆 滑动旋转 / Swipe to Spin';
            swipeHint.style.cssText = \`
                position: absolute;
                bottom: -40px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.7);
                color: #fff;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                opacity: 0;
                transition: opacity 0.3s;
                pointer-events: none;
                white-space: nowrap;
                z-index: 100;
            \`;
            wheelStage.appendChild(swipeHint);
            
            // Show hand cursor on wheel
            wheelContainer.style.cursor = 'grab';
            
            // Swipe tracking
            let startX = 0, startY = 0, startTime = 0;
            let isSwiping = false;
            
            function getEventPos(e) {
                if (e.touches && e.touches.length > 0) {
                    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
                }
                return { x: e.clientX, y: e.clientY };
            }
            
            function handleStart(e) {
                if (isSpinning) return;
                const pos = getEventPos(e);
                startX = pos.x;
                startY = pos.y;
                startTime = Date.now();
                isSwiping = true;
                wheelContainer.style.cursor = 'grabbing';
                swipeHint.style.opacity = '0';
                gestureOverlay.style.opacity = '0';
            }
            
            function handleMove(e) {
                if (!isSwiping || isSpinning) return;
                e.preventDefault();
            }
            
            function handleEnd(e) {
                if (!isSwiping || isSpinning) return;
                isSwiping = false;
                wheelContainer.style.cursor = 'grab';
                
                const pos = e.changedTouches ? 
                    { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY } : 
                    { x: e.clientX, y: e.clientY };
                
                const deltaX = pos.x - startX;
                const deltaY = pos.y - startY;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                const duration = Date.now() - startTime;
                const velocity = distance / duration;
                
                // Need minimum velocity to trigger spin
                if (velocity > 0.3 && distance > 30) {
                    // Trigger spin!
                    vibrate(30);
                    spin();
                }
            }
            
            // Show hint when hovering
            function showHint() {
                if (!isSpinning) {
                    swipeHint.style.opacity = '1';
                    gestureOverlay.style.opacity = '1';
                }
            }
            function hideHint() {
                swipeHint.style.opacity = '0';
                gestureOverlay.style.opacity = '0';
            }
            
            // Initially show gesture for 3 seconds then fade
            setTimeout(() => {
                if (!isSpinning) {
                    gestureOverlay.style.opacity = '1';
                    setTimeout(() => {
                        gestureOverlay.style.opacity = '0';
                    }, 3000);
                }
            }, 1000);
            
            // Touch events
            wheelContainer.addEventListener('touchstart', handleStart, { passive: true });
            wheelContainer.addEventListener('touchmove', handleMove, { passive: false });
            wheelContainer.addEventListener('touchend', handleEnd);
            
            // Mouse events
            wheelContainer.addEventListener('mousedown', handleStart);
            wheelContainer.addEventListener('mousemove', handleMove);
            wheelContainer.addEventListener('mouseup', handleEnd);
            wheelContainer.addEventListener('mouseleave', (e) => {
                if (isSwiping) handleEnd(e);
                hideHint();
            });
            
            // Hover hint
            wheelContainer.addEventListener('mouseenter', showHint);
            wheelContainer.addEventListener('mouseleave', hideHint);
            
            console.log('[SwipeToSpin] Initialized');
        }
        
        // ========== CONFIG SYNC ==========
        window.addEventListener('message', (e) => {
            if (e.data?.type === 'sync-config') {
                config = e.data.config;
                if (config.prizeList) {
                    prizeList = config.prizeList;
                    weights = prizeList.map(p => Number(p.weight) || 100);
                    labels = prizeList.map(p => p.label);
                    icons = prizeList.map(p => p.icon || '🎁');
                }
                createWheel();
                // Additional visual updates can be added here
            } else if (e.data?.type === 'sound-toggle') {
                // 音效开关控制
                soundEnabled = e.data.enabled;
                if (bgmAudio) {
                    if (soundEnabled) {
                        bgmAudio.play().catch(e => console.log('[Sound] Resume failed:', e));
                    } else {
                        bgmAudio.pause();
                    }
                }
                console.log('[Sound] Sound', soundEnabled ? 'enabled' : 'disabled');
            } else if (e.data?.type === 'game-status-update') {
                // 游戏规则状态更新
                const status = e.data.status;
                canPlay = status.canPlay !== false; // Default true
                blockReason = status.blockReason || null;
                blockDetails = status.blockDetails || null;
                
                const btn = document.getElementById('spin-btn');
                if (btn) {
                    btn.disabled = !canPlay;
                    if (!canPlay) {
                        btn.style.opacity = '0.5';
                        btn.style.cursor = 'not-allowed';
                    } else {
                        btn.style.opacity = '';
                        btn.style.cursor = 'pointer';
                    }
                }
                
                console.log('[GameRules] Status updated:', { canPlay, blockReason, blockDetails });
            }
        });
        
        // ========== INIT ==========
        // Start Screen (must be first to block interaction)
        initStartScreen();
        
        // Create visual elements
        if (config.enableLedRing !== false) createLeds();
        createWheel();
        createParticles();
        createHexagons();
        initGridFloor();
        
        // Initialize interaction modes
        initSwipeToSpin();
        
        // Try to start BGM (will be blocked by autoplay policy unless start screen was shown)
        if (!config.enableStartScreen) {
            setTimeout(() => initBGM(), 500);
        }
    <\/script>
</body>
</html>`;
}

// Helper to darken/lighten color
function adjustColor(hex: string, percent: number): string {
    if (!hex || hex[0] !== '#') return hex;
    const num = parseInt(hex.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}
