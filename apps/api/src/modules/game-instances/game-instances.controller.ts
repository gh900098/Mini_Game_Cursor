import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, Header, UseInterceptors, UploadedFile, NotFoundException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { GameInstancesService } from './game-instances.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../../common/guards/permissions.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { generateSpinWheelHtml, SpinWheelConfig } from './templates/spin-wheel.template';

@Controller('game-instances')
export class GameInstancesController {
    constructor(private readonly instancesService: GameInstancesService) { }

    @Get(':slug/play')
    @Header('Content-Type', 'text/html')
    async play(
        @Param('slug') slug: string,
        @Query('token') token: string,
        @Query('isPreview') isPreview?: string,
        @Query('v') version?: string
    ) {
        const instance = await this.instancesService.findBySlug(slug);
        if (!instance) throw new NotFoundException('Game instance not found');

        const config = await this.instancesService.getEffectiveConfig(instance);
        const gameSlug = instance.gameTemplate?.slug;

        // Check if user selected a visual template (other than 'default')
        const visualTemplate = config.visualTemplate || 'default';
        if (visualTemplate !== 'default' && gameSlug) {
            // Try to load the specific visual template HTML file
            // Format: {gameSlug}-{templateName}.html (e.g., spin-wheel-premium-neon.html)
            const templatePath = path.join(__dirname, '..', '..', '..', 'uploads', 'games', `${gameSlug}-${visualTemplate}.html`);
            if (fs.existsSync(templatePath)) {
                let html = fs.readFileSync(templatePath, 'utf-8');
                const configScript = `<script>window.GAME_CONFIG = ${JSON.stringify(config)}; window.INSTANCE_NAME = "${instance.name}";</script>`;
                html = html.replace('</head>', configScript + '</head>');
                return html;
            }
            // If template file not found, fall through to default dynamic template
            console.log(`[Template] Visual template file not found: ${templatePath}, using default`);
        }

        // Debug log
        console.log('[Server Debug] Effective config - dividerType:', config.dividerType, 'dividerImage:', config.dividerImage);

        // ========== PREMIUM TEMPLATE V2 ==========
        // V2 is now default, use v=1 for legacy template
        if (version !== '1') {
            const getUrl = (val: string) => {
                if (!val) return '';
                if (val.startsWith('http') || val.startsWith('/')) return val;
                return `/api/uploads/${val}`;
            };

            const prizeList = config.prizeList || [
                { icon: '💰', label: '10 Points', weight: 40, color: '#3b82f6' },
                { icon: '🎁', label: 'Surprise', weight: 10, color: '#8b5cf6' },
                { icon: '🤡', label: 'Try Again', weight: 25, color: '#64748b' },
                { icon: '💎', label: 'Jackpot', weight: 5, color: '#eab308' },
                { icon: '🎟️', label: 'Ticket', weight: 20, color: '#10b981' }
            ];

            let rawDuration = Number(config.spinDuration) || 4000;
            if (rawDuration < 100) rawDuration *= 1000;

            const pointerDir = config.pointerDirection || 'top';
            const dirMap: Record<string, number> = { 'top': 0, 'top-right': 45, 'right': 90, 'bottom-right': 135, 'bottom': 180, 'bottom-left': 225, 'left': 270, 'top-left': 315 };

            let bgGradient = config.bgGradient || 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)';
            if (config.bgGradStart && config.bgGradEnd) {
                if (config.bgGradDir === 'radial') {
                    bgGradient = `radial-gradient(circle at center, ${config.bgGradStart}, ${config.bgGradEnd})`;
                } else {
                    const dir = config.bgGradDir || '135deg';
                    bgGradient = `linear-gradient(${dir}, ${config.bgGradStart} 0%, ${config.bgGradEnd} 100%)`;
                }
            }

            const templateConfig: SpinWheelConfig = {
                instanceName: instance.name,
                prizeList,
                themeColor: config.themeColor || '#3b82f6',
                secondaryColor: config.secondaryColor || '#f1f5f9',
                spinDuration: rawDuration,
                spinTurns: Number(config.spinTurns) || 12,
                costPerSpin: config.costPerSpin || 0,

                bgType: config.bgType || (config.bgImage ? 'image' : config.bgGradStart ? 'gradient' : 'color'),
                bgColor: config.bgColor || '#1a1a1a',
                bgGradient,
                bgImage: getUrl(config.bgImage),
                bgFit: config.bgFit || 'cover',
                bgBlur: config.bgBlur || 0,
                bgOpacity: (config.bgOpacity !== undefined ? config.bgOpacity : 100) / 100,

                titleImage: getUrl(config.titleImage),
                logoWidth: config.logoWidth || 80,
                logoTopMargin: config.logoTopMargin !== undefined ? config.logoTopMargin : 10,
                logoOpacity: (config.logoOpacity !== undefined ? config.logoOpacity : 100) / 100,
                logoShadow: config.logoDropShadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' : 'none',

                wheelBorderImage: getUrl(config.wheelBorderImage),
                dividerType: config.dividerType || (config.dividerImage ? 'image' : 'line'),
                dividerColor: config.dividerColor || 'rgba(255,255,255,0.2)',
                dividerStroke: config.dividerStroke || 1,
                dividerImage: getUrl(config.dividerImage),
                dividerWidth: config.dividerWidth || 20,
                dividerHeight: config.dividerHeight || 180,
                dividerTop: config.dividerTop || 0,

                pointerImage: getUrl(config.pointerImage),
                pointerSize: config.pointerSize || 50,
                pointerTop: config.pointerTop !== undefined ? config.pointerTop : -35,
                pointerShadow: config.pointerShadow !== undefined ? config.pointerShadow : true,
                pointerDirection: pointerDir,
                pointerRotation: dirMap[pointerDir] || 0,

                centerImage: getUrl(config.centerImage),
                centerType: config.centerType || 'emoji',
                centerEmoji: config.centerEmoji || '🎯',
                centerSize: config.centerSize || 60,
                centerBorder: config.centerBorder !== undefined ? config.centerBorder : true,
                centerShadow: config.centerShadow !== undefined ? config.centerShadow : true,

                spinBtnImage: getUrl(config.spinBtnImage),
                spinBtnText: config.spinBtnText || 'SPIN NOW',
                spinBtnSubtext: config.spinBtnSubtext || `1 PLAY = ${config.costPerSpin || 0} TOKEN`,
                spinBtnColor: config.spinBtnColor || '#f59e0b',
                spinBtnTextColor: config.spinBtnTextColor || '#451a03',
                spinBtnShadow: config.spinBtnShadow !== undefined ? config.spinBtnShadow : true,
                spinBtnWidth: config.spinBtnWidth || 320,
                spinBtnHeight: config.spinBtnHeight || 70,

                tokenBarImage: getUrl(config.tokenBarImage),
                tokenBarColor: config.tokenBarColor || '#ca8a04',
                tokenBarTextColor: config.tokenBarTextColor || '#ffffff',
                tokenBarShadow: config.tokenBarShadow !== undefined ? config.tokenBarShadow : true,

                gameFont: getUrl(config.gameFont),
                enableSound: config.enableSound !== false,
                isPreview: !!isPreview,
                rawConfig: config,

                // LED Colors (for visual templates like Christmas Joy)
                ledColor1: config.ledColor1 || '',
                ledColor2: config.ledColor2 || '',
                ledColor3: config.ledColor3 || '',

                // Background Gradient (alternative)
                bgGradStart: config.bgGradStart || '',
                bgGradEnd: config.bgGradEnd || '',

                // Confetti effects
                enableConfetti: config.enableConfetti !== false,
                confettiParticles: config.confettiParticles || 150,
                confettiSpread: config.confettiSpread || 80,
                confettiColors: config.confettiColors || '#eab308,#ffffff,#3b82f6,#22c55e',
                confettiShapeType: config.confettiShapeType || 'default',
                confettiEmojis: config.confettiEmojis || ''
            };

            return generateSpinWheelHtml(templateConfig);
        }

