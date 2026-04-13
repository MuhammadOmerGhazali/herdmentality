import Phaser from 'phaser';
import { CONFIG, ABILITY_CONFIG } from '../config.js';
import { Sheep } from '../entities/Sheep.js';
import { Wolf } from '../entities/Wolf.js';
import { Dog } from '../entities/Dog.js';
import { BlackSheep } from '../entities/BlackSheep.js';
import { audioManager } from '../audio.js';
import { authService } from '../services/auth.js';
import { LevelContentController } from '../services/LevelContentController.js';
import { DEBUG_CONFIG } from '../services/DebugConfig.js';
import EndlessModeConfig from '../services/EndlessModeConfig.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.woolBalance = authService.loadBalance();
        this.calls = []; // Array of Call objects: { side, entryPrice }
        this.currentRoundSpent = 0; // Track wool committed to bets this round
        this.finalCallSide = null; // Track the player's final call selection (LEFT or RIGHT)
        this.timeLeft = CONFIG.roundTime;
        this.marketDrift = 0;
        this.driftChangeTime = 0;
        this.roundActive = true;
        this.totalIdledCount = 0; // Cumulative count of idle events this round
        this.marketFatigue = 0; // 0 = Fresh, High = Ignored
        this.tutorialMode = false; // Tutorial Clamp Flag
    }

    init(data) {
        // Defensive logging – helps diagnose black screen on bad data
        console.log('[GameScene] init() received data:', JSON.stringify({
            balance: data?.balance,
            activeLevel: data?.activeLevel,
            isRetrying: data?.isRetrying,
            forceReset: data?.forceReset,
            isEndlessMode: data?.isEndlessMode,
            endlessRound: data?.endlessRound,
        }));

        if (data?.activeLevel === undefined || data?.activeLevel === null) {
            console.error('[GameScene] ⚠️  init() – activeLevel is undefined! Defaulting to 1.');
        }
        if (data?.balance === undefined || data?.balance === null) {
            console.warn('[GameScene] ⚠️  init() – balance is undefined, will load from authService.');
        }

        // ENDLESS MODE DETECTION
        // Prioritize explicit data parameter over localStorage to prevent mode bleeding
        if (data?.isEndlessMode !== undefined) {
            this.isEndlessMode = data.isEndlessMode;
        } else {
            this.isEndlessMode = localStorage.getItem('sheepMarket_endlessMode') === 'true';
        }
        this.endlessRound = this.isEndlessMode ? (data?.endlessRound || parseInt(localStorage.getItem('sheepMarket_endlessRound') || '1')) : 0;
        
        if (this.isEndlessMode) {
            console.log(`🔄 ENDLESS MODE: Round ${this.endlessRound}`);
            // Generate random round time between 30-90 seconds
            this.timeLeft = Math.floor(Math.random() * (90 - 30 + 1)) + 30;
            console.log(`⏱️ ENDLESS MODE: Round time = ${this.timeLeft}s (hidden from player)`);
        }

        // Handle retry/reset flag
        this.isRetrying = (data && data.isRetrying) || false;
        const forceReset = (data && data.forceReset) || false;
        
        this.tutorialMode = data?.tutorialMode || false;
        
        if (this.tutorialMode) {
            this.woolBalance = data?.balance ?? 100;
            this.time.delayedCall(200, () => {
                this.events.emit('set-tutorial-mode', this.tutorialMode);
            });
        }
        
        if (this.isRetrying || forceReset) {
            console.log('🔄 GameScene: Full reset for retry');
        }

        // Always reset Level 12 runtime state
        this.level12WinOverride = false;
        this.level12CelebrationComplete = false;
        this.goldenSheepActivated = false;

        this.level12State = {
            phase: 'IDLE',
            isActive: false
        };
        this.level12Timers = [];

        this.goldenKeyActivated = data.goldenKeyActivated || false;
        this.allLevelsUnlocked = data.allLevelsUnlocked || false;

        // Store session stats for Level 1 retry if provided
        this.sessionStats = (data && data.sessionStats) ? data.sessionStats : null;
        
        if (data && data.balance !== undefined) {
            console.log(`🎮 GameScene.init() - Balance from data: ${data.balance}W`);
            this.woolBalance = data.balance;
        } else if (this.isEndlessMode) {
            // Endless mode: load from endless balance
            this.woolBalance = parseFloat(localStorage.getItem('sheepMarket_endlessBalance') || '100');
            console.log(`🎮 ENDLESS MODE: Balance = ${this.woolBalance}W`);
        } else {
            console.log(`🎮 GameScene.init() - Loading balance from authService`);
            this.woolBalance = authService.loadBalance();
            console.log(`🎮 GameScene.init() - Loaded balance: ${this.woolBalance}W`);
        }
        
        // RESET GAMEPLAY STATE (Critical for Scene Restarts)
        this.roundActive = false; // Frozen until GO!
        if (!this.isEndlessMode) {
            this.timeLeft = CONFIG.roundTime;
        }
        // timeLeft already set for endless mode above
        this.calls = []; // Reset calls array
        this.currentRoundSpent = 0;
        this.finalCallSide = null; // Reset final call selection
        this.finalTrendSide = null; // Track the locked trend for end-game
        this.marketDrift = 0;
        this.driftChangeTime = 0;
        this.totalIdledCount = 0;
        this.marketFatigue = 0;
        
        // Wolf State Reset
        this.wolfTimer = 0;
        this.wolvesSpawnedCount = 0;
        this.wolfWarningSent = false;
        this.nextWolfSide = null;
        
        // Anti-Bunching Reset
        this.bunchTimer = 0;
        this.lastBunchSide = null;
        
        this.historicalPrices = []; // Track price history for charting
        
        // Load Player Level
        this.activeLevel = data && data.activeLevel !== undefined ? data.activeLevel : parseInt(localStorage.getItem('sheepMarket_playerLevel') || '1');
        this.playerLevel = parseInt(localStorage.getItem('sheepMarket_playerLevel') || '1');

        // ENDLESS MODE: Generate random config OR use normal level controller
        if (this.isEndlessMode) {
            // Import and generate endless mode config
            this.endlessConfig = new EndlessModeConfig(this.endlessRound);
            
            console.log(`🎲 ENDLESS MODE Round ${this.endlessRound} Config:`, this.endlessConfig.config);
            
            // Create custom level controller that uses endless config
            this.levelController = {
                // Core method used by GameScene.update()
                isEnabled: (feature) => {
                    const config = this.endlessConfig.config;
                    // Map feature names to config properties
                    const featureMap = {
                        'wolves': config.wolves,
                        'wind': config.wind,
                        'grazing': config.grazing,
                        'friendlyDog': config.friendlyDog,
                        'blackSheep': config.blackSheep,
                        'goldenSheep': config.goldenSheep,
                        'lawnMower': config.lawnMower,
                        'gloomyWeather': config.gloomyWeather,
                        'rain': config.rain,
                        'lightning': config.lightning
                    };
                    return featureMap[feature] || false;
                },
                getSheepCount: () => this.endlessConfig.config.sheep,
                get: (feature) => {
                    const config = this.endlessConfig.config;
                    // Return enhanced config objects for features that need them
                    if (feature === 'wolves' && config.wolves) {
                        return {
                            enabled: true,
                            max: config.wolfCount,
                            warningDuration: 5000 // Standard warning duration
                        };
                    }
                    if (feature === 'wind' && config.wind) {
                        return {
                            enabled: true,
                            intensity: config.windIntensity
                        };
                    }
                    if (feature === 'grazing' && config.grazing) {
                        return {
                            enabled: true,
                            density: config.grazingDensity
                        };
                    }
                    // For other features, return the raw value
                    return config[feature];
                },
                getConfig: () => this.endlessConfig.config
            };
        } else {
            // Normal mode: use LevelContentController
            this.levelController = new LevelContentController(this.activeLevel);
        }

        // ── DEBUG OVERRIDES (edit services/DebugConfig.js to use) ────────────
        if (DEBUG_CONFIG.enabled && !this.isEndlessMode) {
            if (DEBUG_CONFIG.level !== null) {
                console.log(`[DEBUG] Level override: ${this.activeLevel} → ${DEBUG_CONFIG.level}`);
                this.activeLevel = DEBUG_CONFIG.level;
                this.playerLevel = DEBUG_CONFIG.level;
                localStorage.setItem('sheepMarket_playerLevel', String(DEBUG_CONFIG.level));
                // Re-create controller for the overridden level
                this.levelController = new LevelContentController(this.activeLevel);
            }
            if (DEBUG_CONFIG.wool !== null) {
                console.log(`[DEBUG] WOOL override: ${this.woolBalance}W → ${DEBUG_CONFIG.wool}W`);
                this.woolBalance = DEBUG_CONFIG.wool;
                authService.saveBalance(DEBUG_CONFIG.wool);
            }
        }
        // ─────────────────────────────────────────────────────────────────────

        // Cache sheep count so update() and settleRound() don't need to re-query
        this.activeSheepCount = this.levelController.getSheepCount();
        
        // Transition Flags
        this.fromGraduation = (data && data.fromGraduation) || false;

        // Golden Sheep Logic
        this.goldenSheepActive = false;
        this.goldenSheepTarget = null; // The actual sprite
        this.goldenSheepTriggerTime = null;
        this.goldenSheepSpawned = false; // Track if Golden Sheep has appeared

        // Ability States
        this.obedienceBoostActive = false;
        this.obedienceBoostEndTime = 0;
        
        // Golden Clover Boost State
        // Golden Clover removed (no longer a timed boost)
        
        // Mud State (Level 4)
        this.mudActive = false;
        this.mudFootprints = [];
        this.mudOverlay = null;
        
        // Grazing System State
        this.grassTufts = [];
        this.grazingActive = false;
        this.nextGrassSproutTime = 0;
        
        // GRASS COUNT PERSISTENCE: Load from localStorage (persists across levels)
        // ENDLESS MODE: Use separate storage to avoid bleeding from main game
        const grassStorageKey = this.isEndlessMode ? 'sheepMarket_endless_grassCount' : 'sheepMarket_grassCount';
        const savedGrassCount = parseInt(localStorage.getItem(grassStorageKey) || '0');
        this.collectedGrassCount = savedGrassCount;
        console.log(`🌱 Grass count loaded: ${this.collectedGrassCount}`);
        
        // Lawn Mower State (Level 3)
        this.lawnMower = null;
        this.lawnMowerSpawned = false;
        this.windGustCount = 0; // Track number of wind gusts in Level 3
        
        // Friendly Dog State (Level 7+)
        this.friendlyDog = null;
        this.dogSpawned = false;
        this.activeDogHerding = null; // Reset dog herding state
        // Level 7: Button unlocks when dog arrives. Level 8+: Button starts unlocked
        this.dogHerdingButtonUnlocked = (this.activeLevel >= 8);
        
        // Black Sheep State (Level 10+)
        this.blackSheep = null;
        this.blackSheepSpawned = false;
        this.blackSheepCollected = false;
        
        // Check localStorage for black sheep button unlock (persists across levels)
        // ENDLESS MODE: Use separate storage
        const blackSheepStorageKey = this.isEndlessMode ? 'sheepMarket_endless_blackSheepUnlocked' : 'sheepMarket_blackSheepUnlocked';
        const blackSheepUnlockedFromStorage = localStorage.getItem(blackSheepStorageKey) === 'true';
        
        // Level 10+: Buttons are automatically unlocked (no spawn needed)
        this.blackSheepButtonUnlocked = (this.activeLevel >= 10);
        
        // BONE COUNT PERSISTENCE: Load from localStorage (persists across levels 7-12)
        // ENDLESS MODE: Use separate storage to avoid bleeding from main game
        const boneStorageKey = this.isEndlessMode ? 'sheepMarket_endless_boneCount' : 'sheepMarket_boneCount';
        const savedBoneCount = parseInt(localStorage.getItem(boneStorageKey) || '0');
        this.collectedBonesCount = savedBoneCount;
        console.log(`🦴 Bone count loaded: ${this.collectedBonesCount}`);
        
        this.bonesList = []; // Track active bone sprites on field
        
        // Wolf Warning State (Level 8+)
        this.wolfWarningActive = false;
        this.nextWolfSpawnSide = null;
        this.wolfWarningBorder = null;
        
        // Gloomy Weather State (Level 2 only)
        this.gloomyWeatherStarted = false;
        
        // Rain State (Level 11)
        this.rainStarted = false;
        this.wetGrassApplied = false;
        
        // Lightning counter (Level 12) - for thunder timing
        this.lightningCount = 0;
        
        // Clean up vignette overlay if it exists (from previous level/retry)
        if (this.vignetteOverlay) {
            this.vignetteOverlay.destroy();
            this.vignetteOverlay = null;
        }
        
        // Store retry flag for create method
        this.forceReset = forceReset;
        
        // Store replay mode and balance snapshot for WOOL preservation
        this.isReplayMode = (data && data.isReplay) || false;
        this.replayBalanceSnapshot = (data && data.replayBalanceSnapshot) || null;
        
        if (this.isReplayMode && this.replayBalanceSnapshot) {
            console.log(`📝 Replay Mode: Balance snapshot = ${this.replayBalanceSnapshot}W`);
        }
    }
    
    changeLevel(targetLevel, extraData = {}) {
        if (targetLevel === this.activeLevel && !extraData.force) return;

        // STOP MUSIC on level change to ensure clean slate
        import('../audio.js').then(({ audioManager }) => {
            audioManager.stopMusic();
        }).catch(e => console.error(e));
        
        // CANCEL DOG BARK TIMER immediately when changing levels
        if (this.activeDogHerding && this.activeDogHerding.nextBarkTimer) {
            this.activeDogHerding.nextBarkTimer.remove();
            console.log('🐕 Dog bark timer cancelled (level change)');
            this.activeDogHerding = null;
        }

        // If this is a manual level replay (not progression/retry), preserve balance for restoration
        if (extraData.isReplay) {
            console.log(`🔄 Entering Level ${targetLevel} as REPLAY - WOOL wallet will be preserved`);
            extraData.replayBalanceSnapshot = this.woolBalance;
        }

        const balanceToPass = extraData.balance !== undefined ? extraData.balance : this.woolBalance;
        console.log(`[GameScene] changeLevel → routing through GameFlowManager: ${this.activeLevel} → ${targetLevel} | ${balanceToPass}W`);

        // Route through GameFlowManager so all transitions go through one place.
        // GameFlowManager.nextLevel handles stop/start; we just hand off the data.
        import('../services/GameFlowManager.js').then(({ gameFlowManager }) => {
            // For replay mode we bypass the normal flow and restart directly
            // (replay is a dev/free-play feature, not a progression event)
            if (extraData.isReplay) {
                this.scene.stop('HUDScene');
                this.scene.restart({
                    balance: balanceToPass,
                    activeLevel: targetLevel,
                    ...extraData
                });
                return;
            }

            // Normal progression – delegate entirely to GameFlowManager
            // (it will stop HUDScene and restart GameScene with correct data)
            if (!gameFlowManager.isTransitioning) {
                gameFlowManager._internalChangeLevelTransition(targetLevel, balanceToPass, extraData);
            }
        }).catch(e => console.error('[GameScene] changeLevel import error:', e));
    }

    // Helper method to play Phaser sounds with mute check
    playSound(key, config = {}) {
        if (audioManager.isSoundMuted) return;
        this.sound.play(key, config);
    }

    /**
     * Play satisfying coin sounds when wool is spent
     * @param {number} amount - Amount of wool spent (affects number of coin sounds)
     */
    playWoolSpendSound(amount = 10) {
        if (audioManager.isSoundMuted) return;
        
        // Calculate number of coins based on amount spent (1-5 coins)
        const numCoins = Math.min(5, Math.max(1, Math.floor(amount / 10) + 1));
        
        // Play coins with slight delays and random pitch variations
        for (let i = 0; i < numCoins; i++) {
            this.time.delayedCall(i * 50, () => {
                // Random pitch between 0.8 and 1.2 for variety
                const pitch = 0.8 + Math.random() * 0.4;
                this.sound.play('coin', { 
                    rate: pitch,
                    volume: 0.4 - (i * 0.05) // Slightly decrease volume for each coin
                });
            });
        }
    }

    create() {
        console.log(`[GameScene] create() – level: ${this.activeLevel} | balance: ${this.woolBalance}W`);
        // Fade in from black to match the end of BootScene
        this.cameras.main.fadeIn(1500, 0, 0, 0);

        // Generate high-resolution soft particle for fireworks and sparkles
        if (!this.textures.exists('sparkle_particle')) {
            const size = 64;
            const pg = this.make.graphics({ x: 0, y: 0, add: false });

            // Create radial gradient style (fake glow)
            for (let i = size / 2; i > 0; i--) {
                const alpha = i / (size / 2);
                pg.fillStyle(0xffffff, alpha * 0.15);
                pg.fillCircle(size / 2, size / 2, i);
            }

            pg.generateTexture('sparkle_particle', size, size);
            pg.destroy();
        }
        
        // Reset camera alpha to full brightness (clears gloomy weather effect from previous level)
        this.cameras.main.setAlpha(1.0);

        // Listen for Auth changes to reload balance.
        // Deferred with a flag so the immediate synchronous callback from
        // onAuthStateChange doesn't fire balance-updated before HUDScene
        // has finished create() and built its text objects.
        let authCallbackReady = false;
        authService.onAuthStateChange(() => {
            if (!authCallbackReady) return;
            this.woolBalance = authService.loadBalance();
            this.events.emit('balance-updated', this.woolBalance);
        });
        // Allow the callback to fire from the next frame onward
        this.time.delayedCall(0, () => { authCallbackReady = true; });
        
        // Listen for sound mute changes to stop/start Phaser sounds
        this.soundMuteListener = (event) => {
            const muted = event.detail.muted;
            if (muted) {
                // Stop all Phaser sounds when muted
                if (this.rainSound && this.rainSound.isPlaying) {
                    this.rainSound.stop();
                }
                if (this.windSound && this.windSound.isPlaying) {
                    this.windSound.stop();
                }
            } else {
                // Restart Phaser sounds when unmuted (if appropriate for current level)
                // Level 12: rain + wind (Phaser sounds)
                if (this.activeLevel === 12 && !this.goldenSheepActivated) {
                    if (this.rainSound && !this.rainSound.isPlaying) {
                        this.rainSound.play('rain_loop');
                    }
                    if (this.windSound && !this.windSound.isPlaying) {
                        this.windSound.play();
                    }
                }
                
                // Level 11: rain (Tone.js) - restart if rain phase has started
                if (this.activeLevel === 11 && this.rainStarted && !this.goldenSheepActivated) {
                    if (audioManager.rainAmbience && audioManager.rainAmbience.loaded) {
                        if (audioManager.rainAmbience.state !== 'started') {
                            audioManager.rainAmbience.start();
                            console.log('🌧️ Level 11: Restarted rain after unmute');
                        }
                    }
                }
                
                // Note: Level 3/4 rain is handled by audioManager.rainAmbience (Tone.js) 
                // which is automatically restarted in audio.js toggleSoundMute()
            }
        };
        window.addEventListener('soundMuteChanged', this.soundMuteListener);
        
        // Full screen pasture
        this.pastureWidth = CONFIG.width; 
        this.pastureHeight = CONFIG.height; 
        const px = 0;
        const py = 0; 

        // Background
        this.bgGraphics = this.add.graphics();
        this.bgGraphics.fillStyle(0x0b0e11, 1);
        this.bgGraphics.fillRect(0, 0, CONFIG.width, CONFIG.height);
        
        // Full Screen Pasture Image
        this.pastureImage = this.add.image(CONFIG.width / 2, CONFIG.height / 2, 'pasture')
            .setDisplaySize(this.pastureWidth, this.pastureHeight);
        
        // LEVEL 3-4: Darken scene for wet look
        if (this.activeLevel >= 3 && this.activeLevel <= 4) {
            this.pastureImage.setTint(0x5a6a5a); // Dark green-gray tint for wet grass
        }
        
        // LEVEL 12: Start with dark/wet scene immediately
        if (this.activeLevel === 12) {
            this.pastureImage.setTint(0x5a6a5a); // Dark green-gray tint for wet grass
            this.wetGrassApplied = true; // Flag as already applied
            console.log('🌧️ LEVEL 12: Starting with dark/wet scene');
        }

        // Particle System for Panic
        // Use the 'panic_particle' texture created in BootScene
        // Phaser 3.60+ Syntax: add.particles(x, y, texture, config)
        this.panicEmitter = this.add.particles(0, 0, 'panic_particle', {
            speed: { min: 50, max: 200 },
            scale: { start: 1.2, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 500,
            gravityY: 0,
            quantity: 2, // Reduced from 4 for better performance
            emitting: false,
            maxParticles: 30 // Limit total particles
        });
        this.panicEmitter.setDepth(9);

        // Golden Sheep Particle Texture
        if (!this.textures.exists('gold_particle')) {
            const pg = this.make.graphics({ x: 0, y: 0, add: false });
            pg.fillStyle(0xffd700, 1);
            pg.fillCircle(4, 4, 4);
            pg.generateTexture('gold_particle', 8, 8);
        }

        // Wolf Eyes Texture
        if (!this.textures.exists('wolf_eyes')) {
            const pg = this.make.graphics({ x: 0, y: 0, add: false });
            pg.fillStyle(0xff0000, 1); // Red glow
            // Left Eye
            pg.fillCircle(4, 4, 4);
            // Right Eye
            pg.fillCircle(20, 4, 4);
            pg.generateTexture('wolf_eyes', 24, 8);
        }

        // Golden Sheep Emitter
        this.goldEmitter = this.add.particles(0, 0, 'gold_particle', {
            speed: { min: 50, max: 100 },
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            gravityY: -50,
            blendMode: 'ADD',
            emitting: false,
            follow: null,
            frequency: 80, // Add frequency control
            maxParticles: 40 // Limit total particles
        });
        this.goldEmitter.setDepth(20);
        
        // Boundaries for sheep - restricted slightly so they don't go under UI panels too much
        // Keeping them mostly in the central view
        this.physics.world.setBounds(50, 150, this.pastureWidth - 100, this.pastureHeight - 400);
        
        // Mid-line marker
        this.add.rectangle(CONFIG.width / 2, CONFIG.height / 2 - 100, 2, this.pastureHeight - 300, 0xffffff, 0.1);

        // Sheep group – count driven by LevelContentController
        const sheepCount = this.levelController.getSheepCount();
        this.activeSheepCount = sheepCount; // store for use in update/settle logic
        console.log(`[GameScene] Sheep count for level ${this.activeLevel}: ${sheepCount}`);

        this.sheep = this.add.group();
        for (let i = 0; i < sheepCount; i++) {
            const s = new Sheep(this,
                Phaser.Math.Between(100, this.pastureWidth - 100),
                Phaser.Math.Between(200, this.pastureHeight - 300)
            );

            // LEVEL 3-4: Make sheep look wet with darker tint
            if (this.activeLevel >= 3 && this.activeLevel <= 4) {
                s.setTint(0x8899aa);
            }

            // LEVEL 12: Start with dark sheep immediately
            if (this.activeLevel === 12) {
                s.setTint(0x8899aa);
            }

            this.sheep.add(s);
        }

        // LEVEL 2: Wolf Group
        this.wolves = this.add.group();
        this.wolfTimer = 0;
        this.wolvesSpawnedCount = 0;
        this.wolfWarningSent = false;
        this.nextWolfSide = null;
        
        // Initialize nextWolfTime based on level rules (consistent with resetRound)
        if (this.activeLevel >= 8) {
             this.nextWolfTime = Phaser.Math.Between(8000, 15000);
        } else {
             this.nextWolfTime = Phaser.Math.Between(15000, 45000);
        }

        // LEVEL 8+: Dog and bone system ready but not visible on pasture
        // Dog only appears when herding ability is activated
        // Bones only appear when wolves eat sheep
        if (this.activeLevel >= 8) {
            this.dogSpawned = true; // Mark system as active (buttons unlocked)
            console.log('🐕 Level 8+ - Dog system ready (will appear on herding activation)');
        }

        // LEVEL 2 WIND LOGIC
        this.windActive = false;
        this.windDirection = 0; // -1 Left, 1 Right
        this.windTimer = 0;
        this.nextWindTime = 56; // First wind at 56s remaining (4s in)
        this.windDuration = 0;
        this.windType = 'normal'; // Types: 'normal', 'gust', 'whirlwind', 'storm'
        this.windIntensity = 1.0;
        this.lastWindDirection = null; // Track last wind direction to ensure variety
        
        // Wind Emitter - Simple wind streaks
        if (!this.textures.exists('wind_particle')) {
            const pg = this.make.graphics({ x: 0, y: 0, add: false });
            pg.fillStyle(0xe8e8e8, 0.8); // Light gray, semi-transparent
            pg.fillRoundedRect(0, 0, 60, 3, 1.5); // Thin horizontal streak
            pg.generateTexture('wind_particle', 60, 3);
        }

        this.windEmitter = this.add.particles(0, 0, 'wind_particle', {
            x: 0,
            y: 0,
            lifespan: 1200,
            speedX: { min: 500, max: 1000 },
            speedY: { min: -20, max: 20 },
            scale: { start: 1.0, end: 0.4 },
            alpha: { start: 0.6, end: 0 },
            quantity: 3, // Reduced from 6 for better performance
            frequency: 100, // Reduced frequency from 70
            emitting: false,
            blendMode: 'ADD',
            tint: 0xffffff,
            maxParticles: 50 // Limit total particles
        });
        this.windEmitter.setDepth(150);
        
        // LEVEL 3+: Rain Particle System
        if (!this.textures.exists('rain_particle')) {
            const pg = this.make.graphics({ x: 0, y: 0, add: false });
            pg.fillStyle(0x88aaff, 0.6);
            pg.fillRect(0, 0, 2, 12); // Vertical raindrop
            pg.generateTexture('rain_particle', 2, 12);
        }
        
        this.rainEmitter = this.add.particles(0, 0, 'rain_particle', {
            x: { min: -100, max: CONFIG.width + 100 },
            y: -50,
            lifespan: 1500,
            speedY: { min: 600, max: 900 },
            speedX: { min: -50, max: 50 },
            scale: { start: 1, end: 0.8 },
            alpha: { start: 0.5, end: 0.2 },
            quantity: (this.activeLevel >= 3 && this.activeLevel <= 4) ? 2 : 0, // Reduced from 3
            frequency: 50, // Add frequency control
            emitting: (this.activeLevel >= 3 && this.activeLevel <= 4),
            blendMode: 'NORMAL',
            maxParticles: 100 // Limit total particles
        });
        this.rainEmitter.setDepth(14);
        
        // ALWAYS stop any existing rain/wind sounds first (cleanup from previous levels)
        if (this.sound.get('rain_ambience')) {
            this.sound.stopByKey('rain_ambience');
        }
        if (this.sound.get('wind_gust')) {
            this.sound.stopByKey('wind_gust');
        }
        if (this.rainSound) {
            this.rainSound.stop();
            this.rainSound.destroy();
            this.rainSound = null;
        }
        if (this.windSound) {
            this.windSound.stop();
            this.windSound.destroy();
            this.windSound = null;
        }
        
        // LEVEL 12: Start with heavy rain immediately
        if (this.activeLevel === 12) {
            // Create heavy rain particle texture
            if (!this.textures.exists('heavy_rain_particle')) {
                const pg = this.make.graphics({ x: 0, y: 0, add: false });
                pg.fillStyle(0xaaccff, 1.0);
                pg.fillRect(0, 0, 3, 20);
                pg.generateTexture('heavy_rain_particle', 3, 20);
                pg.destroy();
            }
            
            // Replace rain emitter with heavy rain
            if (this.rainEmitter) {
                this.rainEmitter.destroy();
            }
            
            this.rainEmitter = this.add.particles(0, 0, 'heavy_rain_particle', {
                x: { min: -100, max: CONFIG.width + 100 },
                y: -50,
                lifespan: 1500,
                speedY: { min: 700, max: 1000 },
                speedX: { min: -50, max: 50 },
                scale: { start: 1.2, end: 1.0 },
                alpha: { start: 0.8, end: 0.4 },
                quantity: 4, // Reduced from 8 for better performance
                frequency: 60, // Add frequency control
                emitting: true,
                blendMode: 'NORMAL',
                maxParticles: 150 // Limit total particles
            });
            this.rainEmitter.setDepth(14);
            this.rainStarted = true;
            
            // Play rain sound with loop and high volume (already cleaned up above)
            // Loop only the first 6 seconds of the audio file
            this.rainSound = this.sound.add('rain_ambience', { 
                loop: true, 
                volume: 1.0  // Full volume
            });
            
            // Add audio marker to loop only first 6 seconds
            this.rainSound.addMarker({
                name: 'rain_loop',
                start: 0,
                duration: 6,
                config: {
                    loop: true
                }
            });
            
            // Play the marker instead of the full sound (with mute check)
            if (!audioManager.isSoundMuted) {
                this.rainSound.play('rain_loop');
            }
            
            // Prevent rain from pausing when window loses focus
            this.sound.pauseOnBlur = false;
            
            console.log('🌧️ LEVEL 12: Rain sound playing via Phaser at FULL VOLUME (6s loop)');
            
            // Also play wind sound immediately (already cleaned up above)
            this.windSound = this.sound.add('wind_gust', {
                loop: true,
                volume: 0.6
            });
            if (!audioManager.isSoundMuted) {
                this.windSound.play();
                console.log('🌪️ LEVEL 12: Wind sound playing via Phaser');
            }
            
            console.log('🌧️ LEVEL 12: Heavy rain started immediately');
        }
        
        // Enable collision between sheep so they don't walk through each other
        // Add process callback to prevent black sheep from colliding with regular sheep
        this.physics.add.collider(this.sheep, this.sheep, null, (body1, body2) => {
            // Prevent collision if either body belongs to the black sheep
            if (this.activeBlackSheep) {
                if (body1.gameObject === this.activeBlackSheep || body2.gameObject === this.activeBlackSheep) {
                    return false; // Skip collision
                }
            }
            return true; // Allow collision
        });
        // Wolves collide with nothing (ghosts/overlay) or maybe scare sheep? 
        // No physics collider needed for fear mechanic, just distance check.

        // ===== CLEAN UP PREVIOUS EVENT LISTENERS =====
        // Remove all event listeners to prevent duplicate registrations
        // CRITICAL: Without this, retrying/restarting adds multiple listeners
        // causing calls to be processed 2x, 3x, 4x times!
        this.events.off('buy-order');
        this.events.off('ability-whistle');
        this.events.off('ability-dog');
        this.events.off('ability-herd-dog');
        this.events.off('ability-blacksheep');
        this.events.off('ability-goldenclover');
        this.events.off('ability-lawnmower');
        this.events.off('enable-grass-selection');
        this.events.off('enable-grass-placement');
        this.events.off('request-next-level');
        this.events.off('request-restart-round');
        this.events.off('set-tutorial-mode');
        this.events.off('global-bleat');
        this.events.off('start-timer');
        
        // Scene events - Register ONCE per scene create
        this.events.on('buy-order', this.handleBuyOrder, this);

        // Start round timer
        // Always paused initially. HUD controls start via 'start-timer' event.
        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: this.tickRound,
            callbackScope: this,
            loop: true,
            paused: true 
        });


        // Listen for timer start signal from HUD
        this.events.on('start-timer', () => {
            console.log('GameScene: Received start-timer event');
            
            // ACTIVATE ROUND LOGIC
            this.roundActive = true;
            
            if (this.timerEvent) {
                this.timerEvent.paused = false;
                console.log('GameScene: Timer unpaused');
            } else {
                console.warn('GameScene: Timer event missing!');
            }

            // Audio Logic - Switch music tracks EXCEPT for Level 9 (which starts on GO!)
            import('../audio.js').then(({ audioManager }) => {
                if (this.activeLevel === 2) {
                    audioManager.switchToLevel2Music();
                } else if (this.activeLevel === 3) {
                    audioManager.switchToLevel3Music();
                } else if (this.activeLevel === 4) {
                    audioManager.switchToLevel4Music();
                } else if (this.activeLevel === 5) {
                    audioManager.switchToLevel5Music();
                } else if (this.activeLevel === 6) {
                    audioManager.switchToLevel6Music();
                } else if (this.activeLevel === 7) {
                    audioManager.switchToLevel7Music();
                } else if (this.activeLevel === 8) {
                    audioManager.switchToLevel8Music();
                } else if (this.activeLevel === 9) {
                    // Level 9: Music starts on GO!, not during countdown
                    console.log('🎵 GameScene start-timer: Level 9 - Music will start on GO!');
                } else if (this.activeLevel === 10) {
                    audioManager.switchToLevel10Music();
                } else if (this.activeLevel === 11) {
                    audioManager.switchToLevel11Music();
                } else if (this.activeLevel === 12) {
                    audioManager.switchToLevel12Music();
                } else if (this.activeLevel >= 13) {
                    // Level 13+: NO MUSIC
                    console.log('🎵 GameScene start-timer: Level 10+ - NO MUSIC');
                } else {
                    audioManager.switchToDefaultMusic();
                }
            }).catch(e => console.error(e));
        });

        // Listen for tutorial mode toggle
        this.events.on('set-tutorial-mode', (isActive) => {
            this.tutorialMode = isActive;
        });

        // Listen for Global Bleat (Visuals)
        this.events.on('global-bleat', () => {
            if (this.sheep) {
                this.sheep.getChildren().forEach(s => {
                    if (s.bleatAnimation) s.bleatAnimation();
                });
            }
        });

        // Listen for HUD commands to control flow
        this.events.on('request-next-level', (data) => {
            this.changeLevel(data.level, data.extra || {});
        });
        
        this.events.on('request-restart-round', () => {
            this.resetRound();
        });

        // Ability Listeners
        this.events.on('ability-whistle', (data) => this.handleRally(data));
        this.events.on('ability-dog', (data) => this.handleDog(data));
        this.events.on('ability-herd-dog', (data) => this.handleHerdDog(data));
        // Black Sheep now uses placement mode - no event listener needed
        this.events.on('ability-goldenclover', (data) => this.handleGoldenClover(data));
        this.events.on('ability-lawnmower', (data) => this.handleLawnMower(data));
        this.events.on('enable-grass-selection', () => this.enableGrassSelectionMode());
        this.events.on('enable-grass-placement', () => this.enableGrassPlacementMode());
        this.events.on('enable-bone-placement', () => this.enableBonePlacementMode());

        // UI Layer - Launch Last to ensure listeners are ready
        const hudData = { 
            balance: this.woolBalance,
            roundTime: this.timeLeft,
            activeLevel: this.activeLevel, // PASS ACTIVE LEVEL TO HUD
            fromGraduation: this.fromGraduation, // Pass transition flag
            isRetrying: this.isRetrying, // Pass the actual retry flag
            sessionStats: this.sessionStats, // Pass carried over stats
            tutorialMode: this.tutorialMode
        };
        
        // ENDLESS MODE: Apply random modifiers and weather effects
        if (this.isEndlessMode && this.endlessConfig) {
            console.log(`🎲 ENDLESS MODE: Applying modifiers for Round ${this.endlessRound}`);
            
            // Apply sheep speed modifier (affects all sheep movement)
            this.sheepSpeedMultiplier = this.endlessConfig.config.sheepSpeed;
            console.log(`  🐑 Sheep speed: ${this.sheepSpeedMultiplier.toFixed(2)}x`);
            
            // Apply market volatility (affects price changes)
            this.marketVolatilityMultiplier = this.endlessConfig.config.marketVolatility;
            console.log(`  📈 Market volatility: ${this.marketVolatilityMultiplier.toFixed(2)}x`);
            
            // Apply weather effects
            if (this.endlessConfig.config.gloomyWeather) {
                console.log(`  🌧️ Gloomy weather enabled`);
                this.time.delayedCall(2000, () => {
                    this.startGloomyWeatherTransition();
                });
            }
            
            if (this.endlessConfig.config.rain) {
                console.log(`  ☔ Rain enabled`);
                this.time.delayedCall(3000, () => {
                    // Start rain if method exists
                    if (this.startRain) {
                        this.startRain();
                    }
                });
            }
            
            if (this.endlessConfig.config.lightning) {
                console.log(`  ⚡ Lightning enabled`);
                // Lightning will trigger randomly during gameplay
                this.lightningEnabled = true;
            }
        }

        // UI Layer - Launch HUDScene fresh every time.
        // Never call scene.restart() on HUDScene from here — it can race with
        // the scene manager and cause a black screen.  Always stop then launch.
        console.log('[GameScene] create() – launching HUDScene with data:', JSON.stringify(hudData));
        if (this.scene.isActive('HUDScene')) {
            this.scene.stop('HUDScene');
        }
        this.scene.launch('HUDScene', hudData);
        
        // PERSISTENCE: Emit initial counts after HUD is ready (persists across levels)
        // Use time.delayedCall to ensure HUD scene has finished initializing
        this.time.delayedCall(100, () => {
            if (this.collectedBonesCount > 0) {
                this.events.emit('bones-collected', this.collectedBonesCount);
                console.log('🦴 Initial bone count emitted:', this.collectedBonesCount);
            }
            
            if (this.collectedGrassCount > 0) {
                const hudScene = this.scene.get('HUDScene');
                if (hudScene && hudScene.updateGrassCount) {
                    hudScene.updateGrassCount(this.collectedGrassCount);
                    console.log('🌱 Initial grass count updated:', this.collectedGrassCount);
                }
            }
        });
    }

    shutdown() {
        // Phaser lifecycle method called when scene is shut down or restarted.
        // CRITICAL: clean up everything that could fire after the scene is gone.

        console.log('[GameScene] shutdown – cleaning up timers, tweens, listeners');
        this.disableGrassPlacementMode();

        // ── Dog bark timer ──────────────────────────────────────────────────
        if (this.activeDogHerding) {
            if (this.activeDogHerding.nextBarkTimer) {
                this.activeDogHerding.nextBarkTimer.remove();
            }
            if (this.activeDogHerding.herdingTimer) {
                this.activeDogHerding.herdingTimer.remove();
            }
            if (this.activeDogHerding.moveTween) {
                this.activeDogHerding.moveTween.stop();
            }
            this.activeDogHerding = null;
            console.log('[GameScene] 🐕 Dog timers cancelled (shutdown)');
        }

        // ── Round timer ─────────────────────────────────────────────────────
        if (this.timerEvent) {
            this.timerEvent.remove(false);
            this.timerEvent = null;
        }

        // ── Wind emitter ────────────────────────────────────────────────────
        if (this.windEmitter) {
            this.windEmitter.stop();
        }

        // ── Rain emitter ────────────────────────────────────────────────────
        if (this.rainEmitter && this.rainEmitter.emitting) {
            this.rainEmitter.stop();
        }

        // ── Audio ───────────────────────────────────────────────────────────
        if (this.rainSound) { this.rainSound.stop(); this.rainSound.destroy(); this.rainSound = null; }
        if (this.windSound) { this.windSound.stop(); this.windSound.destroy(); this.windSound = null; }

        // ── Remove all listeners emitted TO this scene from HUDScene ────────
        // (Phaser removes scene-local listeners automatically, but cross-scene
        //  listeners registered via gameScene.events.on() need explicit removal)
        const eventsToRemove = [
            'buy-order', 'ability-whistle', 'ability-rally', 'ability-dog',
            'ability-herd-dog', 'ability-golden-clover', 'ability-lawn-mower',
            'ability-black-sheep', 'ability-golden-sheep', 'ability-golden-key',
            'enable-grass-selection', 'enable-grass-placement', 'disable-grass-placement',
            'enable-bone-placement', 'disable-bone-placement',
            'request-next-level', 'request-restart-round',
            'set-tutorial-mode', 'start-timer',
            'place-black-sheep', 'collect-black-sheep',
            'place-bone', 'reclaim-bone',
            'place-grass', 'cut-grass',
        ];
        eventsToRemove.forEach(ev => this.events.off(ev));

        // ── Level 12 Specific Timers ────────────────────────────────────────
        if (this.level12Timers) {
            this.level12Timers.forEach(t => {
                if (t && t.remove) t.remove();
            });
            this.level12Timers = [];
        }

        // ── Blanket Safety Kill ─────────────────────────────────────────────
        if (this.time) this.time.removeAllEvents();
        if (this.events) this.events.removeAllListeners();
        if (this.input) this.input.removeAllListeners();
        if (this.tweens) this.tweens.killAll();

        // ── Failsafe UI/Placement Cleanups ──────────────────────────────────
        this.disableGrassPlacementMode();

        // ── Window Listeners ────────────────────────────────────────────────
        if (this.soundMuteListener) {
            window.removeEventListener('soundMuteChanged', this.soundMuteListener);
            this.soundMuteListener = null;
        }

        console.log('[GameScene] ✅ Shutdown complete');
    }

    saveBalance() {
        // Save balance with 2 decimal precision (don't floor - preserve exact wool amount)
        const balanceToSave = parseFloat(this.woolBalance.toFixed(2));
        console.log(`🎮 GameScene saving balance: ${balanceToSave}W (was ${this.woolBalance}W)`);
        authService.saveBalance(balanceToSave);
        
        // Update high score
        const highScore = localStorage.getItem('sheepMarket_highScore') || 0;
        if (this.woolBalance > parseFloat(highScore)) {
            localStorage.setItem('sheepMarket_highScore', this.woolBalance.toFixed(2));
            console.log(`🏆 New high score: ${this.woolBalance.toFixed(2)}W`);
        }
    }

    update(time, delta) {
        // BLACK SHEEP IMMUNITY - OPTIMIZED ENFORCEMENT
        // Only check immune sheep every 100ms instead of every frame
        if (!this._lastImmuneCheck) this._lastImmuneCheck = 0;
        const shouldCheckImmune = (time - this._lastImmuneCheck) > 100;
        
        if (shouldCheckImmune && this.immuneOutlierSheep && this.immuneOutlierSheep.length > 0) {
            this._lastImmuneCheck = time;
            this.immuneOutlierSheep.forEach(sheep => {
                if (sheep && sheep.active && sheep.isImmuneOutlier) {
                    // Check if 15 seconds have elapsed
                    if (sheep.immuneOutlierStartTime && (time - sheep.immuneOutlierStartTime) >= 15000) {
                        // Time to unfreeze this sheep
                        console.log('⏰ 15 seconds elapsed - Restoring sheep to normal (via update loop)');
                        
                        // Remove immune state
                        sheep.isImmuneOutlier = false;
                        sheep.immuneOutlierTintLocked = false;
                        sheep.immuneOutlierStartTime = null;
                        
                        // Remove from tracker
                        const index = this.immuneOutlierSheep.indexOf(sheep);
                        if (index > -1) {
                            this.immuneOutlierSheep.splice(index, 1);
                        }
                        
                        // Restore physics completely
                        if (sheep.body) {
                            sheep.body.setImmovable(false);
                            sheep.body.moves = true;
                            sheep.body.enable = true; // Ensure body is enabled
                            sheep.body.setVelocity(0, 0); // Reset velocity
                            sheep.body.setAcceleration(0, 0); // Reset acceleration
                            sheep.body.setDrag(0); // Reset drag
                            sheep.body.setMaxVelocity(300, 300); // Restore max velocity
                        }
                        
                        // Reset any grazing or other states that might interfere
                        sheep.isGrazing = false;
                        sheep.targetGrassTuft = null;
                        
                        // Add immunity to re-conversion for 5 seconds
                        sheep.immuneToBlackSheep = true;
                        this.time.delayedCall(5000, () => {
                            if (sheep && sheep.active) {
                                sheep.immuneToBlackSheep = false;
                            }
                        });
                        
                        // Clear black tint and restore normal appearance
                        sheep.clearTint();
                        
                        // Apply appropriate tint based on current level conditions
                        if (this.goldenSheepActivated && this.activeLevel === 12) {
                            sheep.setTint(0xffffff);
                        } else if ((this.activeLevel === 11 || this.activeLevel === 12) && this.wetGrassApplied) {
                            sheep.setTint(0x9db3a8);
                            sheep.setAlpha(0.85);
                        } else {
                            sheep.setTint(0xffffff);
                            sheep.setAlpha(1.0);
                        }
                        
                        // Flash to indicate restoration
                        this.tweens.add({
                            targets: sheep,
                            alpha: { from: 0.3, to: sheep.alpha },
                            duration: 300,
                            ease: 'Quad.easeOut'
                        });
                        
                        console.log(`✅ Sheep restored to normal. Remaining immune sheep: ${this.immuneOutlierSheep.length}`);
                        return; // Skip the enforcement below since we just unfroze
                    }
                    
                    // Re-lock black tint every frame
                    if (sheep.tintTopLeft !== 0x0a0a0a) {
                        sheep.setTint(0x0a0a0a);
                    }
                    // Re-lock full opacity
                    if (sheep.alpha !== 1.0) {
                        sheep.setAlpha(1.0);
                    }
                    // Re-lock frozen state
                    if (sheep.body.moves !== false) {
                        sheep.body.moves = false;
                    }
                    if (sheep.body.velocity.x !== 0 || sheep.body.velocity.y !== 0) {
                        sheep.body.setVelocity(0, 0);
                    }
                }
            });
        }
        
        // LEVEL 12 GOLDEN SHEEP BRIGHTNESS LOCK - OPTIMIZED
        // Only check tints every 200ms instead of every frame
        if (!this._lastTintCheck) this._lastTintCheck = 0;
        const shouldCheckTints = (time - this._lastTintCheck) > 200;
        
        if (shouldCheckTints && this.goldenSheepActivated && this.activeLevel === 12) {
            this._lastTintCheck = time;
            this.sheep.getChildren().forEach(sheep => {
                if (sheep && sheep.active && !sheep.isImmuneOutlier) {
                    // FORCE normal brightness (non-immune sheep only)
                    if (sheep.tintTopLeft !== 0xffffff) {
                        sheep.clearTint();
                        sheep.setTint(0xffffff);
                    }
                    if (sheep.alpha !== 1.0) {
                        sheep.setAlpha(1.0);
                    }
                }
            });
        }
        
        // Update lightning timer (Level 12 only)
        if (this.activeLevel === 12 && this.roundActive && this.lightningTimer !== undefined) {
            this.lightningTimer += delta;
        }
        
        // LEVEL 12: Ensure rain sound keeps looping - check every 500ms
        if (!this._lastSoundCheck) this._lastSoundCheck = 0;
        if ((time - this._lastSoundCheck) > 500) {
            this._lastSoundCheck = time;
            if (!this.goldenSheepActivated && this.activeLevel === 12 && this.rainSound && !this.rainSound.isPlaying && !audioManager.isSoundMuted) {
                this.rainSound.play('rain_loop');
            }
            if (!this.goldenSheepActivated && this.activeLevel === 12 && this.windSound && !this.windSound.isPlaying && !audioManager.isSoundMuted) {
                this.windSound.play();
            }
        }
        
        // Calculate distribution first for Level 1 logic
        const leftCount = this.sheep.getChildren().filter(s => s.x < CONFIG.width / 2).length;
        const ratio = leftCount / this.activeSheepCount;

        // Always update sheep so animations and victory march work
        // If round is inactive, pass 0 drift and 0 time
        let drift = this.roundActive ? this.marketDrift : 0;
        
        // ANTI-BUNCHING SYSTEM (All Levels)
        // Prevent sheep from staying bunched on one side for more than 2 seconds
        // Skip during final trend lock (last 5 seconds)
        if (this.roundActive && this.timeLeft > 5) {
            const isBunched = ratio < 0.2 || ratio > 0.8; // Less than 20% or more than 80% on one side
            
            if (isBunched) {
                const currentBunchSide = ratio < 0.5 ? 'RIGHT' : 'LEFT';
                
                // If same side as before, increment timer
                if (currentBunchSide === this.lastBunchSide) {
                    this.bunchTimer += delta;
                } else {
                    // New bunch side, reset timer
                    this.bunchTimer = delta;
                    this.lastBunchSide = currentBunchSide;
                }
                
                // If bunched for more than 2 seconds, apply corrective force
                if (this.bunchTimer > 2000) {
                    const correctionForce = 400; // Strong push to spread them out
                    drift = currentBunchSide === 'LEFT' ? correctionForce : -correctionForce;
                }
            } else {
                // Not bunched, reset tracking
                this.bunchTimer = 0;
                this.lastBunchSide = null;
            }
        }
        
        // LEVEL 1 ONLY: Physical constraints to keep price "Easy" (2W-8W range)
        // We push them back if they get too close to the edges (22% and 78%)
        // This ensures they stay mostly in the 2W-8W range without getting stuck in a clamped "dead zone"
        if (this.activeLevel === 1 && this.roundActive) {
            // If < 25% Left (Approaching 2W limit), push Left to recover balance
            if (ratio < 0.25) {
                drift = -300; // Stronger push
            } 
            // If > 75% Left (Approaching 8W limit), push Right to recover balance
            else if (ratio > 0.75) {
                drift = 300; // Stronger push
            }
        }

        // FINAL TREND LOCK (Last 5 Seconds)
        // Force sheep to commit to the winning side early to avoid last-second flips.
        // They must be 100% settled by T-3, so we start the push at T-5.
        if (this.roundActive && this.timeLeft <= 5) {
            if (!this.finalTrendSide) {
                // Latch the winner based on current majority
                // If tie, default to RIGHT (House Advantage? Or Random? Let's go with pure majority check)
                // Use >= for 50/50 split going Left? Or just strict majority?
                // Using >= 50% for Left to favor Left in ties (Reading direction)
                this.finalTrendSide = leftCount >= (this.activeSheepCount / 2) ? 'LEFT' : 'RIGHT';
            }

            // Apply massive drift force to sweep them to the chosen side
            // 800 is enough to cross the screen in ~1.5s
            const force = 800;
            drift = (this.finalTrendSide === 'LEFT') ? -force : force;
        }

        const remaining = this.roundActive ? this.timeLeft : 0;
        
        this.sheep.getChildren().forEach(s => {
            // ZOMBIE SHEEP: COMPLETELY FROZEN - no movement, no interactions
            if (s.isZombified) {
                // FREEZE IN PLACE - no movement allowed
                s.body.setVelocity(0, 0);
                
                // Update aura position (visual only)
                if (s.zombieAura) {
                    s.zombieAura.setPosition(s.x, s.y);
                }
                
                return; // Skip ALL normal updates for zombified sheep
            }
            
            s.update(time, drift, remaining, CONFIG.roundTime, this.activeLevel, this.mudActive);
            
            // NEW MUD SYSTEM: Simple footprint trails
            if (this.mudActive && s.active && !s.isEaten) {
                const speed = Math.sqrt((s.body?.velocity?.x || 0) ** 2 + (s.body?.velocity?.y || 0) ** 2);
                
                // Create footprint marks when moving
                if (speed > 30) {
                    // Throttle footprints - one every 150ms
                    if (!s.lastFootprintTime || time - s.lastFootprintTime > 150) {
                        this.createMudFootprint(s.x, s.y, s.facingRight);
                        s.lastFootprintTime = time;
                    }
                }
            }
        });

        // Update Wolves (only when wolves system is enabled for this level)
        if (this.levelController.isEnabled('wolves')) {
            this.updateWolves(time, delta);
        }

        // Update Friendly Dog (Level 7 introduction dog)
        if (this.levelController.isEnabled('friendlyDog') && this.friendlyDog && this.friendlyDog.active) {
            this.friendlyDog.update(time, delta, this.sheep);
        }

        // Update Black Sheep roaming and zombie effect
        // Check if black sheep is active (either from level config or manually placed via ability)
        if (this.activeBlackSheep && this.activeBlackSheep.active) {
            this.updateBlackSheepRoaming(time, delta);
            this.activeBlackSheep.update(time, this.sheep);
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // HERDING DOG BEHAVIOR - CLEAN REBUILD
        // 
        // RULES:
        // - Only TWO states: CHASING_WOLF or HERDING
        // - Wolf chase COMPLETELY disables herding (hard return)
        // - Facing is based ONLY on movement direction, not target position
        // - No rapid flipping, no backward movement, no overlap
        // ═══════════════════════════════════════════════════════════════════════
        if (this.activeDogHerding) {
            const { dog, hudScene, obeyingSheep, disobeyingSheep, stopHerding } = this.activeDogHerding;
            
            // AUTO-STOP: Timer at 5 seconds or less
            if (this.timeLeft <= 5) {
                console.log('🐕 Auto-stopping herding: timer at 5 seconds');
                stopHerding();
                return;
            }
            
            // Initialize state machine
            if (!this.activeDogHerding.dogState) {
                this.activeDogHerding.dogState = {
                    mode: 'HERDING', // 'HERDING' or 'CHASING_WOLF'
                    facing: 'LEFT', // Current sprite facing
                    lastX: dog.x,
                    lastY: dog.y,
                    targetWolf: null
                };
                dog.setFlipX(false); // Start facing left (natural sprite orientation)
            }
            
            const state = this.activeDogHerding.dogState;
            const bounds = { left: 100, right: CONFIG.width - 100, top: 150, bottom: 700 };
            
            // ═══════════════════════════════════════════════════════════════════
            // STATE DETERMINATION: Wolf visible in pasture? → CHASING_WOLF, otherwise → HERDING
            // ═══════════════════════════════════════════════════════════════════
            const wolves = this.wolves.getChildren();
            const activeWolf = wolves.find(w => w.active && !w.isEaten && !w.isExiting);
            
            // Only chase wolf if it's VISIBLE inside the pasture bounds
            const wolfIsVisible = activeWolf && 
                                  activeWolf.x >= bounds.left && 
                                  activeWolf.x <= bounds.right &&
                                  activeWolf.y >= bounds.top && 
                                  activeWolf.y <= bounds.bottom;
            
            if (wolfIsVisible) {
                // WOLF EXISTS → FORCE CHASING_WOLF MODE
                if (state.mode !== 'CHASING_WOLF') {
                    console.log('🐕 WOLF DETECTED → CHASING_WOLF MODE');
                    state.mode = 'CHASING_WOLF';
                    state.targetWolf = activeWolf;
                }
                
                const wolf = activeWolf;
                
                // Calculate vector to wolf
                const toWolfX = wolf.x - dog.x;
                const toWolfY = wolf.y - dog.y;
                const distToWolf = Math.sqrt(toWolfX * toWolfX + toWolfY * toWolfY);
                
                const separationDistance = 120;
                const chaseSpeed = 500;
                
                // Only move if far from wolf
                if (distToWolf > separationDistance) {
                    const normalizedX = toWolfX / distToWolf;
                    const normalizedY = toWolfY / distToWolf;
                    
                    dog.x += normalizedX * chaseSpeed * (delta / 1000);
                    dog.y += normalizedY * chaseSpeed * (delta / 1000);
                    
                    // Clamp to bounds
                    dog.x = Phaser.Math.Clamp(dog.x, bounds.left, bounds.right);
                    dog.y = Phaser.Math.Clamp(dog.y, bounds.top, bounds.bottom);
                    
                    // DOG FACES MOVEMENT DIRECTION
                    // Dog sprite naturally faces LEFT, so flip it to face RIGHT
                    if (normalizedX > 0.1) {
                        dog.setFlipX(true); // Moving right - FLIP to face right
                        state.facing = 'RIGHT';
                    } else if (normalizedX < -0.1) {
                        dog.setFlipX(false); // Moving left - NO FLIP, natural left
                        state.facing = 'LEFT';
                    }
                } else {
                    // At separation distance - STOP MOVING, just face wolf
                    const wolfIsRight = wolf.x > dog.x;
                    dog.setFlipX(wolfIsRight); // Face toward wolf
                    state.facing = wolfIsRight ? 'RIGHT' : 'LEFT';
                }
                
                // Wolf flees ONLY when dog is close
                if (wolf.body && distToWolf < 250) {
                    // Calculate distances to each edge
                    const distToLeft = wolf.x - bounds.left;
                    const distToRight = bounds.right - wolf.x;
                    const distToTop = wolf.y - bounds.top;
                    const distToBottom = bounds.bottom - wolf.y;
                    
                    // Find nearest edge
                    const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
                    
                    let escapeX = 0;
                    let escapeY = 0;
                    
                    // Move toward nearest edge
                    if (minDist === distToLeft) {
                        escapeX = -1;
                    } else if (minDist === distToRight) {
                        escapeX = 1;
                    } else if (minDist === distToTop) {
                        escapeY = -1;
                    } else {
                        escapeY = 1;
                    }
                    
                    // Pure escape to edge
                    const fleeSpeed = 500;
                    wolf.body.setVelocity(
                        escapeX * fleeSpeed,
                        escapeY * fleeSpeed
                    );
                    
                    // Mark as exiting when near edge
                    if (minDist < 50) {
                        wolf.isExiting = true;
                    }
                    
                    // Destroy wolf when it exits pasture
                    if (wolf.x < bounds.left - 100 || wolf.x > bounds.right + 100 ||
                        wolf.y < bounds.top - 100 || wolf.y > bounds.bottom + 100) {
                        wolf.destroy();
                    }
                }
                
                dog.setDepth(200);
                dog.setScale(0.15);
                
                // CRITICAL: Return immediately - IGNORE ALL SHEEP
                return;
            }
            
            // NO WOLF EXISTS → Return to herding
            if (state.mode === 'CHASING_WOLF') {
                console.log('🐕 WOLF GONE → HERDING MODE');
                state.mode = 'HERDING';
                state.targetWolf = null;
            }
            
            // ═══════════════════════════════════════════════════════════════════
            // STATE: HERDING (Default - Only active when NO wolf present)
            // ═══════════════════════════════════════════════════════════════════
            if (state.mode === 'HERDING') {
                const herdDirection = this.finalCallSide || 'RIGHT';
                const herdableSheep = obeyingSheep.filter(s => s.active && !s.isEaten);
                
                if (herdableSheep.length === 0) {
                    dog.setDepth(200);
                    dog.setScale(0.15);
                    return;
                }
                
                // Calculate sheep center of mass
                let sheepCenterX = 0;
                let sheepCenterY = 0;
                herdableSheep.forEach(s => {
                    sheepCenterX += s.x;
                    sheepCenterY += s.y;
                });
                sheepCenterX /= herdableSheep.length;
                sheepCenterY /= herdableSheep.length;
                
                // Dog positions BEHIND sheep (opposite side of herd direction)
                const pushDistance = 200;
                let targetX;
                
                if (herdDirection === 'LEFT') {
                    // Push left: dog on right side of sheep
                    targetX = sheepCenterX + pushDistance;
                } else {
                    // Push right: dog on left side of sheep
                    targetX = sheepCenterX - pushDistance;
                }
                const targetY = sheepCenterY;
                
                // Clamp target position
                const clampedTargetX = Phaser.Math.Clamp(targetX, bounds.left, bounds.right);
                const clampedTargetY = Phaser.Math.Clamp(targetY, bounds.top, bounds.bottom);
                
                // Calculate movement vector
                const toTargetX = clampedTargetX - dog.x;
                const toTargetY = clampedTargetY - dog.y;
                const distToTarget = Math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY);
                
                const moveSpeed = 280;
                
                // Calculate intended movement
                let moveX = 0;
                let moveY = 0;
                
                if (distToTarget > 20) {
                    const normalizedX = toTargetX / distToTarget;
                    const normalizedY = toTargetY / distToTarget;
                    
                    moveX = normalizedX * moveSpeed * (delta / 1000);
                    moveY = normalizedY * moveSpeed * (delta / 1000);
                    
                    // Apply movement
                    dog.x += moveX;
                    dog.y += moveY;
                    
                    // Clamp to bounds
                    dog.x = Phaser.Math.Clamp(dog.x, bounds.left, bounds.right);
                    dog.y = Phaser.Math.Clamp(dog.y, bounds.top, bounds.bottom);
                }
                
                // UPDATE FACING BASED ON SHEEP CENTER (HERDING MODE)
                const sheepAreRight = sheepCenterX > dog.x;
                dog.setFlipX(sheepAreRight);
                state.facing = sheepAreRight ? 'RIGHT' : 'LEFT';
                
                dog.setDepth(200);
                dog.setScale(0.15);
                
                // ═══════════════════════════════════════════════════════════════
                // SHEEP RESPONSE TO DOG PRESSURE
                // ═══════════════════════════════════════════════════════════════
                const pressureRadius = 300;
                const strongPressureRadius = 150;
                const minSeparation = 70;
                
                const allSheep = [...obeyingSheep, ...disobeyingSheep];
                
                allSheep.forEach(s => {
                    if (!s.active || s.isEaten) return;
                    
                    const toSheepX = s.x - dog.x;
                    const toSheepY = s.y - dog.y;
                    const distToSheep = Math.sqrt(toSheepX * toSheepX + toSheepY * toSheepY);
                    
                    // Hard separation (prevent overlap)
                    if (distToSheep < minSeparation && distToSheep > 0) {
                        const separationX = (toSheepX / distToSheep) * (minSeparation - distToSheep);
                        const separationY = (toSheepY / distToSheep) * (minSeparation - distToSheep);
                        s.x += separationX;
                        s.y += separationY;
                    }
                    
                    // Sheep movement response
                    if (distToSheep < pressureRadius) {
                        const fleeX = toSheepX / distToSheep;
                        const fleeY = toSheepY / distToSheep;
                        
                        const callX = herdDirection === 'LEFT' ? -1 : 1;
                        const callY = 0;
                        
                        let blendedX, blendedY, speed;
                        
                        if (s.isObeyingDog) {
                            // Obeying: 90% call direction, 10% flee
                            blendedX = callX * 0.9 + fleeX * 0.1;
                            blendedY = callY * 0.9 + fleeY * 0.1;
                            speed = distToSheep < strongPressureRadius ? 450 : 350;
                        } else {
                            // Disobeying: 65% call direction, 35% flee
                            blendedX = callX * 0.65 + fleeX * 0.35;
                            blendedY = callY * 0.65 + fleeY * 0.35;
                            speed = distToSheep < strongPressureRadius ? 400 : 300;
                        }
                        
                        const magnitude = Math.sqrt(blendedX * blendedX + blendedY * blendedY);
                        if (magnitude > 0) {
                            const finalVelX = (blendedX / magnitude) * speed;
                            const finalVelY = (blendedY / magnitude) * speed;
                            
                            s.reactToMarket(finalVelX, finalVelY, 800);
                        }
                    }
                });
            }
        }
        
        // Update Grazing System (gated by LevelContentController)
        if (this.levelController.isEnabled('grazing') && this.grazingActive && time >= this.nextGrassSproutTime) {
            this.spawnGrassTufts();
        }

        if (!this.roundActive) return;

        // --- WIND MECHANIC ---
        // Gated by LevelContentController; existing level-specific sub-rules
        // (e.g. Level 4 stops wind after T=55) are preserved inside the block.
        const allowWind = this.levelController.isEnabled('wind') &&
            (this.activeLevel < 4 || this.timeLeft > 55); // Level 4: clears at T=55

        if (allowWind) {
             // 1. Trigger Check
             // timeLeft ticks DOWN. So we check if timeLeft <= nextWindTime
             // Ensure we don't trigger multiple times in the same second by checking !windActive
             // And ensuring we haven't passed it too long ago (e.g. paused) - simplified: just use == check or similar in tick, 
             // but here in update we can check ranges.
             
             // Check if we hit the trigger time (and haven't missed it significantly)
             if (!this.windActive && this.timeLeft <= this.nextWindTime && this.timeLeft > this.nextWindTime - 2) {
                 this.startWindEvent();
             }

             // 2. Active Logic
             if (this.windActive) {
                 // Check duration
                 if (time > this.windEndTime) {
                     this.stopWindEvent();
                 } else {
                     // APPLY WIND FORCE (Varies by type)
                     this.applyWindForce(delta);
                 }
             }
        }

        // Ability Timer Check
        if (this.obedienceBoostActive && time > this.obedienceBoostEndTime) {
            this.obedienceBoostActive = false;
        }

        // Market Fatigue Decay: Recovers over time (approx 1.0 per second)
        if (this.marketFatigue > 0) {
            this.marketFatigue = Math.max(0, this.marketFatigue - (delta / 1000));
        }

        // Dynamic Market Drift: Higher volatility
        if (time > this.driftChangeTime) {
            // Check for final moments (last 15 seconds) for extreme volatility
            const isPanicMode = this.timeLeft <= 15;
            let range = isPanicMode ? 450 : 250; 
            
            // LEVEL 2: Higher base volatility
            if (this.activeLevel >= 2) range += 200;

            this.marketDrift = Phaser.Math.Between(-range, range); 
            
            // Rapid changes in panic mode
            const nextChange = isPanicMode ? Phaser.Math.Between(500, 1500) : Phaser.Math.Between(2000, 5000);
            this.driftChangeTime = time + nextChange;
        }

        // LEVEL 7 ONLY: Friendly Dog Event (Level 8+ dog is already spawned at start)
        const currentLevel = parseInt(this.activeLevel);
        
        // Check if player is in free play mode (skip asset introductions)
        const inFreePlayMode = localStorage.getItem('sheepMarket_goldenKeyActivated') === 'true' && 
                                localStorage.getItem('sheepMarket_allLevelsUnlocked') === 'true';
        
        // FRIENDLY DOG introduction spawn (Level 7 one-shot)
        // Level 8+ dog is pre-spawned at level start, not via this gate.
        if (this.levelController.isEnabled('friendlyDog') && this.roundActive && !this.dogSpawned && !inFreePlayMode) {
            if (this.timeLeft <= 50) {
                this.spawnFriendlyDog();
                this.dogSpawned = true;
            }
        }
        
        // BLACK SHEEP spawn - DISABLED
        // Black sheep and golden clover buttons are now auto-unlocked at Level 10+
        // No spawn animation needed
        
        // GOLDEN SHEEP "LET THERE BE LIGHT" EVENT (Level 12 WIN ONLY)
        // ❌ NO LONGER spawns during countdown
        // ✅ NOW spawns ONLY on Level 12 victory (see celebrateLevel12Victory)
        // This section intentionally left empty
        
        // LEVEL 11 WEATHER SYSTEM - Integrated into tickRound()
        // Rain starts at 45s, wet grass at 30s, mud at 25s
        
        // WOLF SPAWNER – gated by LevelContentController
        // Advanced config (max, warningDuration) is read from the controller.
        if (this.levelController.isEnabled('wolves') && this.roundActive) {
            this.wolfTimer += delta;

            const wolfCfg         = this.levelController.get('wolves');
            const maxWolves       = typeof wolfCfg === 'object' ? wolfCfg.max           : (currentLevel === 8 ? 1 : currentLevel === 9 ? 2 : currentLevel === 12 ? 15 : 4);
            const warningDuration = typeof wolfCfg === 'object' ? wolfCfg.warningDuration : (currentLevel === 12 ? 2000 : 8000);
            
            // Only proceed if we haven't hit the cap
            if (this.wolvesSpawnedCount < maxWolves) {
                // WARNING PHASE - before wolf spawns
                const warningTime = this.nextWolfTime - warningDuration;
                if (this.wolfTimer > warningTime && !this.wolfWarningActive) {
                    // Level 9: Predetermined sides for 2 wolves (first from LEFT, second from RIGHT)
                    if (currentLevel === 9) {
                        this.nextWolfSpawnSide = (this.wolvesSpawnedCount === 0) ? 'LEFT' : 'RIGHT';
                    } else {
                        // Other levels: Random side selection
                        this.nextWolfSpawnSide = Math.random() < 0.5 ? 'LEFT' : 'RIGHT';
                    }
                    
                    // Play wolf howl sound when red border appears
                    // LEVEL 12: Only play howl for every third wolf (wolves 3, 6, 9, etc.)
                    const shouldPlayHowl = (currentLevel !== 12) || ((this.wolvesSpawnedCount + 1) % 3 === 0);
                    
                    if (shouldPlayHowl) {
                        console.log(`🐺 Playing wolf howl warning sound (wolf #${this.wolvesSpawnedCount + 1})`);
                        audioManager.playWolfHowl();
                    } else {
                        console.log(`🐺 Wolf #${this.wolvesSpawnedCount + 1} - no howl (silent warning)`);
                    }
                    
                    // Show glowing red border on spawn side
                    this.showWolfWarningBorder(this.nextWolfSpawnSide);
                    
                    this.wolfWarningActive = true;
                }
                
                // SPAWN PHASE - Actual wolf spawn
                if (this.wolfTimer > this.nextWolfTime) {
                    this.spawnWolf(this.nextWolfSpawnSide);
                    this.wolvesSpawnedCount++;
                    this.wolfTimer = 0;
                    this.wolfWarningActive = false;
                    
                    // Hide warning border
                    this.hideWolfWarningBorder();
                    
                    // Setup next wolf time if we have spawns left
                    if (this.wolvesSpawnedCount < maxWolves) {
                        // Level 9: Specific timing for 2 wolves (first at ~20s, second at ~40s)
                        if (currentLevel === 9) {
                            if (this.wolvesSpawnedCount === 1) {
                                // Second wolf spawns 20 seconds after first
                                this.nextWolfTime = 20000;
                            }
                        } else if (currentLevel === 12) {
                            // Level 12: ABSOLUTE MADNESS - Wolves spawn every 3-5 seconds!
                            this.nextWolfTime = Phaser.Math.Between(3000, 5000);
                            console.log(`🐺 LEVEL 12 MADNESS: Next wolf in ${this.nextWolfTime/1000}s (${this.wolvesSpawnedCount}/15 spawned)`);
                        } else {
                            // For Level 10-11: Wolves come in waves (10-15s intervals to fit 4 in 60s)
                            this.nextWolfTime = Phaser.Math.Between(10000, 15000);
                        }
                    } else {
                        // No more wolves this round
                        this.nextWolfTime = 999999;
                        if (currentLevel === 12) {
                            console.log('🐺💀 LEVEL 12 MADNESS: Maximum wolves reached (15/15) - THE WOLF HORDE IS COMPLETE!');
                        }
                    }
                }
            }
        }

        // Calculate PRICES based on sheep distribution
        // (leftCount is already calculated at top of function)
        const rightCount = this.activeSheepCount - leftCount;

        // LEFT_price = (sheep_on_left / total) * 10
        // RIGHT_price = (sheep_on_right / total) * 10
        let leftPrice = (leftCount / this.activeSheepCount) * 10;
        let rightPrice = (rightCount / this.activeSheepCount) * 10;
        
        // TUTORIAL CLAMP: Keep prices in reasonable range for Level 1
        if (this.tutorialMode) {
            leftPrice = Phaser.Math.Clamp(leftPrice, 1, 9);
            rightPrice = Phaser.Math.Clamp(rightPrice, 1, 9);
        }

        this.events.emit('update-market', {
            leftPrice: leftPrice,
            rightPrice: rightPrice,
            timeLeft: this.timeLeft,
            fatigue: this.marketFatigue,
            finalCallSide: this.finalCallSide, // Pass the final call side
            sheepLeft: leftCount, // NEW: Sheep on left
            sheepRight: rightCount // NEW: Sheep on right
        });

        // GOLDEN SHEEP random trigger (gated by LevelContentController)
        if (this.levelController.isEnabled('goldenSheep') && this.roundActive && !this.goldenSheepActive && this.goldenSheepTriggerTime !== null) {
            // triggerTime is absolute game time set in resetRound
            if (time > this.goldenSheepTriggerTime) {
                this.triggerGoldenSheep();
            }
        }
        
        // Update Golden Emitter if active
        if (this.goldenSheepActive) {
             if (this.goldenSheepTarget && this.goldenSheepTarget.active) {
                 // Emitter follows automatically via startFollow
             } else {
                 // Lost target
                 this.goldEmitter.stop();
                 this.goldenSheepActive = false;
             }
        }
    }
    
    startWindEvent() {
        this.windActive = true;
        
        // LEVEL 3-4 & 11-12: Advanced Storm Types
        if ((this.activeLevel >= 3 && this.activeLevel <= 4) || this.activeLevel === 11 || this.activeLevel === 12) {
            const roll = Math.random();
            
            // LEVEL 3: Force gust/storm types for lawn mower guarantee
            if (this.activeLevel === 3 && this.windGustCount < 2) {
                // First two winds in Level 3 MUST be gust or storm to ensure lawn mower spawns
                if (roll < 0.6) {
                    this.windType = 'gust'; // Quick bursts (60% for first two)
                } else {
                    this.windType = 'storm'; // Sustained powerful wind (40% for first two)
                }
            } else {
                // Normal distribution for Level 3 after lawn mower spawn, Level 4, or Level 11-12
                if (roll < 0.3) {
                    this.windType = 'gust'; // Quick bursts
                } else if (roll < 0.5) {
                    this.windType = 'whirlwind'; // Bidirectional chaos
                } else if (roll < 0.65) {
                    this.windType = 'storm'; // Sustained powerful wind
                } else {
                    this.windType = 'normal';
                }
            }
        } else {
            this.windType = 'normal';
        }
        
        // Random Direction (with variety logic for Level 2 and Level 3 lawn mower)
        if (this.activeLevel === 2 && this.lastWindDirection !== null) {
            // Level 2: Alternate wind direction to ensure bidirectional variety
            this.windDirection = this.lastWindDirection * -1; // Flip direction from last time
            console.log(`🌪️ LEVEL 2: Wind alternating - now blowing ${this.windDirection === 1 ? 'RIGHT (from left)' : 'LEFT (from right)'}`);
        } else if (this.activeLevel === 3 && this.windGustCount === 1 && !this.lawnMowerSpawned) {
            // Level 3: FORCE second wind gust to come from LEFT (windDirection = 1 means blowing right FROM left)
            this.windDirection = 1; // Blowing RIGHT (from left side) - brings lawn mower with it
            console.log(`🌪️ LEVEL 3: Second wind gust FORCED from LEFT to bring lawn mower`);
        } else {
            // All other levels: Random direction
            this.windDirection = Math.random() < 0.5 ? -1 : 1; // Left or Right
        }
        
        // Save direction for next wind (Level 2 alternation)
        this.lastWindDirection = this.windDirection;
        
        // Duration & Intensity varies by type
        let duration, intensity, particleQuantity, particleSpeed;
        
        switch(this.windType) {
            case 'gust':
                // Short powerful bursts
                duration = Phaser.Math.Between(1000, 2000);
                intensity = 1.8;
                particleQuantity = 8; // More visible
                particleSpeed = { min: 800, max: 1400 };
                break;
            case 'whirlwind':
                // Chaotic swirling (changes direction mid-way)
                duration = Phaser.Math.Between(4000, 6000);
                intensity = 1.3;
                particleQuantity = 6; // More visible
                particleSpeed = { min: 600, max: 1200 };
                this.windSwapTime = this.time.now + (duration / 2); // Swap halfway
                break;
            case 'storm':
                // Long sustained wind
                duration = Phaser.Math.Between(6000, 9000);
                intensity = 1.5;
                particleQuantity = 10; // More visible
                particleSpeed = { min: 700, max: 1300 };
                break;
            default: // normal
                duration = Phaser.Math.Between(2000, 5000);
                intensity = 1.0;
                particleQuantity = 5; // More visible (was 2)
                particleSpeed = { min: 500, max: 1000 };
        }
        
        this.windIntensity = intensity;
        this.windEndTime = this.time.now + duration;
        
        // LEVEL 11-12: Play wind sound effect
        if (this.activeLevel === 11 || this.activeLevel === 12) {
            if (this.sound.get('wind_gust')) {
                this.playSound('wind_gust', { volume: 0.3 });
                console.log(`🌪️ LEVEL ${this.activeLevel}: Wind sound played`);
            }
        }
        
        // Visuals - Enhanced wind particle configuration
        if (this.windEmitter) {
            // Stop any existing emission first
            this.windEmitter.stop();
            
            // Adjust particle speed to match direction
            const minS = particleSpeed.min * this.windDirection;
            const maxS = particleSpeed.max * this.windDirection;
            
            // Spawn from correct side with proper positioning
            let spawnX, spawnY, spawnWidth, spawnHeight;
            if (this.windDirection === 1) { // Blowing Right -> Spawn Left
                spawnX = 0;
                spawnY = 200;
                spawnWidth = 50;
                spawnHeight = CONFIG.height - 400;
            } else { // Blowing Left -> Spawn Right
                spawnX = CONFIG.width - 50;
                spawnY = 200;
                spawnWidth = 50;
                spawnHeight = CONFIG.height - 400;
            }
            
            // Update emitter configuration for this wind event
            this.windEmitter.setConfig({
                x: { min: spawnX, max: spawnX + spawnWidth },
                y: { min: spawnY, max: spawnY + spawnHeight },
                speedX: { min: Math.min(minS, maxS), max: Math.max(minS, maxS) },
                speedY: { min: -20, max: 20 },
                quantity: particleQuantity,
                lifespan: 1200,
                scale: { start: 1.0, end: 0.4 },
                alpha: { start: 0.6, end: 0 },
                frequency: 70,
                blendMode: 'ADD'
            });
            
            // Start the emitter
            this.windEmitter.start();
            
            // Debug log to verify wind setup
            console.log(`🌪️ Wind particles ACTIVE: direction=${this.windDirection === 1 ? '→ RIGHT' : '← LEFT'}, quantity=${particleQuantity}, speed=${Math.min(minS, maxS)} to ${Math.max(minS, maxS)}, spawning at x=${spawnX}-${spawnX+spawnWidth}`);
        }
        
        // HUD Notification for Level 3+ storm types
        // Removed all storm notifications for Level 3 (silent weather)
        
        // Sound - Higher volume for Level 2
        const windVolume = this.activeLevel === 2 ? 0.7 : 0.4;
        this.playSound('wind_gust', { volume: windVolume });
        
        // Log wind direction for debugging
        if (this.activeLevel === 2) {
            console.log(`🌪️ LEVEL 2 WIND: Blowing ${this.windDirection === 1 ? '→ RIGHT' : '← LEFT'} with ${this.windType} intensity`);
        }
        
        // ===== LEVEL 3: SYNC LAWN MOWER WITH WIND GUST =====
        // Track wind gusts and spawn lawn mower ONLY on the SECOND gust
        // Skip in free play mode (lawn mower already available)
        const inFreePlayMode = localStorage.getItem('sheepMarket_goldenKeyActivated') === 'true' && 
                                localStorage.getItem('sheepMarket_allLevelsUnlocked') === 'true';
        
        if (this.activeLevel === 3 && !inFreePlayMode) {
            // Count only strong gusts or storms (not whirlwinds or normal wind)
            if (this.windType === 'gust' || this.windType === 'storm') {
                this.windGustCount++;
                console.log(`🌪️ Wind gust #${this.windGustCount} in Level 3`);
                
                // Spawn lawn mower ONLY on second gust
                if (this.windGustCount === 2 && !this.lawnMowerSpawned) {
                    console.log('🚜 Spawning lawn mower with SECOND wind gust');
                    this.spawnLawnMowerWithWind(duration, intensity, particleSpeed);
                }
            }
        }
    }
    
    applyWindForce(delta) {
        // Base force scaled by intensity
        const baseForce = 400;
        const windForce = baseForce * this.windIntensity;
        
        // Whirlwind: Check for direction swap
        if (this.windType === 'whirlwind' && this.windSwapTime && this.time.now > this.windSwapTime) {
            this.windDirection *= -1; // Reverse!
            this.windSwapTime = null; // Only swap once
            
            // Update particle direction
            if (this.windEmitter) {
                const minS = 600 * this.windDirection;
                const maxS = 1200 * this.windDirection;
                this.windEmitter.speedX = { min: Math.min(minS, maxS), max: Math.max(minS, maxS) };
                
                // Flip spawn side (match startWindEvent positioning)
                if (this.windDirection === 1) {
                    this.windEmitter.setPosition(0, 0);
                    this.windEmitter.setEmitZone({
                        type: 'random',
                        source: new Phaser.Geom.Rectangle(-100, 0, 50, CONFIG.height)
                    });
                } else {
                    this.windEmitter.setPosition(0, 0);
                    this.windEmitter.setEmitZone({
                        type: 'random',
                        source: new Phaser.Geom.Rectangle(CONFIG.width + 50, 0, 50, CONFIG.height)
                    });
                }
            }
        }
        
        // Apply force to sheep
        this.sheep.getChildren().forEach(s => {
            // ✅ IMMUNE OUTLIER CHECK: Skip if sheep is immune
            if (s.isImmuneOutlier) return;
            
            if (s.body) {
                // Gust: Pulsing force
                let force = windForce;
                if (this.windType === 'gust') {
                    // Sine wave pulsing
                    const pulsePhase = (this.time.now % 500) / 500;
                    force *= (0.5 + Math.sin(pulsePhase * Math.PI * 4) * 0.5);
                }
                
                s.body.velocity.x += (this.windDirection * force * (delta/1000));
                
                // Whirlwind: Extra vertical chaos
                const verticalNoise = this.windType === 'whirlwind' ? 
                    Phaser.Math.Between(-50, 50) : 
                    Phaser.Math.Between(-20, 20);
                    
                s.body.velocity.y += verticalNoise * (delta/1000);
            }
        });
    }

    stopWindEvent() {
        this.windActive = false;
        
        if (this.windEmitter) {
            this.windEmitter.stop();
        }
        
        // Calculate NEXT wind time
        // Random increment: 10-20 seconds later
        // Ensure we don't schedule if round is over
        const delay = Phaser.Math.Between(10, 20);
        this.nextWindTime = this.timeLeft - delay;
        
        console.log(`GameScene: Wind ended. Next wind at ${this.nextWindTime}s`);
    }

    createRainbowEffect() {
        // Create rainbow particle textures (7 colors of rainbow)
        const rainbowColors = [
            0xFF0000, // Red
            0xFF7F00, // Orange
            0xFFFF00, // Yellow
            0x00FF00, // Green
            0x0000FF, // Blue
            0x4B0082, // Indigo
            0x9400D3  // Violet
        ];
        
        // Create particle textures for each color
        rainbowColors.forEach((color, index) => {
            const textureName = `rainbow_particle_${index}`;
            if (!this.textures.exists(textureName)) {
                const pg = this.make.graphics({ x: 0, y: 0, add: false });
                pg.fillStyle(color, 0.8);
                pg.fillCircle(4, 4, 4);
                pg.generateTexture(textureName, 8, 8);
            }
        });
        
        // Create an arc of rainbow particles across the sky
        const numStripes = 7;
        const arcWidth = CONFIG.width * 0.8;
        const arcStartX = CONFIG.width * 0.1;
        const arcCenterY = CONFIG.height * 0.3;
        const arcHeight = 150;
        
        rainbowColors.forEach((color, stripeIndex) => {
            const emitter = this.add.particles(0, 0, `rainbow_particle_${stripeIndex}`, {
                x: { min: arcStartX, max: arcStartX + arcWidth },
                y: arcCenterY,
                lifespan: 8000,
                alpha: { start: 0, end: 0.7 },
                scale: { start: 1.5, end: 0.8 },
                speedY: 0,
                speedX: 0,
                quantity: 1,
                frequency: 50,
                blendMode: 'ADD',
                emitting: false
            });
            
            emitter.setDepth(5);
            
            // Stagger the fade-in for each stripe
            this.time.delayedCall(stripeIndex * 100, () => {
                // Position particles in an arc shape
                emitter.addEmitZone({
                    type: 'edge',
                    source: new Phaser.Geom.Circle(CONFIG.width / 2, arcCenterY + arcHeight, arcHeight + (stripeIndex * 15)),
                    quantity: 50,
                    yoyo: false
                });
                
                emitter.explode(50);
                
                // Fade out after 6 seconds
                this.time.delayedCall(6000, () => {
                    this.tweens.add({
                        targets: emitter,
                        alpha: 0,
                        duration: 2000,
                        onComplete: () => emitter.destroy()
                    });
                });
            });
        });
    }

    createSheepSparkles(sheep) {
        if (!sheep || !sheep.active) return;
        
        // Sparkle texture is now generated centrally in create()
        
        // Create sparkle emitter around the sheep
        const sparkleEmitter = this.add.particles(sheep.x, sheep.y, 'sparkle_particle', {
            speed: { min: 20, max: 60 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 800,
            gravityY: -50, // Float upward
            quantity: 2,
            frequency: 80,
            blendMode: 'ADD',
            emitting: false
        });
        
        sparkleEmitter.setDepth(sheep.depth + 1);
        
        // Brief sparkle burst
        sparkleEmitter.explode(8, sheep.x, sheep.y);
        
        // Continue sparkling for 1.5 seconds
        sparkleEmitter.start();
        this.time.delayedCall(1500, () => {
            sparkleEmitter.stop();
            this.time.delayedCall(1000, () => {
                sparkleEmitter.destroy();
            });
        });
    }

    createSunRays() {
        // Create sun ray particle texture
        if (!this.textures.exists('sunray_particle')) {
            const pg = this.make.graphics({ x: 0, y: 0, add: false });
            pg.fillStyle(0xFFFF99, 0.6); // Soft golden-yellow
            pg.fillRect(0, 0, 3, 40); // Vertical ray streak
            pg.generateTexture('sunray_particle', 3, 40);
        }
        
        // Sun position (upper center-left of sky)
        const sunX = CONFIG.width * 0.35;
        const sunY = 50;
        
        // Create multiple ray beams radiating from sun
        const numRays = 12;
        const angleStep = 360 / numRays;
        
        for (let i = 0; i < numRays; i++) {
            const angle = (i * angleStep) - 90; // -90 to start from top
            
            // Only show rays going downward (angles between -45 and 225 degrees from vertical)
            const normalizedAngle = ((angle + 90) % 360);
            if (normalizedAngle > 45 && normalizedAngle < 225) {
                const rayEmitter = this.add.particles(sunX, sunY, 'sunray_particle', {
                    angle: angle,
                    speed: { min: 80, max: 150 },
                    lifespan: 3000,
                    alpha: { start: 0, end: 0.4 },
                    scale: { start: 1.2, end: 0.6 },
                    quantity: 1,
                    frequency: 150,
                    blendMode: 'ADD',
                    emitting: false,
                    rotate: { min: angle - 10, max: angle + 10 } // Slight rotation variance
                });
                
                rayEmitter.setDepth(4); // Behind rainbow but above background
                
                // Stagger start for dramatic effect
                this.time.delayedCall(i * 80, () => {
                    rayEmitter.start();
                    
                    // Stop emitting after 5 seconds, let particles fade naturally
                    this.time.delayedCall(5000, () => {
                        rayEmitter.stop();
                        
                        // Clean up after all particles have faded
                        this.time.delayedCall(3000, () => {
                            rayEmitter.destroy();
                        });
                    });
                });
            }
        }
        
        // Add central sun glow
        const sunGlow = this.add.graphics();
        sunGlow.fillStyle(0xFFFFAA, 0.3);
        sunGlow.fillCircle(sunX, sunY, 60);
        sunGlow.setDepth(3);
        sunGlow.setAlpha(0);
        
        // Fade in sun glow
        this.tweens.add({
            targets: sunGlow,
            alpha: 0.5,
            duration: 2000,
            ease: 'Sine.easeIn',
            onComplete: () => {
                // Pulsing glow effect
                this.tweens.add({
                    targets: sunGlow,
                    alpha: 0.3,
                    scale: 1.1,
                    duration: 1500,
                    yoyo: true,
                    repeat: 2,
                    ease: 'Sine.easeInOut',
                    onComplete: () => {
                        // Fade out
                        this.tweens.add({
                            targets: sunGlow,
                            alpha: 0,
                            duration: 2000,
                            onComplete: () => sunGlow.destroy()
                        });
                    }
                });
            }
        });
    }

    createMudFootprint(x, y, facingRight) {
        // Create simple oval footprint mark in mud
        const footprint = this.add.graphics();
        footprint.setPosition(x, y);
        footprint.setDepth(1); // Just above ground
        
        // Draw two small ovals for sheep hooves
        const hoofWidth = 8;
        const hoofHeight = 12;
        const hoofSpacing = 6;
        
        footprint.fillStyle(0x4a2f1a, 0.65); // Medium-dark brown for footprints
        
        // Left hoof
        footprint.fillEllipse(-hoofSpacing / 2, 0, hoofWidth, hoofHeight);
        // Right hoof
        footprint.fillEllipse(hoofSpacing / 2, 0, hoofWidth, hoofHeight);
        
        // Rotate based on facing direction
        footprint.setRotation(facingRight ? 0 : Math.PI);
        
        // Start with low alpha, fade in
        footprint.setAlpha(0);
        this.tweens.add({
            targets: footprint,
            alpha: 0.7,
            duration: 200,
            ease: 'Sine.easeOut'
        });
        
        // Add to tracking array
        this.mudFootprints.push(footprint);
        
        // Limit footprint count to prevent performance issues
        if (this.mudFootprints.length > 300) {
            const oldFootprint = this.mudFootprints.shift();
            this.tweens.add({
                targets: oldFootprint,
                alpha: 0,
                duration: 500,
                onComplete: () => oldFootprint.destroy()
            });
        }
    }

    brightenBackgroundSky() {
        // Brighten background sky to regular brightness
        if (this.bgGraphics) {
            // Create a temporary graphics object that we can tween
            const tempBg = { colorValue: 0 };
            this.tweens.add({
                targets: tempBg,
                colorValue: 1,
                duration: 3000,
                ease: 'Sine.easeInOut',
                onUpdate: () => {
                    const progress = tempBg.colorValue;
                    const darkColor = 0x0b0e11; // Original dark blue-gray
                    const brightColor = 0x87CEEB; // Sky blue
                    
                    // Interpolate RGB channels
                    const r = Math.floor(((darkColor >> 16) & 0xff) + progress * (((brightColor >> 16) & 0xff) - ((darkColor >> 16) & 0xff)));
                    const g = Math.floor(((darkColor >> 8) & 0xff) + progress * (((brightColor >> 8) & 0xff) - ((darkColor >> 8) & 0xff)));
                    const b = Math.floor((darkColor & 0xff) + progress * ((brightColor & 0xff) - (darkColor & 0xff)));
                    
                    const newColor = (r << 16) | (g << 8) | b;
                    this.bgGraphics.clear();
                    this.bgGraphics.fillStyle(newColor, 1);
                    this.bgGraphics.fillRect(0, 0, CONFIG.width, CONFIG.height);
                }
            });
        }
    }

    triggerLightning() {
        // LEVEL 12 ONLY: Lightning strike effect
        console.log('⚡ Lightning strike!');
        
        this.lightningActive = true;
        
        // Increment lightning counter
        this.lightningCount++;
        
        // Check if this is an even-numbered flash (every second one)
        const shouldPlayThunder = (this.lightningCount % 2 === 0);
        
        if (shouldPlayThunder) {
            console.log(`⚡ Lightning #${this.lightningCount} - THUNDER WILL PLAY (1s delay)`);
        } else {
            console.log(`⚡ Lightning #${this.lightningCount} - no thunder (silent flash)`);
        }
        
        // Create white flash overlay
        const flash = this.add.rectangle(CONFIG.width / 2, CONFIG.height / 2, CONFIG.width, CONFIG.height, 0xffffff, 0.9);
        flash.setDepth(1000);
        
        // Flash brightness tween
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 150,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                flash.destroy();
                this.lightningActive = false;
            }
        });
        
        // Camera shake
        this.cameras.main.shake(100, 0.003);
        
        // Lightning bolt visual (jagged line from top to random position)
        const boltX = Phaser.Math.Between(CONFIG.width * 0.2, CONFIG.width * 0.8);
        const boltY = Phaser.Math.Between(CONFIG.height * 0.3, CONFIG.height * 0.7);
        
        const lightning = this.add.graphics();
        lightning.setDepth(999);
        lightning.lineStyle(6, 0xaaddff, 1);
        
        // Draw jagged lightning bolt
        let currentX = boltX;
        let currentY = 0;
        lightning.beginPath();
        lightning.moveTo(currentX, currentY);
        
        // Create jagged path downward
        const segments = 8;
        for (let i = 0; i < segments; i++) {
            const nextY = (i + 1) * (boltY / segments);
            const nextX = currentX + Phaser.Math.Between(-50, 50);
            lightning.lineTo(nextX, nextY);
            currentX = nextX;
        }
        lightning.lineTo(boltX, boltY);
        lightning.strokePath();
        
        // Add glow effect
        const glow = this.add.graphics();
        glow.setDepth(998);
        glow.lineStyle(20, 0xaaddff, 0.3);
        glow.strokeLineShape(new Phaser.Geom.Line(boltX, 0, boltX, boltY));
        
        // Fade out lightning
        this.tweens.add({
            targets: [lightning, glow],
            alpha: 0,
            duration: 100,
            ease: 'Linear',
            onComplete: () => {
                lightning.destroy();
                glow.destroy();
            }
        });
        
        // Thunder sound (realistic thunder effect) - EXTREMELY LOUD
        // Only play on every second lightning flash (even numbers), delayed by 1 second
        if (shouldPlayThunder) {
            // Delay thunder by 1 second after the flash
            this.time.delayedCall(1000, () => {
                // Just try to play it - if it fails, fail silently
                try {
                    if (!audioManager.isSoundMuted) {
                        const thunderSound = this.sound.add('thunder', {
                            volume: 1.0 // Maximum Phaser volume
                        });
                        
                        // Set detune to 0 to ensure normal pitch (some audio files are quieter at different pitches)
                        if (thunderSound) {
                            thunderSound.detune = 0;
                            thunderSound.play();
                        
                        console.log('💥 Thunder sound playing NOW (1s after flash) - attempting volume boost...');
                        
                        // MULTIPLE VOLUME BOOST STRATEGIES - try all of them
                        
                        // Strategy 1: Direct volume property override (after play)
                        setTimeout(() => {
                            try {
                                thunderSound.volume = 1.0;
                            } catch (e) {}
                        }, 10);
                        
                        // Strategy 2: Web Audio API gain boost (MASSIVE 15x boost)
                        setTimeout(() => {
                            try {
                                if (thunderSound.source && thunderSound.source.gain) {
                                    thunderSound.source.gain.setValueAtTime(15.0, this.sound.context.currentTime);
                                    console.log('✅ Thunder gain boosted to 15x');
                                } else if (thunderSound.source && thunderSound.source.context) {
                                    // Alternative gain access
                                    const gainNode = thunderSound.source.context.createGain();
                                    gainNode.gain.value = 15.0;
                                    console.log('✅ Thunder gain node created at 15x');
                                } else {
                                    console.warn('⚠️ Thunder source not accessible for gain boost');
                                }
                            } catch (e) {
                                console.warn('❌ Thunder boost failed:', e.message);
                            }
                        }, 10);
                        
                        // Strategy 3: Boost master volume temporarily
                        setTimeout(() => {
                            try {
                                const originalMasterVolume = this.sound.volume;
                                this.sound.volume = 1.0; // Ensure master volume is max
                                
                                // Restore after thunder duration (~2 seconds)
                                setTimeout(() => {
                                    this.sound.volume = originalMasterVolume;
                                }, 2000);
                            } catch (e) {}
                        }, 10);
                        
                        console.log('💥 Thunder sound playing at MAXIMUM BOOSTED volume (15x)');
                        }
                    }
                } catch (e) {
                    // Thunder sound not available - skip silently
                    console.warn('⚠️ Thunder sound not available:', e.message);
                }
            });
        }
    }

    startGloomyWeatherTransition() {
        // LEVEL 2 ONLY: Gradual gloomy weather effect over 10 seconds
        // Creates atmosphere of approaching rain and fading sun
        // Much lighter than Level 3 - just a hint of clouds
        console.log('🌧️ Starting gloomy weather transition for Level 2');
        
        const duration = 10000; // 10 seconds to match countdown
        
        // 1. Darken the background sky gradually (sky blue -> light overcast)
        if (this.bgGraphics) {
            const tempBg = { colorValue: 0 };
            this.tweens.add({
                targets: tempBg,
                colorValue: 1,
                duration: duration,
                ease: 'Sine.easeIn',
                onUpdate: () => {
                    const progress = tempBg.colorValue;
                    const startColor = 0x87CEEB; // Sky blue
                    const endColor = 0x9ab0c5; // Very light overcast gray-blue
                    
                    // Interpolate RGB channels
                    const r = Math.floor(((startColor >> 16) & 0xff) + progress * (((endColor >> 16) & 0xff) - ((startColor >> 16) & 0xff)));
                    const g = Math.floor(((startColor >> 8) & 0xff) + progress * (((endColor >> 8) & 0xff) - ((startColor >> 8) & 0xff)));
                    const b = Math.floor((startColor & 0xff) + progress * ((endColor & 0xff) - (startColor & 0xff)));
                    
                    const newColor = (r << 16) | (g << 8) | b;
                    this.bgGraphics.clear();
                    this.bgGraphics.fillStyle(newColor, 1);
                    this.bgGraphics.fillRect(0, 0, CONFIG.width, CONFIG.height);
                }
            });
        }
        
        // 2. Slightly cool the pasture (very subtle tint)
        if (this.pastureImage) {
            const tempPasture = { tintValue: 0 };
            this.tweens.add({
                targets: tempPasture,
                tintValue: 1,
                duration: duration,
                ease: 'Sine.easeIn',
                onUpdate: () => {
                    const progress = tempPasture.tintValue;
                    // Very light tint - just a hint of coolness
                    const startTint = 0xffffff; // Normal
                    const endTint = 0xc8d4d4; // Very light cool tint
                    
                    const r = Math.floor(((startTint >> 16) & 0xff) + progress * (((endTint >> 16) & 0xff) - ((startTint >> 16) & 0xff)));
                    const g = Math.floor(((startTint >> 8) & 0xff) + progress * (((endTint >> 8) & 0xff) - ((startTint >> 8) & 0xff)));
                    const b = Math.floor((startTint & 0xff) + progress * ((endTint & 0xff) - (startTint & 0xff)));
                    
                    const newTint = (r << 16) | (g << 8) | b;
                    this.pastureImage.setTint(newTint);
                }
            });
        }
        
        // 3. Very subtle cooling on sheep
        this.sheep.getChildren().forEach((s) => {
            const tempSheep = { tintValue: 0 };
            this.tweens.add({
                targets: tempSheep,
                tintValue: 1,
                duration: duration,
                ease: 'Sine.easeIn',
                onUpdate: () => {
                    const progress = tempSheep.tintValue;
                    const startTint = 0xffffff; // Normal
                    const endTint = 0xdce8ee; // Very light cool tint
                    
                    const r = Math.floor(((startTint >> 16) & 0xff) + progress * (((endTint >> 16) & 0xff) - ((startTint >> 16) & 0xff)));
                    const g = Math.floor(((startTint >> 8) & 0xff) + progress * (((endTint >> 8) & 0xff) - ((startTint >> 8) & 0xff)));
                    const b = Math.floor((startTint & 0xff) + progress * ((endTint & 0xff) - (startTint & 0xff)));
                    
                    const newTint = (r << 16) | (g << 8) | b;
                    s.setTint(newTint);
                }
            });
        });
        
        // 4. Very minimal vignette effect
        if (!this.vignetteOverlay) {
            this.vignetteOverlay = this.add.graphics();
            this.vignetteOverlay.setDepth(9); // Below UI but above gameplay
        }
        
        const tempVignette = { alpha: 0 };
        this.tweens.add({
            targets: tempVignette,
            alpha: 0.12, // Very subtle vignette
            duration: duration,
            ease: 'Sine.easeIn',
            onUpdate: () => {
                this.vignetteOverlay.clear();
                this.vignetteOverlay.fillStyle(0x000000, tempVignette.alpha);
                
                // Create radial gradient effect by drawing concentric rectangles
                const centerX = CONFIG.width / 2;
                const centerY = CONFIG.height / 2;
                const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
                
                // Draw from outside in for vignette effect
                const steps = 20;
                for (let i = 0; i < steps; i++) {
                    const ratio = i / steps;
                    const dist = maxDist * (1 - ratio);
                    const alpha = tempVignette.alpha * (1 - ratio);
                    
                    this.vignetteOverlay.fillStyle(0x000000, alpha);
                    this.vignetteOverlay.fillRect(
                        centerX - dist,
                        centerY - dist * 0.75,
                        dist * 2,
                        dist * 1.5
                    );
                }
            }
        });
        
        // 5. Minimal camera dimming (barely noticeable)
        const camera = this.cameras.main;
        if (camera) {
            this.tweens.add({
                targets: camera,
                scrollY: 0, // Dummy property to drive the tween
                duration: duration,
                ease: 'Sine.easeIn',
                onUpdate: (tween) => {
                    const progress = tween.progress;
                    // Very subtle brightness reduction - just 7%
                    camera.setAlpha(1.0 - (progress * 0.07));
                }
            });
        }
    }

    triggerGoldenSheep() {
        if (this.goldenSheepActive) return;
        
        const candidates = this.sheep.getChildren().filter(s => s.active);
        if (candidates.length === 0) return;
        
        const target = candidates[Phaser.Math.Between(0, candidates.length - 1)];
        
        target.makeGolden();
        this.goldenSheepTarget = target;
        this.goldenSheepActive = true;
        
        // Attach particles
        this.goldEmitter.startFollow(target);
        this.goldEmitter.start();
        
        // Notify HUD
        this.events.emit('market-event', { type: 'GOLDEN_SHEEP' });
        
        // Sound
        this.playSound('coin', { volume: 0.5 }); // Subtle hint
    }
    
    showWolfWarningEyes(side) {
        if (this.warningEyesGroup) {
            this.warningEyesGroup.destroy(true);
        }
        
        this.warningEyesGroup = this.add.group();
        
        // Create 2-3 pairs of eyes lurking in the dark
        const x = side === 'LEFT' ? 50 : CONFIG.width - 50;
        
        for (let i = 0; i < 3; i++) {
            const y = Phaser.Math.Between(200, CONFIG.height - 200);
            const eyes = this.add.image(x, y, 'wolf_eyes')
                .setDepth(500) // On top of everything
                .setAlpha(0)
                .setScale(0.8);
            
            if (side === 'RIGHT') eyes.setFlipX(true);
            
            this.warningEyesGroup.add(eyes);
            
            // Fade In/Out Blink Animation
            this.tweens.add({
                targets: eyes,
                alpha: 1,
                duration: 1000 + (i * 200),
                yoyo: true,
                repeat: -1,
                delay: i * 500,
                ease: 'Sine.easeInOut'
            });
        }
    }

    hideWolfWarningEyes() {
        if (this.warningEyesGroup) {
            this.warningEyesGroup.destroy(true);
            this.warningEyesGroup = null;
        }
    }
    
    showWolfWarningBorder(side) {
        // Create red glowing bar that isn't too solid
        this.wolfWarningBorder = this.add.container(0, 0);
        this.wolfWarningBorder.setDepth(9999);
        
        const borderWidth = 60;
        const borderX = side === 'LEFT' ? 0 : CONFIG.width - borderWidth;
        
        // Outer glow layer (widest, most transparent)
        const outerGlow = this.add.graphics();
        outerGlow.fillStyle(0xff0000, 0.1);
        outerGlow.fillRect(borderX, 0, borderWidth, CONFIG.height);
        this.wolfWarningBorder.add(outerGlow);
        
        // Middle glow layer
        const middleGlow = this.add.graphics();
        const middleWidth = borderWidth * 0.7;
        const middleX = side === 'LEFT' ? borderX + (borderWidth - middleWidth) / 2 : borderX + (borderWidth - middleWidth) / 2;
        middleGlow.fillStyle(0xff0000, 0.2);
        middleGlow.fillRect(middleX, 0, middleWidth, CONFIG.height);
        this.wolfWarningBorder.add(middleGlow);
        
        // Inner glow layer
        const innerGlow = this.add.graphics();
        const innerWidth = borderWidth * 0.4;
        const innerX = side === 'LEFT' ? borderX + (borderWidth - innerWidth) / 2 : borderX + (borderWidth - innerWidth) / 2;
        innerGlow.fillStyle(0xff3333, 0.3);
        innerGlow.fillRect(innerX, 0, innerWidth, CONFIG.height);
        this.wolfWarningBorder.add(innerGlow);
        
        // Bright center core
        const core = this.add.graphics();
        const coreWidth = borderWidth * 0.15;
        const coreX = side === 'LEFT' ? borderX + (borderWidth - coreWidth) / 2 : borderX + (borderWidth - coreWidth) / 2;
        core.fillStyle(0xff6666, 0.5);
        core.fillRect(coreX, 0, coreWidth, CONFIG.height);
        this.wolfWarningBorder.add(core);
        
        // Pulsing animation - all layers pulse together
        this.tweens.add({
            targets: [outerGlow, middleGlow, innerGlow, core],
            alpha: { from: 0.6, to: 1 },
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Subtle intensity variation on the core
        this.tweens.add({
            targets: core,
            alpha: { from: 0.8, to: 1 },
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    hideWolfWarningBorder() {
        if (this.wolfWarningBorder) {
            this.tweens.killTweensOf(this.wolfWarningBorder);
            this.wolfWarningBorder.destroy();
            this.wolfWarningBorder = null;
        }
    }

    spawnWolf(forcedSide = null) {
        // Hide warning eyes
        this.hideWolfWarningEyes();

        const side = forcedSide || (Math.random() < 0.5 ? 'LEFT' : 'RIGHT');
        const startX = side === 'LEFT' ? -50 : CONFIG.width + 50;
        const baseY = Phaser.Math.Between(200, CONFIG.height - 200);
        
        const wolf = new Wolf(this, startX, baseY);
        if (side === 'LEFT') wolf.setFlipX(true); // Face right initially if coming from left
        
        this.wolves.add(wolf);
        
        // Notify HUD with side info
        this.events.emit('market-event', { type: 'WOLF_ATTACK', side: side });
        
        // BONE BUTTON HINT: If player has bones, bounce the bone button to remind them
        if (this.collectedBonesCount > 0) {
            this.events.emit('bounce-bone-button');
        }
        
        // Initialize growl flag
        wolf.hasGrowled = false;
    }

    updateWolves(time, delta) {
        if (this.wolves.getLength() === 0) return;
        
        const sheepList = this.sheep.getChildren();
        const panicDistSq = 200 * 200; // Reduced panic distance so wolf can get closer before sheep flee
        const catchDistSq = 150 * 150; // Larger catch distance now that we have target locking
        
        this.wolves.getChildren().forEach(wolf => {
            // Update Wolf Logic (Movement/AI) - Every frame
            wolf.update(time, delta, this.sheep);

            // CHECK TARGET CATCH - Every frame for smooth catching
            if (wolf.huntTarget && wolf.huntTarget.active && !wolf.huntTarget.isEaten) {
                const dx = wolf.x - wolf.huntTarget.x;
                const dy = wolf.y - wolf.huntTarget.y;
                const distSq = dx * dx + dy * dy;
                
                // CATCH TARGET SHEEP
                if (distSq < catchDistSq) {
                    // Stop wolf movement immediately to prevent vibration
                    wolf.body.setVelocity(0, 0);
                    
                    // Stop sheep movement immediately
                    if (wolf.huntTarget.body) {
                        wolf.huntTarget.body.setVelocity(0, 0);
                    }
                    
                    this.wolfCatchSheep(wolf, wolf.huntTarget);
                    
                    // Increment sheep eaten counter
                    wolf.sheepEaten = (wolf.sheepEaten || 0) + 1;
                    
                    // Check if wolf has eaten enough sheep
                    if (wolf.sheepEaten >= wolf.maxSheepToEat) {
                        // Wolf is satisfied - make it leave
                        wolf.isExiting = true;
                        wolf.huntTarget = null;
                        
                        // Pick a side to leave
                        const exitX = wolf.x < this.scale.width / 2 ? -200 : this.scale.width + 200;
                        this.physics.moveTo(wolf, exitX, wolf.y, 400); // Fast exit
                        
                        console.log(`🐺 Wolf satisfied after eating ${wolf.sheepEaten} sheep - leaving`);
                        return;
                    }
                    
                    // Clear the target so wolf finds a new one
                    wolf.huntTarget = null;
                    return;
                }
            }

            // PANIC CHECKS - Check all sheep for panic behavior
            sheepList.forEach(s => {
                if (!s.active || s.isEaten) return;
                if (s.isImmuneOutlier) return;
                
                const dx = wolf.x - s.x;
                const dy = wolf.y - s.y;
                const distSq = dx * dx + dy * dy;
                
                if (distSq < panicDistSq) {
                    // Play Growl ONLY when approaching sheep (once per wolf, during active round, not eating bone)
                    const isInPlacementMode = this.bonePlacementMode || 
                                              this.grassPlacementMode || 
                                              this.lawnMowerDragging;
                    
                    if (!wolf.hasGrowled && 
                        this.roundActive && 
                        wolf.active && 
                        wolf.visible && 
                        !wolf.isEatingBone &&
                        !isInPlacementMode) {
                        if (this.sound.get('wolf_growl')) {
                            this.playSound('wolf_growl', { volume: 0.6 });
                        }
                        wolf.hasGrowled = true;
                    }

                    // Use the sheep's internal flee logic
                    s.fleeFrom(wolf);
                }
            });
        });
    }
    
    wolfCatchSheep(wolf, sheep) {
        if (sheep.isEaten || !sheep.active) return;
        
        // ZOMBIE IMMUNITY: Zombified sheep cannot be caught
        if (sheep.isZombified) {
            console.log('🧟 Wolf tried to catch zombified sheep - IMMUNE');
            return;
        }
        
        // ═══ BLACK SHEEP IMMUNITY: Immune outliers cannot be caught ═══
        if (sheep.isImmuneOutlier) {
            console.log('🐑⚫ Wolf tried to catch immune outlier sheep - IMMUNE (Black Sheep protection)');
            return;
        }
        
        // Mark sheep as eaten and inactive IMMEDIATELY to prevent re-triggering
        sheep.isEaten = true;
        sheep.setActive(false);
        
        // Create dramatic catch effects
        this.createWolfCatchEffects(wolf, sheep);
        
        // PANIC NEARBY SHEEP: Make all sheep within range flee from the attack
        const panicRadius = 300; // Sheep within 300px witness the attack and panic
        this.sheep.getChildren().forEach(s => {
            if (s.active && !s.isEaten && s !== sheep) {
                const dx = s.x - sheep.x;
                const dy = s.y - sheep.y;
                const distSq = dx * dx + dy * dy;
                
                if (distSq < panicRadius * panicRadius) {
                    // Make sheep flee from the attack location
                    s.fleeFrom({ x: sheep.x, y: sheep.y });
                }
            }
        });
        
        // Disable physics immediately to prevent overlap jitter
        if (sheep.body) {
            sheep.body.enable = false;
        }
        
        // Remove from group immediately
        if (this.sheep && this.sheep.remove) {
            this.sheep.remove(sheep);
        }
        
        // Hide sheep immediately to prevent visual glitches
        sheep.setVisible(false);
        
        // Create bones at sheep position
        this.createBonesFromSheep(sheep.x, sheep.y);
        
        // Play sheep cry and crunch/thud sound
        audioManager.playBaa(); // Sheep distress baa sound
        audioManager.playDud(); // Crunch/thud sound
    }
    
    createWolfCatchEffects(wolf, sheep) {
        const x = sheep.x;
        const y = sheep.y;
        
        // 1. Red flash impact circle
        const impactCircle = this.add.graphics();
        impactCircle.lineStyle(8, 0xff0000, 1);
        impactCircle.strokeCircle(x, y, 20);
        impactCircle.setDepth(150);
        
        this.tweens.add({
            targets: impactCircle,
            alpha: { from: 1, to: 0 },
            scale: { from: 1, to: 3 },
            duration: 400,
            ease: 'Cubic.easeOut',
            onComplete: () => impactCircle.destroy()
        });
        
        // 2. Screen shake
        this.cameras.main.shake(200, 0.005);
        
        // 3. Red flash vignette
        const flashOverlay = this.add.graphics();
        flashOverlay.fillStyle(0xff0000, 0.3);
        flashOverlay.fillRect(0, 0, this.scale.width, this.scale.height);
        flashOverlay.setDepth(10000);
        
        this.tweens.add({
            targets: flashOverlay,
            alpha: { from: 0.3, to: 0 },
            duration: 300,
            ease: 'Sine.easeOut',
            onComplete: () => flashOverlay.destroy()
        });
        
        // 4. Dust burst effect
        this.createDustBurst(x, y);
        
        // 5. Blood/impact particles
        this.createImpactParticles(x, y);
        
        // 6. "CAUGHT!" text
        const caughtText = this.add.text(x, y - 60, 'CAUGHT!', {
            font: 'bold 32px Arial',
            fill: '#ff0000',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(200);
        
        this.tweens.add({
            targets: caughtText,
            y: y - 100,
            alpha: { from: 1, to: 0 },
            scale: { from: 0.5, to: 1.5 },
            duration: 800,
            ease: 'Cubic.easeOut',
            onComplete: () => caughtText.destroy()
        });
        
        // 7. Wolf flash white briefly
        wolf.setTint(0xffffff);
        this.time.delayedCall(100, () => {
            if (wolf && wolf.active) {
                wolf.clearTint();
            }
        });
    }
    
    createImpactParticles(x, y) {
        // Create red impact particles
        if (!this.textures.exists('impact_particle')) {
            const graphics = this.add.graphics();
            graphics.fillStyle(0xff0000, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('impact_particle', 8, 8);
            graphics.destroy();
        }
        
        const impactEmitter = this.add.particles(x, y, 'impact_particle', {
            speed: { min: 150, max: 300 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.5, end: 0 },
            alpha: { start: 0.9, end: 0 },
            lifespan: 500,
            gravityY: 200,
            quantity: 20,
            emitting: false,
            tint: [0xff0000, 0xff3333, 0xaa0000]
        });
        
        impactEmitter.setDepth(140);
        impactEmitter.explode(20, x, y);
        
        // Clean up after particles fade
        this.time.delayedCall(600, () => {
            impactEmitter.destroy();
        });
    }
    
    createDustBurst(x, y) {
        // Create dust particle texture if it doesn't exist
        if (!this.textures.exists('dust_particle')) {
            const pg = this.make.graphics({ x: 0, y: 0, add: false });
            pg.fillStyle(0xcccccc, 1);
            pg.fillCircle(3, 3, 3);
            pg.generateTexture('dust_particle', 6, 6);
        }
        
        // Create dust explosion
        const dustEmitter = this.add.particles(x, y, 'dust_particle', {
            speed: { min: 100, max: 250 },
            angle: { min: 0, max: 360 },
            scale: { start: 2, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 600,
            gravityY: 150,
            quantity: 15,
            emitting: false
        });
        
        dustEmitter.setDepth(50);
        dustEmitter.explode(15, x, y);
        
        // Clean up after particles fade
        this.time.delayedCall(700, () => {
            dustEmitter.destroy();
        });
    }
    
    createBonesFromSheep(x, y) {
        // Create bone sprite (using text emoji for now)
        const bones = this.add.text(x, y, '🦴', {
            font: '48px Arial'
        }).setOrigin(0.5);
        
        bones.setDepth(60);
        bones.setInteractive({ useHandCursor: true });
        
        // Bounce animation to indicate clickable
        this.tweens.add({
            targets: bones,
            y: y - 20,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Scale pulse animation
        this.tweens.add({
            targets: bones,
            scale: { from: 1, to: 1.2 },
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Click handler - fly bones to bottom right button
        bones.on('pointerdown', () => {
            this.collectBones(bones);
        });
        
        // Store reference for cleanup
        if (!this.bonesList) this.bonesList = [];
        this.bonesList.push(bones);
    }
    
    resurrectAllBoneSheep() {
        console.log('✨ ═══ GOLDEN SHEEP RESURRECTION ═══');
        
        if (!this.bonesList || this.bonesList.length === 0) {
            console.log('   No bones to resurrect');
            return;
        }
        
        console.log(`   Resurrecting ${this.bonesList.length} bone sheep...`);
        
        // Get Golden Sheep position - either from sprite (other levels) or button (Level 12)
        let goldenSheepX, goldenSheepY;
        
        if (this.activeLevel === 12 && !this.goldenSheepSprite) {
            // Level 12: Golden Sheep is in button - emit beams from button position
            const hudScene = this.scene.get('HUDScene');
            const btn = hudScene.abilityButtons[0]; // Golden Sheep button (index 0)
            if (btn && btn.container) {
                goldenSheepX = btn.container.x;
                goldenSheepY = btn.container.y;
                console.log(`   Using Golden Sheep button position: (${goldenSheepX}, ${goldenSheepY})`);
            } else {
                console.warn('   ⚠️ Cannot find Golden Sheep button, using center screen');
                goldenSheepX = CONFIG.width / 2;
                goldenSheepY = CONFIG.height - 100;
            }
        } else if (this.goldenSheepSprite) {
            // Other levels: Golden Sheep sprite exists
            goldenSheepX = this.goldenSheepSprite.x;
            goldenSheepY = this.goldenSheepSprite.y;
        } else {
            console.warn('   ⚠️ No Golden Sheep sprite or button found, using center screen');
            goldenSheepX = CONFIG.width / 2;
            goldenSheepY = CONFIG.height / 2;
        }
        
        // Resurrect each bone with staggered timing
        this.bonesList.forEach((bones, index) => {
            if (!bones || !bones.active) return;
            
            const boneX = bones.x;
            const boneY = bones.y;
            
            // Delay resurrection slightly for dramatic effect
            this.time.delayedCall(index * 150, () => {
                // === BEAM OF LIGHT FROM GOLDEN SHEEP TO BONE ===
                
                // Create golden beam line
                const beamGraphics = this.add.graphics();
                beamGraphics.setDepth(498);
                
                // Animate beam expanding from Golden Sheep to bone
                const beamProgress = { value: 0 };
                
                this.tweens.add({
                    targets: beamProgress,
                    value: 1,
                    duration: 400,
                    ease: 'Cubic.easeOut',
                    onUpdate: () => {
                        beamGraphics.clear();
                        
                        // Calculate beam end point based on progress
                        const currentX = goldenSheepX + (boneX - goldenSheepX) * beamProgress.value;
                        const currentY = goldenSheepY + (boneY - goldenSheepY) * beamProgress.value;
                        
                        // Draw thick golden beam
                        beamGraphics.lineStyle(12, 0xffd700, 0.8);
                        beamGraphics.lineBetween(goldenSheepX, goldenSheepY, currentX, currentY);
                        
                        // Inner bright core
                        beamGraphics.lineStyle(6, 0xffffff, 0.9);
                        beamGraphics.lineBetween(goldenSheepX, goldenSheepY, currentX, currentY);
                    },
                    onComplete: () => {
                        // Hold beam for brief moment
                        this.time.delayedCall(200, () => {
                            // Fade out beam
                            this.tweens.add({
                                targets: beamGraphics,
                                alpha: 0,
                                duration: 300,
                                onComplete: () => beamGraphics.destroy()
                            });
                        });
                        
                        // === RESURRECTION EFFECT AT BONE LOCATION ===
                        this.resurrectSheepAtPosition(bones, boneX, boneY);
                    }
                });
            });
        });
        
        // Clear bones list after resurrection
        this.time.delayedCall(this.bonesList.length * 150 + 1000, () => {
            console.log('✨ All bone sheep resurrected!');
            this.bonesList = [];
        });
    }
    
    resurrectSheepAtPosition(bones, x, y) {
        // Guard: bone may have been collected/destroyed before this tween fires
        if (!bones || !bones.scene || !bones.active) {
            console.log('✨ Skipping resurrection — bone already destroyed');
            return;
        }

        // Golden burst at bone location
        const burstParticles = this.add.particles(x, y, 'sparkle_particle', {
            speed: { min: 100, max: 300 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.0, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 800,
            quantity: 30,
            blendMode: 'ADD',
            tint: [0xffd700, 0xffed4e, 0xffffff]
        });
        burstParticles.setDepth(499);
        burstParticles.explode();
        
        this.time.delayedCall(1000, () => {
            burstParticles.destroy();
        });
        
        // Golden flash at resurrection point
        const resurrectionFlash = this.add.circle(x, y, 60, 0xffd700, 0.9);
        resurrectionFlash.setDepth(498);
        resurrectionFlash.setBlendMode('ADD');
        
        this.tweens.add({
            targets: resurrectionFlash,
            scale: 2.5,
            alpha: 0,
            duration: 500,
            ease: 'Power2.easeOut',
            onComplete: () => resurrectionFlash.destroy()
        });
        
        // Play magical chime sound
        audioManager.playClick(); // Use existing click sound (can be replaced with resurrection sound)
        
        // Remove bone sprite (kill all tweens first)
        this.tweens.killTweensOf(bones);
        if (bones && bones.scene) {
            bones.disableInteractive();
        }
        
        this.tweens.add({
            targets: bones,
            alpha: 0,
            scale: 0,
            duration: 300,
            onComplete: () => {
                if (bones && bones.scene) bones.destroy();
                
                // === CREATE NEW LIVE SHEEP ===
                
                // Create proper Sheep instance (not basic sprite)
                const newSheep = new Sheep(this, x, y);
                this.sheep.add(newSheep);
                
                // Apply Level 11-12 wet tint ONLY if weather is still active
                // (wetGrassApplied is cleared when Golden Sheep button is clicked)
                if ((this.activeLevel === 11 || this.activeLevel === 12) && this.wetGrassApplied) {
                    newSheep.setTint(0x8899aa);
                } else {
                    // Normal bright sheep if weather has been cleared
                    newSheep.clearTint();
                }
                
                // Sheep starts invisible and scales up
                newSheep.setAlpha(0);
                newSheep.setScale(0.05);
                
                // Resurrection animation - pop in with bounce
                this.tweens.add({
                    targets: newSheep,
                    alpha: 1,
                    scale: 0.12,
                    duration: 500,
                    ease: 'Back.easeOut',
                    onComplete: () => {
                        // Jump animation on resurrection
                        this.tweens.add({
                            targets: newSheep,
                            y: y - 30,
                            duration: 200,
                            yoyo: true,
                            ease: 'Quad.easeOut'
                        });
                        
                        // Celebratory spin
                        this.tweens.add({
                            targets: newSheep,
                            angle: 360,
                            duration: 400,
                            ease: 'Cubic.easeInOut',
                            onComplete: () => {
                                newSheep.angle = 0; // Reset rotation
                            }
                        });
                    }
                });
                
                // Initialize sheep properties (same as initial creation)
                newSheep.initialY = y;
                newSheep.wander = 0;
                newSheep.wanderTimer = 0;
                newSheep.wanderDuration = Phaser.Math.Between(2000, 4000);
                newSheep.targetX = null;
                newSheep.targetY = null;
                newSheep.baseSpeed = 100;
                newSheep.panicSpeed = 350;
                newSheep.facingRight = true;
                newSheep.isEaten = false;
                
                // Apply Golden Sheep brightness lock if activated
                if (this.goldenSheepActivated) {
                    newSheep.brightnessLocked = true;
                    newSheep.clearTint();
                    newSheep.setTint(0xffffff);
                    newSheep.setAlpha(1.0);
                }
                
                // Add reactToMarket method
                newSheep.reactToMarket = function(pushX, pushY, duration = 800) {
                    this.body.setVelocity(pushX, pushY);
                    this.scene.time.delayedCall(duration, () => {
                        if (this.active) {
                            const dampFactor = 0.3;
                            this.body.setVelocity(this.body.velocity.x * dampFactor, this.body.velocity.y * dampFactor);
                        }
                    });
                }.bind(newSheep);
                
                // Add fleeFrom method (for wolves)
                newSheep.fleeFrom = function(threat) {
                    const angle = Phaser.Math.Angle.Between(threat.x, threat.y, this.x, this.y);
                    const fleeSpeed = this.panicSpeed;
                    this.body.setVelocity(
                        Math.cos(angle) * fleeSpeed,
                        Math.sin(angle) * fleeSpeed
                    );
                }.bind(newSheep);
                
                console.log(`✨ Sheep resurrected at (${Math.floor(x)}, ${Math.floor(y)})`);
            }
        });
    }
    
    collectBones(bones) {
        // Remove interactivity
        bones.disableInteractive();
        
        // Target position: bottom right locked button (right of lawn mower)
        // Lawn mower is button index 4, bones go to button index 5
        // Control panel is at (960, 880), buttons at relative (lockedX, 125)
        // Button 5 is at: -507.5 + (5 * 145) = 217.5 relative
        // Absolute: 960 + 217.5 = 1177.5, 880 + 125 = 1005
        const spacing = 145;
        const totalWidth = (7 * spacing);
        const buttonRelativeX = -totalWidth / 2 + (5 * spacing);
        const targetX = CONFIG.width / 2 + buttonRelativeX;
        const targetY = CONFIG.height - 200 + 125;
        
        // Get HUD scene to create flying bone in HUD layer (above call buttons)
        const hudScene = this.scene.get('HUDScene');
        
        // Create new bone in HUD scene for flying animation
        const flyingBone = hudScene.add.text(bones.x, bones.y, '🦴', {
            font: '48px Arial'
        }).setOrigin(0.5);
        
        flyingBone.setDepth(10000); // Very high depth to fly OVER call buttons
        
        // Hide original bone
        bones.setVisible(false);
        
        // Stop all tweens on original
        this.tweens.killTweensOf(bones);
        
        // Fly to target with arc (using HUD scene tweens)
        hudScene.tweens.add({
            targets: flyingBone,
            x: targetX,
            y: targetY - 150, // Arc up high
            scale: 1.2,
            rotation: Math.PI * 2, // Full spin
            duration: 500,
            ease: 'Power2.easeOut',
            onComplete: () => {
                // Drop down to button
                hudScene.tweens.add({
                    targets: flyingBone,
                    y: targetY,
                    scale: 0.8,
                    duration: 200,
                    ease: 'Power2.easeIn',
                    onComplete: () => {
                        // Particle burst at collection
                        if (this.panicEmitter) {
                            this.panicEmitter.explode(5, targetX, targetY);
                        }
                        
                        // Destroy flying bone
                        flyingBone.destroy();
                        
                        // Destroy original bone
                        bones.destroy();
                        
                        // BONE COUNT LIFECYCLE: Increment when bone is collected from field
                        // Count only changes on: bone impact (increment), bone placement (decrement), or new bone collected (increment)
                        if (!this.collectedBonesCount) this.collectedBonesCount = 0;
                        this.collectedBonesCount++;
                        
                        // PERSISTENCE: Save to localStorage (persists across levels)
                        // ENDLESS MODE: Use separate storage
                        const boneStorageKey = this.isEndlessMode ? 'sheepMarket_endless_boneCount' : 'sheepMarket_boneCount';
                        localStorage.setItem(boneStorageKey, this.collectedBonesCount.toString());
                        
                        // Emit event to HUD to update bone counter display on button
                        this.events.emit('bones-collected', this.collectedBonesCount);
                        console.log('🦴 Bone collected from field - count incremented to:', this.collectedBonesCount);
                        
                        // Play collect sound
                        audioManager.playCoin();
                    }
                });
            }
        });
    }

    spawnFriendlyDog() {
        // Spawn dog at top right of pasture
        const startX = CONFIG.width + 50;
        const startY = 150;
        
        this.friendlyDog = new Dog(this, startX, startY);
        
        // Dog barks when entering scene from top right (Level 7 introduction sound - one-time)
        try {
            this.playSound('dog_bark', { volume: 0.6 });
            console.log('🐕 Playing dog bark sound as dog enters (Level 7 introduction)');
        } catch (e) {
            console.warn('Failed to play dog bark:', e);
        }
        
        // Notify HUD
        this.events.emit('market-event', { type: 'DOG_ARRIVAL', message: 'FRIENDLY DOG!' });
    }
    
    spawnBlackSheep() {
        // Spawn black sheep at top-left of pasture
        const startX = -50;
        const startY = 150;
        
        this.blackSheep = new BlackSheep(this, startX, startY);
        
        // Black sheep starts roaming
        this.blackSheep.startRoaming();
        
        // GOLDEN CLOVER VISUAL: Black sheep carries the golden clover in front of it
        const goldenClover = this.add.image(startX + 40, startY, 'golden_clover');
        goldenClover.setScale(0.08);
        goldenClover.setDepth(this.blackSheep.depth + 1); // In front of black sheep
        
        // Store clover reference
        this.goldenClover = goldenClover;
        
        // Move to center-left area for "TAKE ME" interaction
        const landingX = 300;
        const landingY = 350;
        
        // Tween clover to follow black sheep (stays ahead of it)
        this.tweens.add({
            targets: goldenClover,
            x: landingX + 40,
            y: landingY,
            duration: 2000,
            ease: 'Power1'
        });
        
        // Tween black sheep
        this.tweens.add({
            targets: this.blackSheep,
            x: landingX,
            y: landingY,
            duration: 2000,
            ease: 'Power1',
            onComplete: () => {
                // Stop movement
                this.blackSheep.body.setVelocity(0, 0);
                
                // DO NOT pause game - gameplay continues
                
                // Drop the golden clover on the ground slightly in front of black sheep
                const cloverX = landingX + 60;
                const cloverY = landingY + 20;
                
                this.tweens.add({
                    targets: goldenClover,
                    x: cloverX,
                    y: cloverY,
                    scale: 0.12,
                    duration: 300,
                    ease: 'Bounce.easeOut',
                    onComplete: () => {
                        // Make clover clickable
                        goldenClover.setInteractive({ useHandCursor: true });
                        
                        // Add gentle glow/pulse to clover
                        this.tweens.add({
                            targets: goldenClover,
                            scale: 0.13,
                            duration: 800,
                            yoyo: true,
                            repeat: -1,
                            ease: 'Sine.easeInOut'
                        });
                    }
                });
                
                // Create "TAKE ME" speech bubble positioned over the CLOVER (not black sheep)
                const bubbleWidth = 100;
                const bubbleHeight = 40;
                const bubbleX = cloverX;
                const bubbleY = cloverY - 70;
                
                // Create bubble background
                const bubble = this.add.graphics();
                bubble.fillStyle(0xffffff, 0.95);
                bubble.lineStyle(2, 0x000000, 1);
                bubble.fillRoundedRect(bubbleX - bubbleWidth/2, bubbleY - bubbleHeight/2, bubbleWidth, bubbleHeight, 8);
                bubble.strokeRoundedRect(bubbleX - bubbleWidth/2, bubbleY - bubbleHeight/2, bubbleWidth, bubbleHeight, 8);
                
                // Speech bubble pointer
                bubble.fillStyle(0xffffff, 0.95);
                bubble.lineStyle(2, 0x000000, 1);
                bubble.beginPath();
                bubble.moveTo(bubbleX - 8, bubbleY + bubbleHeight/2);
                bubble.lineTo(bubbleX, bubbleY + bubbleHeight/2 + 12);
                bubble.lineTo(bubbleX + 8, bubbleY + bubbleHeight/2);
                bubble.closePath();
                bubble.fillPath();
                bubble.strokePath();
                
                bubble.setDepth(10001);
                bubble.setAlpha(0);
                
                // Create text
                const bubbleText = this.add.text(bubbleX, bubbleY, 'TAKE ME', {
                    fontFamily: 'Arial Black',
                    fontSize: '16px',
                    color: '#000000',
                    fontStyle: 'bold'
                });
                bubbleText.setOrigin(0.5);
                bubbleText.setDepth(10002);
                bubbleText.setAlpha(0);
                
                // Store bubble references on black sheep for cleanup
                this.blackSheep.bubble = bubble;
                this.blackSheep.bubbleText = bubbleText;
                
                // Animate bubble in
                this.tweens.add({
                    targets: [bubble, bubbleText],
                    alpha: 1,
                    duration: 200,
                    ease: 'Back.easeOut'
                });
                
                // Remove bubble after 3 seconds
                const bubbleTimer = this.time.delayedCall(3000, () => {
                    if (bubble && bubble.scene) {
                        this.tweens.add({
                            targets: [bubble, bubbleText],
                            alpha: 0,
                            duration: 300,
                            onComplete: () => {
                                if (bubble && bubble.scene) bubble.destroy();
                                if (bubbleText && bubbleText.scene) bubbleText.destroy();
                            }
                        });
                    }
                });
                
                // Make CLOVER clickable (not black sheep)
                goldenClover.once('pointerdown', () => {
                    // Cancel bubble timer if still active
                    if (bubbleTimer) {
                        bubbleTimer.remove();
                    }
                    
                    // Remove bubble immediately
                    if (bubble && bubble.scene) bubble.destroy();
                    if (bubbleText && bubbleText.scene) bubbleText.destroy();
                    
                    // Stop clover pulse
                    this.tweens.killTweensOf(goldenClover);
                    
                    // Collect golden clover first
                    this.collectGoldenClover(goldenClover);
                    
                    // Then automatically collect black sheep after a short delay
                    this.time.delayedCall(500, () => {
                        this.collectBlackSheep();
                    });
                });
            }
        });
        
        // Notify HUD
        this.events.emit('market-event', { type: 'BLACKSHEEP_ARRIVAL', message: 'BLACK SHEEP!' });
    }
    
    collectGoldenClover(cloverSprite) {
        // Remove interactivity
        cloverSprite.disableInteractive();
        
        // Get HUD scene
        const hudScene = this.scene.get('HUDScene');
        
        // Target position: button 1 (left of dog button)
        const spacing = 145;
        const totalWidth = (7 * spacing);
        const buttonRelativeX = -totalWidth / 2 + (1 * spacing);
        const buttonX = CONFIG.width / 2 + buttonRelativeX;
        const buttonY = CONFIG.height - 200 + 125;
        
        // Create flying clover sprite in HUD scene
        const flyingClover = hudScene.add.image(cloverSprite.x, cloverSprite.y, 'golden_clover');
        flyingClover.setScale(0.12);
        flyingClover.setDepth(10000);
        
        // Hide original clover
        cloverSprite.setVisible(false);
        
        // Play collection sound
        audioManager.playCoin();
        
        // Fly to button 1
        hudScene.tweens.add({
            targets: flyingClover,
            x: buttonX,
            y: buttonY,
            scale: 0.10,
            rotation: Math.PI * 2,
            duration: 800,
            ease: 'Power2.easeInOut',
            onComplete: () => {
                // Create impact particle burst (golden particles)
                const impactParticles = hudScene.add.particles(buttonX, buttonY, 'dust_particle', {
                    speed: { min: 100, max: 200 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 0.6, end: 0 },
                    alpha: { start: 0.8, end: 0 },
                    lifespan: 600,
                    quantity: 15,
                    blendMode: 'ADD',
                    tint: 0xffd700 // Gold tint
                });
                impactParticles.setDepth(10001);
                impactParticles.explode();
                
                // Clover settles into button with bounce
                hudScene.tweens.add({
                    targets: flyingClover,
                    scale: 0.12,
                    duration: 200,
                    yoyo: true,
                    repeat: 1,
                    ease: 'Quad.easeOut',
                    onComplete: () => {
                        // Play coin sound
                        audioManager.playCoin();
                        
                        // Keep clover visible in button (don't fade out)
                        flyingClover.setScale(0.10);
                        
                        // Unlock golden clover button (button 1)
                        hudScene.unlockGoldenCloverButton(1, flyingClover);
                        
                        // Mark as collected
                        this.goldenCloverCollected = true;
                        
                        // Game was never paused - no need to resume
                    }
                });
            }
        });
    }
    
    collectBlackSheep() {
        // Remove interactivity
        this.blackSheep.disableInteractive();
        
        // Get HUD scene
        const hudScene = this.scene.get('HUDScene');
        
        // Target position: button 6 (right of bone button)
        const spacing = 145;
        const totalWidth = (7 * spacing);
        const buttonRelativeX = -totalWidth / 2 + (6 * spacing);
        const buttonX = CONFIG.width / 2 + buttonRelativeX;
        const buttonY = CONFIG.height - 200 + 125;
        
        // Create flying black sheep sprite in HUD scene
        const flyingBlackSheep = hudScene.add.image(this.blackSheep.x, this.blackSheep.y, 'sheep');
        flyingBlackSheep.setTint(0x4a4a4a); // Dark grey tint
        flyingBlackSheep.setScale(0.12);
        flyingBlackSheep.setDepth(10000);
        
        // Hide original black sheep
        this.blackSheep.setVisible(false);
        
        // Play collection sound
        audioManager.playCoin();
        
        // Fly to button 6
        hudScene.tweens.add({
            targets: flyingBlackSheep,
            x: buttonX,
            y: buttonY,
            scale: 0.10,
            rotation: Math.PI * 2,
            duration: 800,
            ease: 'Power2.easeInOut',
            onComplete: () => {
                // Create impact particle burst
                const impactParticles = hudScene.add.particles(buttonX, buttonY, 'dust_particle', {
                    speed: { min: 100, max: 200 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 0.6, end: 0 },
                    alpha: { start: 0.8, end: 0 },
                    lifespan: 600,
                    quantity: 15,
                    blendMode: 'ADD',
                    tint: 0xfcd535
                });
                impactParticles.setDepth(10001);
                impactParticles.explode();
                
                // Black sheep settles into button with bounce
                hudScene.tweens.add({
                    targets: flyingBlackSheep,
                    scale: 0.12,
                    duration: 200,
                    yoyo: true,
                    repeat: 1,
                    ease: 'Quad.easeOut',
                    onComplete: () => {
                        // Play coin sound
                        audioManager.playCoin();
                        
                        // Keep black sheep visible in button (don't fade out)
                        flyingBlackSheep.setScale(0.10);
                        
                        // Unlock black sheep button (button 6)
                        hudScene.unlockBlackSheepButton(6, flyingBlackSheep);
                        
                        // Mark as collected
                        this.blackSheepCollected = true;
                        
                        // Game was never paused - no need to resume
                    }
                });
            }
        });
    }
    
    spawnGoldenSheep() {
        console.log('✨ Golden Sheep Pops In!');
        
        const startX = CONFIG.width / 2;
        const startY = CONFIG.height / 2 - 50;
        
        this.goldenSheepSprite = this.add.image(startX, startY, 'golden_sheep');
        this.goldenSheepSprite.setScale(0); 
        this.goldenSheepSprite.setDepth(500); 
        
        this.tweens.add({
            targets: this.goldenSheepSprite,
            scale: 0.25,
            duration: 400,
            ease: 'Back.easeOut'
        });
        
        this.goldenSheepSparkles = this.add.particles(startX, startY, 'sparkle_particle', {
            speed: { min: 20, max: 50 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 1000,
            frequency: 50,
            quantity: 2,
            blendMode: 'ADD',
            tint: [0xffd700, 0xffed4e, 0xffffff]
        });
        this.goldenSheepSparkles.setDepth(499);
        
        const lightRays = this.add.graphics();
        lightRays.setDepth(498);
        lightRays.lineStyle(3, 0xffd700, 0.6);
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8;
            const length = 60;
            lightRays.lineBetween(
                startX, startY,
                startX + Math.cos(angle) * length,
                startY + Math.sin(angle) * length
            );
        }
        this.goldenSheepLightRays = lightRays;
        
        this.tweens.add({
            targets: lightRays,
            angle: 360,
            duration: 3000,
            repeat: -1,
            ease: 'Linear'
        });
        
        if (typeof audioManager !== 'undefined') audioManager.playCoin();
        
        this.goldenSheepActivated = true;
        this.level12CelebrationComplete = true; // Mark as complete!
    }

    restoreSunnyWeather() {
        console.log('☀️ Restoring sunny weather...');
        
        // Gradually fade out rain particles
        if (this.rainEmitter && this.rainEmitter.emitting) {
            this.tweens.add({
                targets: this.rainEmitter,
                alpha: 0,
                duration: 2000,
                onComplete: () => {
                    this.rainEmitter.stop();
                }
            });
        }
        
        // Fade out rain sound
        if (this.rainSound && this.rainSound.isPlaying) {
            this.tweens.add({
                targets: this.rainSound,
                volume: 0,
                duration: 2000,
                onComplete: () => {
                    this.rainSound.stop();
                }
            });
        }
        
        // Fade out wind sound
        if (this.windSound && this.windSound.isPlaying) {
            this.tweens.add({
                targets: this.windSound,
                volume: 0,
                duration: 2000,
                onComplete: () => {
                    this.windSound.stop();
                }
            });
        }
        
        // Stop lightning
        this.lightningActive = false;
        this.lightningTimer = 999999;
        
        // Brighten the scene (remove darkness overlay)
        if (this.darknessOverlay) {
            this.tweens.add({
                targets: this.darknessOverlay,
                alpha: 0,
                duration: 2000,
                onComplete: () => {
                    this.darknessOverlay.destroy();
                    this.darknessOverlay = null;
                }
            });
        }
        
        // Clear mud/wet grass effects
        if (this.mudOverlay) {
            this.tweens.add({
                targets: this.mudOverlay,
                alpha: 0,
                duration: 2000,
                onComplete: () => {
                    this.mudOverlay.destroy();
                    this.mudOverlay = null;
                }
            });
        }
        
        // Brighten the pasture background back to normal
        if (this.pastureImage) {
            this.tweens.add({
                targets: this.pastureImage,
                alpha: 1.0,
                duration: 2000,
                ease: 'Sine.easeOut'
            });
            
            // Remove any dark tint
            this.tweens.addCounter({
                from: 0,
                to: 1,
                duration: 2000,
                ease: 'Sine.easeOut',
                onUpdate: (tween) => {
                    const progress = tween.getValue();
                    // Interpolate from dark tint (if any) back to white (normal)
                    const r = Math.floor(128 + (127 * progress));
                    const g = Math.floor(128 + (127 * progress));
                    const b = Math.floor(128 + (127 * progress));
                    const tintColor = (r << 16) | (g << 8) | b;
                    this.pastureImage.setTint(tintColor);
                },
                onComplete: () => {
                    this.pastureImage.clearTint();
                }
            });
        }
        
        // Brighten ALL sheep back to normal - AGGRESSIVE FIX
        console.log('☀️ BRIGHTENING ALL SHEEP - AGGRESSIVE MODE');
        if (this.sheep && this.sheep.children) {
            let sheepCount = 0;
            let darkSheepFixed = 0;
            
            this.sheep.children.entries.forEach(sheep => {
                if (sheep) {
                    sheepCount++;
                    
                    // Check if sheep is dark before fixing
                    const wasDark = sheep.tintTopLeft !== 0xffffff || sheep.alpha < 1.0;
                    
                    // NUCLEAR OPTION: Clear EVERYTHING
                    sheep.clearTint();
                    sheep.setTint(0xffffff);
                    sheep.setAlpha(1.0);
                    
                    // Clear any blend modes
                    sheep.setBlendMode(Phaser.BlendModes.NORMAL);
                    
                    // Force texture refresh
                    sheep.setTexture('sheep');
                    
                    // If sheep has been zombified by black sheep, clear that
                    if (sheep.zombified) {
                        sheep.zombified = false;
                        console.log(`Sheep ${sheepCount}: Was zombified, cleared state`);
                    }
                    
                    if (wasDark) {
                        darkSheepFixed++;
                        console.log(`Sheep ${sheepCount}: WAS DARK - FIXED! Tint: ${sheep.tintTopLeft.toString(16)}, Alpha: ${sheep.alpha}`);
                    }
                }
            });
            
            console.log(`☀️ Total sheep processed: ${sheepCount}`);
            console.log(`☀️ Dark sheep fixed: ${darkSheepFixed}`);
        }
        
        // Clear any group-level tints or alpha
        if (this.sheep) {
            this.sheep.setAlpha(1.0);
            this.sheep.children.entries.forEach(s => {
                if (s) {
                    s.clearTint();
                    s.setAlpha(1.0);
                }
            });
        }
        
        console.log('☀️ ALL SHEEP SHOULD BE BRIGHT NOW!');
        
        // Resume bird ambience
        import('../audio.js').then(({ audioManager }) => {
            if (audioManager.ambience && audioManager.ambience.state !== 'started') {
                audioManager.ambience.start();
                console.log('🐦 Birds singing again!');
            }
        }).catch(e => console.error(e));
    }
    
    fleaAllWolves() {
        console.log('🐺 All wolves fleeing!');
        
        // Get all active wolves
        if (this.wolves && this.wolves.children) {
            this.wolves.children.entries.forEach(wolf => {
                if (wolf && wolf.active) {
                    // Run away animation
                    const exitSide = wolf.x < CONFIG.width / 2 ? 'LEFT' : 'RIGHT';
                    const exitX = exitSide === 'LEFT' ? -100 : CONFIG.width + 100;
                    
                    this.tweens.add({
                        targets: wolf,
                        x: exitX,
                        duration: 1000,
                        ease: 'Power2.easeIn',
                        onComplete: () => {
                            wolf.destroy();
                        }
                    });
                }
            });
        }
        
        // Prevent new wolves from spawning
        this.nextWolfTime = 999999;
        this.wolfTimer = 0;
    }
    
    celebrateLevel12Victory() {
        if (this.activeLevel !== 12) return;
        
        this.level12State.isActive = true;
        this.level12State.phase = 'CELEBRATING';
        
        console.log('🎉 LEVEL 12 VICTORY CELEBRATION - STREAMLINED CINEMATIC FLOW');
        
        // 🎆 FIREWORKS
        const fireworkColors = [0xffd700, 0xffffff, 0xffed4e, 0xffc0cb, 0x87ceeb, 0xff69b4, 0x00ff00, 0xff1493];
        const numFireworks = 25; 
        
        for (let i = 0; i < numFireworks; i++) {
            this.time.delayedCall(i * 400, () => {
                if (!this.level12State.isActive) return;
                const x = Phaser.Math.Between(150, CONFIG.width - 150);
                const y = Phaser.Math.Between(80, 350);
                const color = fireworkColors[Math.floor(Math.random() * fireworkColors.length)];
                
                const firework = this.add.particles(x, y, 'sparkle_particle', {
                    speed: { min: 150, max: 400 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 0.3, end: 0 },
                    alpha: { start: 1, end: 0 },
                    lifespan: 2000,
                    quantity: 40,
                    blendMode: 'ADD',
                    tint: color,
                    gravityY: 150
                });
                firework.setDepth(1000);
                firework.explode();
                
                // audioManager.playFirework();
                if (typeof audioManager !== 'undefined') audioManager.playFirework();
                this.time.delayedCall(2500, () => { firework.destroy(); });
            });
        }
        
        // 📸 CONFETTI LAYER
        const confetti = this.add.particles(0, -50, 'sparkle_particle', {
            x: { min: 0, max: CONFIG.width },
            speedY: { min: 50, max: 150 },
            speedX: { min: -30, max: 30 },
            scale: { start: 0.5, end: 0.3 },
            alpha: { start: 0.9, end: 0.4 },
            lifespan: 5000,
            frequency: 80,
            quantity: 2,
            blendMode: 'ADD',
            tint: [0xffd700, 0xff69b4, 0x87ceeb, 0x00ff00, 0xffffff],
            gravityY: 100
        });
        confetti.setDepth(997);
        
        this.time.delayedCall(10000, () => {
            confetti.stop();
            this.time.delayedCall(5000, () => confetti.destroy());
        });
        
        // ✨ T+2s Sheep appears
        this.time.delayedCall(2000, () => {
            console.log('🐑 Spawning Golden Sheep...');
            if (!this.goldenSheepSpawned) {
                this.spawnGoldenSheep();
                this.goldenSheepSpawned = true;
            }
            
            // ✨ T+3s Weather clears & Resurrection
            this.time.delayedCall(1000, () => {
                console.log('🌞 Automatic weather clear & resurrection...');
                this.shootGoldenRaysAndResurrect();
            });
        });
    }

    startLevel12ResurrectionSequence() {
        if (this.activeLevel !== 12) return;
        if (!this.level12State || !this.level12State.isActive) return;
        console.log('🔑 Auto-unlocking levels...');
        
        const hudScene = this.scene.get('HUDScene');
        
        const startX = this.goldenSheepSprite ? this.goldenSheepSprite.x : CONFIG.width / 2;
        const startY = this.goldenSheepSprite ? this.goldenSheepSprite.y : CONFIG.height / 2;
        
        const goldenKey = hudScene.add.image(startX, startY, 'golden_key');
        goldenKey.setScale(0.15);
        goldenKey.setDepth(10000);
        
        const keyTrail = hudScene.add.particles(startX, startY, 'sparkle_particle', {
            speed: 0,
            scale: { start: 0.6, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 800,
            frequency: 20,
            quantity: 2,
            blendMode: 'ADD',
            tint: 0xffd700,
            follow: goldenKey
        });
        keyTrail.setDepth(9999);
        
        if (typeof audioManager !== 'undefined') audioManager.playCoin();
        
        hudScene.unlockAllLevelsAnimation(goldenKey, keyTrail);
    }

    shootGoldenRaysAndResurrect() {
        if (!this.level12State || !this.level12State.isActive) return;
        console.log('🌞 Weather clears automatically and resurrecting bones...');
        
        if (this.rainSound && this.rainSound.isPlaying) this.rainSound.stop();
        if (this.windSound && this.windSound.isPlaying) this.windSound.stop();
        this.lightningActive = false;
        
        if (this.rainEmitter) {
            this.rainEmitter.stop();
            this.rainEmitter.destroy();
            this.rainEmitter = null;
        }
        if (this.windEmitter) {
            this.windEmitter.stop();
            this.windEmitter.destroy();
            this.windEmitter = null;
        }
        if (this.darknessOverlay) {
            this.tweens.add({
                targets: this.darknessOverlay,
                alpha: 0,
                duration: 1000,
                onComplete: () => {
                    this.darknessOverlay.destroy();
                    this.darknessOverlay = null;
                }
            });
        }
        
        if (this.pastureImage) {
            this.pastureImage.clearTint();
            this.pastureImage.setAlpha(1.0);
        }
        
        const sheepX = this.goldenSheepSprite ? this.goldenSheepSprite.x : CONFIG.width/2;
        const sheepY = this.goldenSheepSprite ? this.goldenSheepSprite.y : CONFIG.height/2;
        
        this.createGoldenRaysFromCenter(sheepX, sheepY);
        this.resurrectAllBoneSheep();
        
        this.wetGrassApplied = false;
        if (this.sheep && this.sheep.children) {
            this.sheep.getChildren().forEach(sheep => {
                if (sheep && sheep.active && !sheep.isImmuneOutlier) {
                    this.tweens.killTweensOf(sheep);
                    this.tweens.add({
                        targets: sheep,
                        alpha: 1.0,
                        duration: 1500,
                        ease: 'Sine.easeOut'
                    });
                    sheep.clearTint();
                }
            });
        }
        
        this.removeAllWolvesLevel12();
        
        // T+5s Unlock Animation
        this.time.delayedCall(2000, () => {
            this.startLevel12ResurrectionSequence();
        });
    }

    createGoldenRaysFromCenter(centerX, centerY) {
        // Create radial golden rays shooting outward from center
        const rayGraphics = this.add.graphics();
        rayGraphics.setDepth(496);
        
        const numRays = 16;
        const rayColors = [0xffd700, 0xffed4e, 0xffffff];
        
        for (let i = 0; i < numRays; i++) {
            const angle = (i * Math.PI * 2) / numRays;
            const color = rayColors[i % rayColors.length];
            
            // Create ray that extends outward
            const rayLength = { value: 0 };
            
            this.tweens.add({
                targets: rayLength,
                value: 1000,
                duration: 1500,
                delay: i * 30, // Stagger rays slightly
                ease: 'Cubic.easeOut',
                onUpdate: () => {
                    const len = rayLength.value;
                    const startX = centerX + Math.cos(angle) * 50;
                    const startY = centerY + Math.sin(angle) * 50;
                    const endX = centerX + Math.cos(angle) * len;
                    const endY = centerY + Math.sin(angle) * len;
                    
                    // Draw ray with gradient effect (thick at base, thin at tip)
                    const alpha = Math.max(0, 1 - (len / 1000));
                    const thickness = Math.max(2, 10 * (1 - len / 1000));
                    
                    rayGraphics.lineStyle(thickness, color, alpha * 0.6);
                    rayGraphics.lineBetween(startX, startY, endX, endY);
                },
                onComplete: () => {
                    if (i === numRays - 1) {
                        // Destroy after last ray completes
                        this.time.delayedCall(200, () => {
                            rayGraphics.destroy();
                        });
                    }
                }
            });
        }
        
        // Create golden particle explosion
        const explosionParticles = this.add.particles(centerX, centerY, 'sparkle_particle', {
            speed: { min: 200, max: 500 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.2, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 2000,
            quantity: 50,
            blendMode: 'ADD',
            tint: [0xffd700, 0xffed4e, 0xffffff],
            gravityY: -100
        });
        explosionParticles.setDepth(500);
        explosionParticles.explode();
        
        this.time.delayedCall(2000, () => {
            explosionParticles.destroy();
        });
        
        // Create bright golden flash
        const flash = this.add.rectangle(CONFIG.width / 2, CONFIG.height / 2, CONFIG.width, CONFIG.height, 0xffd700, 0.5);
        flash.setDepth(495);
        
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 800,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                flash.destroy();
            }
        });
    }
    
    // Called by HUDScene when player clicks Golden Sheep button (Level 12 only)
    // OLD FUNCTION - NO LONGER USED IN LEVEL 12 FLOW
    removeAllWolvesLevel12() {
        console.log('🐺 ═══ LEVEL 12: REMOVING ALL WOLVES ═══');
        
        if (!this.wolves || !this.wolves.children) {
            console.log('   No wolves to remove');
            return;
        }
        
        const wolfCount = this.wolves.children.entries.filter(w => w && w.active).length;
        console.log(`   Removing ${wolfCount} wolves...`);
        
        this.wolves.children.entries.forEach((wolf, index) => {
            if (wolf && wolf.active) {
                // Delay each wolf removal slightly for staggered effect
                this.time.delayedCall(index * 100, () => {
                    // ═══ BURST INTO DUST ═══
                    const dustBurst = this.add.particles(wolf.x, wolf.y, 'dust_particle', {
                        speed: { min: 50, max: 150 },
                        angle: { min: 0, max: 360 },
                        scale: { start: 1.0, end: 0 },
                        alpha: { start: 0.8, end: 0 },
                        lifespan: 800,
                        quantity: 30,
                        blendMode: 'NORMAL',
                        tint: 0x666666
                    });
                    dustBurst.setDepth(499);
                    dustBurst.explode();
                    
                    // Play dust sound
                    audioManager.playClick();
                    
                    // Fade out wolf
                    this.tweens.add({
                        targets: wolf,
                        alpha: 0,
                        scale: 0.5,
                        duration: 400,
                        onComplete: () => {
                            // ═══ TURN INTO BONES ═══
                            this.createBonesFromWolf(wolf.x, wolf.y);
                            
                            // Destroy wolf
                            wolf.destroy();
                        }
                    });
                    
                    this.time.delayedCall(1000, () => {
                        dustBurst.destroy();
                    });
                });
            }
        });
        
        // Prevent new wolves from spawning
        this.nextWolfTime = 999999;
        this.wolfTimer = 0;
        
        console.log('✅ All wolves removed!');
    }
    
    createBonesFromWolf(x, y) {
        // Create bone sprite at wolf location (same as createBonesFromSheep but for wolves)
        const bones = this.add.text(x, y, '🦴', {
            font: '48px Arial'
        }).setOrigin(0.5);
        
        bones.setDepth(200);
        
        // Start invisible and fade in
        bones.setAlpha(0);
        bones.setScale(0.5);
        
        this.tweens.add({
            targets: bones,
            alpha: 1,
            scale: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });
        
        // Gentle bobbing animation
        this.tweens.add({
            targets: bones,
            y: y - 5,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Add to bones list for tracking
        this.bonesList.push(bones);
    }
    
    // Called by HUDScene after Golden Key fully unlocks all levels
    finalizeGoldenKeySequence() {
        if (this.activeLevel !== 12) return;
        if (!this.level12State || !this.level12State.isActive) return;
        
        console.log('✨ ═══ GOLDEN KEY SEQUENCE FINALIZED ═══');
        console.log('🔓 All levels unlocked by Golden Key animation');
        
        // 🔓 UNLOCK ALL LEVELS IN LOCALSTORAGE
        console.log('💾 Saving unlock state to localStorage...');
        localStorage.setItem('sheepMarket_playerLevel', '12');
        localStorage.setItem('sheepMarket_allLevelsUnlocked', 'true');
        console.log('✅ AllLevelsUnlocked saved to localStorage');
        
        // Update state
        this.level12State.phase = 'COMPLETE';
        
        // Emit event to trigger Game Won popup in HUD
        this.events.emit('level12-complete');
        console.log('📡 Event emitted: level12-complete');
    }

    
    collectGoldenSheep() {
        if (this.activeLevel !== 12) return;
        if (!this.level12State || !this.level12State.isActive) return;
        console.log('✨ Collecting Golden Sheep...');
        
        // Get HUD scene
        const hudScene = this.scene.get('HUDScene');
        
        // Target position: button 0 (left of Golden Clover)
        const spacing = 145;
        const totalWidth = (7 * spacing);
        const buttonRelativeX = -totalWidth / 2 + (0 * spacing);
        const buttonX = CONFIG.width / 2 + buttonRelativeX;
        const buttonY = CONFIG.height - 200 + 125;
        
        // Create flying golden sheep in HUD scene (using unique golden sheep asset with key)
        const flyingGoldenSheep = hudScene.add.image(this.goldenSheepSprite.x, this.goldenSheepSprite.y, 'golden_sheep');
        flyingGoldenSheep.setScale(0.25); // Match the larger size
        flyingGoldenSheep.setDepth(10000);
        
        // Create glowing trail
        const trail = hudScene.add.particles(this.goldenSheepSprite.x, this.goldenSheepSprite.y, 'sparkle_particle', {
            speed: 0,
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 800,
            frequency: 30,
            quantity: 1,
            blendMode: 'ADD',
            tint: 0xffd700,
            follow: flyingGoldenSheep
        });
        trail.setDepth(9999);
        
        // Hide original
        this.goldenSheepSprite.setVisible(false);
        if (this.goldenSheepSparkles) this.goldenSheepSparkles.destroy();
        if (this.goldenSheepLightRays) this.goldenSheepLightRays.destroy();
        
        // Play collection sound
        audioManager.playCoin();
        
        // Fly to button
        hudScene.tweens.add({
            targets: flyingGoldenSheep,
            x: buttonX,
            y: buttonY,
            scale: 0.10,
            rotation: Math.PI * 2,
            duration: 800,
            ease: 'Power2.easeInOut',
            onComplete: () => {
                // Stop trail
                trail.stop();
                
                // Impact particles
                const impactParticles = hudScene.add.particles(buttonX, buttonY, 'sparkle_particle', {
                    speed: { min: 100, max: 200 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 0.6, end: 0 },
                    alpha: { start: 0.8, end: 0 },
                    lifespan: 600,
                    quantity: 20,
                    blendMode: 'ADD',
                    tint: 0xffd700
                });
                impactParticles.setDepth(10001);
                impactParticles.explode();
                
                // Settle into button
                hudScene.tweens.add({
                    targets: flyingGoldenSheep,
                    scale: 0.11,
                    duration: 200,
                    yoyo: true,
                    repeat: 1,
                    ease: 'Quad.easeOut',
                    onComplete: () => {
                        audioManager.playCoin();
                        flyingGoldenSheep.setScale(0.10);
                        
                        // Unlock button 0 (left of Golden Clover)
                        hudScene.unlockGoldenSheepButton(0, flyingGoldenSheep);
                        
                        this.goldenSheepCollected = true;
                    }
                });
            }
        });
    }
    
    collectDogBone(boneSprite) {
        // Remove interactivity
        boneSprite.disableInteractive();
        
        // Target position: button 5 (right of lawn mower)
        const spacing = 145;
        const totalWidth = (7 * spacing);
        const buttonRelativeX = -totalWidth / 2 + (5 * spacing);
        const targetX = CONFIG.width / 2 + buttonRelativeX;
        const targetY = CONFIG.height - 200 + 125;
        
        // Get HUD scene
        const hudScene = this.scene.get('HUDScene');
        
        // Create flying bone in HUD scene
        const flyingBone = hudScene.add.text(boneSprite.x, boneSprite.y, '🦴', {
            font: '48px Arial'
        }).setOrigin(0.5);
        
        flyingBone.setDepth(10000);
        
        // Hide original
        boneSprite.setVisible(false);
        
        // Stop tweens on original
        this.tweens.killTweensOf(boneSprite);
        
        // LEVEL 7: First bone triggers dog/bone button unlock (regardless of persisted bone count from Level 8+)
        // LEVEL 8+: Buttons already unlocked, so this logic doesn't trigger
        const isFirstBone = this.activeLevel === 7 && !this.dogHerdingButtonUnlocked;
        console.log(`🦴 Bone collected - Level: ${this.activeLevel}, dogHerdingButtonUnlocked: ${this.dogHerdingButtonUnlocked}, isFirstBone: ${isFirstBone}`);
        
        // Fly to button
        hudScene.tweens.add({
            targets: flyingBone,
            x: targetX,
            y: targetY - 150,
            scale: 1.2,
            rotation: Math.PI * 2,
            duration: 500,
            ease: 'Power2.easeOut',
            onComplete: () => {
                hudScene.tweens.add({
                    targets: flyingBone,
                    y: targetY,
                    scale: 0.6,
                    duration: 200,
                    ease: 'Power2.easeIn',
                    onComplete: () => {
                        // Create impact particle burst (matching grass collection)
                        const impactParticles = hudScene.add.particles(targetX, targetY, 'grass_tuft', {
                            speed: { min: 100, max: 200 },
                            angle: { min: 0, max: 360 },
                            scale: { start: 0.3, end: 0 },
                            alpha: { start: 0.8, end: 0 },
                            lifespan: 600,
                            quantity: 15,
                            blendMode: 'ADD',
                            tint: 0xffaa44 // Orange tint for bones
                        });
                        impactParticles.setDepth(10001);
                        impactParticles.explode();
                        
                        // Bone settles into button with bounce (matching grass)
                        hudScene.tweens.add({
                            targets: flyingBone,
                            scale: 0.5,
                            duration: 200,
                            yoyo: true,
                            repeat: 1,
                            ease: 'Quad.easeOut',
                            onComplete: () => {
                                // Keep bone visible at button location
                                flyingBone.setScale(0.6);
                                
                                boneSprite.destroy();
                                
                                // BONE COUNT LIFECYCLE: Increment when bone impacts button (first bone collection)
                                // LEVEL 7 FIRST BONE: Reset count to 1 (clear any persisted bones from Level 8+)
                                // LEVEL 8+: Increment normally
                                if (isFirstBone) {
                                    // First bone in Level 7 - reset to 1
                                    this.collectedBonesCount = 1;
                                    console.log('🦴 Level 7 first bone - count reset to: 1');
                                } else {
                                    // Normal increment for additional bones
                                    if (!this.collectedBonesCount) this.collectedBonesCount = 0;
                                    this.collectedBonesCount++;
                                    console.log('🦴 Bone impacted button - count incremented to:', this.collectedBonesCount);
                                }
                                
                                // PERSISTENCE: Save to localStorage (persists across levels)
                                // ENDLESS MODE: Use separate storage
                                const boneStorageKey = this.isEndlessMode ? 'sheepMarket_endless_boneCount' : 'sheepMarket_boneCount';
                                localStorage.setItem(boneStorageKey, this.collectedBonesCount.toString());
                                
                                // Emit event to update bone counter display
                                this.events.emit('bones-collected', this.collectedBonesCount);
                                
                                audioManager.playCoin();
                                
                                // Fade out bone after settling
                                hudScene.tweens.add({
                                    targets: flyingBone,
                                    alpha: 0,
                                    duration: 400,
                                    delay: 200,
                                    onComplete: () => {
                                        flyingBone.destroy();
                                        
                                        // UNLOCK BONE BUTTON immediately after bone impacts (Level 7 only)
                                        if (isFirstBone && this.activeLevel === 7) {
                                            hudScene.unlockBoneButton(5);
                                            // Mark buttons as unlocked to prevent re-triggering
                                            this.dogHerdingButtonUnlocked = true;
                                        }
                                        
                                        // DOG FLIES TO ITS BUTTON after bone impacts (Level 7 only)
                                        if (isFirstBone && this.activeLevel === 7 && this.friendlyDog) {
                                            // Calculate dog button position (button index 2)
                                            const spacing = 145;
                                            const totalWidth = (7 * spacing);
                                            const dogButtonRelativeX = -totalWidth / 2 + (2 * spacing);
                                            const dogButtonX = CONFIG.width / 2 + dogButtonRelativeX;
                                            const dogButtonY = CONFIG.height - 200 + 125;
                                            
                                            // Create flying dog sprite in HUD scene
                                            const flyingDog = hudScene.add.image(this.friendlyDog.x, this.friendlyDog.y, 'sheepdog');
                                            flyingDog.setScale(0.15);
                                            flyingDog.setDepth(200); // Below HUD but visible in pasture
                                            
                                            // Hide original dog
                                            this.friendlyDog.setVisible(false);
                                            
                                            // Fly to button 2
                                            hudScene.tweens.add({
                                                targets: flyingDog,
                                                x: dogButtonX,
                                                y: dogButtonY,
                                                scale: 0.12,
                                                rotation: Math.PI * 2,
                                                duration: 800,
                                                ease: 'Power2.easeInOut',
                                                onComplete: () => {
                                                    // Create impact particle burst (matching bone collection)
                                                    const impactParticles = hudScene.add.particles(dogButtonX, dogButtonY, 'dust_particle', {
                                                        speed: { min: 100, max: 200 },
                                                        angle: { min: 0, max: 360 },
                                                        scale: { start: 0.6, end: 0 },
                                                        alpha: { start: 0.8, end: 0 },
                                                        lifespan: 600,
                                                        quantity: 15,
                                                        blendMode: 'ADD',
                                                        tint: 0xfcd535 // Gold tint matching button border
                                                    });
                                                    impactParticles.setDepth(10001);
                                                    impactParticles.explode();
                                                    
                                                    // Dog settles into button with bounce (matching bone)
                                                    hudScene.tweens.add({
                                                        targets: flyingDog,
                                                        scale: 0.14,
                                                        duration: 200,
                                                        yoyo: true,
                                                        repeat: 1,
                                                        ease: 'Quad.easeOut',
                                                        onComplete: () => {
                                                            // Play coin sound
                                                            audioManager.playCoin();
                                                            
                                                            // Fade out dog sprite after settling
                                                            hudScene.tweens.add({
                                                                targets: flyingDog,
                                                                alpha: 0,
                                                                duration: 400,
                                                                delay: 200,
                                                                onComplete: () => {
                                                                    // Unlock dog button (button 2) with full animation
                                                                    hudScene.unlockDogButton(2, flyingDog);
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    emitPanic(x, y) {
        if (this.panicEmitter) {
            this.panicEmitter.explode(4, x, y);
        }
    }

    tickRound() {
        if (!this.roundActive) return;

        this.timeLeft--;
        
        // LEVEL 3: Lawn mower is now synced with wind gust events (see startWindEvent)
        // No time-based trigger needed - lawn mower spawns with the first appropriate wind gust
        
        // GRAZING SYSTEM: Active from 58 seconds to 7 seconds remaining (LEVEL 5-12)
        if (this.activeLevel >= 5 && this.activeLevel <= 12) {
            if (this.timeLeft === 58) {
                this.startGrazingPeriod();
            } else if (this.timeLeft === 7) {
                this.stopGrazingPeriod();
            }
        }
        
        // LEVEL 4 WEATHER TRANSITION: Fade out storm at 55s, muddy ground activates
        if (this.activeLevel === 4) {
            // At 55 seconds: Stop wind and start fading rain, activate mud
            if (this.timeLeft === 55) {
                // Stop wind events
                if (this.windActive) {
                    this.stopWindEvent();
                }
                
                // Fade out rain particles
                if (this.rainEmitter) {
                    this.tweens.add({
                        targets: this.rainEmitter,
                        alpha: { from: 1, to: 0 },
                        duration: 5000, // 5 second fade
                        onComplete: () => {
                            if (this.rainEmitter) this.rainEmitter.stop();
                        }
                    });
                }
                
                // Fade out rain sound
                import('tone').then((Tone) => {
                    import('../audio.js').then(({ audioManager }) => {
                        if (audioManager.rainAmbience && audioManager.rainAmbience.state === 'started') {
                            const now = Tone.now();
                            audioManager.rainAmbience.volume.rampTo(-60, 5, now); // 5 second fade
                            setTimeout(() => {
                                if (audioManager.rainAmbience) audioManager.rainAmbience.stop();
                            }, 5000);
                        }
                    }).catch(e => console.error(e));
                }).catch(e => console.error(e));
                
                // ACTIVATE MUD - Make ground muddy brown with puddles
                if (this.pastureImage) {
                    this.tweens.add({
                        targets: this.pastureImage,
                        duration: 2000,
                        ease: 'Sine.easeInOut',
                        onUpdate: () => {
                            const progress = this.tweens.getTweensOf(this.pastureImage)[0]?.progress || 0;
                            const wetTint = 0x5a6a5a; // Dark green-gray
                            const muddyTint = 0x4a3a2a; // Much darker muddy brown
                            
                            // Interpolate RGB channels to muddy brown
                            const r = Math.floor(((wetTint >> 16) & 0xff) + progress * (((muddyTint >> 16) & 0xff) - ((wetTint >> 16) & 0xff)));
                            const g = Math.floor(((wetTint >> 8) & 0xff) + progress * (((muddyTint >> 8) & 0xff) - ((wetTint >> 8) & 0xff)));
                            const b = Math.floor((wetTint & 0xff) + progress * ((muddyTint & 0xff) - (wetTint & 0xff)));
                            
                            const newTint = (r << 16) | (g << 8) | b;
                            this.pastureImage.setTint(newTint);
                        }
                    });
                }
                
                // NEW MUD SYSTEM: Footprints array for tracking
                this.mudFootprints = [];
                
                // Create mud overlay - semi-transparent brown layer over entire field
                this.mudOverlay = this.add.rectangle(
                    CONFIG.width / 2,
                    CONFIG.height / 2 - 50,
                    CONFIG.width,
                    CONFIG.height - 200,
                    0x6b4423, // Lighter brown - chocolate mud color
                    0
                );
                this.mudOverlay.setDepth(0.5);
                
                // Fade in mud overlay
                this.tweens.add({
                    targets: this.mudOverlay,
                    alpha: 0.40, // Slightly more opaque for better brown visibility
                    duration: 2000,
                    ease: 'Sine.easeInOut'
                });
                
                // Make sheep muddy (darker brown tint)
                // SKIP if Golden Sheep activated (brightness locked)
                if (!this.goldenSheepActivated) {
                    this.sheep.getChildren().forEach((s) => {
                        // Double-check individual sheep brightness lock
                        if (!s.brightnessLocked) {
                            this.tweens.add({
                                targets: s,
                                duration: 2000,
                                ease: 'Sine.easeInOut',
                                onUpdate: () => {
                                    const progress = this.tweens.getTweensOf(s)[0]?.progress || 0;
                                    const wetTint = 0x8899aa; // Wet blue-gray
                                    const muddyTint = 0x7a6a4a; // Darker muddy sheep brown
                                    
                                    const r = Math.floor(((wetTint >> 16) & 0xff) + progress * (((muddyTint >> 16) & 0xff) - ((wetTint >> 16) & 0xff)));
                                    const g = Math.floor(((wetTint >> 8) & 0xff) + progress * (((muddyTint >> 8) & 0xff) - ((wetTint >> 8) & 0xff)));
                                    const b = Math.floor((wetTint & 0xff) + progress * ((muddyTint & 0xff) - (wetTint & 0xff)));
                                    
                                    const newTint = (r << 16) | (g << 8) | b;
                                    s.setTint(newTint);
                                }
                            });
                        }
                    });
                }
                
                // Notification
                this.events.emit('market-event', { type: 'WEATHER', message: 'MUDDY GROUND!', color: '#8B4513' });
                
                // ENABLE MUD MECHANICS
                this.mudActive = true;
            }
            
            // At 45 seconds: Sun comes out - REMOVE ALL DARK/WET EFFECTS (Mud lasts 10s: 55s to 45s)
            if (this.timeLeft === 45) {
                // Stop mud mechanics
                this.mudActive = false;
                
                // Stop rain sound effect (fade out over 2s)
                audioManager.stopRainAmbience();
                
                // Create sun ray beams
                this.createSunRays();
                
                // REMOVE DARK TINT from pasture - fade to normal brightness over 3 seconds
                if (this.pastureImage) {
                    const currentTint = this.pastureImage.tintTopLeft || 0x6b5a4a; // Get current muddy tint
                    const tempPasture = { tintValue: 0 };
                    
                    this.tweens.add({
                        targets: tempPasture,
                        tintValue: 1,
                        duration: 3000,
                        ease: 'Sine.easeInOut',
                        onUpdate: () => {
                            const progress = tempPasture.tintValue;
                            
                            // Interpolate from current tint to white (no tint)
                            const r = Math.floor(((currentTint >> 16) & 0xff) + progress * (255 - ((currentTint >> 16) & 0xff)));
                            const g = Math.floor(((currentTint >> 8) & 0xff) + progress * (255 - ((currentTint >> 8) & 0xff)));
                            const b = Math.floor((currentTint & 0xff) + progress * (255 - (currentTint & 0xff)));
                            
                            const newTint = (r << 16) | (g << 8) | b;
                            this.pastureImage.setTint(newTint);
                        },
                        onComplete: () => {
                            this.pastureImage.clearTint(); // Ensure fully cleared
                        }
                    });
                }
                
                // Fade out mud overlay
                if (this.mudOverlay) {
                    this.tweens.add({
                        targets: this.mudOverlay,
                        alpha: 0,
                        duration: 3000,
                        ease: 'Sine.easeOut',
                        onComplete: () => {
                            this.mudOverlay.destroy();
                            this.mudOverlay = null;
                        }
                    });
                }
                
                // Fade out all mud footprints
                if (this.mudFootprints) {
                    this.mudFootprints.forEach((footprint, i) => {
                        this.tweens.add({
                            targets: footprint,
                            alpha: 0,
                            duration: 2000,
                            delay: i * 10,
                            ease: 'Sine.easeOut',
                            onComplete: () => footprint.destroy()
                        });
                    });
                    this.mudFootprints = [];
                }
                
                // REMOVE DARK TINT from sheep - fade to normal brightness over 3 seconds
                // SKIP if Golden Sheep activated (brightness locked)
                if (!this.goldenSheepActivated) {
                    this.sheep.getChildren().forEach((s) => {
                        // Double-check individual sheep brightness lock
                        if (!s.brightnessLocked) {
                            const currentTint = s.tintTopLeft || 0x8b7355; // Get current muddy sheep tint
                            const tempSheep = { tintValue: 0 };
                            
                            this.tweens.add({
                                targets: tempSheep,
                                tintValue: 1,
                                duration: 3000,
                                ease: 'Sine.easeInOut',
                                onUpdate: () => {
                                    const progress = tempSheep.tintValue;
                                    
                                    // Interpolate from current tint to white (no tint)
                                    const r = Math.floor(((currentTint >> 16) & 0xff) + progress * (255 - ((currentTint >> 16) & 0xff)));
                                    const g = Math.floor(((currentTint >> 8) & 0xff) + progress * (255 - ((currentTint >> 8) & 0xff)));
                                    const b = Math.floor((currentTint & 0xff) + progress * (255 - (currentTint & 0xff)));
                                    
                                    const newTint = (r << 16) | (g << 8) | b;
                                    s.setTint(newTint);
                                },
                                onComplete: () => {
                                    s.clearTint(); // Ensure fully cleared
                                }
                            });
                        }
                    });
                }
                
                // Brighten background sky to regular brightness
                this.brightenBackgroundSky();
            }
        }
        
        // LEVEL 11-12 WEATHER SYSTEM: Progressive rain → wet → dark
        // SKIP if golden sheep activated
        if (!this.goldenSheepActivated && (this.activeLevel === 11 || this.activeLevel === 12)) {
            // LEVEL 12 ONLY: Lightning system with progressive intensity
            if (this.activeLevel === 12) {
                // Initialize lightning timer
                if (!this.lightningTimer) {
                    this.lightningTimer = 0;
                    this.nextLightningTime = Phaser.Math.Between(3000, 6000); // First lightning in 3-6 seconds
                }
                
                // Progressive weather intensity (0.0 = start, 1.0 = end)
                const weatherProgress = 1.0 - (this.timeLeft / 60); // 0 at start, 1 at end
                
                // Increase rain particle quantity over time
                if (this.rainEmitter && this.timeLeft % 10 === 0) { // Update every 10 seconds
                    const baseQuantity = 8;
                    const maxQuantity = 16;
                    const newQuantity = Math.floor(baseQuantity + (maxQuantity - baseQuantity) * weatherProgress);
                    this.rainEmitter.setQuantity(newQuantity);
                    console.log(`🌧️ LEVEL 12: Rain intensity increased to ${newQuantity} particles (progress: ${(weatherProgress * 100).toFixed(0)}%)`);
                }
                
                // Increase rain/wind volume over time
                if (this.rainSound && this.timeLeft % 5 === 0) { // Update every 5 seconds
                    const newVolume = 1.0 + (weatherProgress * 0.5); // 1.0 → 1.5
                    this.rainSound.setVolume(Math.min(newVolume, 1.5));
                }
                if (this.windSound && this.timeLeft % 5 === 0) {
                    const newVolume = 0.6 + (weatherProgress * 0.4); // 0.6 → 1.0
                    this.windSound.setVolume(Math.min(newVolume, 1.0));
                }
                
                // Lightning gets more frequent as storm intensifies
                const baseLightningMin = 4000; // 4 seconds
                const baseLightningMax = 8000; // 8 seconds
                const intenseLightningMin = 2000; // 2 seconds
                const intenseLightningMax = 4000; // 4 seconds
                
                const minInterval = baseLightningMin - (baseLightningMin - intenseLightningMin) * weatherProgress;
                const maxInterval = baseLightningMax - (baseLightningMax - intenseLightningMax) * weatherProgress;
                
                // Check for lightning strike
                if (!this.lightningActive && this.lightningTimer >= this.nextLightningTime) {
                    this.triggerLightning();
                    this.lightningTimer = 0;
                    this.nextLightningTime = Phaser.Math.Between(minInterval, maxInterval);
                    console.log(`⚡ Next lightning in ${(this.nextLightningTime / 1000).toFixed(1)}s (intensity: ${(weatherProgress * 100).toFixed(0)}%)`);
                }
            }
            
            // At 45 seconds: Start heavy rain
            if (this.timeLeft === 45 && !this.rainStarted) {
                console.log(`🌧️ LEVEL ${this.activeLevel}: Starting rain at 45 seconds - timeLeft:`, this.timeLeft);
                
                // Create more visible rain particles for Level 11
                if (!this.textures.exists('heavy_rain_particle')) {
                    const pg = this.make.graphics({ x: 0, y: 0, add: false });
                    pg.fillStyle(0xaaccff, 1.0);
                    pg.fillRect(0, 0, 3, 20);
                    pg.generateTexture('heavy_rain_particle', 3, 20);
                    pg.destroy();
                }
                
                // Stop existing rain emitter and create new heavy rain emitter
                if (this.rainEmitter) {
                    this.rainEmitter.stop();
                    this.rainEmitter.destroy();
                }
                
                // Create new heavy rain emitter
                this.rainEmitter = this.add.particles(0, 0, 'heavy_rain_particle', {
                    x: { min: -100, max: CONFIG.width + 100 },
                    y: -50,
                    lifespan: 1500,
                    speedY: { min: 700, max: 1000 },
                    speedX: { min: -50, max: 50 },
                    scale: { start: 1.2, end: 1.0 },
                    alpha: { start: 0.8, end: 0.4 },
                    quantity: 8,
                    emitting: true,
                    blendMode: 'NORMAL'
                });
                this.rainEmitter.setDepth(14);
                
                // Stop bird ambience sound
                if (audioManager.ambience && audioManager.ambience.state === 'started') {
                    import('tone').then((Tone) => {
                        const now = Tone.now();
                        audioManager.ambience.volume.rampTo(-60, 2, now);
                        this.time.delayedCall(2000, () => {
                            if (audioManager.ambience) audioManager.ambience.stop();
                        });
                    }).catch(e => console.error('Error loading Tone:', e));
                }
                
                // Start rain sound effect (check mute state)
                if (!audioManager.isSoundMuted && audioManager.rainAmbience && audioManager.rainAmbience.loaded) {
                    if (audioManager.rainAmbience.state !== 'started') {
                        audioManager.rainAmbience.start();
                    }
                }
                
                this.rainStarted = true;
            }
            
            // At 30 seconds: Darken/wet grass with SMOOTH FADE
            if (this.timeLeft === 30 && !this.wetGrassApplied) {
                console.log(`💧 LEVEL ${this.activeLevel}: Applying wet grass at 30 seconds - timeLeft:`, this.timeLeft, 'pastureImage exists:', !!this.pastureImage);
                
                // Darken grass to wet appearance with SMOOTH FADE
                if (this.pastureImage) {
                    const tempObj = { progress: 0 };
                    this.tweens.add({
                        targets: tempObj,
                        progress: 1,
                        duration: 3000, // 3 second smooth fade
                        ease: 'Sine.easeInOut',
                        onUpdate: () => {
                            const progress = tempObj.progress;
                            // Interpolate from white (0xffffff) to dark green-gray (0x5a6a5a)
                            const r = Math.floor(255 + (0x5a - 255) * progress);
                            const g = Math.floor(255 + (0x6a - 255) * progress);
                            const b = Math.floor(255 + (0x5a - 255) * progress);
                            const tint = (r << 16) | (g << 8) | b;
                            this.pastureImage.setTint(tint);
                        }
                    });
                    console.log(`💧 LEVEL ${this.activeLevel}: Grass fade started!`);
                }
                
                // Make sheep wet with darker tint - SMOOTH FADE (SHARED TWEEN)
                // SKIP if Golden Sheep activated (brightness locked)
                if (!this.goldenSheepActivated) {
                    const sheepArray = this.sheep.getChildren();
                    
                    // FIRST: Clear all existing tints to start from the same baseline (only unlocked sheep)
                    sheepArray.forEach(s => {
                        if (!s.brightnessLocked) {
                            s.clearTint();
                        }
                    });
                    
                    const sheepTempObj = { progress: 0 };
                    this.tweens.add({
                        targets: sheepTempObj,
                        progress: 1,
                        duration: 3000,
                        ease: 'Sine.easeInOut',
                        onUpdate: () => {
                            const progress = sheepTempObj.progress;
                            // Interpolate from white (0xffffff) to blue-gray (0x8899aa)
                            const r = Math.floor(255 + (0x88 - 255) * progress);
                            const g = Math.floor(255 + (0x99 - 255) * progress);
                            const b = Math.floor(255 + (0xaa - 255) * progress);
                            const tint = (r << 16) | (g << 8) | b;
                            // Apply same tint to ALL sheep simultaneously (only unlocked sheep)
                            sheepArray.forEach(s => {
                                if (!s.brightnessLocked) {
                                    s.setTint(tint);
                                }
                            });
                        }
                    });
                    console.log(`💧 LEVEL ${this.activeLevel}: Sheep fade started!`);
                }
                
                this.wetGrassApplied = true;
            }
        }
        
        // LEVEL 2 ONLY: Gloomy weather transition at 10 seconds
        if (this.activeLevel === 2 && this.timeLeft === 10 && !this.gloomyWeatherStarted) {
            this.gloomyWeatherStarted = true;
            this.startGloomyWeatherTransition();
        }
        
        // Gentle tick sound for last 10 seconds
        if (this.timeLeft <= 10 && this.timeLeft > 0) {
            import('../audio.js').then(({ audioManager }) => {
                audioManager.playTick();
            });
        }



        if (this.timeLeft <= 0) {
            this.settleRound();
        }
    }



    handleBuyOrder(data) {
        console.log(`🎯 GameScene.handleBuyOrder() called - Side: ${data.side}, EntryPrice: ${data.entryPrice}W`);
        
        // STRICT RULE: No betting if the round is not active (e.g., Victory March phase)
        // EXCEPTION: Allow betting during Tutorial Mode even if round is paused
        if (!this.roundActive && !this.tutorialMode) return;

        const { side, entryPrice } = data;
        
        // CRITICAL: Block ALL calls when balance is 0W or negative
        if (this.woolBalance <= 0) {
            console.log('🚫 CALL BLOCKED IN GAMESCENE: Balance is 0W - no calls allowed');
            return;
        }
        
        // Check if balance is enough for entry price
        if (this.woolBalance >= entryPrice - 0.001) {
            // Create new Call object
            const call = {
                side: side,
                entryPrice: entryPrice
            };
            
            // Add to calls array
            this.calls.push(call);
            
            // IMMEDIATE DEDUCTION
            const balanceBefore = this.woolBalance;
            this.woolBalance -= entryPrice;
            this.currentRoundSpent += entryPrice; // Track for stats
            console.log(`💸 Call placed: ${side} at ${entryPrice.toFixed(2)}W | Balance: ${balanceBefore.toFixed(2)}W → ${this.woolBalance.toFixed(2)}W`);
            
            // Play satisfying coin sound
            this.playWoolSpendSound(entryPrice);
            
            this.saveBalance(); // Persist immediately
            this.events.emit('balance-updated', this.woolBalance); // Notify HUD
            
            // Track call spending in lifetime stats
            const hudScene = this.scene.get('HUDScene');
            if (hudScene && hudScene.trackCallSpending) {
                hudScene.trackCallSpending(entryPrice);
            }

            // Update final call side (last bet determines final call)
            this.finalCallSide = side;

            // Notify HUD with call data
            this.events.emit('calls-updated', {
                calls: this.calls,
                finalCallSide: this.finalCallSide
            });

            // --- MARKET IMPACT MECHANIC ---
            // Impact based on entry price (larger bets = more wool spent = more impact)
            const impactAmount = entryPrice * 10; // Scale impact by price paid
            this.applyMarketPressure(side, impactAmount, entryPrice * 10); // Convert to percentage for compatibility
        }
    }

    handleRally(data) {
        if (!this.roundActive) return;
        
        // Deduct Cost
        this.woolBalance -= data.cost;
        
        // Play satisfying coin sound
        this.playWoolSpendSound(data.cost);
        
        this.saveBalance();
        this.events.emit('balance-updated', this.woolBalance);
        
        // Track call spending in lifetime stats
        const hudScene = this.scene.get('HUDScene');
        if (hudScene && hudScene.trackCallSpending) {
            hudScene.trackCallSpending(data.cost);
        }

        // Effect
        this.obedienceBoostActive = true;
        this.obedienceBoostEndTime = this.time.now + 5000; // 5 Seconds
        
        // Audio
        // Using 'bleat_go' as a placeholder for a whistle if no whistle sound exists
        // Or play 'call' via audio manager if available, but here we use scene sounds.
        // Let's use 'bleat_go' for now as a "Rally" sound.
        this.playSound('bleat_go', { volume: 1.0 });

        // Visual Feedback (Pulse on all sheep)
        this.sheep.getChildren().forEach(s => {
            if (s.active) {
                // SKIP tint if Golden Sheep activated (brightness locked in Level 12)
                if (!this.goldenSheepActivated) {
                    s.setTint(0xffff00); // Yellow Tint
                }
                this.tweens.add({
                    targets: s,
                    scaleX: 1.3,
                    scaleY: 0.8,
                    duration: 150,
                    yoyo: true,
                    onComplete: () => {
                        // SKIP clearTint if Golden Sheep activated
                        if (!this.goldenSheepActivated) {
                            s.clearTint();
                        }
                    }
                });
            }
        });
        
        // Show text
        this.events.emit('market-event', { type: 'REACTION', message: 'RALLYING FLOCK!', color: '#fcd535' });
    }

    handleDog(data) {
        if (!this.roundActive) return;

        // Deduct Cost
        this.woolBalance -= data.cost;
        
        // Play satisfying coin sound
        this.playWoolSpendSound(data.cost);
        
        this.saveBalance();
        this.events.emit('balance-updated', this.woolBalance);
        
        // Track call spending in lifetime stats
        const hudScene = this.scene.get('HUDScene');
        if (hudScene && hudScene.trackCallSpending) {
            hudScene.trackCallSpending(data.cost);
        }

        // Audio - Use procedural dog bark sound (NOT wolf growl)
        // Create a quick bark using Tone.js synth instead of wolf sound
        audioManager.playBaa(); // Temporary placeholder - uses sheep sound at different pitch

        // Effect: Scatter from Center
        const centerX = CONFIG.width / 2;
        const centerY = CONFIG.height / 2;
        
        this.sheep.getChildren().forEach(s => {
            if (s.active) {
                // ZOMBIE IMMUNITY: Zombified sheep ignore dog scatter
                if (s.isZombified) {
                    return;
                }
                
                const angle = Phaser.Math.Angle.Between(centerX, centerY, s.x, s.y);
                const speed = 400;
                
                // Override velocity directly
                // Assuming sheep update uses internal velocity or we simulate a "fear" push
                // We'll treat this like a momentary 'reactToMarket' but forced away from center
                const vecX = Math.cos(angle) * speed;
                const vecY = Math.sin(angle) * speed;
                
                // Force a reaction move
                s.reactToMarket(vecX, vecY, 1500); // Run for 1.5s
                
                // Emote
                s.showRejection(); // "!" emote
            }
        });

        // Visual Shockwave
        const shockwave = this.add.circle(centerX, centerY, 10, 0xffffff, 0.5);
        this.tweens.add({
            targets: shockwave,
            radius: 500,
            alpha: 0,
            duration: 800,
            onComplete: () => shockwave.destroy()
        });

        this.events.emit('market-event', { type: 'REACTION', message: 'SCATTER!', color: '#ffffff' });
    }

    handleHerdDog(data) {
        console.log('🐕 handleHerdDog called', { roundActive: this.roundActive, level: this.activeLevel, finalCallSide: this.finalCallSide, activeDogHerding: !!this.activeDogHerding });
        
        // Check if player is in free play mode (won Level 12)
        const inFreePlayMode = localStorage.getItem('sheepMarket_goldenKeyActivated') === 'true' && 
                                localStorage.getItem('sheepMarket_allLevelsUnlocked') === 'true';
        
        // Check if we're in Level 7+ OR free play mode
        if (this.activeLevel < 7 && !inFreePlayMode) {
            console.log('🐕 Cannot herd: not Level 7+ and not in free play mode');
            return;
        }
        
        // ALLOW MULTIPLE DOGS: Don't block if dog already active
        // If dog is already herding, allow another dog to be activated
        if (this.activeDogHerding) {
            console.log('🐕 Dog already herding - stopping current dog and starting new one');
            // Stop the current dog
            if (this.activeDogHerding.stopHerding) {
                this.activeDogHerding.stopHerding();
            }
        }
        
        // Determine target side from most recent call, or default to RIGHT if no call made yet
        let targetSide = this.finalCallSide; // 'LEFT' or 'RIGHT'
        
        if (!targetSide) {
            console.log('🐕 No call made yet - herding to RIGHT by default');
            targetSide = 'RIGHT'; // Default direction
        }
        
        console.log('🐕 Starting herding to', targetSide);
        
        // Play bark sound immediately when dog button is pressed (only during active round)
        if (this.roundActive) {
            try {
                this.playSound('dog_bark', { volume: 0.6 });
                console.log('🐕 Initial bark played on button press');
            } catch (e) {
                console.error('🐕 Failed to play initial bark:', e);
            }
        }
        
        // Get HUD scene for dog button
        const hudScene = this.scene.get('HUDScene');
        const dogButton = hudScene.abilityButtons[2];
        
        if (!dogButton || !dogButton.dogImage) return;
        
        // Calculate button world position
        const spacing = 145;
        const totalWidth = (7 * spacing);
        const dogButtonRelativeX = -totalWidth / 2 + (2 * spacing);
        const dogButtonX = CONFIG.width / 2 + dogButtonRelativeX;
        const dogButtonY = CONFIG.height - 200 + 125;
        
        // Create flying dog from button
        const flyingDog = hudScene.add.image(dogButtonX, dogButtonY, 'sheepdog');
        flyingDog.setScale(0.10);
        flyingDog.setDepth(200); // Below HUD but visible in pasture
        
        // Hide dog in button temporarily
        dogButton.dogImage.setVisible(false);
        
        // Hide lock icon while herding (Level 7-12)
        if (this.activeLevel >= 7 && this.activeLevel <= 12 && dogButton.icon) {
            dogButton.icon.setVisible(false);
        }
        
        // Target position in center of pasture
        const targetX = CONFIG.width / 2;
        const targetY = CONFIG.height / 2 - 100;
        
        // Keep dog on HUD (above call buttons) - don't transfer to GameScene
        // Position dog in green pasture area, well above call buttons
        const herdingStartY = CONFIG.height - 340; // In green pasture, above buttons
        
        hudScene.tweens.add({
            targets: flyingDog,
            y: herdingStartY,
            scale: 0.15,
            rotation: Math.PI * 2,
            duration: 600,
            ease: 'Power2.easeOut',
            onComplete: () => {
                // Set initial facing direction based on target side (dog sprite faces LEFT naturally)
                if (targetSide === 'LEFT') {
                    flyingDog.setFlipX(false); // Face left
                } else {
                    flyingDog.setFlipX(true); // Face right
                }
                
                // Start herding behavior (dog stays in HUD scene)
                this.herdSheep(flyingDog, targetSide, dogButtonX, dogButtonY, dogButton, hudScene);
            }
        });
    }

    herdSheep(dogSprite, targetSide, buttonX, buttonY, dogButton, hudScene) {
        console.log('🐕 herdSheep method called', { targetSide, sheepCount: this.sheep.getChildren().length });
        
        // Determine target zone based on side (more flexible - just a general area)
        const targetZoneX = targetSide === 'LEFT' ? CONFIG.width * 0.3 : CONFIG.width * 0.7;
        
        // Select 70% of sheep to obey (random selection)
        // ZOMBIE IMMUNITY: Exclude zombified sheep from dog herding
        const allSheep = this.sheep.getChildren().filter(s => s.active && !s.isEaten && !s.isZombified);
        const obeyCount = Math.floor(allSheep.length * 0.7);
        const shuffled = Phaser.Utils.Array.Shuffle([...allSheep]);
        const obeyingSheep = shuffled.slice(0, obeyCount);
        const disobeyingSheep = shuffled.slice(obeyCount);
        
        console.log('🐕 Sheep groups:', { total: allSheep.length, obeying: obeyingSheep.length, disobeying: disobeyingSheep.length, zombified: this.zombifiedSheep?.length || 0 });
        
        // Mark sheep
        obeyingSheep.forEach(s => s.isObeyingDog = true);
        disobeyingSheep.forEach(s => s.isDisobeyingDog = true);
        
        // Start continuous barking sound (looping) - bound to herding state
        // NOTE: Bark sound plays continuously while isHerding is active
        // Stops immediately when: stopHerding() is called, timer ≤ 5s auto-stop, or round reset
        let barkSound = null;
        
        // Bark occasionally (every 2-4 seconds) instead of looping continuously
        const playOccasionalBark = () => {
            // Only bark if dog is still actively herding
            if (this.activeDogHerding && this.activeDogHerding.dog) {
                try {
                    // Play a single bark sound (with mute check)
                    if (!audioManager.isSoundMuted) {
                        const bark = this.sound.add('dog_bark', { 
                            volume: 0.6, 
                            loop: false 
                        });
                        bark.play();
                    }
                    
                    // Schedule next bark in 2-4 seconds
                    const nextBarkDelay = Phaser.Math.Between(2000, 4000);
                    if (this.activeDogHerding) {
                        this.activeDogHerding.nextBarkTimer = this.time.delayedCall(nextBarkDelay, playOccasionalBark);
                    }
                } catch (e) {
                    console.error('🐕 Failed to play bark sound:', e);
                }
            }
        };
        
        // Start the occasional barking after initial delay
        this.time.delayedCall(800, playOccasionalBark);
        
        // Function to stop herding and return dog to button
        const stopHerding = () => {
            console.log('🐕 Stopping dog herding');
            
            // Cancel any pending bark timers
            if (this.activeDogHerding && this.activeDogHerding.nextBarkTimer) {
                this.activeDogHerding.nextBarkTimer.remove();
                console.log('🐕 Bark timer cancelled');
            }
            
            // Clear dog flags on all sheep
            allSheep.forEach(s => {
                s.isObeyingDog = false;
                s.isDisobeyingDog = false;
            });
            
            // Stop any movement tweens
            if (this.activeDogHerding && this.activeDogHerding.moveTween) {
                this.activeDogHerding.moveTween.stop();
            }
            
            // Clear active herding state
            this.activeDogHerding = null;
            
            // Dog returns to button (dog is already in HUD scene)
            const gameScene = this;
            hudScene.tweens.add({
                targets: dogSprite,
                x: buttonX,
                y: buttonY,
                scale: 0.10,
                rotation: Math.PI * 2,
                duration: 600,
                ease: 'Power2.easeIn',
                onComplete: () => {
                    // Unlock button on first impact (Level 7+)
                    if (gameScene.activeLevel >= 7 && !gameScene.dogHerdingButtonUnlocked) {
                        gameScene.dogHerdingButtonUnlocked = true;
                        hudScene.unlockDogHerdingButton(2);
                        
                        // Don't show lock icon after unlocking
                        dogSprite.destroy();
                        dogButton.dogImage.setVisible(true);
                    } else {
                        // Subsequent returns - just restore button
                        dogSprite.destroy();
                        dogButton.dogImage.setVisible(true);
                        
                        // Don't show lock icon if already unlocked (Level 7-12)
                        if (gameScene.activeLevel >= 7 && gameScene.activeLevel <= 12 && dogButton.icon && !gameScene.dogHerdingButtonUnlocked) {
                            dogButton.icon.setVisible(true);
                        }
                    }
                    
                    // START 15 SECOND COOLDOWN after dog returns
                    dogButton.onCooldown = true;
                    dogButton.cooldownTimer = 15000;
                    
                    // Dim button during cooldown
                    dogButton.bg.clear();
                    dogButton.bg.fillStyle(0x3a3a3a, 0.9);
                    dogButton.bg.lineStyle(3, 0x666666, 1);
                    dogButton.bg.fillCircle(0, 0, 56);
                    dogButton.bg.strokeCircle(0, 0, 56);
                    
                    // Keep dog image visible but dimmed during cooldown
                    if (dogButton.dogImage) {
                        dogButton.dogImage.setVisible(true);
                        dogButton.dogImage.setAlpha(0.3); // Dim the dog image
                    }
                    
                    // Show countdown text
                    if (dogButton.cdText) {
                        dogButton.cdText.setVisible(true);
                        dogButton.cdText.setText('15');
                    }
                }
            });
        };
        
        // Dog herds for exactly 15 seconds, then returns
        const herdingTimer = this.time.addEvent({
            delay: 15000, // 15 seconds
            callback: stopHerding,
            loop: false
        });
        
        // Store dog sprite and target for update loop
        this.activeDogHerding = {
            dog: dogSprite,
            hudScene: hudScene,
            targetSide: targetSide, // Initial direction, but will update dynamically based on this.finalCallSide
            targetZoneX: targetZoneX,
            obeyingSheep: obeyingSheep,
            disobeyingSheep: disobeyingSheep,
            dogMoveTimer: 0,
            currentTarget: null,
            lastTargetChange: 0,
            animationInitialized: false,
            nextBarkTimer: null, // Will store the next scheduled bark timer
            herdingTimer: herdingTimer, // Store for cleanup
            stopHerding: stopHerding // Store function reference for 5-second rule
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    // BLACK SHEEP ROAMING UPDATE (Level 10+)
    // Makes the Black Sheep move around the pasture, continuously applying
    // the zombie effect to nearby sheep as it roams
    //
    // BEHAVIOR:
    // - Black Sheep picks random targets and roams around pasture
    // - Shows a pulsing dark aura indicating influence radius (250px)
    // - Any sheep entering the radius becomes zombified (gray, locked)
    // - Zombified sheep move to and lock on player's call side
    // - Sheep leaving the radius are instantly released
    // - Active for 15 seconds total
    // ═══════════════════════════════════════════════════════════════════
    updateBlackSheepRoaming(time, delta) {
        const blackSheep = this.activeBlackSheep;
        if (!blackSheep || !blackSheep.active || !blackSheep.body) return;
        
        // Initialize roaming state if first time
        if (!blackSheep.roamingState) {
            blackSheep.roamingState = {
                targetX: blackSheep.x,
                targetY: blackSheep.y,
                nextTargetTime: time + 1500, // Change direction every 1.5 seconds
                moveSpeed: 120,
                influenceRadius: 250, // Zombie effect radius
                lastZombieCheckTime: 0
            };
            
            // Create glowing aura around Black Sheep to show influence radius
            const auraCircle = this.add.circle(blackSheep.x, blackSheep.y, blackSheep.roamingState.influenceRadius, 0x1a1a1a, 0.15);
            auraCircle.setDepth(15); // Below Black Sheep but above regular sheep
            blackSheep.influenceAura = auraCircle;
            
            // Add pulsing effect to the aura
            this.tweens.add({
                targets: auraCircle,
                alpha: 0.25,
                scale: 1.05,
                duration: 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
            
            // Create dark trail effect behind Black Sheep
            const trail = this.add.particles(blackSheep.x, blackSheep.y, 'panic_particle', {
                speed: { min: 10, max: 30 },
                scale: { start: 0.5, end: 0 },
                alpha: { start: 0.4, end: 0 },
                tint: 0x1a1a1a,
                lifespan: 600,
                frequency: 80,
                quantity: 1,
                blendMode: 'NORMAL'
            });
            trail.setDepth(14);
            blackSheep.darkTrail = trail;
        }
        
        const state = blackSheep.roamingState;
        
        // Update aura and trail position to follow Black Sheep
        if (blackSheep.influenceAura) {
            blackSheep.influenceAura.setPosition(blackSheep.x, blackSheep.y);
        }
        if (blackSheep.darkTrail) {
            blackSheep.darkTrail.setPosition(blackSheep.x, blackSheep.y);
        }
        
        // Pick new random target if it's time
        if (time >= state.nextTargetTime) {
            // Define pasture boundaries with padding
            const padding = 80;
            const minX = padding;
            const maxX = CONFIG.width - padding;
            const minY = padding;
            const maxY = CONFIG.height - 250; // Account for HUD
            
            // Pick random target within bounds
            state.targetX = Phaser.Math.Between(minX, maxX);
            state.targetY = Phaser.Math.Between(minY, maxY);
            state.nextTargetTime = time + Phaser.Math.Between(1500, 2500);
            
            // Dark particle burst when changing direction
            const burst = this.add.particles(blackSheep.x, blackSheep.y, 'panic_particle', {
                speed: { min: 50, max: 100 },
                scale: { start: 0.4, end: 0 },
                alpha: { start: 0.8, end: 0 },
                tint: 0x1a1a1a,
                lifespan: 600,
                quantity: 8,
                blendMode: 'NORMAL'
            });
            burst.setDepth(20);
            this.time.delayedCall(700, () => burst.destroy());
            
            console.log(`🐑💀 Black Sheep new roaming target: (${state.targetX.toFixed(0)}, ${state.targetY.toFixed(0)})`);
        }
        
        // Move toward target
        const distToTarget = Phaser.Math.Distance.Between(blackSheep.x, blackSheep.y, state.targetX, state.targetY);
        
        if (distToTarget > 10) {
            const angle = Phaser.Math.Angle.Between(blackSheep.x, blackSheep.y, state.targetX, state.targetY);
            const velocityX = Math.cos(angle) * state.moveSpeed;
            const velocityY = Math.sin(angle) * state.moveSpeed;
            
            blackSheep.body.setVelocity(velocityX, velocityY);
            
            // Flip sprite based on movement direction
            blackSheep.setFlipX(velocityX < 0);
        } else {
            // Reached target, slow down
            blackSheep.body.setVelocity(0, 0);
        }
        
        // Check for nearby sheep to zombify (throttle checks to every 200ms)
        if (time - state.lastZombieCheckTime >= 200) {
            state.lastZombieCheckTime = time;
            
            this.sheep.getChildren().forEach(s => {
                if (!s.active || s.isEaten) return;
                
                const dist = Phaser.Math.Distance.Between(s.x, s.y, blackSheep.x, blackSheep.y);
                
                // Sheep within influence radius
                if (dist <= state.influenceRadius) {
                    // If not already zombified, zombify it
                    if (!s.isZombified) {
                        this.zombifySheep(s);
                    }
                }
                // Sheep outside influence radius
                else {
                    // If zombified, release it
                    if (s.isZombified) {
                        this.unzombifySheep(s);
                    }
                }
            });
        }
    }
    
    // Helper: Zombify a single sheep
    zombifySheep(s) {
        // Determine target side based on most recent call (default to RIGHT if no call yet)
        const callSide = this.finalCallSide || 'RIGHT';
        const targetSideX = callSide === 'LEFT' ? CONFIG.width * 0.25 : CONFIG.width * 0.75;
        
        // Mark as zombified
        s.isZombified = true;
        s.zombieTargetX = targetSideX;
        s.preZombieVelocity = { x: s.body.velocity.x, y: s.body.velocity.y };
        
        // Store original state
        s.zombieOriginalTint = s.tintTopLeft || 0xffffff;
        
        // Zombification visual
        // SKIP if Golden Sheep activated (brightness locked in Level 12)
        if (!this.goldenSheepActivated) {
            s.setTint(0x666666); // Gray zombie color
        }
        
        // Freeze animation
        this.tweens.add({
            targets: s,
            scaleX: 0.14,
            scaleY: 0.10,
            duration: 150,
            yoyo: true,
            ease: 'Quad.easeInOut'
        });
        
        // Create zombie aura particle
        const aura = this.add.particles(s.x, s.y, 'panic_particle', {
            speed: { min: 20, max: 40 },
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.6, end: 0 },
            tint: 0x1a1a1a,
            lifespan: 800,
            frequency: 100,
            quantity: 2,
            blendMode: 'NORMAL'
        });
        aura.setDepth(s.depth + 1);
        s.zombieAura = aura;
        
        // Track zombified sheep
        if (!this.zombifiedSheep) this.zombifiedSheep = [];
        if (!this.zombifiedSheep.includes(s)) {
            this.zombifiedSheep.push(s);
            console.log(`🧟 Sheep zombified by roaming Black Sheep (total: ${this.zombifiedSheep.length})`);
        }
    }
    
    // Helper: Un-zombify a single sheep (when it leaves the influence radius)
    unzombifySheep(s) {
        if (!s.active) return;
        
        // Restore original tint
        if (s.zombieOriginalTint) {
            s.setTint(s.zombieOriginalTint);
        } else {
            s.clearTint();
        }
        
        // Remove zombie flags
        s.isZombified = false;
        delete s.zombieTargetX;
        delete s.zombieOriginalTint;
        delete s.preZombieVelocity;
        
        // Destroy aura
        if (s.zombieAura) {
            s.zombieAura.destroy();
            delete s.zombieAura;
        }
        
        // Remove from tracking array
        if (this.zombifiedSheep) {
            const index = this.zombifiedSheep.indexOf(s);
            if (index !== -1) {
                this.zombifiedSheep.splice(index, 1);
                console.log(`✨ Sheep released from zombie effect (remaining: ${this.zombifiedSheep.length})`);
            }
        }
        
        // Brief flash to indicate release
        this.tweens.add({
            targets: s,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            ease: 'Quad.easeOut'
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // BLACK SHEEP PLACEMENT MODE (Level 10+)
    // Player clicks button → enters placement mode → places in pasture
    // Creates immune outlier sheep in radius for 15 seconds
    // Single-use per level with button countdown
    // ═══════════════════════════════════════════════════════════════════
    
    enterBlackSheepPlacementMode() {
        console.log('🐑 ═══ ENTERING BLACK SHEEP PLACEMENT MODE ═══');
        
        if (!this.roundActive) return;
        
        // Check if player is in free play mode (won Level 12)
        const inFreePlayMode = localStorage.getItem('sheepMarket_goldenKeyActivated') === 'true' && 
                                localStorage.getItem('sheepMarket_allLevelsUnlocked') === 'true';
        
        // Black Sheep available in Level 10+ OR free play mode
        if (this.activeLevel < 10 && !inFreePlayMode) {
            console.log('🐑 Black Sheep placement not available: requires Level 10+ or free play mode');
            return;
        }
        
        // Create draggable Black Sheep sprite
        const blackSheepCursor = this.add.sprite(this.input.activePointer.x, this.input.activePointer.y, 'sheep');
        blackSheepCursor.setScale(0.14);
        blackSheepCursor.setTint(0x0a0a0a); // Black tint
        blackSheepCursor.setDepth(10000); // Above everything
        blackSheepCursor.setAlpha(0.8); // Slightly transparent during placement
        
        // Add visual indicator circle showing effect radius
        const radiusCircle = this.add.circle(
            blackSheepCursor.x, 
            blackSheepCursor.y, 
            150, // Match immunity radius
            0x0a0a0a, 
            0.2
        );
        radiusCircle.setDepth(9999);
        radiusCircle.setStrokeStyle(3, 0x0a0a0a, 0.6);
        
        // Pulse animation for radius circle
        this.tweens.add({
            targets: radiusCircle,
            alpha: 0.3,
            scale: 1.05,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        console.log('🐑 Black Sheep cursor created - following mouse');
        console.log('🐑 Click anywhere in pasture to place');
        
        // Follow mouse movement
        const followMouse = () => {
            const pointer = this.input.activePointer;
            blackSheepCursor.setPosition(pointer.x, pointer.y);
            radiusCircle.setPosition(pointer.x, pointer.y);
        };
        
        this.input.on('pointermove', followMouse);
        
        // Cancel placement on right-click or ESC
        const cancelPlacement = () => {
            this.input.off('pointermove', followMouse);
            this.input.off('pointerdown', placeBlackSheep);
            this.input.keyboard.off('keydown-ESC', cancelPlacement);
            this.tweens.killTweensOf(radiusCircle);
            radiusCircle.destroy();
            blackSheepCursor.destroy();
            // Restore button state in HUD
            this.events.emit('placement-cancelled', { type: 'blackSheep' });
            console.log('🐑 Black Sheep placement cancelled');
        };
        this.input.keyboard.once('keydown-ESC', cancelPlacement);

        // Place on click
        const placeBlackSheep = (pointer) => {
            // Ignore right-click
            if (pointer.rightButtonDown && pointer.rightButtonDown()) return;

            console.log('🐑 Black Sheep placed at:', { x: Math.floor(pointer.x), y: Math.floor(pointer.y) });
            
            // Stop following mouse
            this.input.off('pointermove', followMouse);
            this.input.off('pointerdown', placeBlackSheep);
            this.input.keyboard.off('keydown-ESC', cancelPlacement);
            
            // Destroy cursor and radius circle
            this.tweens.killTweensOf(radiusCircle);
            radiusCircle.destroy();
            
            // Create actual Black Sheep at clicked position
            const placedX = pointer.x;
            const placedY = pointer.y;
            
            // Remove cursor and place real Black Sheep
            blackSheepCursor.destroy();
            
            // Create Black Sheep entity
            this.placeBlackSheep(placedX, placedY);

            // Notify HUD to start cooldown
            this.events.emit('placement-complete', { type: 'blackSheep' });
        };
        
        this.input.once('pointerdown', placeBlackSheep);
    }
    
    placeBlackSheep(x, y) {
        console.log('🐑 ═══ PLACING BLACK SHEEP ═══');
        console.log(`   Position: (${Math.floor(x)}, ${Math.floor(y)})`);
        
        // Get HUD scene for button countdown
        const hudScene = this.scene.get('HUDScene');
        if (!hudScene) return;
        
        // Create Black Sheep entity at placed position
        const blackSheep = new BlackSheep(this, x, y);
        blackSheep.setScale(0.14);
        blackSheep.setDepth(100); // Ensure it's visible above regular sheep
        this.activeBlackSheep = blackSheep;
        
        // Initialize immune outlier tracker
        this.immuneOutlierSheep = this.immuneOutlierSheep || [];
        
        // === PLACEMENT EFFECTS ===
        
        // Camera shake for impact
        this.cameras.main.shake(200, 0.004);
        
        // Placement burst particles
        const burstParticles = this.add.particles(x, y, 'dust_particle', {
            speed: { min: 100, max: 250 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.0, end: 0 },
            alpha: { start: 0.8, end: 0 },
            tint: 0x0a0a0a,
            lifespan: 600,
            quantity: 25,
            blendMode: 'NORMAL'
        });
        burstParticles.setDepth(20);
        burstParticles.explode();
        
        this.time.delayedCall(800, () => {
            burstParticles.destroy();
        });
        
        // Play placement sound
        audioManager.playCoin();
        
        // Start roaming behavior
        blackSheep.startRoaming();
        
        console.log('🐑 Black Sheep placed - starting 15-second roaming period');
        
        // Update HUD button to show countdown starting
        const btn = hudScene.abilityButtons[6]; // Button index 6
        if (btn) {
            // Keep black sheep visible (don't dim the sheep images - keep them black)
            // Only dim the background to indicate it's been used
            if (btn.blackSheepImage) btn.blackSheepImage.setAlpha(1); // Keep black sheep visible
            if (btn.blackSheepBorder) btn.blackSheepBorder.setAlpha(1); // Keep white border visible
            
            btn.bg.clear();
            btn.bg.fillStyle(0x2a2a2a, 0.7);
            btn.bg.lineStyle(3, 0x666666, 1); // Gray border
            btn.bg.fillCircle(0, 0, 56);
            btn.bg.strokeCircle(0, 0, 56);
            
            // Show countdown text (will count down level timer for rest of level)
            if (btn.cdText) {
                btn.cdText.setVisible(true);
                btn.cdText.setText(Math.ceil(this.timeLeft).toString());
            }
            
            console.log('🐑 Button 6 countdown activated - synced to level timer');
        }
        
        // === 15 SECOND IMMUNE EFFECT DURATION ===
        this.time.delayedCall(15000, () => {
            console.log('🐑 15-second Black Sheep roaming period ending');
            console.log(`   ${this.immuneOutlierSheep.length} sheep remain PERMANENTLY frozen and immune`);
            console.log(`   These sheep will stay black, frozen, and immune for the rest of the level`);
            
            // Remove black sheep (affected sheep remain immune)
            if (this.activeBlackSheep && this.activeBlackSheep.active) {
                // Fade out aura and trail immediately
                if (this.activeBlackSheep.influenceAura) {
                    this.tweens.add({
                        targets: this.activeBlackSheep.influenceAura,
                        alpha: 0,
                        duration: 500,
                        onComplete: () => {
                            if (this.activeBlackSheep && this.activeBlackSheep.influenceAura) {
                                this.activeBlackSheep.influenceAura.destroy();
                            }
                        }
                    });
                }
                if (this.activeBlackSheep.darkTrail) {
                    this.activeBlackSheep.darkTrail.stop();
                    this.time.delayedCall(500, () => {
                        if (this.activeBlackSheep && this.activeBlackSheep.darkTrail) {
                            this.activeBlackSheep.darkTrail.destroy();
                        }
                    });
                }
                
                // Fade out black sheep
                this.tweens.add({
                    targets: this.activeBlackSheep,
                    alpha: 0,
                    scale: 0.05,
                    duration: 500,
                    ease: 'Power2.easeIn',
                    onComplete: () => {
                        if (this.activeBlackSheep) {
                            this.activeBlackSheep.destroy();
                            this.activeBlackSheep = null;
                        }
                    }
                });
            }
            
            console.log('🐑 Black Sheep entity removed - button countdown continues for rest of level');
        });
    }
    
    /**
     * ═══════════════════════════════════════════════════════════════════════════
     * CONVERT SHEEP TO IMMUNE OUTLIER
     * ═══════════════════════════════════════════════════════════════════════════
     * Transforms a regular sheep into an IMMUNE OUTLIER:
     *   - Turns black with dark aura
     *   - Freezes completely in place
     *   - Immune to ALL forces (wind, rain, wolves, etc.)
     *   - Wolves cannot target, chase, or attack
     *   - Effect lasts 15 SECONDS, then sheep returns to normal
     * ═══════════════════════════════════════════════════════════════════════════
     */
    convertSheepToImmuneOutlier(sheep) {
        if (sheep.isImmuneOutlier) return; // Already converted
        if (sheep.immuneToBlackSheep) return; // Recently unfrozen, can't be re-converted yet
        
        console.log('🐑 Converting sheep to IMMUNE OUTLIER at position:', { x: Math.floor(sheep.x), y: Math.floor(sheep.y) });
        
        // ═══════════════════════════════════════════════════════════════════
        // TEMPORARY STATE FLAG - LASTS 15 SECONDS
        // ═══════════════════════════════════════════════════════════════════
        sheep.isImmuneOutlier = true;
        sheep.immuneOutlierStartTime = this.time.now; // Track when freeze started
        
        // Add to tracker
        if (!this.immuneOutlierSheep) this.immuneOutlierSheep = [];
        this.immuneOutlierSheep.push(sheep);
        
        // ═══════════════════════════════════════════════════════════════════
        // TEMPORARY VISUAL LOCK - BLACK TINT FOR 15 SECONDS
        // ═══════════════════════════════════════════════════════════════════
        sheep.clearTint();
        sheep.setTint(0x0a0a0a); // Very dark black
        sheep.setAlpha(1.0); // Full opacity
        
        // Lock this visual state temporarily
        sheep.immuneOutlierTintLocked = true;
        
        // ═══════════════════════════════════════════════════════════════════
        // MOVEMENT LOCK - FREEZE FOR 15 SECONDS
        // ═══════════════════════════════════════════════════════════════════
        sheep.body.setVelocity(0, 0);
        sheep.body.setImmovable(true); // Cannot be pushed
        sheep.body.moves = false; // Disable physics updates entirely
        
        // Set to idle texture (no walking animation)
        sheep.setTexture('sheep');
        
        // ═══════════════════════════════════════════════════════════════════
        // CONVERSION FLASH EFFECT (one-time visual feedback)
        // ═══════════════════════════════════════════════════════════════════
        this.tweens.add({
            targets: sheep,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            repeat: 2,
            ease: 'Quad.easeInOut',
            onComplete: () => {
                // CRITICAL: Re-lock visual state after flash effect
                sheep.setTint(0x0a0a0a);
                sheep.setAlpha(1.0);
            }
        });
        
        // ═══════════════════════════════════════════════════════════════════
        // PARTICLE BURST (one-time effect, then destroyed)
        // ═══════════════════════════════════════════════════════════════════
        const burstParticles = this.add.particles(sheep.x, sheep.y, 'dust_particle', {
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.8, end: 0 },
            tint: 0x0a0a0a,
            lifespan: 600,
            quantity: 15,
            blendMode: 'NORMAL'
        });
        burstParticles.setDepth(20);
        burstParticles.explode();
        
        this.time.delayedCall(800, () => {
            burstParticles.destroy();
        });
        
        // Play sound
        audioManager.playClick();
        
        console.log(`✅ Sheep converted to immune outlier. Total immune: ${this.immuneOutlierSheep.length}`);
        console.log(`   - Black tint LOCKED for 15 seconds (immuneOutlierTintLocked = true)`);
        console.log(`   - Movement DISABLED for 15 seconds (body.moves = false)`);
        console.log(`   - Will ignore ALL weather, wolves, and forces for 15 seconds`);
        
        // ═══════════════════════════════════════════════════════════════════
        // 15-SECOND TIMER - RESTORE SHEEP TO NORMAL
        // ═══════════════════════════════════════════════════════════════════
        const unfreezeTimer = this.time.delayedCall(15000, () => {
            if (sheep && sheep.active) {
                console.log('⏰ 15 seconds elapsed - Restoring sheep to normal');
                
                // Remove immune state
                sheep.isImmuneOutlier = false;
                sheep.immuneOutlierTintLocked = false;
                
                // Remove from tracker
                const index = this.immuneOutlierSheep.indexOf(sheep);
                if (index > -1) {
                    this.immuneOutlierSheep.splice(index, 1);
                }
                
                // Restore physics
                sheep.body.setImmovable(false);
                sheep.body.moves = true;
                
                // Clear black tint and restore normal appearance
                sheep.clearTint();
                
                // Apply appropriate tint based on current level conditions
                if (this.goldenSheepActivated && this.activeLevel === 12) {
                    // Level 12 with Golden Sheep: bright white
                    sheep.setTint(0xffffff);
                } else if ((this.activeLevel === 11 || this.activeLevel === 12) && this.wetGrassApplied) {
                    // Level 11/12 with rain: wet tint
                    sheep.setTint(0x9db3a8);
                    sheep.setAlpha(0.85);
                } else {
                    // Normal appearance
                    sheep.setTint(0xffffff);
                    sheep.setAlpha(1.0);
                }
                
                // Flash to indicate restoration
                this.tweens.add({
                    targets: sheep,
                    alpha: { from: 0.3, to: sheep.alpha },
                    duration: 300,
                    ease: 'Quad.easeOut'
                });
                
                console.log(`✅ Sheep restored to normal. Remaining immune sheep: ${this.immuneOutlierSheep.length}`);
            }
        });
        
        // Store timer reference on the sheep so it persists
        sheep.unfreezeTimer = unfreezeTimer;
    }
    
    handleGoldenClover(data) {
        console.log('🍀 handleGoldenClover called', { roundActive: this.roundActive, level: this.activeLevel });
        
        if (!this.roundActive) return;
        
        // Check if player is in free play mode (won Level 12)
        const inFreePlayMode = localStorage.getItem('sheepMarket_goldenKeyActivated') === 'true' && 
                                localStorage.getItem('sheepMarket_allLevelsUnlocked') === 'true';
        
        // Golden clover only in Level 10+ OR free play mode
        if (this.activeLevel < 10 && !inFreePlayMode) {
            console.log('🍀 Golden Clover not available in this level (not Level 10+ and not in free play mode)');
            return;
        }
        
        // Get HUD scene for button position and current wool balance
        const hudScene = this.scene.get('HUDScene');
        if (!hudScene) return;
        
        // Get current wool balance
        const currentWool = hudScene.balance || 0;
        
        // Generate random percentage between 1-100
        const randomPercent = Phaser.Math.Between(1, 100);
        
        // Calculate wool bonus
        const woolBonus = Math.floor((randomPercent / 100) * currentWool);
        
        console.log(`🍀 Golden Clover: ${randomPercent}% of ${currentWool}W = +${woolBonus}W bonus`);
        
        // Button 1 position
        const spacing = 145;
        const totalWidth = (7 * spacing);
        const buttonRelativeX = -totalWidth / 2 + (1 * spacing);
        const buttonX = CONFIG.width / 2 + buttonRelativeX;
        const buttonY = CONFIG.height - 200 + 125;
        
        // Create flying clover sprite in HUD scene (flies out of button)
        const flyingClover = hudScene.add.image(buttonX, buttonY, 'golden_clover');
        flyingClover.setScale(0.10); // Starts at button size
        flyingClover.setDepth(10000);
        
        // Target position in pasture (slightly above center)
        const targetX = CONFIG.width / 2;
        const targetY = CONFIG.height / 2 - 100;
        
        // Play coin sound
        audioManager.playCoin();
        
        // Fly out from button to above the pasture
        hudScene.tweens.add({
            targets: flyingClover,
            x: targetX,
            y: targetY,
            scale: 0.25, // Grows larger
            rotation: Math.PI * 4, // Double spin
            duration: 800,
            ease: 'Power2.easeOut',
            onComplete: () => {
                // Add golden glow effect BEHIND clover
                const glowCircle = this.add.circle(targetX, targetY, 100, 0xffd700, 0.4);
                glowCircle.setDepth(5000);
                glowCircle.setBlendMode('ADD');
                
                // Pulse the glow
                this.tweens.add({
                    targets: glowCircle,
                    scale: 1.3,
                    alpha: 0.6,
                    duration: 400,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                
                // Set clover depth ABOVE glow but BELOW text
                flyingClover.setDepth(5001);
                
                // Create sparkle particles around clover (continuous during spin)
                const sparkleParticles = hudScene.add.particles(targetX, targetY, 'sparkle_particle', {
                    speed: { min: 50, max: 150 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 1.2, end: 0 },
                    alpha: { start: 1, end: 0 },
                    lifespan: 800,
                    frequency: 50,
                    tint: 0xffd700,
                    blendMode: 'ADD',
                    emitting: true
                });
                sparkleParticles.setDepth(5002);
                
                // Create spinning percentage text ABOVE clover and particles
                const percentText = hudScene.add.text(targetX, targetY - 80, '???%', {
                    font: 'bold 72px Inter',
                    fill: '#ffd700',
                    stroke: '#000000',
                    strokeThickness: 10
                }).setOrigin(0.5).setDepth(5010); // Very high depth to always be visible
                
                // Animate spinning percentage with random numbers
                let spinCount = 0;
                const spinDuration = 2000; // 2 seconds of spinning
                const spinInterval = 100; // Update every 100ms
                const totalSpins = spinDuration / spinInterval;
                
                const spinTimer = hudScene.time.addEvent({
                    delay: spinInterval,
                    repeat: totalSpins - 1,
                    callback: () => {
                        spinCount++;
                        if (spinCount < totalSpins) {
                            // Show random percentage while spinning
                            const randomDisplay = Phaser.Math.Between(1, 100);
                            percentText.setText(`${randomDisplay}%`);
                            
                            // Pulse scale
                            hudScene.tweens.add({
                                targets: percentText,
                                scale: 1.2,
                                duration: 50,
                                yoyo: true,
                                ease: 'Quad.easeOut'
                            });
                        } else {
                            // Final reveal - show actual percentage
                            percentText.setText(`${randomPercent}%`);
                            
                            // DRAMATIC REVEAL - Increase sparkle intensity
                            sparkleParticles.setFrequency(20); // Much faster sparkles
                            sparkleParticles.setScale({ start: 1.5, end: 0 });
                            
                            // Explosion of sparkles on reveal
                            sparkleParticles.explode(80, targetX, targetY);
                            
                            // Flash effect on reveal
                            const flashCircle = this.add.circle(targetX, targetY, 150, 0xffd700, 0.8);
                            flashCircle.setDepth(5009); // Below text but above everything else
                            flashCircle.setBlendMode('ADD');
                            this.tweens.add({
                                targets: flashCircle,
                                scale: 2,
                                alpha: 0,
                                duration: 300,
                                ease: 'Power2.easeOut',
                                onComplete: () => flashCircle.destroy()
                            });
                            
                            // Big reveal animation with enhanced scale
                            hudScene.tweens.add({
                                targets: percentText,
                                scale: 2.0,
                                duration: 250,
                                yoyo: true,
                                ease: 'Back.easeOut',
                                onComplete: () => {
                                    // After brief pause, fly to wallet
                                    hudScene.time.delayedCall(800, () => {
                                        // Calculate wool wallet position (top-left)
                                        const walletX = 200; // Approximate wallet position
                                        const walletY = 86;
                                        
                                        // Stop continuous sparkles, prepare for transition
                                        sparkleParticles.stop();
                                        
                                        // Create dramatic golden particle trail from clover to wallet
                                        const particleTrail = hudScene.add.particles(targetX, targetY, 'sparkle_particle', {
                                            speed: { min: 200, max: 350 },
                                            angle: { min: 0, max: 360 },
                                            scale: { start: 1.5, end: 0.2 },
                                            alpha: { start: 1, end: 0 },
                                            lifespan: 1000,
                                            tint: 0xffd700,
                                            blendMode: 'ADD',
                                            frequency: 20
                                        });
                                        particleTrail.setDepth(5004);
                                        
                                        // Create stream of particles toward wallet
                                        particleTrail.startFollow(null);
                                        particleTrail.setPosition(targetX, targetY);
                                        
                                        // Massive explosion of particles from clover position
                                        particleTrail.explode(100, targetX, targetY);
                                        
                                        // Show wool bonus text flying to wallet - VERY HIGH DEPTH
                                        const bonusText = hudScene.add.text(targetX, targetY - 80, `+${woolBonus}W`, {
                                            font: 'bold 80px Inter',
                                            fill: '#ffd700',
                                            stroke: '#000000',
                                            strokeThickness: 10
                                        }).setOrigin(0.5).setDepth(5015); // Highest depth to always be visible
                                        
                                        // Play coin sound for the bonus
                                        audioManager.playCoin();
                                        
                                        // Fly bonus text to wallet with particle stream following
                                        hudScene.tweens.add({
                                            targets: bonusText,
                                            x: walletX,
                                            y: walletY,
                                            scale: 0.8,
                                            duration: 800,
                                            ease: 'Power2.easeInOut',
                                            onUpdate: () => {
                                                // Particles follow the bonus text
                                                particleTrail.setPosition(bonusText.x, bonusText.y);
                                            },
                                            onComplete: () => {
                                                // Apply wool bonus to player's balance
                                                this.woolBalance += woolBonus;
                                                hudScene.balance = this.woolBalance;
                                                
                                                // Track golden clover bonus
                                                hudScene.levelBonuses.push({
                                                    type: 'GOLDEN CLOVER',
                                                    amount: woolBonus
                                                });
                                                console.log('💰 Golden Clover bonus tracked:', woolBonus);
                                                
                                                // Save updated balance
                                                this.saveBalance();
                                                
                                                // DIRECT UPDATE: Update balance text immediately
                                                if (hudScene.balanceText) {
                                                    hudScene.displayBalance = this.woolBalance;
                                                    hudScene.balanceText.setText(`${hudScene.formatWool(this.woolBalance)}W`);
                                                    console.log('🍀 Directly updated balanceText to:', this.woolBalance);
                                                }
                                                
                                                // Update HUD display - emit from GameScene, not HUD
                                                this.events.emit('balance-updated', this.woolBalance);
                                                console.log('🍀 Emitted balance-updated event with balance:', this.woolBalance);
                                                
                                                // DIRECT UPDATE: Also update wool wallet UI directly
                                                if (hudScene.woolWalletPlaceholders && hudScene.woolWalletPlaceholders.totalBalance) {
                                                    hudScene.woolWalletPlaceholders.totalBalance.setText(`${hudScene.formatWool(this.woolBalance)}W`);
                                                    console.log('🍀 Directly updated wool wallet UI to:', this.woolBalance);
                                                }
                                                
                                                // MASSIVE explosion effect at wallet
                                                if (hudScene.walletEmitter && hudScene.walletEmitter.active) {
                                                    hudScene.walletEmitter.explode(150); // More particles
                                                }
                                                
                                                // Additional golden burst at wallet position
                                                particleTrail.explode(120, walletX, walletY);
                                                
                                                // Flash at wallet
                                                const walletFlash = hudScene.add.circle(walletX, walletY, 60, 0xffd700, 0.9);
                                                walletFlash.setDepth(5020);
                                                walletFlash.setBlendMode('ADD');
                                                hudScene.tweens.add({
                                                    targets: walletFlash,
                                                    scale: 2.5,
                                                    alpha: 0,
                                                    duration: 400,
                                                    ease: 'Power2.easeOut',
                                                    onComplete: () => walletFlash.destroy()
                                                });
                                                
                                                // Play additional coin sound for wallet impact
                                                audioManager.playCoin();
                                                
                                                bonusText.destroy();
                                                particleTrail.stop();
                                                hudScene.time.delayedCall(1500, () => particleTrail.destroy());
                                                
                                                console.log(`🍀 Golden Clover bonus applied: +${woolBonus}W (${randomPercent}%)`);
                                            }
                                        });
                                        
                                        // Fade out clover and effects (delayed to keep visual interest)
                                        hudScene.tweens.add({
                                            targets: [flyingClover, percentText],
                                            alpha: 0,
                                            delay: 400, // Keep visible longer
                                            duration: 600,
                                            onComplete: () => {
                                                flyingClover.destroy();
                                                percentText.destroy();
                                            }
                                        });
                                        
                                        this.tweens.add({
                                            targets: glowCircle,
                                            alpha: 0,
                                            delay: 400,
                                            duration: 600,
                                            onComplete: () => glowCircle.destroy()
                                        });
                                        
                                        // Clean up sparkle particles
                                        hudScene.time.delayedCall(2000, () => {
                                            if (sparkleParticles) {
                                                sparkleParticles.destroy();
                                            }
                                        });
                                    });
                                }
                            });
                        }
                    }
                });
                
                // Camera shake for impact
                this.cameras.main.shake(150, 0.003);
            }
        });
    }

    handleLawnMower(data) {
        if (!this.roundActive) return;

        // Deduct Cost
        this.woolBalance -= data.cost;
        
        // Play satisfying coin sound
        this.playWoolSpendSound(data.cost);
        
        this.saveBalance();
        this.events.emit('balance-updated', this.woolBalance);
        
        // Track call spending in lifetime stats
        const hudScene = this.scene.get('HUDScene');
        if (hudScene && hudScene.trackCallSpending) {
            hudScene.trackCallSpending(data.cost);
        }

        // Effect: Create a lawn mower that sweeps across the field
        const mowerSprite = this.add.image(-100, CONFIG.height / 2, 'lawn_mower');
        mowerSprite.setScale(0.3);
        mowerSprite.setDepth(50);
        mowerSprite.setRotation(-0.2);

        // Create grass clipping particles
        const grassParticles = this.add.particles(0, 0, 'grass_tuft', {
            speed: { min: 50, max: 150 },
            angle: { min: 160, max: 200 },
            scale: { start: 0.15, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 800,
            gravityY: 200,
            quantity: 3,
            frequency: 50,
            emitting: false
        });
        grassParticles.setDepth(49);
        
        // Sweep across the field
        this.tweens.add({
            targets: mowerSprite,
            x: CONFIG.width + 100,
            y: CONFIG.height / 2 + 50,
            rotation: 0.2,
            duration: 3000,
            ease: 'Sine.easeInOut',
            onUpdate: () => {
                // Emit grass particles from mower position
                grassParticles.emitParticleAt(mowerSprite.x, mowerSprite.y);
                
                // Push sheep away from mower
                this.sheep.getChildren().forEach(s => {
                    if (s.active && !s.isGrazing) {
                        const dist = Phaser.Math.Distance.Between(mowerSprite.x, mowerSprite.y, s.x, s.y);
                        if (dist < 200) {
                            // Push sheep away from mower
                            const angle = Phaser.Math.Angle.Between(mowerSprite.x, mowerSprite.y, s.x, s.y);
                            const pushX = Math.cos(angle) * 300;
                            const pushY = Math.sin(angle) * 300;
                            s.reactToMarket(pushX, pushY, 800);
                        }
                    }
                });
            },
            onComplete: () => {
                mowerSprite.destroy();
                grassParticles.stop();
                this.time.delayedCall(1000, () => {
                    grassParticles.destroy();
                });
            }
        });

        this.events.emit('market-event', { type: 'REACTION', message: 'LAWN MOWER!', color: '#44ff44' });
    }

    enableGrassSelectionMode() {
        // Enable drag mode for lawn mower
        this.grassSelectionMode = true;
        this.isDraggingMower = false;
        this.mowerTrail = [];
        this.cutGrassList = []; // Track which grass has been cut in this drag
        
        // Highlight all grass tufts
        this.grassTufts.forEach(tuft => {
            if (!tuft.eaten && tuft.sprite && tuft.sprite.active) {
                // Add highlight glow
                tuft.sprite.setTint(0xffff00); // Yellow highlight
                
                // Scale pulse animation
                if (tuft.pulseTween) tuft.pulseTween.stop();
                tuft.pulseTween = this.tweens.add({
                    targets: tuft.sprite,
                    scale: 0.5,
                    duration: 400,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        });
        
        // Create invisible full-screen zone for drag detection
        if (this.mowerDragZone) {
            this.mowerDragZone.destroy();
        }
        
        this.mowerDragZone = this.add.rectangle(
            CONFIG.width / 2, 
            CONFIG.height / 2, 
            CONFIG.width, 
            CONFIG.height, 
            0x000000, 
            0
        );
        this.mowerDragZone.setDepth(1000); // Very high depth to catch all clicks
        this.mowerDragZone.setInteractive({ cursor: 'crosshair' });
        
        // Use single pointer down to start drag immediately
        const pointerDownHandler = (pointer) => {
            if (!this.isDraggingMower) {
                this.startMowerDrag(pointer.x, pointer.y);
            }
        };
        
        const pointerMoveHandler = (pointer) => {
            if (this.isDraggingMower && pointer.isDown) {
                this.updateMowerDrag(pointer.x, pointer.y);
            }
        };
        
        const pointerUpHandler = () => {
            if (this.isDraggingMower) {
                this.endMowerDrag();
            }
        };
        
        // Attach listeners
        this.mowerDragZone.on('pointerdown', pointerDownHandler);
        this.input.on('pointermove', pointerMoveHandler);
        this.input.on('pointerup', pointerUpHandler);
        
        // Store handlers for cleanup
        this.mowerPointerHandlers = {
            down: pointerDownHandler,
            move: pointerMoveHandler,
            up: pointerUpHandler
        };
    }
    
    startMowerDrag(x, y) {
        this.isDraggingMower = true;
        this.cutGrassList = [];
        this.totalGrassAtStart = this.grassTufts.length; // Track initial grass count
        
        // Create lawn mower sprite that follows cursor
        this.dragMowerSprite = this.add.image(x, y, 'lawn_mower');
        this.dragMowerSprite.setScale(0.25);
        this.dragMowerSprite.setDepth(50);
        this.dragMowerSprite.setRotation(0);
        
        // Spinning animation while dragging
        this.tweens.add({
            targets: this.dragMowerSprite,
            rotation: Math.PI * 2,
            duration: 500,
            repeat: -1,
            ease: 'Linear'
        });
        
        // Create grass particle emitter
        this.dragGrassParticles = this.add.particles(0, 0, 'grass_tuft', {
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.15, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            gravityY: 200,
            frequency: 30,
            emitting: false
        });
        this.dragGrassParticles.setDepth(49);
        
        // Check for grass at start position
        this.checkGrassCollision(x, y);
    }
    
    updateMowerDrag(x, y) {
        if (!this.dragMowerSprite) return;
        
        // Move mower sprite to cursor
        this.dragMowerSprite.x = x;
        this.dragMowerSprite.y = y;
        
        // Emit particles at mower position (if particles still exist)
        if (this.dragGrassParticles) {
            this.dragGrassParticles.emitParticleAt(x, y, 3);
        }
        
        // Check for grass collision
        this.checkGrassCollision(x, y);
        
        // Make sheep panic and flee from mower
        this.scareNearbySheen(x, y);
    }
    
    scareNearbySheen(mowerX, mowerY) {
        const panicRadius = 120; // Larger radius for fear
        
        this.sheep.getChildren().forEach(s => {
            if (!s.active) return;
            
            // ═══ BLACK SHEEP IMMUNITY: Skip immune outliers ═══
            if (s.isImmuneOutlier) return; // Immune sheep don't react to lawn mower
            
            const dist = Phaser.Math.Distance.Between(mowerX, mowerY, s.x, s.y);
            
            if (dist < panicRadius) {
                // Calculate flee direction (away from mower)
                const angle = Phaser.Math.Angle.Between(mowerX, mowerY, s.x, s.y);
                const fleeForce = 400; // Strong flee force
                const pushX = Math.cos(angle) * fleeForce;
                const pushY = Math.sin(angle) * fleeForce;
                
                // Apply panic movement
                s.reactToMarket(pushX, pushY, 600);
                
                // Show panic emote (if not already showing)
                if (!s.panicEmote || !s.panicEmote.active) {
                    s.panicEmote = this.add.image(s.x, s.y - 40, 'emote_exclamation')
                        .setDepth(s.depth + 1)
                        .setScale(0);
                    
                    // Pop in animation
                    this.tweens.add({
                        targets: s.panicEmote,
                        scale: 1,
                        duration: 150,
                        ease: 'Back.easeOut',
                        onComplete: () => {
                            // Float up and fade
                            this.tweens.add({
                                targets: s.panicEmote,
                                y: s.panicEmote.y - 30,
                                alpha: 0,
                                duration: 600,
                                ease: 'Power2.easeOut',
                                onComplete: () => {
                                    if (s.panicEmote) s.panicEmote.destroy();
                                    s.panicEmote = null;
                                }
                            });
                        }
                    });
                }
                
                // Visual panic - flash red tint
                // SKIP if Golden Sheep activated (brightness locked in Level 12)
                // SKIP if immune outlier (Black Sheep effect overrides all coloring)
                if (!s.isPanicking && !this.goldenSheepActivated && !s.isImmuneOutlier) {
                    s.isPanicking = true;
                    s.setTint(0xff8888); // Red tint
                    
                    // Clear tint after a moment
                    this.time.delayedCall(300, () => {
                        if (s.active && !s.isImmuneOutlier) {
                            s.clearTint();
                            s.isPanicking = false;
                        }
                    });
                }
            }
        });
    }
    
    checkGrassCollision(x, y) {
        const cutRadius = 60; // Detection radius around mower
        
        this.grassTufts.forEach(tuft => {
            if (!tuft.eaten && tuft.sprite && tuft.sprite.active) {
                // Check if mower is near this grass
                const dist = Phaser.Math.Distance.Between(x, y, tuft.x, tuft.y);
                
                if (dist < cutRadius && !this.cutGrassList.includes(tuft)) {
                    // Cut this grass!
                    this.cutGrassList.push(tuft);
                    this.cutGrassInstant(tuft);
                    
                    // Play lawn mower sound each time grass is cut
                    this.playSound('lawn_mower', { volume: 0.7 });
                }
            }
        });
    }
    
    cutGrassInstant(tuft) {
        // Immediate cut without animation (for drag mode)
        if (!tuft.sprite || !tuft.sprite.active) return;
        
        // Scare nearby sheep away from the cut grass
        const scareRadius = 150; // Distance to scare sheep
        this.sheep.getChildren().forEach(s => {
            if (s.active) {
                // ═══ BLACK SHEEP IMMUNITY: Skip immune outliers ═══
                if (s.isImmuneOutlier) return; // Immune sheep don't react to grass cutting
                
                const dist = Phaser.Math.Distance.Between(tuft.x, tuft.y, s.x, s.y);
                
                if (dist < scareRadius) {
                    // Calculate flee direction (away from grass)
                    const angle = Phaser.Math.Angle.Between(tuft.x, tuft.y, s.x, s.y);
                    const fleeForce = 400; // Strong flee force
                    
                    // Apply flee velocity
                    s.body.setVelocity(
                        Math.cos(angle) * fleeForce,
                        Math.sin(angle) * fleeForce
                    );
                    
                    // Visual panic feedback
                    // SKIP if Golden Sheep activated (brightness locked in Level 12)
                    if (!this.goldenSheepActivated) {
                        s.setTint(0xffcccc); // Light red tint
                    }
                    
                    // Show exclamation mark
                    const emote = this.add.text(s.x, s.y - 60, '!', {
                        font: 'bold 32px Arial',
                        fill: '#ff0000',
                        stroke: '#ffffff',
                        strokeThickness: 4
                    });
                    emote.setOrigin(0.5);
                    emote.setDepth(s.depth + 1);
                    
                    // Emote animation
                    this.tweens.add({
                        targets: emote,
                        y: s.y - 80,
                        alpha: 0,
                        duration: 800,
                        ease: 'Power2',
                        onComplete: () => emote.destroy()
                    });
                    
                    // Clear tint after a moment
                    // SKIP if Golden Sheep activated
                    if (!this.goldenSheepActivated) {
                        this.time.delayedCall(500, () => {
                            if (s.active) s.clearTint();
                        });
                    }
                    
                    // If sheep was grazing, stop grazing
                    if (s.isGrazing) {
                        s.isGrazing = false;
                        s.grazingTuft = null;
                        
                        // Stop eating animation
                        if (s.eatingTween) {
                            s.eatingTween.stop();
                            s.eatingTween = null;
                        }
                        
                        // Stop grass consumption tween
                        if (s.grassConsumptionTween) {
                            s.grassConsumptionTween.stop();
                            s.grassConsumptionTween = null;
                        }
                        
                        // Stop and destroy eating particles
                        if (s.eatParticles) {
                            s.eatParticles.stop();
                            this.time.delayedCall(800, () => {
                                if (s.eatParticles) {
                                    s.eatParticles.destroy();
                                    s.eatParticles = null;
                                }
                            });
                        }
                        
                        // Restore scale
                        s.setScale(0.12);
                        
                        // Restore normal sheep depth
                        s.setDepth(10);
                        
                        if (s.grazingIndicator && s.grazingIndicator.active) {
                            this.tweens.add({
                                targets: s.grazingIndicator,
                                alpha: 0,
                                duration: 200,
                                onComplete: () => {
                                    if (s.grazingIndicator) s.grazingIndicator.destroy();
                                }
                            });
                        }
                        s.grazingIndicator = null;
                    }
                }
            }
        });
        
        // Stop pulse animation
        if (tuft.pulseTween) {
            tuft.pulseTween.stop();
        }
        
        // Quick shrink and remove
        this.tweens.add({
            targets: tuft.sprite,
            scale: 0,
            alpha: 0,
            duration: 200,
            ease: 'Back.easeIn',
            onComplete: () => {
                tuft.sprite.destroy();
                tuft.eaten = true;
                
                // Remove from array
                const index = this.grassTufts.indexOf(tuft);
                if (index > -1) {
                    this.grassTufts.splice(index, 1);
                }
                
                // Check if this is naturally spawned grass (not player-placed)
                const isNaturalGrass = !tuft.playerPlaced;
                
                if (isNaturalGrass) {
                    // Pay player 5W for cutting natural grass
                    const woolReward = 5;
                    this.woolBalance += woolReward;
                    this.saveBalance();
                    
                    // Get HUD scene reference (used for multiple operations below)
                    const hudScene = this.scene.get('HUDScene');
                    
                    // Create flying wool coin animation
                    if (hudScene) {
                        // Emit on GameScene events so HUD can listen properly
                        this.events.emit('balance-updated', this.woolBalance);
                        
                        // Create wool coin sprite at grass location
                        const woolCoin = hudScene.add.image(tuft.x, tuft.y, 'wool_coin');
                        woolCoin.setScale(0.5); // Start at half size
                        woolCoin.setDepth(10000); // Very high depth
                        woolCoin.setAlpha(1);
                        
                        // Show +5W text that stays at grass location briefly
                        const rewardText = hudScene.add.text(tuft.x, tuft.y - 40, `+${woolReward}W`, {
                            font: 'bold 24px Inter',
                            fill: '#44ff44',
                            stroke: '#000000',
                            strokeThickness: 4
                        });
                        rewardText.setOrigin(0.5);
                        rewardText.setDepth(10001);
                        
                        // Text floats up and fades quickly
                        hudScene.tweens.add({
                            targets: rewardText,
                            y: tuft.y - 80,
                            alpha: 0,
                            duration: 800,
                            ease: 'Sine.easeOut',
                            onComplete: () => rewardText.destroy()
                        });
                        
                        // Calculate target position (wallet balance location)
                        const targetX = 200; // Balance text X position
                        const targetY = 86;  // Balance text Y position
                        
                        // Add sparkle trail particles following the coin
                        const sparkleTrail = hudScene.add.particles(tuft.x, tuft.y, 'wool_coin', {
                            speed: { min: 20, max: 60 },
                            angle: { min: 0, max: 360 },
                            scale: { start: 0.3, end: 0 },
                            alpha: { start: 0.8, end: 0 },
                            lifespan: 600,
                            frequency: 30,
                            quantity: 1,
                            blendMode: 'ADD',
                            tint: 0xffdd44
                        });
                        sparkleTrail.setDepth(9999);
                        
                        // Animate coin flying to wallet with arc trajectory
                        hudScene.tweens.add({
                            targets: woolCoin,
                            x: targetX,
                            y: targetY - 20, // Slightly above to create arc
                            scale: 0.3, // Shrink as it travels
                            rotation: Math.PI * 4, // Spin during flight
                            duration: 800,
                            ease: 'Cubic.easeIn', // Speed up as it approaches
                            onUpdate: () => {
                                // Keep sparkle trail following the coin
                                sparkleTrail.setPosition(woolCoin.x, woolCoin.y);
                            },
                            onComplete: () => {
                                // Stop and cleanup sparkle trail
                                sparkleTrail.stop();
                                this.time.delayedCall(600, () => sparkleTrail.destroy());
                                
                                // Create impact burst at wallet
                                const impactBurst = hudScene.add.particles(targetX, targetY, 'wool_coin', {
                                    speed: { min: 80, max: 150 },
                                    angle: { min: 0, max: 360 },
                                    scale: { start: 0.4, end: 0 },
                                    alpha: { start: 1, end: 0 },
                                    lifespan: 500,
                                    quantity: 8,
                                    blendMode: 'ADD',
                                    tint: 0xffdd44
                                });
                                impactBurst.setDepth(10002);
                                impactBurst.explode();
                                
                                // Destroy burst after particles fade
                                this.time.delayedCall(600, () => impactBurst.destroy());
                                
                                // Make wallet balance briefly pulse/glow
                                if (hudScene.balanceText) {
                                    const originalScale = hudScene.balanceText.scaleX;
                                    hudScene.tweens.add({
                                        targets: hudScene.balanceText,
                                        scaleX: originalScale * 1.15,
                                        scaleY: originalScale * 1.15,
                                        duration: 100,
                                        yoyo: true,
                                        ease: 'Sine.easeInOut'
                                    });
                                }
                                
                                // Destroy the coin sprite
                                woolCoin.destroy();
                            }
                        });
                        
                        // Add slight arc to the trajectory (bezier curve effect)
                        const midY = (tuft.y + targetY) / 2 - 60; // Arc peak
                        hudScene.tweens.add({
                            targets: woolCoin,
                            y: midY,
                            duration: 400,
                            ease: 'Sine.easeOut',
                            onComplete: () => {
                                // Second half of arc (descending)
                                hudScene.tweens.add({
                                    targets: woolCoin,
                                    y: targetY - 20,
                                    duration: 400,
                                    ease: 'Sine.easeIn'
                                });
                            }
                        });
                    }
                    
                    // All naturally spawned grass gets collected to the button
                    // Increment grass collection count
                    if (!this.collectedGrassCount) {
                        this.collectedGrassCount = 0;
                    }
                    this.collectedGrassCount++;
                    
                    // PERSISTENCE: Save to localStorage (persists across levels)
                    // ENDLESS MODE: Use separate storage
                    const grassStorageKey = this.isEndlessMode ? 'sheepMarket_endless_grassCount' : 'sheepMarket_grassCount';
                    localStorage.setItem(grassStorageKey, this.collectedGrassCount.toString());
                    
                    const isFirstCut = !this.firstGrassCutCollected;
                    if (isFirstCut) {
                        // Mark first cut to unlock the button
                        this.firstGrassCutCollected = true;
                    }
                    
                    // Every natural grass tuft flies to button (index 3)
                    // Create in HUDScene so it's definitely in front of everything
                    const grassAsset = hudScene.add.image(tuft.x, tuft.y, 'grass_tuft');
                    grassAsset.setScale(0.4);
                    grassAsset.setDepth(10000); // Very high depth to be above all HUD elements
                    grassAsset.setAlpha(1); // Fully visible
                    
                    // Calculate target position (button index 3 - left of lawn mower)
                    const spacing = 145;
                    const totalWidth = (7 * spacing);
                    const buttonRelativeX = -totalWidth / 2 + (3 * spacing);
                    const targetX = CONFIG.width / 2 + buttonRelativeX;
                    const targetY = CONFIG.height - 200 + 125;
                    
                    // Create wind trail particles following the grass (similar to lawn mower)
                    const windTrail = hudScene.add.particles(tuft.x, tuft.y, 'grass_tuft', {
                        speed: { min: 50, max: 100 },
                        angle: { min: 160, max: 200 }, // Trail behind
                        scale: { start: 0.2, end: 0 },
                        alpha: { start: 0.6, end: 0 },
                        lifespan: 800,
                        frequency: 40,
                        quantity: 2,
                        blendMode: 'ADD',
                        tint: 0x44ff44
                    });
                    windTrail.setDepth(9999);
                    
                    // Calculate rotation to ensure it lands upright (at 0 radians)
                    const currentRotation = grassAsset.rotation;
                    const spins = 2; // Number of full spins during flight
                    const targetRotation = Math.floor(currentRotation / (Math.PI * 2)) * (Math.PI * 2) + (spins * Math.PI * 2);
                    
                    // Animate grass flying to button with dramatic tumbling (matching lawn mower)
                    hudScene.tweens.add({
                        targets: grassAsset,
                        x: targetX,
                        y: targetY,
                        scale: 0.15,
                        rotation: targetRotation, // Spin 2 full times and land upright
                        duration: 1500,
                        ease: 'Cubic.easeOut', // Dramatic deceleration (matching lawn mower)
                        onUpdate: () => {
                            // Keep wind trail following
                            windTrail.setPosition(grassAsset.x - 20, grassAsset.y);
                        },
                        onComplete: () => {
                            // Stop wind trail
                            windTrail.stop();
                            
                            // UNLOCK BUTTON on first cut, update count on all cuts
                            if (isFirstCut) {
                                hudScene.unlockGrassButton(3);
                            }
                            // Update grass count display on button
                            hudScene.updateGrassCount(this.collectedGrassCount);
                            
                            // Create impact dust burst (matching lawn mower)
                            const impactDust = hudScene.add.particles(targetX, targetY, 'grass_tuft', {
                                speed: { min: 100, max: 200 },
                                angle: { min: 0, max: 360 },
                                scale: { start: 0.3, end: 0 },
                                alpha: { start: 0.8, end: 0 },
                                lifespan: 600,
                                quantity: 15,
                                blendMode: 'ADD',
                                tint: 0x44ff44
                            });
                            impactDust.setDepth(10001);
                            impactDust.explode();
                            
                            // Grass settles into button with bounce (matching lawn mower)
                            hudScene.tweens.add({
                                targets: grassAsset,
                                scale: 0.18,
                                duration: 200,
                                yoyo: true,
                                repeat: 1,
                                ease: 'Quad.easeOut',
                                onComplete: () => {
                                    // Fade out and destroy
                                    hudScene.tweens.add({
                                        targets: grassAsset,
                                        alpha: 0,
                                        duration: 400,
                                        onComplete: () => {
                                            grassAsset.destroy();
                                        }
                                    });
                                }
                            });
                            
                            // Clean up particles after a moment
                            hudScene.time.delayedCall(800, () => {
                                windTrail.destroy();
                                impactDust.destroy();
                            });
                        }
                    });
                }
                // Note: All naturally spawned grass is now collected to button for placement later
                // Player-placed grass gives nothing when cut
            }
        });
    }
    
    endMowerDrag() {
        this.isDraggingMower = false;
        this.grassSelectionMode = false;
        
        // Don't stop grass spawning - let all 12 tufts spawn naturally
        // Grazing will stop at 7 seconds remaining via stopGrazingPeriod()
        
        // Fly mower away
        if (this.dragMowerSprite) {
            this.tweens.add({
                targets: this.dragMowerSprite,
                y: this.dragMowerSprite.y - 200,
                scale: 0,
                alpha: 0,
                duration: 600,
                ease: 'Power2',
                onComplete: () => {
                    if (this.dragMowerSprite) {
                        this.dragMowerSprite.destroy();
                        this.dragMowerSprite = null;
                    }
                }
            });
        }
        
        // Stop and cleanup particles
        if (this.dragGrassParticles) {
            this.dragGrassParticles.stop();
            this.time.delayedCall(1000, () => {
                if (this.dragGrassParticles) {
                    this.dragGrassParticles.destroy();
                    this.dragGrassParticles = null;
                }
            });
        }
        
        // Remove drag zone
        if (this.mowerDragZone) {
            this.mowerDragZone.removeAllListeners();
            this.mowerDragZone.destroy();
            this.mowerDragZone = null;
        }
        
        // Remove input listeners
        if (this.mowerPointerHandlers) {
            this.input.off('pointermove', this.mowerPointerHandlers.move);
            this.input.off('pointerup', this.mowerPointerHandlers.up);
            this.mowerPointerHandlers = null;
        }
        
        // Remove highlights from remaining grass
        this.grassTufts.forEach(t => {
            if (t.sprite && t.sprite.active) {
                t.sprite.clearTint();
                if (t.pulseTween) {
                    t.pulseTween.stop();
                    t.sprite.setScale(0.4);
                }
            }
        });
        
        // Check if all grass is cleared
        if (this.grassTufts.length === 0) {
            this.celebrateGrassCleared();
        }
    }



    celebrateGrassCleared() {
        // Visual celebration when all grass is cleared
        
        // 1. Big text message
        this.events.emit('market-event', { 
            type: 'REACTION', 
            message: 'PASTURE CLEARED!\nALL SHEEP FREE!', 
            color: '#44ff44' 
        });
        
        // 2. Particle burst at center
        const centerX = CONFIG.width / 2;
        const centerY = CONFIG.height / 2;
        
        // Create celebration particles (grass tufts flying everywhere)
        const celebrationParticles = this.add.particles(centerX, centerY, 'grass_tuft', {
            speed: { min: 200, max: 400 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.3, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 1500,
            gravityY: 200,
            quantity: 50,
            rotate: { min: 0, max: 360 }
        });
        celebrationParticles.setDepth(100);
        celebrationParticles.explode();
        
        // 3. Create sparkle/star particles for extra celebration
        if (!this.textures.exists('star_particle')) {
            const gfx = this.make.graphics({ x: 0, y: 0, add: false });
            gfx.fillStyle(0xfcd535, 1); // Gold
            // Draw a simple star shape manually
            gfx.beginPath();
            gfx.moveTo(8, 0);
            gfx.lineTo(10, 6);
            gfx.lineTo(16, 6);
            gfx.lineTo(11, 10);
            gfx.lineTo(13, 16);
            gfx.lineTo(8, 12);
            gfx.lineTo(3, 16);
            gfx.lineTo(5, 10);
            gfx.lineTo(0, 6);
            gfx.lineTo(6, 6);
            gfx.closePath();
            gfx.fillPath();
            gfx.generateTexture('star_particle', 16, 16);
            gfx.destroy();
        }
        
        const starParticles = this.add.particles(centerX, centerY, 'star_particle', {
            speed: { min: 150, max: 300 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 1200,
            quantity: 30,
            blendMode: 'ADD',
            rotate: { min: 0, max: 360 }
        });
        starParticles.setDepth(101);
        starParticles.explode();
        
        // 4. Play celebration sound
        this.playSound('bleat_go', { volume: 0.5 });
        
        // 5. Make all sheep happy (jump/bleat)
        this.sheep.getChildren().forEach(s => {
            if (s.active && !s.isGrazing) {
                // Happy jump
                this.tweens.add({
                    targets: s,
                    y: s.y - 50,
                    duration: 300,
                    yoyo: true,
                    ease: 'Quad.easeOut'
                });
            }
        });
        
        // 6. Cleanup particles after animation
        this.time.delayedCall(2000, () => {
            celebrationParticles.destroy();
            starParticles.destroy();
        });
    }

    applyMarketPressure(side, amount, price) {
        // Market Fatigue Logic
        // LEVEL 1 TUNING: Significantly reduced penalty (0.5 -> 0.1)
        // Players can spam freely with high responsiveness.
        this.marketFatigue += 0.1;

        // Fatigue dampens the POWER of the move
        const fatigueFactor = 1 / (1 + this.marketFatigue);
        
        // OBEDIENCE LOGIC (Price Dependent) - INVERTED
        // "Sheep obey MORE when player pays LESS (Low Risk) and obey LESS when player pays MORE (High Risk)"
        
        // Normalize price (Probability 0-100)
        // Safety fallback to 50 if undefined or null
        const prob = (price !== undefined && price !== null) ? price : 50;
        const priceRatio = prob / 100; 

        // Base Obedience Formula: 0.90 - (0.60 * Ratio)
        // Low Cost (10% Price)  -> 0.90 - 0.06 = 84% Obedience (Cooperation)
        // Med Cost (50% Price)  -> 0.90 - 0.30 = 60% Obedience (Neutral)
        // High Cost (90% Price) -> 0.90 - 0.54 = 36% Obedience (Resistance)
        
        let baseObedience = 0.90 - (0.60 * priceRatio);

        // ABILITY OVERRIDE: RALLY
        if (this.obedienceBoostActive) {
            baseObedience = 0.98; // 98% Obedience
        } else {
            // "They also don't always obey just because they are stubborn"
            // Random "Stubbornness" Roll per call: 
            // 25% chance to be Extra Stubborn (reduce obedience by 40%)
            // This adds the "Unpredictable" feeling even at high prices
            if (Math.random() < 0.25) {
                baseObedience *= 0.6;
            }
        }

        // General Unpredictability: Small random fluctuation +/- 10%
        baseObedience += Phaser.Math.FloatBetween(-0.1, 0.1);
        
        // Clamp it (Never 0, Never 100)
        baseObedience = Phaser.Math.Clamp(baseObedience, 0.10, 0.95);

        // Apply Fatigue to the final rate
        const participationRate = baseObedience / (1 + (this.marketFatigue * 0.05));

        let direction = side === 'LEFT' ? -1 : 1;
        let isRejection = false;

        // Whale Trade Logic (High Stakes = High Risk)
        // If a player throws a massive amount of wool, the sheep might spook.
        if (amount >= 500) {
            // LEVEL 1 TUNING: Almost no Rejection Chance: 10% -> 1%
            if (Math.random() < 0.01) {
                direction *= -1; // Invert global direction
                isRejection = true;
                this.events.emit('market-event', { type: 'REJECTION' });
            }
        }
        
        // Dynamic Intensity based on Wool Amount
        // Cap the amount influence so it doesn't break physics (e.g. max consideration is 1000 wool)
        const cappedAmount = Math.min(1000, amount);
        
        // Speed: Base move + amount boost
        // LEVEL 1 TUNING: Massive base speed (250 -> 450) and multiplier (0.6 -> 1.5)
        // Even a +1 bet should feel powerful.
        const baseSpeed = isRejection ? 300 : 450;
        const speedBoost = cappedAmount * (isRejection ? 0.8 : 1.5); 
        
        // Apply Fatigue to the final speed calculation
        const targetSpeed = ((baseSpeed + speedBoost) * direction) * fatigueFactor;

        // Duration: How long they ignore their own brains
        // Small bets = sustained run (1000ms)
        // Big bets = marathon (up to 4000ms)
        const baseDuration = 1000; // Increased base duration (500 -> 1000)
        const durationBoost = cappedAmount * 4.0; // Increased duration multiplier
        
        // Apply Fatigue to duration too - spamming makes them twitchy but not committed
        const dampenedDurationBoost = durationBoost * fatigueFactor;

        const totalSheep = this.sheep.getLength();

        this.sheep.getChildren().forEach(s => {
            // 1. Obedience Check: Does this sheep respond?
            const willObey = Math.random() <= participationRate;
            
            if (!willObey) {
                // Disobedient sheep - ignored the call
                if (Math.random() < 0.15) { 
                    s.showRejection();
                }
                return; // Ignored the call
            }
            
            // ═══════════════════════════════════════════════════════════════════
            // OBEDIENT SHEEP - INSTANT, IMMEDIATE RESPONSE (NO DELAY)
            // ═══════════════════════════════════════════════════════════════════
            
            // 2. Direction: Obedient sheep move in the EXACT direction called
            // No confusion, no contrarian behavior - they OBEY immediately
            const myDirectionMultiplier = 1; // Always obey the call direction
            
            // 3. Enthusiasm: Obedient sheep respond with consistent energy
            const enthusiasm = Phaser.Math.FloatBetween(1.0, 1.3); // Strong response

            // Minimal variance for obedient sheep - they move together cohesively
            const speedVariance = Phaser.Math.Between(-20, 20);
            
            // Combine factors - obedient sheep move decisively
            const finalSpeedX = (targetSpeed * myDirectionMultiplier * enthusiasm) + speedVariance;
            const finalSpeedY = Phaser.Math.Between(-20, 20); // Minimal vertical scatter

            // Duration with minimal variance - consistent movement
            const durationVariance = Phaser.Math.Between(-50, 100);
            const finalDuration = Math.max(500, baseDuration + dampenedDurationBoost + durationVariance);

            // INSTANT REACTION - No delay, no hesitation
            s.reactToMarket(finalSpeedX, finalSpeedY, finalDuration);
        });
    }

    settleRound() {
        this.roundActive = false;
        
        const leftCount = this.sheep.getChildren().filter(s => s.x < CONFIG.width / 2).length;
        const winner = leftCount > (this.activeSheepCount / 2) ? 'LEFT' : 'RIGHT';

        // Check for Golden Sheep on Winning Side
        let multiplier = 1;
        let goldenSheepWon = false;
        
        if (this.goldenSheepActive && this.goldenSheepTarget && this.goldenSheepTarget.active) {
            const gx = this.goldenSheepTarget.x;
            const goldenOnLeft = gx < CONFIG.width / 2;
            const goldenOnRight = gx >= CONFIG.width / 2;
            
            if ((winner === 'LEFT' && goldenOnLeft) || (winner === 'RIGHT' && goldenOnRight)) {
                multiplier = 2;
                goldenSheepWon = true;
            }
        }

        // FORCE UI UPDATE: Snap market values to final prices
        this.events.emit('update-market', {
            leftPrice: winner === 'LEFT' ? 10 : 0,
            rightPrice: winner === 'RIGHT' ? 10 : 0,
            timeLeft: 0
        });

        // Organic Victory March: All sheep move towards the winning side
        // Strays move purposefully, winners mill about or move deeper
        this.sheep.getChildren().forEach(s => {
            // Check if sheep is on the wrong side
            const isStray = (winner === 'LEFT' && s.x > CONFIG.width / 2) || 
                            (winner === 'RIGHT' && s.x < CONFIG.width / 2);
            
            let targetX, targetY;
            
            if (winner === 'LEFT') {
                // Target: Left side, scattered
                targetX = Phaser.Math.Between(50, CONFIG.width / 2 - 50);
            } else {
                // Target: Right side, scattered
                targetX = Phaser.Math.Between(CONFIG.width / 2 + 50, CONFIG.width - 50);
            }
            targetY = Phaser.Math.Between(200, CONFIG.height - 300);

            // Variable delay: Strays move IMMEDIATELY to ensure visual "100%" compliance
            const delay = isStray ? Phaser.Math.Between(0, 300) : Phaser.Math.Between(0, 1500);
            
            // Speed: Strays SPRINT to the winning side
            const speed = isStray ? Phaser.Math.Between(300, 450) : Phaser.Math.Between(40, 100);

            s.startVictoryMarch(targetX, targetY, delay, speed);
        });
        
        let payout = 0;
        
        // Calculate final prices based on winner
        const finalLeftPrice = winner === 'LEFT' ? 10 : 0;
        const finalRightPrice = winner === 'RIGHT' ? 10 : 0;
        
        // Settle all calls
        this.calls.forEach(call => {
            const finalPrice = call.side === 'LEFT' ? finalLeftPrice : finalRightPrice;
            const settledValue = finalPrice;
            payout += settledValue;
        });
        
        // Apply Golden Multiplier to total payout
        if (goldenSheepWon) {
            payout *= multiplier;
        }
        
        // Apply Golden Clover Boost to payout (2x wool earnings)
        // Golden Clover no longer applies a multiplier to payout (now instant bonus)

        // Apply final settlement: payout is added (cost already deducted)
        this.woolBalance += payout;
        
        console.log(`💰 [settleRound] Wool calculation: payout=${payout}W, new balance=${this.woolBalance}W`);
        
        // FINAL CALL OUTCOME: Determines round outcome (correct/incorrect) for progression
        // This is separate from settlement (wool/money)
        const finalCallCorrect = this.finalCallSide === winner;
        
        // REPLAY MODE: Restore balance snapshot to preserve WOOL wallet
        // EXCEPTION: Level 12 completion should KEEP the earnings (it's the final level)
        const isLevel12Win = (this.activeLevel === 12 && finalCallCorrect && (this.calls.length > 0));
        
        if (this.isReplayMode && this.replayBalanceSnapshot !== null && !isLevel12Win) {
            console.log(`🔄 REPLAY MODE: Reverting balance from ${this.woolBalance}W to ${this.replayBalanceSnapshot}W`);
            this.woolBalance = this.replayBalanceSnapshot;
            // Clear replay mode after first round (convert to normal level play)
            this.isReplayMode = false;
            this.replayBalanceSnapshot = null;
        } else if (isLevel12Win && this.isReplayMode) {
            console.log(`🎉 LEVEL 12 WIN: Keeping earned wool (${this.woolBalance}W) despite replay mode`);
            // Clear replay mode but keep the earnings
            this.isReplayMode = false;
            this.replayBalanceSnapshot = null;
        }
        
        // Ensure balance doesn't go negative or glitch
        // this.woolBalance = Math.max(0, this.woolBalance); // Removed safety floor to allow true failure state
        
        // Calculate actual profit BEFORE resetting currentRoundSpent
        const totalSpentThisRound = this.currentRoundSpent;
        const profit = payout - totalSpentThisRound;

        this.currentRoundSpent = 0; // Reset for next round

        // Save with 2 decimals
        if (this.isEndlessMode) {
            // ENDLESS MODE: Save to separate balance
            localStorage.setItem('sheepMarket_endlessBalance', this.woolBalance.toFixed(2));
            console.log(`💾 [ENDLESS MODE] Balance saved: ${this.woolBalance}W (Round ${this.endlessRound})`);
        } else {
            authService.saveBalance(this.woolBalance);
            console.log(`💾 [settleRound] Balance saved: ${this.woolBalance}W (Level ${this.activeLevel})`);
        }
        
        // Update high score
        const highScore = localStorage.getItem('sheepMarket_highScore') || 0;
        if (this.woolBalance > parseFloat(highScore)) {
            localStorage.setItem('sheepMarket_highScore', this.woolBalance.toFixed(2));
        }

        // ENDLESS MODE: Check for game over conditions
        if (this.isEndlessMode) {
            // Game over if wrong final bet OR out of wool
            if (!finalCallCorrect || this.woolBalance <= 0) {
                console.log(`💀 ENDLESS MODE: Game Over - Round ${this.endlessRound}`);
                console.log(`   Final Call: ${finalCallCorrect ? 'Correct' : 'Wrong'} | Balance: ${this.woolBalance}W`);
                
                // Emit game over event
                this.events.emit('round-settled', {
                    winner,
                    payout,
                    profit,
                    totalSpent: totalSpentThisRound,
                    startingBalance: this.woolBalance - profit,
                    balance: this.woolBalance,
                    hadBet: (this.calls.length > 0),
                    goldenSheepWon: goldenSheepWon,
                    finalCallSide: this.finalCallSide,
                    finalCallCorrect: finalCallCorrect,
                    endlessGameOver: true, // Flag for HUD to show game over
                    endlessRound: this.endlessRound,
                    settledCalls: this.calls.map(call => {
                        const finalPrice = call.side === winner ? 10 : 0;
                        let settledValue = finalPrice;
                        if (call.side === winner && goldenSheepWon) {
                            settledValue *= 2; 
                        }
                        return {
                            side: call.side,
                            entryPrice: call.entryPrice,
                            finalPrice: settledValue,
                            delta: settledValue - call.entryPrice
                        };
                    })
                });
                return; // Stop here, don't continue to next round
            }
            
            // Success! Increment round and continue
            this.endlessRound++;
            localStorage.setItem('sheepMarket_endlessRound', this.endlessRound.toString());
            console.log(`✅ ENDLESS MODE: Advancing to Round ${this.endlessRound}`);
        }

        this.events.emit('round-settled', {
            winner,
            payout,
            profit,
            totalSpent: totalSpentThisRound,
            startingBalance: this.woolBalance - profit, // balance before this round's net
            balance: this.woolBalance,
            hadBet: (this.calls.length > 0),
            goldenSheepWon: goldenSheepWon,
            finalCallSide: this.finalCallSide,
            finalCallCorrect: finalCallCorrect,
            settledCalls: this.calls.map(call => {
                const finalPrice = call.side === winner ? 10 : 0;
                let settledValue = finalPrice;
                if (call.side === winner && goldenSheepWon) {
                    settledValue *= 2; 
                }
                return {
                    side: call.side,
                    entryPrice: call.entryPrice,
                    finalPrice: settledValue,
                    delta: settledValue - call.entryPrice
                };
            })
        });

        // LEVEL 12 WIN: FULL OVERRIDE - 10s Celebration → Golden Sheep → Golden Key → Wool Wallet
        if (this.activeLevel === 12 && finalCallCorrect && (this.calls.length > 0)) {
            console.log('🎉 LEVEL 12 WON - ACTIVATING 10-SECOND CELEBRATION');
            
            // Set override flags to block default win flow
            this.level12WinOverride = true;
            this.level12CelebrationComplete = false;
            
            // Start immediate celebration (no delay - victory is now!)
            this.celebrateLevel12Victory();
        }

        // Reset for next round is now controlled by HUD via 'request-restart-round' or 'request-next-level'
        // We do NOT auto-reset here anymore to allow the HUD modal to control flow.
        console.log('GameScene: Round settled. Waiting for HUD...');
    }

    saveBalance() {
        // Redundant method but kept for compatibility if called elsewhere
        // Updated to support floats
        authService.saveBalance(this.woolBalance);
    }
    resetRound() {
        this.timeLeft = CONFIG.roundTime;
        this.calls = []; // Clear all calls
        this.historicalPrices = []; 
        this.roundActive = false; // Frozen until GO!
        this.finalCallSide = null; // Reset final call selection
        this.finalTrendSide = null;
        this.totalIdledCount = 0; // Reset cumulative counter
        
        // Reload Player Level (in case it changed after a graduation)
        this.playerLevel = parseInt(localStorage.getItem('sheepMarket_playerLevel') || '1');
        
        // Reset Wolf Timer for Level 7+
        this.wolfTimer = 0;
        this.wolvesSpawnedCount = 0;
        this.wolfWarningSent = false;
        this.nextWolfSide = null;
        
        // Reset Anti-Bunching System
        this.bunchTimer = 0;
        this.lastBunchSide = null;
        
        // Reset Mud State (used in Level 4 and Level 11)
        this.mudActive = false;
        
        // Clean up mud footprints
        if (this.mudFootprints && this.mudFootprints.length > 0) {
            this.mudFootprints.forEach(fp => {
                if (fp && fp.destroy) fp.destroy();
            });
            this.mudFootprints = [];
        }
        
        // Remove mud overlay
        if (this.mudOverlay) {
            this.mudOverlay.destroy();
            this.mudOverlay = null;
        }
        
        // Reset Rain State (Level 11-12)
        this.rainStarted = false;
        this.wetGrassApplied = false;
        
        // Reset Lightning State (Level 12)
        this.lightningTimer = 0;
        this.nextLightningTime = Phaser.Math.Between(3000, 6000);
        this.lightningActive = false;
        
        // Stop rain if active
        if (this.rainEmitter && this.rainEmitter.emitting) {
            this.rainEmitter.stop();
        }
        if (audioManager.rainAmbience && audioManager.rainAmbience.state === 'started') {
            audioManager.rainAmbience.stop();
        }
        
        // Stop Phaser rain and wind sounds (Level 12)
        if (this.rainSound) {
            this.rainSound.stop();
            this.rainSound.destroy();
            this.rainSound = null;
        }
        if (this.windSound) {
            this.windSound.stop();
            this.windSound.destroy();
            this.windSound = null;
        }
        
        // Clear wet grass tint
        if (this.pastureImage) {
            this.pastureImage.clearTint();
        }
        
        // Reset Grazing State
        this.grazingActive = false;
        this.grassTufts.forEach(tuft => {
            if (tuft.sprite) tuft.sprite.destroy();
        });
        this.grassTufts = [];
        
        // Reset Lawn Mower State
        this.lawnMowerSpawned = false;
        this.windGustCount = 0; // Reset wind gust counter for Level 3
        if (this.lawnMower) {
            this.lawnMower.destroy();
            this.lawnMower = null;
        }
        
        // Reset Dog Herding State - stop bark sound if herding is active
        if (this.activeDogHerding) {
            // Cancel any pending bark timer
            if (this.activeDogHerding.nextBarkTimer) {
                this.activeDogHerding.nextBarkTimer.remove();
                console.log('🐕 Bark timer cancelled (round reset)');
            }
            // Clear herding timer
            if (this.activeDogHerding.herdingTimer) {
                this.activeDogHerding.herdingTimer.remove();
            }
            // Clear movement tween
            if (this.activeDogHerding.moveTween) {
                this.activeDogHerding.moveTween.stop();
            }
            // Destroy dog sprite if exists
            if (this.activeDogHerding.dog) {
                this.activeDogHerding.dog.destroy();
            }
            this.activeDogHerding = null;
        }
        
        // Reset Black Sheep State (Level 10+)
        this.blackSheepSpawned = false; // Reset spawn flag for levels 10+
        this.goldenCloverCollected = false; // Reset clover collection flag
        
        // Clear immune outlier tracking array
        if (this.immuneOutlierSheep) {
            this.immuneOutlierSheep = [];
        }
        
        if (this.activeBlackSheep) {
            // Destroy authority glow if it exists
            if (this.activeBlackSheep.authorityGlow) {
                this.activeBlackSheep.authorityGlow.destroy();
            }
            // Destroy influence aura (pulsing black circle)
            if (this.activeBlackSheep.influenceAura) {
                this.activeBlackSheep.influenceAura.destroy();
            }
            // Destroy dark trail particles
            if (this.activeBlackSheep.darkTrail) {
                this.activeBlackSheep.darkTrail.destroy();
            }
            this.activeBlackSheep.destroy();
            this.activeBlackSheep = null;
        }
        
        // Clean up black sheep and golden clover from previous round
        if (this.blackSheep) {
            // Remove bubble if exists
            if (this.blackSheep.bubble) {
                this.blackSheep.bubble.destroy();
            }
            if (this.blackSheep.bubbleText) {
                this.blackSheep.bubbleText.destroy();
            }
            this.blackSheep.destroy();
            this.blackSheep = null;
        }
        
        if (this.goldenClover) {
            this.goldenClover.destroy();
            this.goldenClover = null;
        }
        
        // Random spawn 15-45s for Level 8 (Intro), but earlier (8-15s) for Level 9+ to start the chaos
        if (this.activeLevel >= 9) {
             this.nextWolfTime = Phaser.Math.Between(8000, 15000);
        } else {
             this.nextWolfTime = Phaser.Math.Between(15000, 45000);
        }
        
        // Golden Sheep Reset
        this.goldenSheepActive = false;
        this.goldenSheepTarget = null;
        this.goldenSheepSpawned = false; // Reset spawn flag for new round
        if (this.goldEmitter) this.goldEmitter.stop();
        
        // 15% Chance to trigger Golden Sheep event this round
        if (Math.random() < 0.15) {
            // Trigger between 10s and 40s into the round (absolute time from now)
            // Note: 'time' in update is global time.
            // Since we don't have 'now' easily here without accessing scene, we will set a relative delay
            // and calculate the absolute time in the first update() call or just check relative to 'this.time.now'
            // 'this.time.now' is available in Scene.
            const now = this.time.now;
            this.goldenSheepTriggerTime = now + Phaser.Math.Between(10000, 40000);
            console.log('GameScene: Golden Sheep Scheduled for', this.goldenSheepTriggerTime);
        } else {
            this.goldenSheepTriggerTime = null;
        }

        this.wolves.clear(true, true); // Destroy existing wolves

        const px = 10;
        const py = 180;

        // Reposition sheep
        this.sheep.getChildren().forEach(s => {
            s.reset(); // Reset internal state
            s.setPosition(
                Phaser.Math.Between(px + 100, px + this.pastureWidth - 100),
                Phaser.Math.Between(py + 100, py + this.pastureHeight - 100)
            );
            
            // LEVEL 3-4: Reapply wet tint after reset
            if (this.activeLevel >= 3 && this.activeLevel <= 4) {
                s.setTint(0x8899aa);
            }
            
            // LEVEL 11-12: Reapply wet tint if wet grass is active
            if ((this.activeLevel === 11 || this.activeLevel === 12) && this.wetGrassApplied) {
                s.setTint(0x8899aa);
            }
        });

        this.events.emit('round-started', {
            balance: this.woolBalance,
            roundTime: this.timeLeft
        });
    }

    startGrazingPeriod() {
        this.grazingActive = true;
        
        // Level 7-12: 6 grass tufts maximum (random spawning)
        // Level 6: Only 2 grass tufts to emphasize player-placed grass strategy
        // Level 5: 12 grass tufts (original behavior)
        if (this.activeLevel >= 7) {
            this.totalGrassToSpawn = 6;
        } else if (this.activeLevel === 6) {
            this.totalGrassToSpawn = 10; // Increased from 2 to 10 for more grass
        } else {
            this.totalGrassToSpawn = 12;
        }
        
        this.grassSpawnedCount = 0;
        this.firstGrassCutCollected = false; // Track if first grass has been sent to button
        
        // Calculate spawn interval: 58s to 7s = 51 seconds = 51000ms
        if (this.activeLevel >= 7) {
            // Level 7-12: Spawn 6 tufts over 51 seconds = ~8500ms per tuft
            this.grassSpawnInterval = 8500;
        } else if (this.activeLevel === 6) {
            // Level 6: Spawn 10 tufts over 51 seconds = ~5100ms per tuft (faster spawning)
            this.grassSpawnInterval = 5100;
        } else {
            // Level 5: Spread 12 tufts over 51 seconds = ~4636ms per tuft
            this.grassSpawnInterval = 4636; // ~4.6 seconds between spawns
        }
        
        this.nextGrassSproutTime = this.time.now + 2000; // First spawn after 2s
        
        console.log(`GameScene: Grazing period started - will spawn ${this.totalGrassToSpawn} tufts over 51 seconds`);
    }

    stopGrazingPeriod() {
        this.grazingActive = false;
        
        // Clean up all grass tufts
        this.grassTufts.forEach(tuft => {
            if (tuft.sprite) {
                this.tweens.add({
                    targets: tuft.sprite,
                    alpha: 0,
                    scale: 0,
                    duration: 500,
                    onComplete: () => {
                        tuft.sprite.destroy();
                    }
                });
            }
        });
        this.grassTufts = [];
        
        // Release all grazing sheep and remove indicators
        this.sheep.getChildren().forEach(s => {
            if (s.isGrazing) {
                s.isGrazing = false;
                s.grazingTuft = null;
                
                // Stop eating animation
                if (s.eatingTween) {
                    s.eatingTween.stop();
                    s.eatingTween = null;
                }
                
                // Stop grass consumption tween
                if (s.grassConsumptionTween) {
                    s.grassConsumptionTween.stop();
                    s.grassConsumptionTween = null;
                }
                
                // Stop and destroy eating particles
                if (s.eatParticles) {
                    s.eatParticles.stop();
                    this.time.delayedCall(800, () => {
                        if (s.eatParticles) {
                            s.eatParticles.destroy();
                            s.eatParticles = null;
                        }
                    });
                }
                
                // Restore scale
                s.setScale(0.12);
                
                // Restore normal sheep depth
                s.setDepth(10);
                
                // Remove grazing indicator
                if (s.grazingIndicator && s.grazingIndicator.active) {
                    this.tweens.add({
                        targets: s.grazingIndicator,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => {
                            if (s.grazingIndicator) s.grazingIndicator.destroy();
                        }
                    });
                }
                s.grazingIndicator = null;
            }
        });
        
        console.log('GameScene: Grazing period ended');
    }

    spawnGrassTufts() {
        if (!this.grazingActive) return;
        
        // Check if we've spawned all 12 tufts
        if (this.grassSpawnedCount >= this.totalGrassToSpawn) {
            return;
        }
        
        // Spawn 1 grass tuft at a time in the pasture area (above buttons)
        // Buttons are at height - 200 = 880, so keep grass well above at max y=700
        const x = Phaser.Math.Between(150, CONFIG.width - 150);
        const y = Phaser.Math.Between(200, 700); // Keep grass in visible pasture area, above buttons
        
        const tuft = this.add.image(x, y, 'grass_tuft');
        tuft.setScale(0);
        tuft.setDepth(5); // Below sheep
        tuft.setAlpha(0);
        
        // Play plop sound
        audioManager.playGrassPlop();
        
        // Pop-up animation
        this.tweens.add({
            targets: tuft,
            scale: 0.4,
            alpha: 1,
            duration: 500,
            ease: 'Back.easeOut'
        });
        
        this.grassTufts.push({
            sprite: tuft,
            x: x,
            y: y,
            eaten: false
        });
        
        this.grassSpawnedCount++;
        
        // Level 5: Show speech bubble on the FIRST grass tuft only
        if (this.activeLevel === 5 && this.grassSpawnedCount === 1) {
            // Create speech bubble after pop-up animation completes
            this.time.delayedCall(500, () => {
                const bubbleWidth = 270;
                const bubbleHeight = 65;
                const bubbleX = x;
                const bubbleY = y - 85;
                
                // Create bubble background
                const bubble = this.add.graphics();
                bubble.fillStyle(0xffffff, 0.95);
                bubble.lineStyle(2, 0x000000, 1);
                bubble.fillRoundedRect(bubbleX - bubbleWidth/2, bubbleY - bubbleHeight/2, bubbleWidth, bubbleHeight, 8);
                bubble.strokeRoundedRect(bubbleX - bubbleWidth/2, bubbleY - bubbleHeight/2, bubbleWidth, bubbleHeight, 8);
                
                // Speech bubble pointer pointing down to grass
                bubble.fillStyle(0xffffff, 0.95);
                bubble.lineStyle(2, 0x000000, 1);
                bubble.beginPath();
                bubble.moveTo(bubbleX - 8, bubbleY + bubbleHeight/2);
                bubble.lineTo(bubbleX, bubbleY + bubbleHeight/2 + 12);
                bubble.lineTo(bubbleX + 8, bubbleY + bubbleHeight/2);
                bubble.closePath();
                bubble.fillPath();
                bubble.strokePath();
                
                bubble.setDepth(10001);
                bubble.setAlpha(0);
                
                // Create text with the requested message
                const bubbleText = this.add.text(bubbleX, bubbleY, "PLEASE DON'T MOW ME!\n(BUT ACTUALLY, DO)", {
                    fontFamily: 'Arial Black',
                    fontSize: '16px',
                    color: '#000000',
                    fontStyle: 'bold',
                    align: 'center'
                });
                bubbleText.setOrigin(0.5);
                bubbleText.setDepth(10002);
                bubbleText.setAlpha(0);
                
                // Animate bubble in
                this.tweens.add({
                    targets: [bubble, bubbleText],
                    alpha: 1,
                    duration: 200,
                    ease: 'Back.easeOut'
                });
                
                // Remove bubble after 6 seconds
                this.time.delayedCall(6000, () => {
                    if (bubble && bubble.scene) {
                        this.tweens.add({
                            targets: [bubble, bubbleText],
                            alpha: 0,
                            duration: 300,
                            onComplete: () => {
                                if (bubble && bubble.scene) bubble.destroy();
                                if (bubbleText && bubbleText.scene) bubbleText.destroy();
                            }
                        });
                    }
                });
            });
        }
        
        // Notify HUD that grass spawned (for lawn mower button bounce)
        this.events.emit('grass-spawned');
        
        // Send 2-4 random sheep to graze (increased attraction)
        // Exclude zombified and immune outlier sheep
        const availableSheep = this.sheep.getChildren().filter(s => !s.isGrazing && s.active && !s.isZombified && !s.isImmuneOutlier);
        const numGrazers = Math.min(Phaser.Math.Between(2, 4), availableSheep.length);
        
        for (let i = 0; i < numGrazers; i++) {
            const sheep = Phaser.Utils.Array.GetRandom(availableSheep);
            const tuft = this.grassTufts[i % this.grassTufts.length];
            
            if (sheep && tuft && !tuft.eaten) {
                this.sendSheepToGraze(sheep, tuft);
                availableSheep.splice(availableSheep.indexOf(sheep), 1);
            }
        }
        
        // Schedule next grass sprout at fixed interval
        this.nextGrassSproutTime = this.time.now + this.grassSpawnInterval;
    }

    sendSheepToGraze(sheep, tuft) {
        // IMMUNE SHEEP: Zombified/immune outlier sheep ignore grass tufts
        if (sheep.isZombified || sheep.isImmuneOutlier) {
            console.log('🐑⚫ Immune/zombified sheep ignoring grass tuft');
            return;
        }
        
        sheep.isGrazing = true;
        sheep.grazingTuft = tuft;
        sheep.body.setVelocity(0, 0);
        
        // Position sheep to the side of grass, not on top
        // Random side (left or right) with offset
        const side = Math.random() > 0.5 ? 1 : -1;
        const offsetX = side * 50; // 50 pixels to the side (more distance)
        const offsetY = Phaser.Math.Between(-30, -15); // Position sheep ABOVE grass (negative Y = higher up on screen)
        
        const targetX = tuft.x + offsetX;
        const targetY = tuft.y + offsetY;
        
        // Ensure sheep is behind grass in depth (grass is at depth 5)
        // Set sheep depth lower than grass so sheep appears behind
        sheep.setDepth(4);
        
        // Create visual indicator above sheep (eating icon)
        const indicator = this.add.text(sheep.x, sheep.y - 60, '🌿', {
            font: '32px Arial',
            fill: '#ffffff'
        });
        indicator.setOrigin(0.5);
        indicator.setDepth(sheep.depth + 1);
        indicator.setAlpha(0);
        
        // Fade in indicator
        this.tweens.add({
            targets: indicator,
            alpha: 1,
            duration: 300
        });
        
        // Store indicator reference on sheep
        sheep.grazingIndicator = indicator;
        
        // Move sheep to grass tuft (beside it)
        this.tweens.add({
            targets: sheep,
            x: targetX,
            y: targetY,
            duration: 1000,
            ease: 'Sine.easeInOut',
            onUpdate: () => {
                // Keep indicator above sheep while moving
                if (indicator && indicator.active) {
                    indicator.setPosition(sheep.x, sheep.y - 60);
                }
            },
            onComplete: () => {
                // Start eating animation - continuous bobbing head motion
                if (sheep.isGrazing) {
                    // Pulse indicator continuously
                    this.tweens.add({
                        targets: indicator,
                        scale: { from: 1, to: 1.2 },
                        duration: 400,
                        yoyo: true,
                        repeat: -1 // Continuous animation
                    });
                    
                    // Store original scale to restore it properly
                    const originalScaleY = sheep.scaleY;
                    
                    // Continuous head bobbing animation (eating motion)
                    const eatingTween = this.tweens.add({
                        targets: sheep,
                        scaleY: originalScaleY * 0.92, // Bob down
                        duration: 500,
                        yoyo: true,
                        repeat: -1, // Loop forever while grazing
                        ease: 'Sine.easeInOut',
                        onUpdate: () => {
                            // Keep indicator synced during eating animation
                            if (indicator && indicator.active) {
                                indicator.setPosition(sheep.x, sheep.y - 60);
                            }
                        }
                    });
                    
                    // Store the eating tween so we can stop it later
                    sheep.eatingTween = eatingTween;
                    
                    // Visual grass consumption effect - gradually shrink grass as sheep eats
                    const grassSprite = tuft.sprite;
                    if (grassSprite && grassSprite.active) {
                        const originalGrassScale = grassSprite.scaleX;
                        
                        // Gradually shrink grass over eating duration
                        const grassConsumptionTween = this.tweens.add({
                            targets: grassSprite,
                            scale: originalGrassScale * 0.3, // Shrink to 30% of original size
                            alpha: 0.5, // Fade slightly
                            duration: 4000, // 4 seconds of consumption
                            ease: 'Sine.easeIn'
                        });
                        
                        // Store grass consumption tween reference
                        sheep.grassConsumptionTween = grassConsumptionTween;
                        
                        // Create eating particle effect - small green bits
                        const eatParticles = this.add.particles(tuft.x, tuft.y, 'grass_tuft', {
                            speed: { min: 20, max: 50 },
                            angle: { min: 0, max: 360 },
                            scale: { start: 0.05, end: 0 },
                            alpha: { start: 0.8, end: 0 },
                            lifespan: 600,
                            frequency: 300, // Emit every 300ms
                            quantity: 2,
                            tint: 0x44ff44,
                            blendMode: 'ADD'
                        });
                        eatParticles.setDepth(15);
                        
                        // Store particle reference to stop later
                        sheep.eatParticles = eatParticles;
                    }
                    
                    // After 3-5 seconds of grazing, sheep finishes eating
                    const grazeDuration = Phaser.Math.Between(3000, 5000);
                    this.time.delayedCall(grazeDuration, () => {
                        if (sheep.isGrazing) {
                            // Stop the eating animation
                            if (sheep.eatingTween) {
                                sheep.eatingTween.stop();
                                sheep.eatingTween = null;
                            }
                            
                            // Stop grass consumption tween
                            if (sheep.grassConsumptionTween) {
                                sheep.grassConsumptionTween.stop();
                                sheep.grassConsumptionTween = null;
                            }
                            
                            // Stop and destroy eating particles
                            if (sheep.eatParticles) {
                                sheep.eatParticles.stop();
                                this.time.delayedCall(800, () => {
                                    if (sheep.eatParticles) {
                                        sheep.eatParticles.destroy();
                                        sheep.eatParticles = null;
                                    }
                                });
                            }
                            
                            // Restore original scale
                            sheep.setScale(0.12);
                            
                            // Restore normal sheep depth (above grass)
                            sheep.setDepth(10);
                            
                            // Remove indicator
                            if (indicator && indicator.active) {
                                this.tweens.add({
                                    targets: indicator,
                                    alpha: 0,
                                    duration: 300,
                                    onComplete: () => {
                                        indicator.destroy();
                                    }
                                });
                            }
                            
                            sheep.isGrazing = false;
                            sheep.grazingTuft = null;
                            sheep.grazingIndicator = null;
                        }
                    });
                }
            }
        });
    }

    spawnLawnMowerWithWind(windDuration, windIntensity, windParticleSpeed) {
        // LEVEL 3 ONLY: Lawn mower synced with wind gust animation
        // This function is called directly from startWindEvent() with wind parameters
        this.lawnMowerSpawned = true;
        
        console.log('🌪️ Lawn mower spawning with wind gust from LEFT');
        
        // ALWAYS spawn from LEFT for Level 3 (ignore wind direction)
        const startX = -150;
        const startY = Phaser.Math.Between(180, 280); // Random vertical position
        const landingX = 250;
        const landingY = 350;
        
        // Calculate mower speed based on wind intensity and particle speed
        // Match the wind gust timing exactly
        const mowerSpeed = (windParticleSpeed.min + windParticleSpeed.max) / 2;
        const distance = Math.abs(landingX - startX);
        const mowerDuration = (distance / mowerSpeed) * 1000 * windIntensity;
        
        // Create lawn mower sprite
        this.lawnMower = this.add.image(startX, startY, 'lawn_mower');
        this.lawnMower.setScale(0.25);
        this.lawnMower.setDepth(10000);
        this.lawnMower.setAlpha(0);
        this.lawnMower.setRotation(-0.3);
        this.lawnMower.setInteractive();
        
        // Additional wind particles trailing the mower (synced with main wind emitter)
        const mowerTrail = this.add.particles(startX, startY, 'wind_particle', {
            speed: { min: windParticleSpeed.min * 0.5, max: windParticleSpeed.max * 0.5 },
            angle: { min: -15, max: 15 }, // Blowing right
            scale: { start: 0.8, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 1200,
            frequency: 50,
            quantity: 3,
            blendMode: 'ADD',
            tint: 0xaaaaaa
        });
        mowerTrail.setDepth(9999);
        
        // Grass particles kicked up by the mower
        if (!this.textures.exists('dust_particle')) {
            const pg = this.make.graphics({ x: 0, y: 0, add: false });
            pg.fillStyle(0x90a080, 1);
            pg.fillCircle(3, 3, 3);
            pg.generateTexture('dust_particle', 6, 6);
        }
        
        const dustTrail = this.add.particles(startX, startY + 20, 'dust_particle', {
            speed: { min: 50, max: 150 },
            angle: { min: 150, max: 210 }, // Trailing behind (left side)
            scale: { start: 0.4, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 800,
            frequency: 40,
            quantity: 2,
            gravityY: 100,
            tint: 0x8b7355
        });
        dustTrail.setDepth(9998);
        
        // Animate lawn mower entrance - synced with wind timeline
        // Use Cubic.easeOut to match wind settling behavior
        this.tweens.add({
            targets: this.lawnMower,
            x: landingX,
            y: landingY,
            rotation: 0,
            alpha: 1,
            duration: mowerDuration,
            ease: 'Cubic.easeOut', // Eases in with wind, settles smoothly
            onUpdate: () => {
                // Update particle emitter positions to follow mower
                if (mowerTrail) {
                    mowerTrail.setPosition(this.lawnMower.x, this.lawnMower.y);
                }
                if (dustTrail) {
                    dustTrail.setPosition(this.lawnMower.x, this.lawnMower.y + 20);
                }
            },
            onComplete: () => {
                // Stop particle emitters when mower lands
                if (mowerTrail) {
                    mowerTrail.stop();
                    this.time.delayedCall(1200, () => mowerTrail.destroy());
                }
                if (dustTrail) {
                    dustTrail.stop();
                    this.time.delayedCall(800, () => dustTrail.destroy());
                }
                
                // Create "TAKE ME" speech bubble
                const bubbleWidth = 100;
                const bubbleHeight = 40;
                const bubbleX = landingX;
                const bubbleY = landingY - 80;
                
                // Create bubble background
                const bubble = this.add.graphics();
                bubble.fillStyle(0xffffff, 0.95);
                bubble.lineStyle(2, 0x000000, 1);
                bubble.fillRoundedRect(bubbleX - bubbleWidth/2, bubbleY - bubbleHeight/2, bubbleWidth, bubbleHeight, 8);
                bubble.strokeRoundedRect(bubbleX - bubbleWidth/2, bubbleY - bubbleHeight/2, bubbleWidth, bubbleHeight, 8);
                
                // Speech bubble pointer
                bubble.fillStyle(0xffffff, 0.95);
                bubble.lineStyle(2, 0x000000, 1);
                bubble.beginPath();
                bubble.moveTo(bubbleX - 8, bubbleY + bubbleHeight/2);
                bubble.lineTo(bubbleX, bubbleY + bubbleHeight/2 + 12);
                bubble.lineTo(bubbleX + 8, bubbleY + bubbleHeight/2);
                bubble.closePath();
                bubble.fillPath();
                bubble.strokePath();
                
                bubble.setDepth(10001);
                bubble.setAlpha(0);
                
                // Create text
                const bubbleText = this.add.text(bubbleX, bubbleY, 'TAKE ME', {
                    fontFamily: 'Arial Black',
                    fontSize: '16px',
                    color: '#000000',
                    fontStyle: 'bold'
                });
                bubbleText.setOrigin(0.5);
                bubbleText.setDepth(10002);
                bubbleText.setAlpha(0);
                
                // Animate bubble in
                this.tweens.add({
                    targets: [bubble, bubbleText],
                    alpha: 1,
                    duration: 200,
                    ease: 'Back.easeOut'
                });
                
                // Remove bubble after 3 seconds
                this.time.delayedCall(3000, () => {
                    this.tweens.add({
                        targets: [bubble, bubbleText],
                        alpha: 0,
                        duration: 300,
                        onComplete: () => {
                            bubble.destroy();
                            bubbleText.destroy();
                        }
                    });
                });
                
                // Add idle animation after landing to attract attention
                this.tweens.add({
                    targets: this.lawnMower,
                    y: landingY - 10,
                    duration: 800,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                
                this.tweens.add({
                    targets: this.lawnMower,
                    rotation: -0.1,
                    duration: 600,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                
                this.tweens.add({
                    targets: this.lawnMower,
                    scale: 0.27,
                    duration: 700,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        });
        
        // ===== CLICK HANDLER - FLY TO BUTTON =====
        this.lawnMower.on('pointerdown', () => {
            if (!this.lawnMower || !this.lawnMower.active) return;
            
            // Stop any animations
            this.tweens.killTweensOf(this.lawnMower);
            
            // Get current position and properties
            const currentX = this.lawnMower.x;
            const currentY = this.lawnMower.y;
            const currentScale = this.lawnMower.scale;
            const currentRotation = this.lawnMower.rotation;
            const currentAlpha = this.lawnMower.alpha;
            
            // Hide the GameScene lawn mower
            this.lawnMower.setVisible(false);
            
            // Tell HUD to create and animate the lawn mower
            this.scene.get('HUDScene').events.emit('animate-lawnmower', {
                startX: currentX,
                startY: currentY,
                startScale: currentScale,
                startRotation: currentRotation,
                startAlpha: currentAlpha
            });
            
            // Clean up GameScene lawn mower after a delay
            this.time.delayedCall(3000, () => {
                if (this.lawnMower) {
                    this.lawnMower.destroy();
                    this.lawnMower = null;
                }
            });
        });
    }
    
    spawnLawnMower() {
        // Legacy function - kept for compatibility but no longer used in Level 3
        // Level 3 now uses spawnLawnMowerWithWind() which syncs with wind gusts
        this.lawnMowerSpawned = true;
        
        // Start lawn mower off-screen to the left
        const startX = -100;
        const startY = 200;
        const landingX = 250;
        const landingY = 350; // Higher up to avoid interface
        
        // SYNCHRONIZED WIND EFFECTS - ALL START TOGETHER
        
        // 1. Play wind sound immediately
        if (this.sound.get('wind_gust')) {
            this.playSound('wind_gust', { volume: 0.3 });
        }
        
        // 2. Create multiple wind particle layers for dramatic effect
        // Background wind layer (lighter, faster)
        const windBackground = this.add.particles(-200, startY - 50, 'dust_particle', {
            speed: { min: 200, max: 300 },
            angle: { min: -5, max: 5 },
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.4, end: 0 },
            lifespan: 1200,
            frequency: 40,
            quantity: 3,
            blendMode: 'ADD',
            tint: 0xdddddd
        });
        windBackground.setDepth(9998);
        
        // 3. Main wind trail following lawn mower
        const windTrail = this.add.particles(startX - 30, startY, 'dust_particle', {
            speed: { min: 150, max: 250 },
            angle: { min: -15, max: 15 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.7, end: 0 },
            lifespan: 1500,
            frequency: 30,
            quantity: 2,
            blendMode: 'ADD',
            tint: 0xaaaaaa
        });
        windTrail.setDepth(9999);
        
        // 4. Create lawn mower
        this.lawnMower = this.add.image(startX, startY, 'lawn_mower');
        this.lawnMower.setScale(0.25);
        this.lawnMower.setDepth(10000);
        this.lawnMower.setAlpha(0);
        this.lawnMower.setRotation(-0.3);
        this.lawnMower.setInteractive();
        
        // 5. Animate everything together in sync
        const animDuration = 2000;
        
        // Move background wind
        this.tweens.add({
            targets: windBackground,
            x: landingX + 100,
            y: startY + 50,
            duration: animDuration,
            ease: 'Sine.easeOut',
            onComplete: () => {
                windBackground.stop();
                this.time.delayedCall(1200, () => windBackground.destroy());
            }
        });
        
        // Move main wind trail
        this.tweens.add({
            targets: windTrail,
            x: landingX - 40,
            y: landingY,
            duration: animDuration,
            ease: 'Sine.easeOut',
            onComplete: () => {
                windTrail.stop();
                this.time.delayedCall(1500, () => windTrail.destroy());
            }
        });
        
        // Blow in lawn mower
        this.tweens.add({
            targets: this.lawnMower,
            x: landingX,
            y: landingY,
            rotation: 0,
            alpha: 1,
            duration: animDuration,
            ease: 'Sine.easeOut',
            onComplete: () => {
                // Add idle animation after landing to attract attention
                // Gentle bounce and slight rotation
                this.tweens.add({
                    targets: this.lawnMower,
                    y: landingY - 10,
                    duration: 800,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                
                this.tweens.add({
                    targets: this.lawnMower,
                    rotation: -0.1,
                    duration: 600,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                
                this.tweens.add({
                    targets: this.lawnMower,
                    scale: 0.27,
                    duration: 700,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        });
        
        // Click handler
        this.lawnMower.on('pointerdown', () => {
            if (!this.lawnMower || !this.lawnMower.active) return;
            
            // Stop any animations
            this.tweens.killTweensOf(this.lawnMower);
            
            // Get current position and properties
            const currentX = this.lawnMower.x;
            const currentY = this.lawnMower.y;
            const currentScale = this.lawnMower.scale;
            const currentRotation = this.lawnMower.rotation;
            const currentAlpha = this.lawnMower.alpha;
            
            // Hide the GameScene lawn mower
            this.lawnMower.setVisible(false);
            
            // Tell HUD to create and animate the lawn mower
            this.scene.get('HUDScene').events.emit('animate-lawnmower', {
                startX: currentX,
                startY: currentY,
                startScale: currentScale,
                startRotation: currentRotation,
                startAlpha: currentAlpha
            });
            
            // Clean up GameScene lawn mower after a delay
            this.time.delayedCall(3000, () => {
                if (this.lawnMower) {
                    this.lawnMower.destroy();
                    this.lawnMower = null;
                }
            });
        });
    }

    enableGrassPlacementMode() {
        console.log('[GRASS] enter');
        if (this.grassPlacementMode) return;
        
        // Enable click-to-place grass mode for Level 6
        this.grassPlacementMode = true;
        
        // Create cursor grass preview
        this.grassCursor = this.add.image(0, 0, 'grass_tuft')
            .setScale(0.4)
            .setDepth(10000)
            .setAlpha(0.7);
        
        // Create full-screen interactive zone
        if (this.grassPlacementZone) {
            this.grassPlacementZone.destroy();
        }
        
        this.grassPlacementZone = this.add.rectangle(
            CONFIG.width / 2,
            CONFIG.height / 2,
            CONFIG.width,
            CONFIG.height,
            0x000000,
            0
        );
        this.grassPlacementZone.setDepth(9999);
        this.grassPlacementZone.setInteractive({ cursor: 'crosshair' });
        
        // Track mouse movement to show preview
        const pointerMoveHandler = (pointer) => {
            if (this.grassCursor && this.grassCursor.active) {
                this.grassCursor.setPosition(pointer.worldX, pointer.worldY);
            }
        };
        
        // Place grass on click
        const pointerDownHandler = (pointer) => {
            if (this.grassPlacementMode) {
                this.placeGrass(pointer.worldX, pointer.worldY);
            }
        };
        
        // Attach listeners
        this.input.on('pointermove', pointerMoveHandler);
        this.grassPlacementZone.once('pointerdown', pointerDownHandler);
        
        // Store handlers for cleanup
        this.grassPlacementHandlers = {
            move: pointerMoveHandler,
            down: pointerDownHandler
        };
    }

    placeGrass(x, y) {
        console.log('[GRASS] place');
        
        // Consume one collected grass tuft
        if (!this.collectedGrassCount || this.collectedGrassCount === 0) {
            this.disableGrassPlacementMode();
            return; // Should not happen - button should be disabled
        }
        this.collectedGrassCount--;
        
        // PERSISTENCE: Save to localStorage (persists across levels)
        // ENDLESS MODE: Use separate storage
        const grassStorageKey = this.isEndlessMode ? 'sheepMarket_endless_grassCount' : 'sheepMarket_grassCount';
        localStorage.setItem(grassStorageKey, this.collectedGrassCount.toString());
        
        // Update grass count display
        const hudScene = this.scene.get('HUDScene');
        hudScene.updateGrassCount(this.collectedGrassCount);
        
        // Deduct cost - from config
        const cost = ABILITY_CONFIG.grass.cost;
        this.woolBalance -= cost;
        hudScene.balance -= cost;
        
        // Play satisfying coin sound
        this.playWoolSpendSound(cost);
        
        this.saveBalance();
        
        // Update balance text directly
        if (hudScene.balanceText) {
            hudScene.displayBalance = hudScene.balance;
            hudScene.balanceText.setText(`${hudScene.formatWool(hudScene.balance)}W`);
        }
        
        // Update wool wallet UI directly
        if (hudScene.woolWalletPlaceholders && hudScene.woolWalletPlaceholders.totalBalance) {
            hudScene.woolWalletPlaceholders.totalBalance.setText(`${hudScene.formatWool(hudScene.balance)}W`);
        }
        
        this.events.emit('balance-updated', this.woolBalance);
        
        // Track call spending in lifetime stats
        if (hudScene && hudScene.trackCallSpending) {
            hudScene.trackCallSpending(cost);
        }
        
        // Create grass tuft at clicked position
        const tuft = this.add.image(x, y, 'grass_tuft');
        tuft.setScale(0);
        tuft.setDepth(800); // 800 ensures grass is above sheep (200-700)
        tuft.setAlpha(0);
        
        // Play plop sound
        audioManager.playGrassPlop();
        
        // (Particle burst removed for stability)
        
        // Pop-up animation
        this.tweens.add({
            targets: tuft,
            scale: 0.4,
            alpha: 1,
            duration: 500,
            ease: 'Back.easeOut'
        });
        
        // Show cost text above grass
        const costText = this.add.text(x, y - 30, `-${cost}W`, {
            font: 'bold 24px Arial',
            fill: '#ff6666',
            stroke: '#000000',
            strokeThickness: 4
        });
        costText.setOrigin(0.5);
        costText.setDepth(1001);
        
        // Float up and fade
        this.tweens.add({
            targets: costText,
            y: y - 80,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => costText.destroy()
        });
        
        // Initialize grass tufts array if it doesn't exist
        if (!this.grassTufts) {
            this.grassTufts = [];
        }
        
        // Add to grass tufts array (mark as player-placed to skip wool payout when cut)
        this.grassTufts.push({
            sprite: tuft,
            x: x,
            y: y,
            eaten: false,
            playerPlaced: true // Flag to skip wool reward when mowed
        });
        
        // Play sound (soft bleat for grass placement)
        this.playSound('bleat', { volume: 0.15 });
        
        // Send 2-3 nearby sheep to graze at this tuft
        const nearbyRadius = 400;
        const availableSheep = this.sheep.getChildren().filter(s => {
            if (!s.active || s.isGrazing || s.isZombified || s.isImmuneOutlier) return false;
            const dist = Phaser.Math.Distance.Between(x, y, s.x, s.y);
            return dist < nearbyRadius;
        });
        
        // Sort by distance (closest first)
        availableSheep.sort((a, b) => {
            const distA = Phaser.Math.Distance.Between(x, y, a.x, a.y);
            const distB = Phaser.Math.Distance.Between(x, y, b.x, b.y);
            return distA - distB;
        });
        
        // Take top 2-3 closest sheep
        const numGrazers = Math.min(Phaser.Math.Between(2, 3), availableSheep.length);
        const selectedSheep = availableSheep.slice(0, numGrazers);
        
        selectedSheep.forEach(sheep => {
            const grassTuft = this.grassTufts[this.grassTufts.length - 1]; // Latest tuft
            if (grassTuft && !grassTuft.eaten) {
                this.sendSheepToGraze(sheep, grassTuft);
            }
        });
        
        // Clean up placement mode and trigger HUD cooldown
        this.disableGrassPlacementMode();
        this.events.emit('placement-complete', { type: 'grass' });
    }

    disableGrassPlacementMode() {
        console.log('[GRASS] exit');
        
        this.grassPlacementMode = false;
        
        // Remove cursor preview
        if (this.grassCursor) {
            this.grassCursor.destroy();
            this.grassCursor = null;
        }
        
        // Remove placement zone
        if (this.grassPlacementZone) {
            this.grassPlacementZone.removeAllListeners();
            this.grassPlacementZone.destroy();
            this.grassPlacementZone = null;
        }
        
        // Remove input listeners
        if (this.grassPlacementHandlers && this.grassPlacementHandlers.move) {
            this.input.off('pointermove', this.grassPlacementHandlers.move);
        }
        this.grassPlacementHandlers = null;
    }

    enableBonePlacementMode() {
        // Enable click-to-place bone mode for Level 7+
        this.bonePlacementMode = true;
        
        // Create cursor bone preview (emoji)
        this.boneCursor = this.add.text(0, 0, '🦴', {
            font: '48px Arial'
        }).setOrigin(0.5)
            .setDepth(10000)
            .setAlpha(0.7);
        
        // Create full-screen interactive zone
        if (this.bonePlacementZone) {
            this.bonePlacementZone.destroy();
        }
        
        this.bonePlacementZone = this.add.rectangle(
            CONFIG.width / 2,
            CONFIG.height / 2,
            CONFIG.width,
            CONFIG.height,
            0x000000,
            0
        );
        this.bonePlacementZone.setDepth(9999);
        this.bonePlacementZone.setInteractive({ cursor: 'crosshair' });
        
        // Track mouse movement to show preview
        const pointerMoveHandler = (pointer) => {
            if (this.boneCursor && this.boneCursor.active) {
                this.boneCursor.setPosition(pointer.worldX, pointer.worldY);
            }
        };
        
        // Place bone on click
        const pointerDownHandler = (pointer) => {
            if (this.bonePlacementMode) {
                this.placeBone(pointer.worldX, pointer.worldY);
            }
        };
        
        // Attach listeners
        this.input.on('pointermove', pointerMoveHandler);
        this.bonePlacementZone.once('pointerdown', pointerDownHandler);
        
        // Store handlers for cleanup
        this.bonePlacementHandlers = {
            move: pointerMoveHandler,
            down: pointerDownHandler
        };
    }

    placeBone(x, y) {
        // WALLET ZONE PROTECTION: Prevent bone placement near wool wallet (top-left corner)
        // Wallet is at (90, 87) with ~120px width and ~60px height
        const walletZone = {
            x: 0,
            y: 0,
            width: 240,  // Extended buffer zone
            height: 180  // Extended buffer zone
        };
        
        if (x >= walletZone.x && x <= walletZone.x + walletZone.width &&
            y >= walletZone.y && y <= walletZone.y + walletZone.height) {
            // Show warning that this area is blocked
            const warningText = this.add.text(x, y, '❌ Too close to wallet!', {
                font: 'bold 20px Arial',
                color: '#ff3333',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5).setDepth(300);
            
            this.tweens.add({
                targets: warningText,
                y: y - 40,
                alpha: 0,
                duration: 1200,
                ease: 'Cubic.easeOut',
                onComplete: () => warningText.destroy()
            });
            
            return; // Don't place bone
        }
        
        // Deduct cost - from config
        const hudScene = this.scene.get('HUDScene');
        const cost = ABILITY_CONFIG.bone.cost;
        this.woolBalance -= cost;
        hudScene.balance -= cost;
        
        // Play satisfying coin sound
        this.playWoolSpendSound(cost);
        
        this.saveBalance();
        
        // Update balance text directly
        if (hudScene.balanceText) {
            hudScene.displayBalance = hudScene.balance;
            hudScene.balanceText.setText(`${hudScene.formatWool(hudScene.balance)}W`);
        }
        
        // Update wool wallet UI directly
        if (hudScene.woolWalletPlaceholders && hudScene.woolWalletPlaceholders.totalBalance) {
            hudScene.woolWalletPlaceholders.totalBalance.setText(`${hudScene.formatWool(hudScene.balance)}W`);
        }
        
        this.events.emit('balance-updated', this.woolBalance);
        
        // Track call spending in lifetime stats
        if (hudScene && hudScene.trackCallSpending) {
            hudScene.trackCallSpending(cost);
        }
        
        // Show cost text above bone
        const costText = this.add.text(x, y - 30, `-${cost}W`, {
            font: 'bold 24px Arial',
            fill: '#ff6666',
            stroke: '#000000',
            strokeThickness: 4
        });
        costText.setOrigin(0.5);
        costText.setDepth(1001);
        
        // Float up and fade
        this.tweens.add({
            targets: costText,
            y: y - 80,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => costText.destroy()
        });
        
        // Create bone sprite at clicked position (distraction for wolves)
        const bone = this.add.text(x, y, '🦴', {
            font: '48px Arial'
        }).setOrigin(0.5);
        
        bone.setScale(0);
        bone.setDepth(60);
        bone.setAlpha(0);
        
        // Make bone interactive for reclaiming
        bone.setInteractive({ useHandCursor: true });
        
        // Pop-up animation
        this.tweens.add({
            targets: bone,
            scale: 1,
            alpha: 1,
            duration: 500,
            ease: 'Back.easeOut'
        });
        
        // Pulse animation to attract wolves
        const pulseTween = this.tweens.add({
            targets: bone,
            scale: { from: 1, to: 1.2 },
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Initialize placed bones array if it doesn't exist
        if (!this.placedBones) {
            this.placedBones = [];
        }
        
        // Store bone reference (wolves will target this)
        const boneData = {
            sprite: bone,
            x: x,
            y: y,
            active: true,
            pulseTween: pulseTween
        };
        
        this.placedBones.push(boneData);
        
        // Add click handler to reclaim bone
        bone.on('pointerdown', () => {
            this.reclaimBone(boneData);
        });
        
        // Hover effects
        bone.on('pointerover', () => {
            if (boneData.active) {
                bone.setTint(0xffff00); // Yellow tint on hover
            }
        });
        
        bone.on('pointerout', () => {
            bone.clearTint();
        });
        
        // BONE COUNT LIFECYCLE: Decrement when bone is placed in pasture
        // Count only changes on: bone impact (increment), bone placement (decrement), or new bone collected (increment)
        if (this.collectedBonesCount > 0) {
            this.collectedBonesCount--;
            
            // PERSISTENCE: Save to localStorage (persists across levels)
            // ENDLESS MODE: Use separate storage
            const boneStorageKey = this.isEndlessMode ? 'sheepMarket_endless_boneCount' : 'sheepMarket_boneCount';
            localStorage.setItem(boneStorageKey, this.collectedBonesCount.toString());
            
            this.events.emit('bones-collected', this.collectedBonesCount);
            console.log('🦴 Bone placed in pasture - count decremented to:', this.collectedBonesCount);
        }
        
        // Play sound
        audioManager.playClick();
        
        // Clean up placement mode and trigger HUD cooldown
        this.disableBonePlacementMode();
        this.events.emit('placement-complete', { type: 'bone' });
    }

    reclaimBone(boneData) {
        // Check if bone is still active and not being eaten by a wolf
        if (!boneData.active || !boneData.sprite || !boneData.sprite.active) {
            return;
        }
        
        // Check if a wolf is currently eating this bone
        const wolves = this.wolves.getChildren();
        const isBeingEaten = wolves.some(wolf => 
            wolf.isEatingBone && wolf.currentBoneTarget === boneData
        );
        
        if (isBeingEaten) {
            // Show feedback that bone can't be reclaimed while being eaten
            const warningText = this.add.text(boneData.x, boneData.y - 50, "Wolf is eating!", {
                font: 'bold 20px Arial',
                fill: '#ff0000',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5).setDepth(200);
            
            this.tweens.add({
                targets: warningText,
                y: boneData.y - 80,
                alpha: 0,
                duration: 1000,
                ease: 'Sine.easeOut',
                onComplete: () => warningText.destroy()
            });
            
            audioManager.playDud();
            return;
        }
        
        // Mark as inactive
        boneData.active = false;
        
        // Stop pulse tween
        if (boneData.pulseTween) {
            boneData.pulseTween.stop();
        }
        
        // Remove from placed bones array
        const index = this.placedBones.indexOf(boneData);
        if (index > -1) {
            this.placedBones.splice(index, 1);
        }
        
        const bone = boneData.sprite;
        bone.disableInteractive(); // Prevent further clicks during animation
        bone.clearTint();
        
        // Use exact same animation as collecting bones from sheep
        // Target position: bone button (button index 5)
        const spacing = 145;
        const totalWidth = (7 * spacing);
        const buttonRelativeX = -totalWidth / 2 + (5 * spacing);
        const targetX = CONFIG.width / 2 + buttonRelativeX;
        const targetY = CONFIG.height - 200 + 125;
        
        // Get HUD scene to create flying bone in HUD layer
        const hudScene = this.scene.get('HUDScene');
        
        // Create new bone in HUD scene for flying animation
        const flyingBone = hudScene.add.text(bone.x, bone.y, '🦴', {
            font: '48px Arial'
        }).setOrigin(0.5);
        
        flyingBone.setDepth(10000); // Very high depth to fly OVER call buttons
        
        // Hide original bone
        bone.setVisible(false);
        
        // Fly to target with arc (using HUD scene tweens)
        hudScene.tweens.add({
            targets: flyingBone,
            x: targetX,
            y: targetY - 150, // Arc up high
            scale: 1.2,
            rotation: Math.PI * 2, // Full spin
            duration: 500,
            ease: 'Power2.easeOut',
            onComplete: () => {
                // Drop down to button
                hudScene.tweens.add({
                    targets: flyingBone,
                    y: targetY,
                    scale: 0.8,
                    duration: 200,
                    ease: 'Power2.easeIn',
                    onComplete: () => {
                        // Particle burst at collection
                        if (this.panicEmitter) {
                            this.panicEmitter.explode(5, targetX, targetY);
                        }
                        
                        // Destroy flying bone
                        flyingBone.destroy();
                        
                        // Destroy original bone
                        bone.destroy();
                        
                        // BONE COUNT LIFECYCLE: Increment when bone is reclaimed
                        if (!this.collectedBonesCount) this.collectedBonesCount = 0;
                        this.collectedBonesCount++;
                        
                        // PERSISTENCE: Save to localStorage (persists across levels)
                        // ENDLESS MODE: Use separate storage
                        const boneStorageKey = this.isEndlessMode ? 'sheepMarket_endless_boneCount' : 'sheepMarket_boneCount';
                        localStorage.setItem(boneStorageKey, this.collectedBonesCount.toString());
                        
                        // Emit event to HUD to update bone counter display on button
                        this.events.emit('bones-collected', this.collectedBonesCount);
                        console.log('🦴 Bone reclaimed - count incremented to:', this.collectedBonesCount);
                        
                        // Play collect sound
                        audioManager.playCoin();
                    }
                });
            }
        });
    }

    disableBonePlacementMode() {
        this.bonePlacementMode = false;
        
        // Remove cursor preview
        if (this.boneCursor) {
            this.boneCursor.destroy();
            this.boneCursor = null;
        }
        
        // Remove placement zone
        if (this.bonePlacementZone) {
            this.bonePlacementZone.removeAllListeners();
            this.bonePlacementZone.destroy();
            this.bonePlacementZone = null;
        }
        
        // Remove input listeners
        if (this.bonePlacementHandlers) {
            this.input.off('pointermove', this.bonePlacementHandlers.move);
            this.bonePlacementHandlers = null;
        }
    }
}
