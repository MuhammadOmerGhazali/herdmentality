import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { authService } from '../services/auth.js';
import { audioManager } from '../audio.js';

export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
        this.isRetry = false;
    }

    init(data) {
        this.isRetry = data && data.retry ? true : false;
        this.gameStarted = false; // Reset flag to ensure button works on replay
    }

    preload() {
        this.load.image('pasture', CONFIG.assets.background);
        this.load.image('sheep', CONFIG.assets.sheep);
        this.load.image('sheep_walk', CONFIG.assets.sheep_walk);
        this.load.image('wool', CONFIG.assets.wool);
        this.load.image('heart', CONFIG.assets.heart);
        this.load.image('poop', CONFIG.assets.poop);
        this.load.image('sign_left', CONFIG.assets.sign_left);
        this.load.image('sign_right', CONFIG.assets.sign_right);
        this.load.image('wolf', 'assets/wolf.webp');
        this.load.image('shepherd_icon', 'assets/shepherd-icon.webp');
        this.load.image('grass_tuft', 'assets/grass-tuft-particle.webp');
        this.load.image('lawn_mower', 'assets/lawn-mower.webp.webp');
        this.load.image('shepherds_whistle', 'assets/wooden-shepherds-whistle.webp');
        this.load.image('sheepdog', 'assets/sheepdog_running_fixed.webp.webp');
        this.load.image('golden_clover', 'assets/golden-clover.webp.webp');
        this.load.image('golden_sheep', 'assets/golden-sheep-with-key.webp.webp');
        this.load.image('golden-sheep-icon.webp.webp', 'assets/golden-sheep-icon.webp.webp');
        this.load.image('golden_key', 'assets/golden-key-icon.webp.webp');
        
        // UI Icons
        this.load.image('pause_icon', 'assets/pause.webp');
        this.load.image('sound_icon', 'assets/sound.webp');
        this.load.image('music_icon', 'assets/music.webp');
        this.load.image('mute_icon', 'assets/mute.webp');
        this.load.image('leaderboard_icon', 'assets/leaderboard.webp');
        this.load.image('toolkit_icon', 'assets/toolkit.webp');

        // PHASE 1 Design Assets (no local copies – kept as remote)
        this.load.image('woolWalletGameUI', 'https://rosebud.ai/assets/wool-wallet-game-ui.webp?2fxc');
        this.load.image('woolCoinIcon', 'https://rosebud.ai/assets/wool-coin-stack-icon.webp?YIsd');
        this.load.image('levelBadgeIcon', 'https://rosebud.ai/assets/level-badge-icon.webp?rsLx');
        this.load.image('graphPaperPanel', 'https://rosebud.ai/assets/graph-paper-panel.webp?6frR');

        this.load.audio('bleat', 'assets/210511__yuval__sheep-bleat-outdoors.1_1.wav');
        this.load.audio('dog_bark', 'assets/418108__crazymonke9__dog-tripple-bark.wav');
        this.load.audio('bleat_go', 'assets/710299__michaelperfect__sheep-baaing-4-norwegian-sheep-expressing-itself-concisely.wav');
        this.load.audio('fart', 'assets/635805__swag1773__trimmed-fart.m4a');
        this.load.audio('music_ai', 'assets/generator.ai_OGNjYWNlM2YtMTYzYi00ZWI2LWI0YTItMWZjNWIxMzY0Y2Fm-ai-music-generator.ai.mp3');
        this.load.audio('music_level2', 'assets/generator.ai_NmE5NDI4MzgtMmJhYS00MjZjLWJlZTctYmQ0YzA2Y2Q3MzNi-ai-music-generator.ai.mp3');
        this.load.audio('music_level3', 'assets/generator.ai_NjhjMTdhMjAtOTg0Yi00MDRlLWFjZDgtNjNkYmFjZmE5Y2Nk-ai-music-generator.ai.mp3');
        this.load.audio('music_level7', 'assets/generator.ai_NWEwMWRhM2EtOWE3ZC00YjI2LWJhMjYtNWNjMjU1OWI5OTM4-ai-music-generator.ai.mp3');
        this.load.audio('wolf_growl', 'assets/338674__newagesoup__wolf-growl.wav');
        this.load.audio('wolf_howl', 'assets/398430__naturestemper__wolf-howl.mp3');
        this.load.audio('wind_gust', 'assets/800399__shiyang96__cartoon-wind-embarrassed.wav');
        this.load.audio('farm_ambience', 'assets/574730__crattray1997__farm-ambience-4416.wav');
        this.load.audio('lawn_mower', 'assets/lawn.wav');
        this.load.audio('rain_ambience', 'assets/79270__ra_gun__ambience-summer-rain-05-090718.wav');
        this.load.audio('thunder', 'assets/696550__saha213131__thunder11.mp3');
        this.load.audio('coin', 'assets/coins.mp3');

        // Error handler – logs any asset that fails to load
        this.load.on('loaderror', (file) => {
            console.error('[BootScene] Failed to load asset:', file.key, '→', file.src);
        });

        // Simple loading text
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const loadingText = this.add.text(width / 2, height / 2, 'LOADING PASTURE...', {
            font: '40px monospace',
            fill: '#ffffff'
        }).setOrigin(0.5);
    }

    createWindGusts() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        if (!this.textures.exists('wind_trace')) {
            const gfx = this.make.graphics({x:0, y:0, add:false});
            
            // Draw a faint streak with fade tail
            gfx.fillStyle(0xffffff, 1);
            gfx.fillRoundedRect(0, 0, 150, 3, 1.5);
            gfx.generateTexture('wind_trace', 150, 3);
        }

        // Particle Emitter for Wind Streaks
        this.windEmitter = this.add.particles(0, 0, 'wind_trace', {
            // Emit from top-left area (offscreen)
            emitZone: {
                type: 'random',
                source: new Phaser.Geom.Rectangle(-200, -200, width * 0.5, height * 0.5)
            },
            angle: { min: 25, max: 45 }, // Top-Left to Bottom-Right trajectory
            speed: { min: 1800, max: 2500 }, // INTENSE speed
            lifespan: 1000, // Short life for fast movement
            scaleX: { min: 1.0, max: 4.0 }, // Longer streaks
            scaleY: { min: 0.5, max: 1.2 },
            alpha: { start: 0.3, end: 0 }, // More visible start
            rotate: { min: 25, max: 45 }, // Align texture with movement
            quantity: 0, // Manual bursts
            blendMode: 'ADD'
        });
        this.windEmitter.setDepth(19); // Behind Logo (20), In front of Sheep (10-15)

        // Leaf/Debris Particles
        if (!this.textures.exists('leaf')) {
             const gfx = this.make.graphics({x:0, y:0, add:false});
             gfx.fillStyle(0x8FBC8F, 1); // Dark Sea Green
             gfx.fillEllipse(5, 3, 5, 3);
             gfx.generateTexture('leaf', 10, 6);
        }
        
        this.leafEmitter = this.add.particles(0, 0, 'leaf', {
             emitZone: {
                type: 'random',
                source: new Phaser.Geom.Rectangle(-200, -200, width * 0.5, height * 0.5)
            },
            angle: { min: 25, max: 45 },
            speed: { min: 800, max: 1400 }, // Fast debris
            lifespan: 2500,
            rotate: { min: 0, max: 360 }, // Spin
            gravityY: 150,
            scale: { min: 0.5, max: 1.5 },
            alpha: { start: 1, end: 0 },
            quantity: 0
        });
        this.leafEmitter.setDepth(19);
    }

    triggerGust() {
        if (this.windEmitter && this.leafEmitter && !this.isWolfActive) {
             // Initial burst
             this.windEmitter.explode(40);
             this.leafEmitter.explode(15);
             // Landing page - always play wind, no mute check
             this.sound.play('wind_gust', { volume: 0.3 });

             // Intermediate burst 1 (The "Second" animation)
             this.time.delayedCall(3500, () => {
                 if (this.windEmitter && !this.isWolfActive) {
                     this.windEmitter.explode(30); 
                     this.leafEmitter.explode(10);
                 }
             });

             // Intermediate burst 2
             this.time.delayedCall(7000, () => {
                 if (this.windEmitter && !this.isWolfActive) {
                     this.windEmitter.explode(30); 
                     this.leafEmitter.explode(10);
                 }
             });

             // Final burst
             this.time.delayedCall(10500, () => {
                 if (this.windEmitter && !this.isWolfActive) {
                     this.windEmitter.explode(30); 
                     this.leafEmitter.explode(10);
                 }
             });
        }
    }

    create() {
        if (this.gameStarted) return;
        this.gameStarted = false;
        
        window.dispatchEvent(new CustomEvent('show-auth-ui'));
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        this.isWolfActive = false;

        // Setup Panic Texture & Group
        if (!this.textures.exists('emote_exclamation')) {
            const gfx = this.make.graphics({x:0, y:0, add:false});
            gfx.fillStyle(0xFF4444, 1); // Reddish Orange
            gfx.fillRect(0, 0, 8, 24);
            gfx.fillRect(0, 28, 8, 8);
            gfx.generateTexture('emote_exclamation', 8, 36);
        }

        // Setup Stubborn Texture (Grey "..." Bubble)
        if (!this.textures.exists('emote_stubborn')) {
            const gfx = this.make.graphics({x:0, y:0, add:false});
            
            // Bubble Background
            gfx.fillStyle(0xffffff, 1);
            gfx.lineStyle(2, 0x888888, 1);
            gfx.fillRoundedRect(0, 0, 40, 28, 8);
            gfx.strokeRoundedRect(0, 0, 40, 28, 8);
            
            // Dots
            gfx.fillStyle(0x555555, 1);
            gfx.fillCircle(10, 14, 3);
            gfx.fillCircle(20, 14, 3);
            gfx.fillCircle(30, 14, 3);
            
            // Small tail
            gfx.fillStyle(0xffffff, 1);
            gfx.lineStyle(0); // No stroke for fill overlap
            gfx.beginPath();
            gfx.moveTo(15, 26);
            gfx.lineTo(10, 34);
            gfx.lineTo(25, 26);
            gfx.closePath();
            gfx.fillPath();
            
            // Redraw stroke for tail is complex, skipping for simplicity or using image
            // Just a simple bubble is fine.
            
            gfx.generateTexture('emote_stubborn', 42, 36);
        }

        this.sheepGroup = this.add.group();

        // 1. BACKGROUND (Full Brightness)
        this.add.image(width / 2, height / 2, 'pasture')
            .setDisplaySize(width, height)
            .setDepth(0);

        // 1.5 WIND GUSTS
        this.createWindGusts();
        this.time.delayedCall(6000, () => this.triggerGust());

        // 1.6 AMBIENCE - autoplay with fallback handling
        this.farmAmbience = this.sound.add('farm_ambience', { loop: true, volume: 2.0 });
        
        // Attempt autoplay immediately
        const playPromise = this.farmAmbience.play();
        
        // Handle browsers that block autoplay
        if (playPromise !== undefined && playPromise instanceof Promise) {
            playPromise.catch(() => {
                console.log('Autoplay blocked, will retry on any user interaction');
                // Set up one-time listener for ANY interaction to start audio
                const startAudio = () => {
                    if (!this.farmAmbience.isPlaying) {
                        this.farmAmbience.play();
                    }
                    // Remove all listeners after first interaction
                    this.input.off('pointerdown', startAudio);
                    this.input.keyboard.off('keydown', startAudio);
                };
                this.input.once('pointerdown', startAudio);
                this.input.keyboard.once('keydown', startAudio);
            });
        }

        // 2. FOREGROUND SHEEP (The "Running Herd")
        const spawnRunningSheep = () => {
            // Random direction
            const isLeftToRight = Math.random() > 0.5;
            const startX = isLeftToRight ? -150 : width + 150;
            const endX = isLeftToRight ? width + 150 : -150;
            
            // Randomize texture and speed
            const texture = 'sheep_walk'; // Only use running sprite
            const duration = Phaser.Math.Between(4000, 8000); // 4-8 seconds to cross
            
            const sheep = this.add.image(startX, height + 10, texture)
                .setOrigin(0.5, 1) // Anchor at feet
                .setScale(1.2 + Math.random() * 0.6) // Size variety
                .setDepth(10 + Math.random() * 5); // Layering
            
            this.sheepGroup.add(sheep);

            // Set facing direction
            // Texture faces Left by default.
            // L->R: Flip=true. R->L: Flip=false.
            sheep.setFlipX(isLeftToRight); 

            // 1. Move Across Screen
            const moveTween = this.tweens.add({
                targets: sheep,
                x: endX,
                duration: duration,
                ease: 'Linear',
                onComplete: () => sheep.destroy()
            });
            sheep.setData('moveTween', moveTween);

            // 2. Bobbing "Run" Animation
            this.tweens.add({
                targets: sheep,
                y: height - 10, // Bob up
                duration: 150 + Math.random() * 50,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            // 3. Slight Rotation (Wobble)
            this.tweens.add({
                targets: sheep,
                angle: { from: -5, to: 5 },
                duration: 300 + Math.random() * 200,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        };

        // Spawn loop
        this.spawnEvent = this.time.addEvent({
            delay: 1500, // New sheep every 1.5s
            callback: spawnRunningSheep,
            callbackScope: this,
            loop: true
        });

        // Spawn a few immediately so screen isn't empty
        for (let i = 0; i < 4; i++) {
            this.time.delayedCall(i * 500, spawnRunningSheep);
        }

        // 2.5 WOLF PEEK (Event)
        const peekWolf = () => {
            // Safety check in case scene changed
            if (!this.scene.isActive('BootScene')) return;
            
            this.isWolfActive = true;

            // Pause Spawning
            if (this.spawnEvent) this.spawnEvent.paused = true;

            // TRIGGER PANIC!
            this.sheepGroup.getChildren().forEach(sheep => {
                // Stop regular movement
                const oldTween = sheep.getData('moveTween');
                if (oldTween) oldTween.stop();
                
                // Visual Panic
                sheep.setTint(0xFFCCCC); // Pale red tint
                sheep.setFlipX(false); // Face Right (away from wolf on Left)
                
                // Emote
                const emote = this.add.image(sheep.x, sheep.y - 70, 'emote_exclamation')
                    .setDepth(sheep.depth + 1);
                
                // Emote pop animation
                this.tweens.add({
                    targets: emote,
                    y: '-=30',
                    alpha: 0,
                    duration: 800,
                    ease: 'Power2.easeOut',
                    onComplete: () => emote.destroy()
                });

                // Run Away FAST!
                this.tweens.add({
                    targets: sheep,
                    x: width + 300, // Run well off screen
                    y: sheep.y - 15, // Scared hop
                    duration: Phaser.Math.Between(600, 900), // Very fast
                    ease: 'Back.in', // Accelerate out
                    onComplete: () => sheep.destroy()
                });
            });

            // Wolf Sprite (Bottom Left, Head Only)
            // Origin (0.5, 0) means the anchor is the top-center of the image (the head)
            const wolf = this.add.image(150, height, 'wolf')
                .setOrigin(0.5, 0) 
                .setScale(1.3)
                .setDepth(18) // Behind logo (20), front of sheep (10-15)
                .setFlipX(true); // Face right

            // 1. Peek Up (Head Only)
            this.tweens.add({
                targets: wolf,
                y: height - 750, // Ultra high lift
                duration: 1500,
                ease: 'Power2.easeOut',
                onComplete: () => {
                    // Play sound (landing page - always play, no mute check)
                    this.sound.play('wolf_growl', { volume: 0.3 });

                    // 2. Wait
                    this.time.delayedCall(2000, () => {
                        // 3. Slide Down
                        this.tweens.add({
                            targets: wolf,
                            y: height, // Back below screen
                            duration: 1000,
                            ease: 'Power2.easeIn',
                            onComplete: () => {
                                wolf.destroy();
                                this.isWolfActive = false;
                                // Resume spawning
                                if (this.spawnEvent) this.spawnEvent.paused = false;
                                scheduleWolf(); // Schedule next visit
                                
                                // Wind 2s after wolf leaves
                                this.time.delayedCall(2000, () => this.triggerGust());
                            }
                        });
                    });
                }
            });
        };

        const scheduleWolf = () => {
             // Fixed 10 seconds delay
             this.time.delayedCall(10000, peekWolf);
        };

        // Start the wolf loop after a short initial delay
        this.time.delayedCall(3000, scheduleWolf);

        // 3. LOGO (Procedural "Wooden Sign" with Clouds)
        const logoY = height * 0.25;
        const logoContainer = this.add.container(width / 2, -200).setDepth(20);

        // Clouds behind logo
        const cloudGfx = this.add.graphics();
        cloudGfx.fillStyle(0xffffff, 1);
        // Draw a fluffy cloud shape
        cloudGfx.fillCircle(-200, 0, 60);
        cloudGfx.fillCircle(-120, -40, 70);
        cloudGfx.fillCircle(0, -50, 80);
        cloudGfx.fillCircle(120, -40, 70);
        cloudGfx.fillCircle(200, 0, 60);
        cloudGfx.fillCircle(100, 40, 60);
        cloudGfx.fillCircle(-100, 40, 60);
        logoContainer.add(cloudGfx);

        // Wooden Board
        const boardGfx = this.add.graphics();
        boardGfx.fillStyle(0x8B4513, 1); // SaddleBrown
        boardGfx.lineStyle(8, 0x5D4037, 1); // Darker Wood
        // Irregular plank shape - WIDENED to fit new title and arrows
        boardGfx.fillRoundedRect(-420, -60, 840, 120, 15);
        boardGfx.strokeRoundedRect(-420, -60, 840, 120, 15);
        // Wood grain details
        boardGfx.lineStyle(4, 0xA0522D, 0.5);
        boardGfx.beginPath();
        boardGfx.moveTo(-380, -20); boardGfx.lineTo(-100, -20);
        boardGfx.moveTo(100, 20); boardGfx.lineTo(380, 20);
        boardGfx.strokePath();
        logoContainer.add(boardGfx);

        // Arrows
        
        // Red Down Arrow (Left of HERD)
        const redArrow = this.add.graphics();
        redArrow.x = -380; // Shifted out slightly
        redArrow.fillStyle(0xFF4444, 1); // Bright Red
        redArrow.lineStyle(6, 0x000000, 1); // Thicker outline
        
        redArrow.beginPath();
        redArrow.moveTo(-25, -40); // Top Left Stem
        redArrow.lineTo(25, -40); // Top Right Stem
        redArrow.lineTo(25, 10);   // Bottom Right Stem
        redArrow.lineTo(60, 10);   // Right Head Wing
        redArrow.lineTo(0, 70);    // Tip
        redArrow.lineTo(-60, 10);  // Left Head Wing
        redArrow.lineTo(-25, 10);  // Bottom Left Stem
        redArrow.closePath();
        redArrow.fillPath();
        redArrow.strokePath();

        logoContainer.add(redArrow);

        // Animate Red Arrow (Dramatic Crash)
        this.tweens.add({
            targets: redArrow,
            y: 30,
            scaleY: 1.15, // Stretch effect
            duration: 450,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Green Up Arrow (Right of MENTALITY)
        const greenArrow = this.add.graphics();
        greenArrow.x = 380; // Shifted out slightly
        greenArrow.fillStyle(0x44FF44, 1); // Bright Green
        greenArrow.lineStyle(6, 0x000000, 1); // Thicker outline
        
        greenArrow.beginPath();
        greenArrow.moveTo(-25, 40); // Bottom Left Stem
        greenArrow.lineTo(25, 40); // Bottom Right Stem
        greenArrow.lineTo(25, -10);  // Top Right Stem
        greenArrow.lineTo(60, -10);  // Right Head Wing
        greenArrow.lineTo(0, -70);  // Tip
        greenArrow.lineTo(-60, -10); // Left Head Wing
        greenArrow.lineTo(-25, -10); // Top Left Stem
        greenArrow.closePath();
        greenArrow.fillPath();
        greenArrow.strokePath();

        logoContainer.add(greenArrow);

        // Animate Green Arrow (Dramatic Surge)
        this.tweens.add({
            targets: greenArrow,
            y: -30,
            scaleY: 1.15, // Stretch effect
            duration: 450,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: 225 // Half-cycle offset
        });

        // Text
        const titleText = this.add.text(0, 0, "HERD MENTALITY", {
            font: '900 64px Inter',
            fill: '#FFD700', // Gold
            stroke: '#000000',
            strokeThickness: 12,
            shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 0, fill: true }
        }).setOrigin(0.5);
        
        // Gradient effect on text (Top Orange, Bottom Yellow)
        const gradient = titleText.context.createLinearGradient(0, 0, 0, titleText.height);
        gradient.addColorStop(0, '#FFA500'); // Orange
        gradient.addColorStop(1, '#FFD700'); // Gold
        titleText.setFill(gradient);
        
        logoContainer.add(titleText);

        // Drop In Animation
        this.tweens.add({
            targets: logoContainer,
            y: logoY,
            duration: 1000,
            ease: 'Bounce.out'
        });

        // 4. LOGIN FORM (Center)
        const formY = height * 0.55;
        const storedName = localStorage.getItem('sheepMarket_playerName') || '';

        // Random Welcome Message
        const welcomePhrases = [
            "Shepherd… the herd is counting on you. Your name?",
            "Every legend has a name. What’s yours, Shepherd?",
            "Step up, Shepherd. How shall history remember you?",
            "Claim your title, oh wise Shepherd:"
        ];
        const randomPhrase = Phaser.Utils.Array.GetRandom(welcomePhrases);

        const welcomeText = this.add.text(width / 2, formY - 70, randomPhrase, {
            font: '700 24px Inter',
            fill: '#000000', // Black text
            stroke: '#ffffff', // White border
            strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5).setDepth(200).setAlpha(0);

        // Input Styling (DOM)
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'ENTER NAME';
        input.value = storedName;
        input.style.width = '400px';
        input.style.height = '70px';
        input.style.fontSize = '32px';
        input.style.textAlign = 'center';
        input.style.backgroundColor = '#fff8dc'; // Cornsilk (parchment-ish)
        input.style.color = '#5D4037'; // Dark Wood
        input.style.border = '4px solid #000000'; // Black border
        input.style.borderRadius = '12px';
        input.style.outline = 'none';
        input.style.fontFamily = 'Inter, sans-serif';
        input.style.fontWeight = '900';
        input.style.textTransform = 'uppercase';
        input.maxLength = 12;

        // Sound Effect
        input.addEventListener('input', () => {
            audioManager.playTyping();
        });

        const domInput = this.add.dom(width / 2, formY, input).setDepth(200);
        domInput.setAlpha(0); // Fade in
        this.nameInput = domInput; // Store reference for guide modal

        // Start Button (Wooden Plaque Style)
        const btnContainer = this.add.container(width / 2, formY + 120).setDepth(200).setAlpha(0);
        
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x000000, 0.5); // Semi-transparent black (wool wallet color)
        btnBg.lineStyle(4, 0xdfb762, 1); // Gold border
        btnBg.fillRoundedRect(-150, -40, 300, 80, 20);
        btnBg.strokeRoundedRect(-150, -40, 300, 80, 20);
        
        const btnText = this.add.text(0, 0, this.isRetry ? "TRY AGAIN" : "PLAY", {
            font: '900 36px Inter',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);
        
        btnContainer.add([btnBg, btnText]);
        
        // Interactive Zone
        const hitArea = new Phaser.Geom.Rectangle(-150, -40, 300, 80);
        btnContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
        
        btnContainer.on('pointerover', () => {
            btnContainer.setScale(1.05);
            btnBg.fillStyle(0x000000, 0.7); // Darker on hover
        });
        btnContainer.on('pointerout', () => {
            btnContainer.setScale(1);
            btnBg.fillStyle(0x000000, 0.5); // Reset to semi-transparent black
        });
        
        // LOGIC
        const startGame = () => {
            if (this.gameStarted) return;
            this.gameStarted = true;

            let name = input.value.trim();
            if (!name) name = "Shepherd_" + Math.floor(Math.random() * 999);
            
            // UI Feedback
            audioManager.playClick();
            btnContainer.setScale(0.9);
            input.disabled = true;

            // Save Data
            const oldName = localStorage.getItem('sheepMarket_playerName');
            
            if (oldName && name !== oldName) {
                console.log(`👤 NEW SHEPHERD DETECTED: "${name}" replaces "${oldName}". Starting fresh...`);
                // Clear all progress data for the new player
                localStorage.clear();
                // After clear, we must re-set the name
                localStorage.setItem('sheepMarket_playerName', name);
                localStorage.setItem('sheepMarket_playerLevel', '1');
                authService.saveBalance(0); // Will receive 50W from intro
            } else {
                localStorage.setItem('sheepMarket_playerName', name);
            }
            
            // Handle special reset/debug names
            if (name.toUpperCase() === 'RESET') {
                localStorage.setItem('sheepMarket_playerLevel', '1');
                authService.saveBalance(0);
            } else if (name.toUpperCase() === 'LEVEL2') {
                localStorage.setItem('sheepMarket_playerLevel', '2');
                authService.saveBalance(100);
            }

            // Transition
            const cover = this.add.graphics().fillStyle(0x000000, 1).fillRect(0, 0, width, height).setDepth(1000).setAlpha(0);
            
            // Fade out ambience
            if (this.farmAmbience) {
                this.tweens.add({
                    targets: this.farmAmbience,
                    volume: 0,
                    duration: 500,
                    onComplete: () => {
                        this.farmAmbience.stop();
                    }
                });
            }

            this.tweens.add({
                targets: cover,
                alpha: 1,
                duration: 500,
                onComplete: () => {
                    const goldenKeyUsed = localStorage.getItem('sheepMarket_goldenKeyActivated') === 'true';
                    const allUnlocked = localStorage.getItem('sheepMarket_allLevelsUnlocked') === 'true';
                    const savedPlayerLevel = parseInt(localStorage.getItem('sheepMarket_playerLevel') || '1');
                    
                    // Clear endless mode flags when starting main game
                    localStorage.setItem('sheepMarket_endlessMode', 'false');
                    
                    // Starts at Level 1 ONLY if the game was beaten (golden key / all unlocked). Otherwise resume.
                    const startingLevel = (goldenKeyUsed || allUnlocked) ? 1 : savedPlayerLevel;

                    this.scene.start('GameScene', {
                        activeLevel: startingLevel,
                        balance: authService.loadBalance(),
                        isRetrying: false,
                        fromMenu: true,
                        isEndlessMode: false, // Explicitly set to false for main game

                        // pass progression flags explicitly (important for HUDScene sync)
                        goldenKeyActivated: goldenKeyUsed,
                        allLevelsUnlocked: allUnlocked
                    });
                }
            });

            import('tone').then(T => T.start().catch(() => {}));
        };

        btnContainer.on('pointerdown', startGame);
        
        // Keyboard support
        this.input.keyboard.on('keydown-ENTER', startGame);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') startGame();
        });

        // SHEPHERD'S GUIDE Button
        const guideBtnContainer = this.add.container(width / 2, formY + 220).setDepth(200).setAlpha(0);
        
        const guideBtnBg = this.add.graphics();
        guideBtnBg.fillStyle(0x000000, 0.5); // Semi-transparent black (wool wallet color)
        guideBtnBg.lineStyle(4, 0xdfb762, 1); // Gold border
        guideBtnBg.fillRoundedRect(-180, -40, 360, 80, 20);
        guideBtnBg.strokeRoundedRect(-180, -40, 360, 80, 20);
        
        const guideBtnText = this.add.text(0, 0, "TUTORIAL", {
            font: '900 32px Inter',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);
        
        guideBtnContainer.add([guideBtnBg, guideBtnText]);
        
        // Interactive
        const guideHitArea = new Phaser.Geom.Rectangle(-180, -40, 360, 80);
        guideBtnContainer.setInteractive(guideHitArea, Phaser.Geom.Rectangle.Contains);
        
        guideBtnContainer.on('pointerover', () => {
            guideBtnContainer.setScale(1.05);
            guideBtnBg.clear();
            guideBtnBg.fillStyle(0x000000, 0.7); // Darker on hover
            guideBtnBg.lineStyle(4, 0xdfb762, 1); // Gold border
            guideBtnBg.fillRoundedRect(-180, -40, 360, 80, 20);
            guideBtnBg.strokeRoundedRect(-180, -40, 360, 80, 20);
        });
        
        guideBtnContainer.on('pointerout', () => {
            guideBtnContainer.setScale(1);
            guideBtnBg.clear();
            guideBtnBg.fillStyle(0x000000, 0.5); // Semi-transparent black
            guideBtnBg.lineStyle(4, 0xdfb762, 1); // Gold border
            guideBtnBg.fillRoundedRect(-180, -40, 360, 80, 20);
            guideBtnBg.strokeRoundedRect(-180, -40, 360, 80, 20);
        });
        
        guideBtnContainer.on('pointerdown', () => {
            audioManager.playClick();
            
            // Clear endless mode flags when starting tutorial
            localStorage.setItem('sheepMarket_endlessMode', 'false');
            
            // Transition cleanly to Tutorial
            const cover = this.add.graphics().fillStyle(0x000000, 1).fillRect(0, 0, width, height).setDepth(1000).setAlpha(0);
            
            if (this.farmAmbience) {
                this.tweens.add({
                    targets: this.farmAmbience,
                    volume: 0,
                    duration: 500,
                    onComplete: () => {
                        this.farmAmbience.stop();
                    }
                });
            }

            this.tweens.add({
                targets: cover,
                alpha: 1,
                duration: 500,
                onComplete: () => {
                    localStorage.setItem('sheepMarket_level1StartBalance', '100');
                    this.scene.start('GameScene', {
                        activeLevel: 1,
                        tutorialMode: true,
                        isEndlessMode: false, // Explicitly set to false for tutorial
                        balance: 100
                    });
                }
            });
            import('tone').then(T => T.start().catch(() => {}));
        });

        // SHEPHERD'S TOOLKIT Button
        const toolkitBtnContainer = this.add.container(width / 2, formY + 320).setDepth(200).setAlpha(0);
        
        const toolkitBtnBg = this.add.graphics();
        toolkitBtnBg.fillStyle(0x000000, 0.5); // Semi-transparent black (wool wallet color)
        toolkitBtnBg.lineStyle(4, 0xdfb762, 1); // Gold border
        toolkitBtnBg.fillRoundedRect(-220, -40, 440, 80, 20);
        toolkitBtnBg.strokeRoundedRect(-220, -40, 440, 80, 20);
        
        const toolkitBtnText = this.add.text(0, 0, "ENDLESS MODE", {
            font: '900 32px Inter',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);
        
        toolkitBtnContainer.add([toolkitBtnBg, toolkitBtnText]);
        
        // Interactive
        const toolkitHitArea = new Phaser.Geom.Rectangle(-220, -40, 440, 80);
        toolkitBtnContainer.setInteractive(toolkitHitArea, Phaser.Geom.Rectangle.Contains);
        
        toolkitBtnContainer.on('pointerover', () => {
            toolkitBtnContainer.setScale(1.05);
            toolkitBtnBg.clear();
            toolkitBtnBg.fillStyle(0x000000, 0.7); // Darker on hover
            toolkitBtnBg.lineStyle(4, 0xdfb762, 1); // Gold border
            toolkitBtnBg.fillRoundedRect(-220, -40, 440, 80, 20);
            toolkitBtnBg.strokeRoundedRect(-220, -40, 440, 80, 20);
        });
        
        toolkitBtnContainer.on('pointerout', () => {
            toolkitBtnContainer.setScale(1);
            toolkitBtnBg.clear();
            toolkitBtnBg.fillStyle(0x000000, 0.5); // Semi-transparent black
            toolkitBtnBg.lineStyle(4, 0xdfb762, 1); // Gold border
            toolkitBtnBg.fillRoundedRect(-220, -40, 440, 80, 20);
            toolkitBtnBg.strokeRoundedRect(-220, -40, 440, 80, 20);
        });
        
        toolkitBtnContainer.on('pointerdown', () => {
            audioManager.playClick();
            this.showShepherdsToolkit();
        });

        // Fade In Elements
        this.tweens.add({
            targets: [domInput, btnContainer, guideBtnContainer, toolkitBtnContainer, welcomeText],
            alpha: 1,
            y: '-=20', // Slide up slightly
            duration: 800,
            delay: 500,
            ease: 'Power2'
        });

        // Generate Panic Particle Texture (Keep this for game scene usage if needed later, or move to boot preload)
        if (!this.textures.exists('panic_particle')) {
            const pg = this.make.graphics({ x: 0, y: 0, add: false });
            pg.fillStyle(0xffffff, 1).fillCircle(4, 4, 4).generateTexture('panic_particle', 8, 8);
        }
    }

    showShepherdsGuide() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Hide name input field to prevent it showing through
        if (this.nameInput) {
            this.nameInput.setVisible(false);
        }

        // Overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.8);
        overlay.fillRect(0, 0, width, height);
        overlay.setDepth(1000);
        overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);

        // Modal Background - Wooden Style
        const modalWidth = 900;
        const modalHeight = 700;
        const modalX = width / 2;
        const modalY = height / 2;

        const modalBg = this.add.graphics();
        
        // Outer shadow for depth
        modalBg.fillStyle(0x3E2723, 0.8);
        modalBg.fillRoundedRect(modalX - modalWidth/2 + 8, modalY - modalHeight/2 + 8, modalWidth, modalHeight, 15);
        
        // Main wooden board - medium brown
        modalBg.fillStyle(0x6D4C41, 1);
        modalBg.fillRoundedRect(modalX - modalWidth/2, modalY - modalHeight/2, modalWidth, modalHeight, 15);
        
        // Wood grain effect - darker brown horizontal lines
        modalBg.lineStyle(2, 0x5D4037, 0.4);
        for (let i = 0; i < 15; i++) {
            const yPos = modalY - modalHeight/2 + (i * 50);
            modalBg.lineBetween(modalX - modalWidth/2 + 20, yPos, modalX + modalWidth/2 - 20, yPos);
        }
        
        // Darker wooden frame border
        modalBg.lineStyle(8, 0x4E342E, 1);
        modalBg.strokeRoundedRect(modalX - modalWidth/2, modalY - modalHeight/2, modalWidth, modalHeight, 15);
        
        // Inner lighter wood trim
        modalBg.lineStyle(3, 0x8D6E63, 1);
        modalBg.strokeRoundedRect(modalX - modalWidth/2 + 12, modalY - modalHeight/2 + 12, modalWidth - 24, modalHeight - 24, 12);
        
        // Corner "nails" - metallic rivets
        const nailPositions = [
            [modalX - modalWidth/2 + 30, modalY - modalHeight/2 + 30],
            [modalX + modalWidth/2 - 30, modalY - modalHeight/2 + 30],
            [modalX - modalWidth/2 + 30, modalY + modalHeight/2 - 30],
            [modalX + modalWidth/2 - 30, modalY + modalHeight/2 - 30]
        ];
        
        nailPositions.forEach(([x, y]) => {
            // Nail head - dark metal
            modalBg.fillStyle(0x424242, 1);
            modalBg.fillCircle(x, y, 6);
            // Nail shine
            modalBg.fillStyle(0x757575, 1);
            modalBg.fillCircle(x - 2, y - 2, 2);
        });
        
        modalBg.setDepth(1001);

        // Title on wooden sign plaque
        const titleBg = this.add.graphics();
        titleBg.fillStyle(0x8D6E63, 1);
        titleBg.lineStyle(3, 0x5D4037, 1);
        titleBg.fillRoundedRect(modalX - 280, modalY - modalHeight/2 + 20, 560, 70, 10);
        titleBg.strokeRoundedRect(modalX - 280, modalY - modalHeight/2 + 20, 560, 70, 10);
        titleBg.setDepth(1002);
        
        const title = this.add.text(modalX, modalY - modalHeight/2 + 55, "SHEPHERD'S GUIDE", {
            font: '900 42px Inter',
            fill: '#FFF8DC', // Cornsilk - light wood color
            stroke: '#3E2723',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(1003);

        // Guide Text Content with scroll indicator embedded
        const scrollIndicatorHTML = '<span style="font-size: 26px; color: #8B0000; font-weight: 900; display: block; margin: 10px 0;">▼▼▼ SCROLL DOWN ▼▼▼</span>';
        
        const guideText = `WELCOME TO HERD MENTALITY
${scrollIndicatorHTML}


YOU'RE THE SHEPHERD.
THE FLOCK HAS A MIND OF ITS OWN.

YOUR GOAL IS SIMPLE: PREDICT WHERE THE SHEEP WILL END UP WHEN THE CLOCK RUNS OUT.

HOW IT WORKS

THERE ARE 50 SHEEP IN THE PASTURE.
THEY CAN WANDER LEFT OR RIGHT… AND THEY DON'T ALWAYS LISTEN.

YOU CAN CALL THE SHEEP TO EITHER SIDE:

CALL LEFT
CALL RIGHT

EACH CALL COSTS WOOL.
THE PRICE CHANGES AS THE SHEEP MOVE.

IF MORE SHEEP DRIFT TO A SIDE, THAT SIDE GETS MORE EXPENSIVE.
IF THEY WANDER AWAY, IT GETS CHEAPER.

MAKING CALLS

YOU CAN MAKE MULTIPLE CALLS DURING A ROUND.
CALLS YOU MAKE EARLY CAN GAIN OR LOSE VALUE AS THE FLOCK SHIFTS.

YOU'RE NOT LOCKED IN RIGHT AWAY.
ADJUST AS THE PASTURE CHANGES.

THE FINAL CALL

WHEN THERE ARE 15 SECONDS LEFT, IT'S TIME TO COMMIT.

YOUR FINAL CALL IS THE SIDE YOU BELIEVE THE SHEEP WILL END ON WHEN THE TIMER HITS ZERO.

YOUR FINAL CALL DECIDES WHETHER YOU WIN OR LOSE THE ROUND.
YOU CAN STILL WIN OR LOSE WOOL BASED ON ALL YOUR CALLS.

HOW WOOL SETTLES

ALL CALLS SETTLE WHEN THE TIMER HITS ZERO.

WHEN THE ROUND ENDS:
THE SIDE THE SHEEP END ON SETTLES AT FULL VALUE.
THE OTHER SIDE SETTLES AT ZERO.

YOUR WOOL GAIN OR LOSS IS:
FINAL VALUE COMPARED TO THE PRICE YOU PAID.

WINNING AND LOSING

YOU READ THE HERD.
YOUR FINAL CALL WAS RIGHT. YOU MOVE ON TO THE NEXT LEVEL.

YOU MISREAD THE HERD.
THE FLOCK FOOLED YOU. YOU'LL HAVE TO TRY AGAIN.

YOU MIGHT STILL GAIN WOOL EVEN IF YOU LOSE THE ROUND.
YOU MIGHT LOSE WOOL EVEN IF YOU WIN.

THAT'S THE HERD MENTALITY.

YOUR WOOL WALLET

WOOL SPENT SHOWS HOW MUCH YOU'VE PAID THIS ROUND.

UNREALIZED WOOL SHOWS HOW YOUR CALLS ARE DOING RIGHT NOW.

PRICES CHANGE IN REAL TIME AS SHEEP MOVE.

YOU CAN OPEN YOUR WALLET AT ANY TIME TO CHECK YOUR POSITION.

AS YOU PROGRESS…

NEW CHALLENGES SHOW UP.
THE PASTURE GETS LESS PREDICTABLE.
THE SHEEP GET SMARTER... OR DO THEY?
AND THINGS DON'T ALWAYS BEHAVE THE WAY YOU EXPECT.

TRUST YOUR INSTINCTS.
WATCH THE FLOCK.
MAKE YOUR CALL.`;


        // Create scrollable text area using DOM element - parchment style
        const scrollDiv = document.createElement('div');
        scrollDiv.style.width = '820px';
        scrollDiv.style.height = '480px';
        scrollDiv.style.overflowY = 'scroll';
        scrollDiv.style.padding = '25px';
        scrollDiv.style.backgroundColor = '#F5E6D3'; // Parchment/old paper color
        scrollDiv.style.border = '4px solid #8D6E63'; // Medium wood border
        scrollDiv.style.borderRadius = '8px';
        scrollDiv.style.boxShadow = 'inset 0 0 20px rgba(139, 69, 19, 0.2)'; // Inner shadow for aged paper look
        scrollDiv.style.color = '#3E2723'; // Dark brown text
        scrollDiv.style.fontSize = '52px'; // 2x larger (was 26px)
        scrollDiv.style.fontFamily = 'Inter, sans-serif';
        scrollDiv.style.fontWeight = '900'; // Bold
        scrollDiv.style.lineHeight = '1.8';
        scrollDiv.style.whiteSpace = 'pre-wrap';
        scrollDiv.style.textAlign = 'center';
        
        scrollDiv.innerHTML = guideText;

        // Custom scrollbar styling - wooden theme
        const style = document.createElement('style');
        style.innerHTML = `
            div::-webkit-scrollbar {
                width: 14px;
            }
            div::-webkit-scrollbar-track {
                background: #5D4037;
                border-radius: 8px;
                border: 2px solid #4E342E;
            }
            div::-webkit-scrollbar-thumb {
                background: #8D6E63;
                border-radius: 8px;
                border: 2px solid #6D4C41;
            }
            div::-webkit-scrollbar-thumb:hover {
                background: #A1887F;
            }
        `;
        document.head.appendChild(style);

        const domScroll = this.add.dom(modalX, modalY + 30, scrollDiv).setDepth(1002);
        
        // ===== SCROLL INDICATOR AT BOTTOM OF TEXT BOX =====
        // Position indicator at the very bottom of the scroll container (always show - content is always scrollable)
        const indicatorY = modalY + 30 + (480 / 2) - 60; // Bottom of scroll container
        
        // Semi-transparent background for better visibility
        const indicatorBg = this.add.graphics();
        indicatorBg.fillStyle(0x3E2723, 0.9); // Dark brown, mostly opaque
        indicatorBg.fillRoundedRect(modalX - 90, indicatorY - 20, 180, 70, 10);
        indicatorBg.lineStyle(3, 0x8D6E63, 1);
        indicatorBg.strokeRoundedRect(modalX - 90, indicatorY - 20, 180, 70, 10);
        indicatorBg.setDepth(1010); // Very high depth
        
        // Chevron/Arrow graphic - filled triangles
        const chevronGraphics = this.add.graphics();
        chevronGraphics.setDepth(1011);
        
        // First chevron (upper) - filled triangle
        chevronGraphics.fillStyle(0xfcd535, 1); // Gold/yellow color for visibility
        chevronGraphics.fillTriangle(
            modalX - 25, indicatorY - 8,    // Left point
            modalX + 25, indicatorY - 8,    // Right point
            modalX, indicatorY + 8          // Bottom point
        );
        
        // Second chevron (lower) - filled triangle
        chevronGraphics.fillTriangle(
            modalX - 25, indicatorY + 5,    // Left point
            modalX + 25, indicatorY + 5,    // Right point
            modalX, indicatorY + 21         // Bottom point
        );
        
        const scrollIndicator = chevronGraphics;
        
        // Bold text hint
        const scrollIndicatorText = this.add.text(modalX, indicatorY + 35, 'MORE BELOW', {
            font: 'bold 16px Inter',
            fill: '#fcd535',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(1011);
        
        // Smooth pulsing animation
        this.tweens.add({
            targets: [scrollIndicator, scrollIndicatorText],
            alpha: 0.7,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Bounce animation
        this.tweens.add({
            targets: [scrollIndicator, scrollIndicatorText, indicatorBg],
            y: '+=10',
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Listen for scroll events to hide indicator when at bottom
        scrollDiv.addEventListener('scroll', () => {
            const atBottom = scrollDiv.scrollHeight - scrollDiv.scrollTop <= scrollDiv.clientHeight + 20;
            
            if (atBottom) {
                // User reached bottom - hide indicator
                scrollIndicator.setVisible(false);
                scrollIndicatorText.setVisible(false);
                indicatorBg.setVisible(false);
            } else {
                // Not at bottom - show indicator
                scrollIndicator.setVisible(true);
                scrollIndicatorText.setVisible(true);
                indicatorBg.setVisible(true);
            }
        });

        // Red bouncing arrow pointing down (below "The flock has a mind of its own")
        const arrowGraphics = this.add.graphics();
        arrowGraphics.setDepth(1003);
        
        // Draw thick red arrow pointing down
        const arrowX = modalX;
        const arrowY = modalY - modalHeight/2 + 220; // Position below the intro text
        
        arrowGraphics.fillStyle(0xff0000, 1); // Red
        arrowGraphics.lineStyle(6, 0xcc0000, 1); // Dark red outline
        
        // Arrow shaft (thick rectangle)
        arrowGraphics.fillRect(arrowX - 15, arrowY - 40, 30, 40);
        arrowGraphics.strokeRect(arrowX - 15, arrowY - 40, 30, 40);
        
        // Arrow head (triangle)
        arrowGraphics.fillTriangle(
            arrowX, arrowY + 20,           // Bottom point
            arrowX - 35, arrowY,           // Left point
            arrowX + 35, arrowY            // Right point
        );
        arrowGraphics.strokeTriangle(
            arrowX, arrowY + 20,
            arrowX - 35, arrowY,
            arrowX + 35, arrowY
        );
        
        // "SCROLL TO CONTINUE" text hint
        const continueHint = this.add.text(modalX, arrowY + 40, 'SCROLL TO CONTINUE', {
            font: 'bold 24px Inter',
            fill: '#ff0000',
            stroke: '#3E2723',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(1003);
        
        // Bouncing animation for both arrow and text
        this.tweens.add({
            targets: [arrowGraphics, continueHint],
            y: '+=15',
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Close Button - positioned lower at bottom of modal (wooden style)
        const closeBtnContainer = this.add.container(modalX, modalY + modalHeight/2 - 20).setDepth(1003);
        
        const closeBtnBg = this.add.graphics();
        // Shadow
        closeBtnBg.fillStyle(0x3E2723, 0.6);
        closeBtnBg.fillRoundedRect(-98, -28, 200, 60, 12);
        // Main wood
        closeBtnBg.fillStyle(0x8D6E63, 1);
        closeBtnBg.fillRoundedRect(-100, -30, 200, 60, 12);
        // Dark border
        closeBtnBg.lineStyle(4, 0x5D4037, 1);
        closeBtnBg.strokeRoundedRect(-100, -30, 200, 60, 12);
        
        const closeBtnText = this.add.text(0, 0, 'CLOSE', {
            font: '900 32px Inter',
            fill: '#FFF8DC',
            stroke: '#3E2723',
            strokeThickness: 5
        }).setOrigin(0.5);
        
        closeBtnContainer.add([closeBtnBg, closeBtnText]);
        
        const closeHitArea = new Phaser.Geom.Rectangle(-100, -30, 200, 60);
        closeBtnContainer.setInteractive(closeHitArea, Phaser.Geom.Rectangle.Contains);
        
        closeBtnContainer.on('pointerover', () => {
            closeBtnContainer.setScale(1.08);
            closeBtnBg.clear();
            // Lighter wood on hover
            closeBtnBg.fillStyle(0x3E2723, 0.6);
            closeBtnBg.fillRoundedRect(-98, -28, 200, 60, 12);
            closeBtnBg.fillStyle(0xA1887F, 1);
            closeBtnBg.fillRoundedRect(-100, -30, 200, 60, 12);
            closeBtnBg.lineStyle(4, 0x5D4037, 1);
            closeBtnBg.strokeRoundedRect(-100, -30, 200, 60, 12);
        });
        
        closeBtnContainer.on('pointerout', () => {
            closeBtnContainer.setScale(1);
            closeBtnBg.clear();
            // Reset to normal wood
            closeBtnBg.fillStyle(0x3E2723, 0.6);
            closeBtnBg.fillRoundedRect(-98, -28, 200, 60, 12);
            closeBtnBg.fillStyle(0x8D6E63, 1);
            closeBtnBg.fillRoundedRect(-100, -30, 200, 60, 12);
            closeBtnBg.lineStyle(4, 0x5D4037, 1);
            closeBtnBg.strokeRoundedRect(-100, -30, 200, 60, 12);
        });
        
        closeBtnContainer.on('pointerdown', () => {
            audioManager.playClick();
            // Show name input field again
            if (this.nameInput) {
                this.nameInput.setVisible(true);
            }
            overlay.destroy();
            modalBg.destroy();
            titleBg.destroy();
            title.destroy();
            arrowGraphics.destroy();
            continueHint.destroy();
            domScroll.destroy();
            closeBtnContainer.destroy();
            // Clean up scroll indicator if it exists
            if (scrollIndicator) scrollIndicator.destroy();
            if (scrollIndicatorText) scrollIndicatorText.destroy();
            if (indicatorBg) indicatorBg.destroy();
            document.head.removeChild(style);
        });

        // Click overlay to close
        overlay.on('pointerdown', () => {
            audioManager.playClick();
            // Show name input field again
            if (this.nameInput) {
                this.nameInput.setVisible(true);
            }
            overlay.destroy();
            modalBg.destroy();
            titleBg.destroy();
            title.destroy();
            arrowGraphics.destroy();
            continueHint.destroy();
            domScroll.destroy();
            closeBtnContainer.destroy();
            // Clean up scroll indicator if it exists
            if (scrollIndicator) scrollIndicator.destroy();
            if (scrollIndicatorText) scrollIndicatorText.destroy();
            if (indicatorBg) indicatorBg.destroy();
            document.head.removeChild(style);
        });
    }

    showShepherdsToolkit() {
        // Start Endless Mode
        audioManager.playClick();
        
        // Set endless mode flag in localStorage
        localStorage.setItem('sheepMarket_endlessMode', 'true');
        localStorage.setItem('sheepMarket_endlessRound', '1');
        localStorage.setItem('sheepMarket_endlessBalance', '100');
        
        // Start the game in endless mode
        this.scene.start('GameScene', {
            balance: 100,
            activeLevel: 1, // Use level 1 config as base
            isEndlessMode: true,
            endlessRound: 1
        });
    }
}