        // ========== ORIGINAL TEMPLATE V1 ==========
        const prizeList = config.prizeList || [
            { icon: '💰', label: '10 Points', weight: 40, color: '#3b82f6' },
            { icon: '🎁', label: 'Surprise', weight: 10, color: '#8b5cf6' },
            { icon: '🤡', label: 'Try Again', weight: 25, color: '#64748b' },
            { icon: '💎', label: 'Jackpot', weight: 5, color: '#eab308' },
            { icon: '🎟️', label: 'Ticket', weight: 20, color: '#10b981' }
        ];

        const themeColor = config.themeColor || '#3b82f6';
        const secondaryColor = config.secondaryColor || '#f1f5f9';

        let rawDuration = Number(config.spinDuration) || 4000;
        if (rawDuration < 100) rawDuration *= 1000;
        const spinDuration = rawDuration;

        const spinTurns = Number(config.spinTurns) || 12;
        const costPerSpin = config.costPerSpin || 0;

        const getUrl = (val: string) => {
            if (!val) return '';
            if (val.startsWith('http') || val.startsWith('/')) return val;
            return `/api/uploads/${val}`;
        };

        const bgType = config.bgType || (config.bgImage ? 'image' : config.bgGradStart ? 'gradient' : 'color');
        const bgImg = getUrl(config.bgImage);
        const bgColor = config.bgColor || '#1a1a1a';

        let bgGradient = config.bgGradient || 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)';
        if (config.bgGradStart && config.bgGradEnd) {
            if (config.bgGradDir === 'radial') {
                bgGradient = `radial-gradient(circle at center, ${config.bgGradStart}, ${config.bgGradEnd})`;
            } else {
                const dir = config.bgGradDir || '135deg';
                bgGradient = `linear-gradient(${dir}, ${config.bgGradStart} 0%, ${config.bgGradEnd} 100%)`;
            }
        }

        const bgFit = config.bgFit || 'cover';
        const bgBlur = (config.bgBlur || 0) + 'px';
        const bgOpacity = (config.bgOpacity !== undefined ? config.bgOpacity : 100) / 100;

        const logoWidth = config.logoWidth || 80;
        const logoTopMargin = config.logoTopMargin !== undefined ? config.logoTopMargin : 10;
        const logoOpacity = (config.logoOpacity !== undefined ? config.logoOpacity : 100) / 100;
        const logoShadow = config.logoDropShadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' : 'none';

        const centerSize = config.centerSize || 60;
        const centerBorder = config.centerBorder !== undefined ? config.centerBorder : true;
        const centerShadow = config.centerShadow !== undefined ? config.centerShadow : true;
        const centerType = config.centerType || 'emoji';
        const centerEmoji = config.centerEmoji || '🎯';

        const pointerSize = config.pointerSize || 50;
        const pointerTop = config.pointerTop !== undefined ? config.pointerTop : -35;
        const pointerShadow = config.pointerShadow !== undefined ? config.pointerShadow : true;

        const pointerDir = config.pointerDirection || 'top';
        const dirMap: Record<string, number> = { 'top': 0, 'top-right': 45, 'right': 90, 'bottom-right': 135, 'bottom': 180, 'bottom-left': 225, 'left': 270, 'top-left': 315 };
        const pointerRot = dirMap[pointerDir] || 0;

        const titleImg = getUrl(config.titleImage);
        const centerImg = getUrl(config.centerImage);
        const pointerImg = getUrl(config.pointerImage);
        const spinBtnImg = getUrl(config.spinBtnImage);
        const wheelBorderImg = getUrl(config.wheelBorderImage);
        const tokenBarImg = getUrl(config.tokenBarImage);
        const tokenBarColor = config.tokenBarColor || '#ca8a04';
        const tokenBarTextColor = config.tokenBarTextColor || '#ffffff';
        const tokenBarShadow = config.tokenBarShadow !== undefined ? config.tokenBarShadow : true;
        const gameFont = getUrl(config.gameFont);

        const spinBtnText = config.spinBtnText || 'SPIN NOW';
        const spinBtnSubtext = config.spinBtnSubtext || '1 PLAY = ' + costPerSpin + ' TOKEN';
        const spinBtnColor = config.spinBtnColor || '#f59e0b';
        const spinBtnTextColor = config.spinBtnTextColor || '#451a03';
        const spinBtnShadow = config.spinBtnShadow !== undefined ? config.spinBtnShadow : true;
        const spinBtnWidth = config.spinBtnWidth || 320;
        const spinBtnHeight = config.spinBtnHeight || 70;

        // Ensure defaults if not set in config
        const bgGradStart = config.bgGradStart || '#1e1b4b';

        const fontCss = gameFont ? `
            @font-face {
                font-family: 'CustomGameFont';
                src: url('${gameFont}');
                font-weight: 400 900;
                font-display: swap;
            }
            :root, body, button, input, .token-bar, .default-title, .prize-text {
                font-family: 'CustomGameFont', 'Orbitron', 'Inter', sans-serif !important;
            }
        ` : '';

        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
            <title>${instance.name}</title>
            <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;900&family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
            <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
            <style>
                ${fontCss}
                :root {
                    --primary: ${themeColor};
                    --secondary: ${secondaryColor};
                    --duration: ${spinDuration}ms;
                    --gold-gradient: linear-gradient(180deg, #fceabb 0%, #fccd4d 50%, #f8b500 100%);
                    --metallic-text: linear-gradient(180deg, #fff 0%, #eab308 40%, #854d0e 100%);
                }
                * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; outline: none; }
                html, body {
                    margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden;
                    background: #000; font-family: 'Inter', sans-serif;
                }
                .game-world {
                    position: fixed; inset: 0;
                    display: flex; flex-direction: column; align-items: center; justify-content: space-between;
                    overflow: hidden; z-index: 1;
                }
                .bg-layer {
                    position: absolute; inset: -20px; z-index: -1; width: calc(100% + 40px); height: calc(100% + 40px);
                    pointer-events: none; transition: all 0.5s ease;
                }
                .hud-top {
                    width: 100%; padding: env(safe-area-inset-top) 0; display: flex; flex-direction: column; align-items: center;
                    z-index: 50; margin-top: 10px;
                }
                .token-bar {
                    background: ${tokenBarImg ? `url("${tokenBarImg}") center/100% 100% no-repeat` : tokenBarColor};
                    color: ${tokenBarTextColor};
                    padding: 8px 24px; border-radius: 12px; font-weight: 700; font-family: ${gameFont ? "'CustomGameFont'" : "'Orbitron'"};
                    filter: ${tokenBarShadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' : 'none'};
                    border: 2px solid rgba(255,255,255,0.2);
                    min-width: 200px; text-align: center;
                }
                .branding { width: 100%; text-align: center; margin-top: ${logoTopMargin}px; }
                .branding img {
                    width: ${logoWidth}%;
                    max-width: 100%;
                    max-height: 50vh;
                    object-fit: contain;
                    opacity: ${logoOpacity};
                    filter: ${logoShadow};
                }
                .default-title {
                    font-family: ${gameFont ? "'CustomGameFont', " : ""}'Orbitron', sans-serif;
                    font-size: 2.5rem; font-weight: 950;
                    background: var(--metallic-text); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 0 15px rgba(234, 179, 8, 0.6)); line-height: 1;
                }
                .wheel-stage {
                    position: relative; width: min(88vw, 400px); height: min(88vw, 400px);
                    display: flex; align-items: center; justify-content: center;
                    filter: drop-shadow(0 0 40px rgba(0, 0, 0, 0.8));
                    z-index: 60; /* Ensure it is above hud-top */
                }
                .wheel-border-plate {
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    z-index: 5; pointer-events: none;
                    background-size: contain; background-repeat: no-repeat; background-position: center;
                }
                .pointer-wrapper {
                    position: absolute; inset: 0; pointer-events: none; z-index: 60;
                    display: flex; justify-content: center;
                    transform: rotate(${pointerRot}deg);
                }
                .outer-neon-ring {
                    position: absolute; inset: -12px; border-radius: 50%; border: 5px solid #1e293b;
                    box-shadow: inset 0 0 15px #000, 0 0 20px var(--primary); z-index: 10;
                }
                .led-dot {
                    position: absolute; width: 8px; height: 8px; border-radius: 50%; background: #fff;
                    box-shadow: 0 0 10px #fff; animation: led-pulse 2s infinite;
                }
                @keyframes led-pulse {
                    0%, 100% { opacity: 0.3; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.4); box-shadow: 0 0 15px var(--primary); }
                }

                .wheel-container {
                    width: 100%; height: 100%; border-radius: 50%; border: 10px solid #0f172a;
                    box-shadow: 0 0 0 4px var(--primary);
                    overflow: hidden; background: #fff; position: relative; z-index: 10;
                    background-size: cover; background-position: center;
                }

                #wheel {
                     width: 100%; height: 100%; position: relative;
                     transform-origin: center center;
                     will-change: transform;
                     transition-timing-function: cubic-bezier(0.1, 0, 0, 1);
                }

                svg { width: 100%; height: 100%; display: block; }
                .slice-label-g { pointer-events: none; }
                .slice-label {
                    font-family: 'Orbitron', sans-serif; font-weight: 900;
                    text-transform: uppercase; text-anchor: middle;
                    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
                }
                .slice-prefix { font-size: 6px; font-weight: 700; opacity: 0.8; }
                .slice-text { font-size: 10px; }
                .slice-icon-emoji { font-size: 24px; }

                .pointer-stage {
                    position: absolute; top: ${pointerTop}px; transform: translateX(0); /* Wrapper handles centering */
                    width: ${pointerSize}px; height: ${pointerSize * 1.5}px; z-index: 60;
                    filter: ${pointerShadow ? 'drop-shadow(0 10px 15px rgba(0,0,0,0.7))' : 'none'};
                }
                .pointer-asset {
                    width: 100%; height: 100%;
                    ${pointerImg ? `background: url("${pointerImg}") center/no-repeat; background-size: contain;` : 'background: #22c55e; clip-path: polygon(0 0, 100% 0, 50% 100%); border-radius: 4px;'}
                }

                .center-hub {
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    width: ${centerSize}px; height: ${centerSize}px;
                    ${centerType === 'image' && centerImg ? `background: url("${centerImg}") center/cover no-repeat;` : `background: radial-gradient(circle, #fff, #94a3b8);`}
                    border: ${centerBorder ? '5px solid #1e293b' : 'none'};
                    box-shadow: ${centerShadow ? '0 10px 30px rgba(0,0,0,0.8), inset 0 2px 5px #fff' : 'none'};
                    z-index: 20;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center; font-size: 24px;
                }

                .hud-bottom {
                    width: 100%; padding-bottom: calc(30px + env(safe-area-inset-bottom));
                    display: flex; flex-direction: column; align-items: center; z-index: 50;
                }
                .spin-btn {
                    width: min(85vw, ${spinBtnWidth}px); height: ${spinBtnHeight}px; border: none; cursor: pointer;
                    border-radius: 12px; position: relative; transition: all 0.1s;
                    box-shadow: ${spinBtnShadow ? '0 8px 25px rgba(0,0,0,0.6)' : 'none'};
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    ${spinBtnImg ? `background: url("${spinBtnImg}") center/100% 100% no-repeat;` : `background: ${spinBtnColor}; border-bottom: 6px solid rgba(0,0,0,0.2);`}
                }
                .spin-btn:active:not(:disabled) { transform: translateY(4px); ${!spinBtnImg ? 'border-bottom-width: 2px;' : ''} }
                .spin-btn:disabled { opacity: 0.6; filter: grayscale(0.8); cursor: not-allowed; }

                .spin-label { font-family: 'Orbitron'; font-weight: 950; font-size: 1.5rem; color: ${spinBtnTextColor}; line-height: 1; }
                .spin-sub { font-family: 'Orbitron'; font-size: 0.7rem; font-weight: 800; color: ${spinBtnTextColor}; margin-top: 3px; opacity: 0.7; }

                #status-msg { margin-top: 15px; color: #fff; font-family: 'Orbitron'; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; opacity: 0.6; font-size: 0.8rem; }

                #result-screen {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.95); backdrop-filter: blur(25px);
                    display: none; align-items: center; justify-content: center; z-index: 100;
                    padding: 20px;
                }
                .result-card {
                    background: linear-gradient(180deg, #1e293b, #020617); border: 5px solid #eab308;
                    border-radius: 40px; width: 92vw; max-width: 400px; padding: 40px 20px; text-align: center;
                    box-shadow: 0 0 100px rgba(234, 179, 8, 0.4); animation: card-reveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                    display: flex; flex-direction: column; align-items: center;
                }
                @keyframes card-reveal { from { transform: scale(0.6) translateY(50px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
                .result-prize {
                    font-family: 'Orbitron'; font-size: clamp(1.8rem, 10vw, 3.2rem); color: #fff;
                    margin: 20px 0; text-shadow: 0 0 25px #eab308; line-height: 1.1;
                    word-break: break-word; width: 100%;
                }
            </style>
        </head>
        <body>
            <div id="game-container-el" class="game-world">
                <!-- Background Layers -->
                <div id="bg-layer" class="bg-layer" style="
                    ${bgType === 'image' ? `filter: blur(${bgBlur}); opacity: ${bgOpacity};` : ''}
                    ${bgType === 'color' ? `background: ${bgColor};` : ''}
                    ${bgType === 'gradient' ? `background: ${bgGradient};` : ''}
                    ${bgType === 'image' ? `background: url("${bgImg}") center/${bgFit} no-repeat;` : ''}
                "></div>
                
                <div class="hud-top">
                    <div id="token-bar-el" class="token-bar">MY TOKEN: ${costPerSpin}.00</div>
                    <div id="branding-el" class="branding">
                        ${titleImg ? `<img src="${titleImg}" />` : `<div class="default-title">SPIN & WIN</div>`}
                    </div>
                </div>

                <div class="wheel-stage">
                     <div id="wheel-border-plate" class="wheel-border-plate"></div>
                     <div class="outer-neon-ring" id="led-ring"></div>
                     <div class="pointer-wrapper">
                         <div class="pointer-stage"><div id="pointer-el" class="pointer-asset"></div></div>
                     </div>
                     <div class="wheel-container" id="wheel-container-el">
                         <div id="wheel"></div>
                     </div>
                     <div class="center-hub">${centerType === 'emoji' ? centerEmoji : ''}</div>
                </div>

                <div class="hud-bottom">
                    <button class="spin-btn" id="spin-btn" onclick="spin()">
                        ${!spinBtnImg ? `
                        <div class="spin-label">${spinBtnText}</div>
                        <div class="spin-sub">${spinBtnSubtext}</div>` : ''}
                    </button>
                    <div id="status-msg">READY TO WIN?</div>
                </div>

                <div id="result-screen">
                    <div class="result-card">
                        <div style="font-family: 'Orbitron'; font-size: 0.9rem; color: #eab308; letter-spacing: 5px; text-transform: uppercase; font-weight: 900;">Grand Prize!</div>
                        <div id="winner-text" class="result-prize"></div>
                        <p id="winner-msg" style="color: #fff; opacity: 0.8; margin-bottom: 30px; font-size: 0.95rem; line-height: 1.4;"></p>
                        <button class="spin-btn" style="height: 60px; box-shadow: none; border-bottom: none;" onclick="closeOverlay()">
                            <div class="spin-label" style="font-size: 1.4rem">COLLECT</div>
                        </button>
                    </div>
                </div>

                <script>
                    let isSpinning = false;
                    let currentRotation = 0;
                    let config = ${JSON.stringify(config)};
                    let prizeList = ${JSON.stringify(prizeList)};
                    let weights = prizeList.map(p => Number(p.weight) || 100);
                    let labels = prizeList.map(p => p.label);

                    const wheelEl = document.getElementById('wheel');
                    const ledRing = document.getElementById('led-ring');

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

                    function createWheel() {
                        console.log('[Divider Debug] dividerType:', config.dividerType, 'dividerImage:', config.dividerImage, 'Full config keys:', Object.keys(config));
                        const n = prizeList.length;
                        const angle = 360 / n;
                        let svgHtml = '<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" style="overflow: visible;">';
                        svgHtml += '<defs></defs>';

                        // Loop 1: Slices
                        prizeList.forEach((prize, i) => {
                            const startAngle = i * angle;
                            const endAngle = (i + 1) * angle;
                            const x1 = 200 + 200 * Math.cos((startAngle - 90) * Math.PI / 180);
                            const y1 = 200 + 200 * Math.sin((startAngle - 90) * Math.PI / 180);
                            const x2 = 200 + 200 * Math.cos((endAngle - 90) * Math.PI / 180);
                            const y2 = 200 + 200 * Math.sin((endAngle - 90) * Math.PI / 180);
                            const largeArc = angle > 180 ? 1 : 0;
                            
                            const bg = prize.color || (i % 2 === 0 ? config.themeColor || '#3b82f6' : config.secondaryColor || '#f1f5f9');
                            svgHtml += '<path d="M 200 200 L ' + x1 + ' ' + y1 + ' A 200 200 0 ' + largeArc + ' 1 ' + x2 + ' ' + y2 + ' Z" fill="' + bg + '" />';
                        });

                        // Loop 2: Dividers - TEMPORARILY DISABLED FOR DEBUGGING
                        // prizeList.forEach((prize, i) => {
                        //      const startAngle = i * angle;
                        //      const divType = config.dividerType || (config.dividerImage ? 'image' : 'line');
                        //      if (divType === 'image' && config.dividerImage) {
                        //          const w = config.dividerWidth || 20;
                        //          const h = config.dividerHeight || 180;
                        //          const x = 200 - (w / 2);
                        //          const y = 200 - h;
                        //          svgHtml += '<g transform="rotate(' + startAngle + ', 200, 200)">' +
                        //              '<image href="' + getUrlLocal(config.dividerImage) + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" preserveAspectRatio="none" />' +
                        //              '</g>';
                        //      } else {
                        //          const col = config.dividerColor || 'rgba(255,255,255,0.2)';
                        //          const str = config.dividerStroke || 1;
                        //          const x1 = 200 + 200 * Math.cos((startAngle - 90) * Math.PI / 180);
                        //          const y1 = 200 + 200 * Math.sin((startAngle - 90) * Math.PI / 180);
                        //          svgHtml += '<line x1="200" y1="200" x2="' + x1 + '" y2="' + y1 + '" stroke="' + col + '" stroke-width="' + str + '" />';
                        //      }
                        // });

                        // Loop 3: Labels
                        prizeList.forEach((prize, i) => {
                             const startAngle = i * angle;
                             const endAngle = (i + 1) * angle;
                             const midAngle = (startAngle + endAngle) / 2;
                             
                             const bg = prize.color || (i % 2 === 0 ? config.themeColor || '#3b82f6' : config.secondaryColor || '#f1f5f9');
                             const textCol = getContrast(bg);
                             const textDist = 140;
                             const tx = 200 + textDist * Math.cos((midAngle - 90) * Math.PI / 180);
                             const ty = 200 + textDist * Math.sin((midAngle - 90) * Math.PI / 180);
                             const isEmoji = !prize.icon || (!prize.icon.startsWith('/') && !prize.icon.startsWith('http') && !prize.icon.includes(':'));

                             svgHtml += '<g class="slice-label-g" transform="translate(' + tx + ', ' + ty + ') rotate(' + midAngle + ')">' +
                                 '<text class="slice-label" fill="' + textCol + '">' +
                                 '<tspan x="0" dy="-10" class="slice-prefix">WIN</tspan>' +
                                 '<tspan x="0" dy="12" class="slice-text">' + prize.label.substring(0, 12) + '</tspan>' +
                                 (isEmoji ? '<tspan x="0" dy="30" class="slice-icon-emoji">' + (prize.icon || "🎁") + '</tspan>' : '') +
                                 '</text>' +
                                 (!isEmoji ? '<image x="-12" y="16" width="24" height="24" href="' + getUrlLocal(prize.icon) + '" />' : '') +
                                 '</g>';
                        });

                        svgHtml += '</svg>';
                        wheelEl.innerHTML = svgHtml;
                    }

                    function createLeds() {
                        let html = '';
                        for (let i = 0; i < 24; i++) {
                            const angle = (i * 15) * (Math.PI / 180);
                            const x = 50 + 51 * Math.cos(angle);
                            const y = 50 + 51 * Math.sin(angle);
                            html += '<div class="led-dot" style="left: ' + x + '%; top: ' + y + '%; animation-delay: ' + (i * 0.1) + 's"></div>';
                        }
                        ledRing.innerHTML = html;
                    }

                    function spin() {
                        if (isSpinning) return;
                        window.parent.postMessage({ type: 'game-start', cost: ${costPerSpin}, isPreview: ${!!isPreview} }, '*');

                        isSpinning = true;
                        const btn = document.getElementById('spin-btn');
                        const status = document.getElementById('status-msg');
                        btn.disabled = true;
                        status.innerText = 'GOOD LUCK...';

                        const winnerIdx = (() => {
                             const total = weights.reduce((a, b) => a + b, 0);
                             let r = Math.random() * total;
                             for (let i = 0; i < weights.length; i++) {
                                 if (r < weights[i]) return i;
                                 r -= weights[i];
                             }
                             return 0;
                        })();

                        const sa = 360 / prizeList.length;
                        const pDir = config.pointerDirection || 'top';
                        const dirMap = { 'top': 0, 'top-right': 45, 'right': 90, 'bottom-right': 135, 'bottom': 180, 'bottom-left': 225, 'left': 270, 'top-left': 315 };
                        const pRot = dirMap[pDir] || 0;
                        const targetPos = 360 - (winnerIdx * sa + sa / 2) + pRot;

                        const duration = ${spinDuration};
                        const turns = ${spinTurns};
                        const delta = (turns * 360) + (targetPos - (currentRotation % 360) + 360) % 360;
                        currentRotation += delta;

                        wheelEl.style.transition = 'none';
                        void wheelEl.offsetWidth;
                        wheelEl.style.transition = 'transform ' + duration + 'ms cubic-bezier(0.1, 0, 0, 1)';
                        wheelEl.style.transform = 'rotate(' + currentRotation + 'deg)';

                        setTimeout(() => {
                             isSpinning = false;
                             btn.disabled = false;
                             const won = labels[winnerIdx];
                             status.innerText = 'WINNER: ' + won;
                             document.getElementById('winner-text').innerText = won;
                             document.getElementById('winner-msg').innerText = 'CONGRATULATIONS! YOU UNLOCKED THE ' + won;
                             document.getElementById('result-screen').style.display = 'flex';
                             confetti({
                                 particleCount: 200, spread: 100, origin: { y: 0.7 },
                                 colors: ['#eab308', '#ffffff', '#3b82f6']
                             });
                             window.parent.postMessage({ type: 'score-submit', score: 10, metadata: { prize: won } }, '*');
                        }, duration + 100);
                    }

                    function closeOverlay() {
                        document.getElementById('result-screen').style.display = 'none';
                    }

                    window.addEventListener('message', (e) => {
                        if (e.data?.type === 'sync-config') {
                            console.log('[Sync Debug] Received sync-config, dividerType:', e.data.config?.dividerType, 'dividerImage:', e.data.config?.dividerImage);
                            config = e.data.config;
                            if (config.prizeList) {
                                prizeList = config.prizeList;
                                weights = prizeList.map(p => Number(p.weight) || 100);
                                labels = prizeList.map(p => p.label);
                            }
                            updateVisuals();
                        }
                    });

                    function updateVisuals() {
                        console.log('[updateVisuals] Called. config.wheelBorderImage:', config.wheelBorderImage);
                        try {
                            const root = document.documentElement;
                            if (config.themeColor) root.style.setProperty('--primary', config.themeColor);
                            if (config.secondaryColor) root.style.setProperty('--secondary', config.secondaryColor);

                            // Update Background
                            const bgLayer = document.getElementById('bg-layer');
                            const type = config.bgType || (config.bgImage ? 'image' : 'color');
                            const blur = (config.bgBlur || 0) + 'px';
                            const opacity = (config.bgOpacity !== undefined ? config.bgOpacity : 100) / 100;

                            // Reset
                            bgLayer.style.background = '';
                            bgLayer.style.filter = '';
                            bgLayer.style.opacity = '';

                            if (type === 'gradient') {
                                if (config.bgGradStart && config.bgGradEnd) {
                                    if (config.bgGradDir === 'radial') {
                                        bgLayer.style.background = 'radial-gradient(circle at center, ' + config.bgGradStart + ', ' + config.bgGradEnd + ')';
                                    } else {
                                        const dir = config.bgGradDir || '135deg';
                                        bgLayer.style.background = 'linear-gradient(' + dir + ', ' + config.bgGradStart + ' 0%, ' + config.bgGradEnd + ' 100%)';
                                    }
                                } else {
                                    bgLayer.style.background = config.bgGradient || 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)';
                                }
                            } else if (type === 'image') {
                                bgLayer.style.background = 'url("' + getUrlLocal(config.bgImage) + '") center/' + (config.bgFit || 'cover') + ' no-repeat';
                                bgLayer.style.filter = 'blur(' + blur + ')';
                                bgLayer.style.opacity = opacity;
                            } else if (type === 'color') {
                                bgLayer.style.backgroundColor = config.bgColor || '#1a1a1a';
                            }

                            const pointer = document.getElementById('pointer-el');
                            const pointerStage = document.querySelector('.pointer-stage');

                            const pSize = config.pointerSize || 50;
                            pointerStage.style.width = pSize + 'px';
                            pointerStage.style.height = (pSize * 1.5) + 'px';

                            const pTop = config.pointerTop !== undefined ? config.pointerTop : -35;
                            pointerStage.style.top = pTop + 'px';

                            const pShadow = config.pointerShadow !== undefined ? config.pointerShadow : true;
                            pointerStage.style.filter = pShadow ? 'drop-shadow(0 10px 15px rgba(0,0,0,0.7))' : 'none';

                            const pDir = config.pointerDirection || 'top';
                            const dirMap = { 'top': 0, 'top-right': 45, 'right': 90, 'bottom-right': 135, 'bottom': 180, 'bottom-left': 225, 'left': 270, 'top-left': 315 };
                            const pRot = dirMap[pDir] || 0;
                            const wrapper = document.querySelector('.pointer-wrapper');
                            if (wrapper) wrapper.style.transform = 'rotate(' + pRot + 'deg)';

                            pointerStage.style.zIndex = '100';

                            if (config.pointerImage) {
                                pointer.style.background = 'url(' + getUrlLocal(config.pointerImage) + ') center/contain no-repeat';
                                pointer.style.clipPath = 'none';
                                pointer.style.borderRadius = '0';
                            } else {
                                pointer.style.background = '#22c55e';
                                pointer.style.clipPath = 'polygon(0 0, 100% 0, 50% 100%)';
                                pointer.style.borderRadius = '4px';
                                pointer.style.backgroundImage = 'none';
                            }

                            const branding = document.getElementById('branding-el');
                            branding.style.marginTop = (config.logoTopMargin !== undefined ? config.logoTopMargin : 10) + 'px';

                            if (config.titleImage) {
                                branding.innerHTML = '<img src="' + getUrlLocal(config.titleImage) + '" />';
                                const img = branding.querySelector('img');
                                if (img) {
                                    img.style.width = (config.logoWidth || 80) + '%';
                                    img.style.maxWidth = '100%';
                                    img.style.maxHeight = '30vh';
                                    img.style.opacity = (config.logoOpacity !== undefined ? config.logoOpacity : 100) / 100;
                                    img.style.filter = config.logoDropShadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' : 'none';
                                }
                            } else {
                                branding.innerHTML = '<div class="default-title">SPIN & WIN</div>';
                            }

                            const btn = document.getElementById('spin-btn');
                            if (config.spinBtnImage) {
                                btn.style.background = 'url(' + getUrlLocal(config.spinBtnImage) + ') center/100% 100% no-repeat';
                                btn.innerHTML = '';
                                btn.style.border = 'none';
                            } else {
                                btn.style.background = config.spinBtnColor || '#f59e0b';
                                btn.style.borderBottom = '6px solid rgba(0,0,0,0.2)';
                                const txt = config.spinBtnText || 'SPIN NOW';
                                const sub = config.spinBtnSubtext || '1 PLAY = ' + ${config.costPerSpin || 0} + ' TOKEN';
                                const col = config.spinBtnTextColor || '#451a03';
                                btn.innerHTML = '<div class="spin-label" style="color:' + col + '">' + txt + '</div><div class="spin-sub" style="color:' + col + '; opacity:0.7">' + sub + '</div>';
                            }
                            
                            const btnW = config.spinBtnWidth || 320;
                            const btnH = config.spinBtnHeight || 70;
                            btn.style.width = 'min(85vw, ' + btnW + 'px)';
                            btn.style.height = btnH + 'px';

                            if (config.spinBtnShadow !== false) {
                                btn.style.boxShadow = '0 8px 25px rgba(0,0,0,0.6)';
                            } else {
                                btn.style.boxShadow = 'none';
                            }

                            const centerHub = document.querySelector('.center-hub');
                            const cSize = config.centerSize || 60;
                            centerHub.style.width = cSize + 'px';
                            centerHub.style.height = cSize + 'px';

                            const cBorder = config.centerBorder !== undefined ? config.centerBorder : true;
                            centerHub.style.border = cBorder ? '5px solid #1e293b' : 'none';

                            const cShadow = config.centerShadow !== undefined ? config.centerShadow : true;
                            centerHub.style.boxShadow = cShadow ? '0 10px 30px rgba(0,0,0,0.8), inset 0 2px 5px #fff' : 'none';

                            const cType = config.centerType || 'emoji';
                            if (cType === 'image' && config.centerImage) {
                                centerHub.style.background = 'url(' + getUrlLocal(config.centerImage) + ') center/cover no-repeat';
                                centerHub.innerText = '';
                            } else {
                                centerHub.style.background = 'radial-gradient(circle, #fff, #94a3b8)';
                                centerHub.innerText = config.centerEmoji || '🎯';
                            }

                            createWheel();

                            const wheelBorderPlate = document.getElementById('wheel-border-plate');
                            const outerRing = document.getElementById('led-ring');
                            const wheelContainer = document.getElementById('wheel-container-el');

                            if (config.wheelBorderImage && wheelBorderPlate) {
                                console.log('[Wheel Border Debug] Applying wheel border:', config.wheelBorderImage);
                                console.log('[Wheel Border Debug] URL:', getUrlLocal(config.wheelBorderImage));
                                wheelBorderPlate.style.display = 'block';
                                wheelBorderPlate.style.backgroundImage = 'url(' + getUrlLocal(config.wheelBorderImage) + ')';

                                const bSize = (config.wheelBorderSize || 110) + '%';
                                wheelBorderPlate.style.width = bSize;
                                wheelBorderPlate.style.height = bSize;

                                const bOp = (config.wheelBorderOpacity !== undefined ? config.wheelBorderOpacity : 100) / 100;
                                wheelBorderPlate.style.opacity = bOp;

                                const bTop = config.wheelBorderTop || 0;
                                wheelBorderPlate.style.transform = 'translate(-50%, calc(-50% + ' + bTop + 'px))';

                                const layer = config.wheelBorderLayer || 'behind';
                                if (layer === 'front') {
                                    wheelBorderPlate.style.zIndex = '15'; 
                                    if (wheelContainer) wheelContainer.style.background = '#fff';
                                } else {
                                    wheelBorderPlate.style.zIndex = '5';
                                    if (wheelContainer) wheelContainer.style.background = 'transparent';
                                }

                                if (outerRing) outerRing.style.display = 'none';
                                if (wheelContainer) {
                                    wheelContainer.style.border = 'none';
                                    wheelContainer.style.boxShadow = 'none';
                                }
                                console.log('[Wheel Border Debug] Applied successfully');
                            } else {
                                console.log('[Wheel Border Debug] NOT applying wheel border. Image:', config.wheelBorderImage, 'Element:', wheelBorderPlate);
                                if (wheelBorderPlate) wheelBorderPlate.style.display = 'none';
                                if (outerRing) outerRing.style.display = 'block';
                                if (wheelContainer) {
                                    wheelContainer.style.border = '10px solid #0f172a';
                                    wheelContainer.style.boxShadow = '0 0 0 4px var(--primary)';
                                    wheelContainer.style.background = '#fff';
                                }
                            }

                            const tokenBar = document.getElementById('token-bar-el');
                            if (tokenBar) {
                                if (config.tokenBarImage) {
                                    tokenBar.style.background = 'url(' + getUrlLocal(config.tokenBarImage) + ') center/100% 100% no-repeat';
                                } else {
                                    tokenBar.style.background = config.tokenBarColor || '#ca8a04';
                                }
                                tokenBar.style.color = config.tokenBarTextColor || '#ffffff';
                                const shadow = config.tokenBarShadow !== undefined ? config.tokenBarShadow : true;
                                tokenBar.style.filter = shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' : 'none';
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    }

                    createLeds();
                    createWheel();
                    updateVisuals();
                </script>
            </div>
        </body>
        </html>
        `;
    }

    @Get('public/:companySlug')
    async findAllPublic(@Param('companySlug') companySlug: string) {
        return this.instancesService.findAllByCompanySlug(companySlug);
    }

    @Post()
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('games:manage')
    create(@Request() req: any, @Body() body: any) {
        // Super Admin can specify companyId, otherwise use current company
        // Fallback to default company if currentCompanyId is not set
        const companyId = req.user.isSuperAdmin && body.companyId
            ? body.companyId
            : (req.user.currentCompanyId || 'f6605a10-7b87-415f-bce9-2fa55e495c87');

        return this.instancesService.create({
            ...body,
            companyId,
        });
    }

    @Get()
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('games:manage')
    findAll(@Request() req: any, @Query('companyId') companyId?: string) {
        if (req.user.isSuperAdmin) {
            if (companyId) {
                return this.instancesService.findAllByCompany(companyId);
            }
            return this.instancesService.findAll();
        }
        return this.instancesService.findAllByCompany(req.user.currentCompanyId);
    }

    @Post('upload')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: (req: any, file, cb) => {
                const companyId = req.user?.currentCompanyId || 'default';
                const instanceId = req.body.instanceId || 'common';
                const category = req.body.category || 'misc';
                const uploadPath = `./uploads/${companyId}/${instanceId}/${category}`;

                const fs = require('fs');
                if (!fs.existsSync(uploadPath)) {
                    fs.mkdirSync(uploadPath, { recursive: true });
                }
                cb(null, uploadPath);
            },
            filename: (req: any, file, cb) => {
                if (req.body.customName) {
                    // Sanitize customName to prevent filesystem issues
                    // Replace spaces, slashes, and other problematic characters
                    const sanitizedName = req.body.customName
                        .replace(/\\/g, '-')           // Replace backslash with hyphen
                        .replace(/\//g, '-')            // Replace forward slash with hyphen
                        .replace(/\s+/g, '_')           // Replace spaces with underscore
                        .replace(/[^a-zA-Z0-9._-]/g, '_'); // Replace other special chars with underscore

                    const ext = extname(file.originalname);
                    return cb(null, `${sanitizedName}${ext}`);
                }
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                return cb(null, `${randomName}${extname(file.originalname)}`);
            }
        }),
        fileFilter: (req: any, file, cb) => {
            // Strict Font Validation
            if (req.body.category === 'fonts') {
                if (!file.originalname.match(/\.(ttf|otf|woff|woff2)$/i)) {
                    return cb(new BadRequestException('Only font files (ttf, otf, woff, woff2) are allowed!'), false);
                }
                return cb(null, true);
            }

            // Audio File Validation - Limit to 4MB for audio files
            const isAudioFile = file.originalname.match(/\.(mp3|wav|ogg|m4a|aac)$/i);
            if (isAudioFile) {
                // Audio files have stricter size limits (checked in uploadFile method)
                return cb(null, true);
            }

            // General Asset Validation (images, video, fonts)
            if (!file.originalname.match(/\.(jpg|jpeg|png|gif|svg|webp|mp4|webm|ttf|otf|woff|woff2|mp3|wav|ogg|m4a|aac)$/i)) {
                return cb(new BadRequestException('Unsupported file type!'), false);
            }
            cb(null, true);
        },
        limits: {
            fileSize: 10 * 1024 * 1024 // Max 10MB for general files
        }
    }))
    async uploadFile(@UploadedFile() file: any, @Request() req: any) {
        const companyId = req.user?.currentCompanyId || 'default';
        const instanceId = req.body.instanceId || 'common';
        const category = req.body.category || 'misc';

        // Audio file size validation - max 4MB
        const isAudioFile = file.originalname.match(/\.(mp3|wav|ogg|m4a|aac)$/i);
        if (isAudioFile && file.size > 4 * 1024 * 1024) {
            // Delete the uploaded file since it exceeds the limit
            const fs = require('fs');
            fs.unlinkSync(file.path);
            throw new BadRequestException('Audio files must be under 4MB! Consider compressing your audio file.');
        }

        return {
            url: `/api/uploads/${companyId}/${instanceId}/${category}/${file.filename}`
        };
    }

    @Get(':slug')
    async findBySlug(@Param('slug') slug: string) {
        return this.instancesService.findBySlug(slug);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('games:manage')
    update(@Param('id') id: string, @Body() body: any) {
        return this.instancesService.update(id, body);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('games:manage')
    remove(@Param('id') id: string) {
        return this.instancesService.remove(id);
    }

    @Get(':id/usage-check')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('games:manage')
    checkUsage(@Param('id') id: string) {
        return this.instancesService.checkUsage(id);
    }
}
