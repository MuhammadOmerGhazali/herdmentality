import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { audioManager } from '../audio.js';

/**
 * Sheep Entity - Herd Mentality Prediction Game
 * 
 * PROGRESSIVE DIFFICULTY SYSTEM:
 * Sheep behavior is dynamically adjusted per level to create a gradual, fair difficulty curve.
 * All adjustments are observable through existing game mechanics (no hidden RNG).
 * 
 * Key Tunable Parameters (see getLevelBehaviorConfig):
 * - centeringStrength: How strongly sheep are pulled toward center (creates 50/50 uncertainty)
 * - cohesionMultiplier: How much sheep follow the flock (affects predictability)
 * - panicMultiplier: Chaos escalation as timer runs out (creates late reversals)
 * - earlyCommitment: When sheep start showing clear directional bias
 * - responseDelay: Milliseconds delay before reacting to player calls (higher levels = slower)
 * - ignoreChance: Probability of temporarily ignoring a call (higher levels = less obedient)
 * - movementSpeed: Base movement speed multiplier (higher levels = more sluggish)
 * 
 * Progressive Difficulty Mechanics:
 * - Early Levels (1-3): Instant response, never ignore calls, full speed, predictable movement
 * - Mid Levels (4-8): Small delays, occasional ignoring, slower movement, less predictable
 * - Late Levels (9-12): Significant delays, frequent ignoring, sluggish movement, chaotic
 * 
 * Target Win Rates (first-time players):
 * L1: 85-90% | L2: 70-75% | L3: 55-60% | L4: 60-65% | L5: 50-55% | L6: 55-60%
 * L7: 40-45% | L8: 35-40% | L9: 30-35% | L10: 25-30% | L11: 20-25% | L12: 10-15%
 * 
 * Design Philosophy: "I misread the herd" NOT "The game cheated me"
 */
export class Sheep extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'sheep');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(0.12);
        
        // Override clearTint to preserve Level 11-12 wet tint
        this._originalClearTint = this.clearTint.bind(this);
        this.clearTint = () => {
            // LEVEL 11-12: Never clear tint if wet grass is active - always restore wet tint
            if (this.scene && (this.scene.activeLevel === 11 || this.scene.activeLevel === 12) && this.scene.wetGrassApplied) {
                this.setTint(0x8899aa); // Keep wet blue-gray tint
            } else {
                this._originalClearTint();
            }
        }; 
        
        // Use a circular body for better "personal space" threshold
        // Radius 250 (unscaled) becomes ~30px (scaled) which creates a good 60px bubble
        this.body.setCircle(250);
        
        // Center the circle on the sprite
        // Original texture is likely around ~800-1000px wide
        // Offset centers the circle horizontally and places it lower for "feet" logic
        this.body.setOffset(this.width / 2 - 250, this.height / 2 - 100);

        this.setDepth(10);
        this.setInteractive();
        
        // Random initial velocity
        this.body.setVelocity(
            Phaser.Math.Between(-50, 50),
            Phaser.Math.Between(-50, 50)
        );
        this.body.setCollideWorldBounds(true);
        this.body.setBounce(0.5, 0.5);

        this.nextDecisionTime = 0;
        this.isIdling = false;
        
        // Face direction state (true = right, false = left)
        // Initialize based on initial velocity
        this.facingRight = this.body.velocity.x > 0;
        
        // Victory State
        this.isVictoryMarching = false;
        this.victoryMoving = false;
        this.victoryTarget = null;
        this.victorySpeed = 0;

        // Golden Sheep State
        this.isGolden = false;
        
        // Grazing State
        this.isGrazing = false;
        this.grazingTuft = null;

        this.on('pointerdown', () => {
            // Ignore clicks if game is over / victory marching / grazing / zombified
            if (this.isVictoryMarching || this.isGrazing || this.isZombified) return;

            // Check if sheep is idling (low speed)
            const speed = this.body.velocity.length();
            
            if (speed < 20) {
                // Idle -> Poop Easter Egg
                this.spawnPoop();
            } else {
                // Moving -> Standard Interaction
                audioManager.playBaa();
                this.showHeart();

                // Run fast in the direction of the player's last bet, only if round is active
                if (scene.roundActive && scene.lastBetSide) {
                    const dashVelocity = scene.lastBetSide === 'LEFT' ? -500 : 500;
                    this.body.setVelocity(dashVelocity, Phaser.Math.Between(-50, 50));
                    // Pause regular decision making for 2 seconds to allow the dash
                    this.nextDecisionTime = scene.time.now + 2000;
                }
            }

            scene.tweens.add({
                targets: this,
                y: this.y - 40,
                duration: 150,
                yoyo: true,
                ease: 'Back.easeOut'
            });
        });
    }

    reset() {
        this.isVictoryMarching = false;
        this.victoryMoving = false;
        this.victoryTarget = null;
        this.victorySpeed = 0;
        this.isIdling = false;
        this.isGolden = false;
        this.lastSplashTime = 0;
        this.isSlipping = false;
        this.configLogged = false; // Reset config debug flag
        this.isImmuneOutlier = false; // Clear immune outlier state
        this.immuneOutlierTintLocked = false; // Clear tint lock
        this.setTint(0xffffff); // Clear any tints
        
        // Restore physics if it was frozen
        if (this.body) {
            this.body.setImmovable(false);
            this.body.moves = true;
        }
    }
    
    startMudSlip() {
        // Sheep slips and slides in a random uncontrollable direction
        this.isSlipping = true;
        
        // Apply a strong random velocity in a chaotic direction
        const slipAngle = Math.random() * Math.PI * 2;
        const slipForce = Phaser.Math.Between(300, 500);
        
        this.body.setVelocity(
            Math.cos(slipAngle) * slipForce,
            Math.sin(slipAngle) * slipForce
        );
        
        // Visual feedback: shake/wiggle animation
        if (this.scene) {
            this.scene.tweens.add({
                targets: this,
                angle: { from: -10, to: 10 },
                duration: 100,
                yoyo: true,
                repeat: 3,
                onComplete: () => {
                    this.angle = 0;
                }
            });
        }
    }
    
    createMudSplash() {
        if (!this.scene || !this.active) return;
        
        // Create mud splash particle texture if it doesn't exist
        if (!this.scene.textures.exists('mud_particle')) {
            const pg = this.scene.make.graphics({ x: 0, y: 0, add: false });
            pg.fillStyle(0x6b4423, 0.9); // Dark muddy brown
            pg.fillCircle(3, 3, 3);
            pg.generateTexture('mud_particle', 6, 6);
        }
        
        // Create mud splash emitter
        const mudEmitter = this.scene.add.particles(this.x, this.y, 'mud_particle', {
            speed: { min: 30, max: 80 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.2, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 400,
            gravityY: 150,
            quantity: 3,
            emitting: false
        });
        
        mudEmitter.setDepth(this.depth - 1);
        mudEmitter.explode(3, this.x, this.y);
        
        // Clean up after particles fade
        this.scene.time.delayedCall(500, () => {
            mudEmitter.destroy();
        });
    }
    
    createPuddleSplash() {
        if (!this.scene || !this.active) return;
        
        // Create splash particle emitter texture if it doesn't exist
        if (!this.scene.textures.exists('splash_particle')) {
            const pg = this.scene.make.graphics({ x: 0, y: 0, add: false });
            pg.fillStyle(0x6699cc, 0.8);
            pg.fillCircle(3, 3, 3);
            pg.generateTexture('splash_particle', 6, 6);
        }
        
        // Create a quick burst of splash particles at sheep's feet
        const splash = this.scene.add.particles(this.x, this.y + 15, 'splash_particle', {
            speed: { min: 30, max: 80 },
            angle: { min: -120, max: -60 }, // Spray upward and outward
            scale: { start: 0.8, end: 0.2 },
            alpha: { start: 0.7, end: 0 },
            lifespan: 300,
            gravityY: 400,
            quantity: 3,
            emitting: false
        });
        
        splash.setDepth(this.y - 1); // Just behind the sheep
        splash.explode(3, this.x, this.y + 15);
        
        // Clean up the emitter after particles are done
        this.scene.time.delayedCall(400, () => {
            if (splash) splash.destroy();
        });
    }

    makeGolden() {
        this.isGolden = true;
        this.setTint(0xffd700); // Gold
        
        // Immediate visual pop
        this.scene.tweens.add({
            targets: this,
            scale: 0.16, // Pulse up
            duration: 200,
            yoyo: true,
            ease: 'Back.easeOut',
            onComplete: () => this.setScale(0.12)
        });
    }

    startVictoryMarch(targetX, targetY, delay, speed) {
        this.victoryTarget = new Phaser.Math.Vector2(targetX, targetY);
        this.isVictoryMarching = true; // Stop normal AI
        this.isIdling = false; // Force exit idle mode to prevent glitches
        this.victoryMoving = false; // Wait for delay
        this.victorySpeed = speed;
        
        // Stop current movement immediately
        if (this.body) this.body.setVelocity(0, 0);

        this.scene.time.delayedCall(delay, () => {
            if (!this.scene || !this.active) return;
            this.victoryMoving = true;
        });
    }

    fleeFrom(target) {
        if (!target || !this.body) return;

        // Calculate vector away from target
        const dx = this.x - target.x;
        const dy = this.y - target.y;
        const angle = Math.atan2(dy, dx); // Angle AWAY from target

        // High speed panic
        const panicSpeed = Phaser.Math.Between(350, 500);
        
        this.body.setVelocity(
            Math.cos(angle) * panicSpeed,
            Math.sin(angle) * panicSpeed
        );

        // Visual panic
        this.setTint(0xffaaaa); 
        this.scene.time.delayedCall(300, () => this.clearTint());

        // Emit Panic Particles (Throttled)
        if (!this.lastPanicEmit || this.scene.time.now > this.lastPanicEmit + 100) {
            if (this.scene.emitPanic) {
                this.scene.emitPanic(this.x, this.y);
            }
            this.lastPanicEmit = this.scene.time.now;
        }

        // Lock brain for a moment so they don't immediately flock back
        // But keep checking distance in GameScene, so this will be called repeatedly if wolf is close
        if (this.scene && this.scene.time) {
            this.nextDecisionTime = this.scene.time.now + 200; // Short updates for smooth fleeing
        }
    }

    spawnPoop() {
        // 1. Squat Animation (The "Squeeze")
        this.scene.tweens.add({
            targets: this,
            scaleY: 0.09, // Squash down (from 0.12)
            scaleX: 0.15, // Stretch wide (from 0.12)
            y: this.y + 5, // Anchor feet
            duration: 150,
            yoyo: true,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                this.setScale(0.12); // Reset scale
            }
        });

        // 2. Create poop at sheep's feet (delayed slightly to match the "squat")
        this.scene.time.delayedCall(150, () => {
            // Play sound effect with boosted volume (check mute state)
            this.scene.playSound('fart', { volume: 1.7 });

            const poop = this.scene.add.image(this.x, this.y + 20, 'poop').setScale(0);
            poop.setDepth(this.y - 1); // Behind the sheep
            
            // Pop in
            this.scene.tweens.add({
                targets: poop,
                scale: 0.08,
                duration: 300,
                ease: 'Back.easeOut'
            });

            // Fade out after a while
            this.scene.tweens.add({
                targets: poop,
                alpha: 0,
                delay: 3000,
                duration: 1000,
                onComplete: () => poop.destroy()
            });
        });
        
        // 3. Sheep looks ashamed (stop moving for a second)
        this.body.setVelocity(0, 0);
        this.setTint(0xffaaaa); // Red tint for "embarrassed"
        this.scene.time.delayedCall(600, () => this.clearTint());
        this.nextDecisionTime = this.scene.time.now + 1200;
    }

    bleatAnimation() {
        if (!this.active || !this.scene) return;
        
        // Random slight delay so they don't all pop at the exact same millisecond
        const delay = Phaser.Math.Between(0, 100);
        
        this.scene.time.delayedCall(delay, () => {
            if (!this.active) return;
            
            // "Pop" animation: Scale up and jump slightly
            this.scene.tweens.add({
                targets: this,
                scaleY: 0.15, // Stretch up
                scaleX: 0.11, // Squeeze in
                y: this.y - 15, // Jump up
                duration: 100,
                yoyo: true,
                ease: 'Back.easeOut',
                onComplete: () => {
                    this.setScale(0.12); // Reset to base scale
                }
            });
            
            // Add a temporary tint for feedback
            this.setTint(0xffffcc); 
            this.scene.time.delayedCall(150, () => this.clearTint());
        });
    }

    reactToMarket(velocityX, velocityY, duration) {
        // Get level-specific behavior config
        const activeLevel = this.scene ? this.scene.activeLevel : 1;
        const timeLeft = this.scene ? this.scene.timeLeft : 60;
        const totalTime = this.scene ? this.scene.CONFIG?.roundTime || 60 : 60;
        const levelConfig = this.getLevelBehaviorConfig(activeLevel, timeLeft, totalTime);
        
        // Check if this sheep should ignore this call (progressive difficulty)
        const shouldIgnore = Math.random() < levelConfig.ignoreChance;
        
        if (shouldIgnore) {
            // Sheep ignores the call - show rejection emote
            this.showRejection();
            return;
        }
        
        // Apply response delay (progressive difficulty)
        const applyReaction = () => {
            // 1. Apply immediate physical force
            if (this.body) {
                this.body.setVelocity(velocityX, velocityY);
            }
            
            // 2. Lock their "brain" for a random duration
            if (this.scene && this.scene.time) {
                this.nextDecisionTime = this.scene.time.now + duration;
            }

            // 3. Visual Feedback (Simplified)
            if (Math.abs(velocityX) > 300) {
                 this.setTint(0xffffee);
                 if (this.scene && this.scene.time) {
                     this.scene.time.delayedCall(100, () => {
                         if (this.active) this.clearTint();
                     });
                 }
            }
        };
        
        // Apply delay based on level configuration
        if (levelConfig.responseDelay > 0 && this.scene && this.scene.time) {
            this.scene.time.delayedCall(levelConfig.responseDelay, applyReaction);
        } else {
            // Instant response for early levels
            applyReaction();
        }
    }

    showHeart() {
        const heart = this.scene.add.image(this.x, this.y - 40, 'heart').setScale(0.15).setDepth(20);
        this.scene.tweens.add({
            targets: heart,
            y: heart.y - 50,
            alpha: 0,
            duration: 1000,
            onComplete: () => heart.destroy()
        });
    }

    showRejection() {
        if (this.isEmoting) return;
        this.isEmoting = true;

        // Random chance to show "meh" vs "..." to add variety?
        // For now, just use the stubborn emote.
        
        const emote = this.scene.add.image(this.x, this.y - 40, 'emote_stubborn').setDepth(20);
        
        // Initial state
        emote.setScale(0);
        emote.setAlpha(0);

        // Pop in
        this.scene.tweens.add({
            targets: emote,
            scale: 1,
            alpha: 1,
            y: this.y - 50,
            duration: 200,
            ease: 'Back.out',
            onComplete: () => {
                // Hold then fade out
                this.scene.tweens.add({
                    targets: emote,
                    y: this.y - 70,
                    alpha: 0,
                    delay: 800,
                    duration: 500,
                    onComplete: () => {
                        emote.destroy();
                        this.isEmoting = false;
                    }
                });
            }
        });
        
        // Shake head slightly
        this.scene.tweens.add({
            targets: this,
            angle: { from: -5, to: 5 },
            duration: 100,
            yoyo: true,
            repeat: 2
        });
    }
    
    getLevelBehaviorConfig(level, timeLeft, totalTime) {
        // Target Win Rates (correct prediction rate):
        // L1: 85-90%, L2: 70-75%, L3: 55-60%, L4: 60-65%, L5: 50-55%, L6: 55-60%
        // L7: 40-45%, L8: 35-40%, L9: 30-35%, L10: 25-30%, L11: 20-25%, L12: 10-15%
        
        // Key Parameters:
        // - centeringStrength: How strongly sheep are pulled to middle (higher = more 50/50 uncertainty)
        // - cohesionMultiplier: How much sheep follow the flock (higher = more predictable)
        // - panicMultiplier: Chaos escalation near end (higher = more last-second reversals)
        // - earlyCommitment: How soon sheep start showing directional bias (lower = later commitment)
        // - responseDelay: Milliseconds delay before reacting to calls (higher = slower response)
        // - ignoreChance: Probability (0-1) of temporarily ignoring a call (higher = less obedient)
        // - movementSpeed: Base movement speed multiplier (lower = slower, more sluggish)
        
        const configs = {
            1: { // 85-90% win rate - Tutorial easy
                centeringStrength: 0.05,  // Very weak centering, clear trends
                cohesionMultiplier: 1.3,  // Strong flock unity
                panicMultiplier: 0.6,     // Low late-game chaos
                earlyCommitment: 0.7,     // Commit early (at 42s mark)
                responseDelay: 0,         // Instant response
                ignoreChance: 0.0,        // Never ignore calls
                movementSpeed: 1.0        // Full speed
            },
            2: { // 70-75% win rate - Readable but requires attention
                centeringStrength: 0.15,  // Moderate centering
                cohesionMultiplier: 1.1,  // Good flock unity
                panicMultiplier: 0.8,     // Moderate chaos
                earlyCommitment: 0.6,     // Commit fairly early (at 36s)
                responseDelay: 50,        // Tiny delay
                ignoreChance: 0.0,        // Never ignore
                movementSpeed: 0.98       // Slightly slower
            },
            3: { // 55-60% win rate - Lawn mower chaos adds confusion
                centeringStrength: 0.25,  // Strong centering
                cohesionMultiplier: 0.9,  // Weakened flock unity
                panicMultiplier: 1.0,     // Standard chaos
                earlyCommitment: 0.5,     // Commit midway (at 30s)
                responseDelay: 100,       // Small delay
                ignoreChance: 0.05,       // 5% chance to ignore
                movementSpeed: 0.95       // Slightly slower
            },
            4: { // 60-65% win rate - Mud slipping creates uncertainty
                centeringStrength: 0.20,  // Moderate-strong centering
                cohesionMultiplier: 0.95, // Slightly weak unity
                panicMultiplier: 0.9,     // Moderate chaos
                earlyCommitment: 0.55,    // Commit slightly early (at 33s)
                responseDelay: 150,       // Noticeable delay
                ignoreChance: 0.08,       // 8% chance to ignore
                movementSpeed: 0.92       // More sluggish
            },
            5: { // 50-55% win rate - Grass attraction creates conflicting signals
                centeringStrength: 0.30,  // Very strong centering
                cohesionMultiplier: 0.85, // Weak flock unity
                panicMultiplier: 1.1,     // Higher chaos
                earlyCommitment: 0.45,    // Commit later (at 27s)
                responseDelay: 200,       // Clear delay
                ignoreChance: 0.10,       // 10% chance to ignore
                movementSpeed: 0.90       // Noticeably slower
            },
            6: { // 55-60% win rate - Sheep dog helps but grass still distracts
                centeringStrength: 0.25,  // Strong centering
                cohesionMultiplier: 0.90, // Weakened unity
                panicMultiplier: 1.0,     // Standard chaos
                earlyCommitment: 0.50,    // Commit midway (at 30s)
                responseDelay: 250,       // Moderate delay
                ignoreChance: 0.12,       // 12% chance to ignore
                movementSpeed: 0.88       // Slower
            },
            7: { // 40-45% win rate - High difficulty
                centeringStrength: 0.40,  // Extreme centering
                cohesionMultiplier: 0.75, // Very weak unity
                panicMultiplier: 1.3,     // High chaos
                earlyCommitment: 0.35,    // Very late commitment (at 21s)
                responseDelay: 300,       // Significant delay
                ignoreChance: 0.15,       // 15% chance to ignore
                movementSpeed: 0.85       // Quite slow
            },
            8: { // 35-40% win rate - Very high difficulty
                centeringStrength: 0.45,  // Extreme centering
                cohesionMultiplier: 0.70, // Very weak unity
                panicMultiplier: 1.4,     // Very high chaos
                earlyCommitment: 0.30,    // Very late commitment (at 18s)
                responseDelay: 350,       // Large delay
                ignoreChance: 0.18,       // 18% chance to ignore
                movementSpeed: 0.82       // Very slow
            },
            9: { // 30-35% win rate - Expert level
                centeringStrength: 0.50,  // Maximum centering
                cohesionMultiplier: 0.65, // Extremely weak unity
                panicMultiplier: 1.5,     // Extreme chaos
                earlyCommitment: 0.25,    // Extremely late (at 15s)
                responseDelay: 400,       // Very large delay
                ignoreChance: 0.20,       // 20% chance to ignore
                movementSpeed: 0.80       // Sluggish
            },
            10: { // 25-30% win rate - Master level
                centeringStrength: 0.55,  // Beyond maximum centering
                cohesionMultiplier: 0.60, // Almost no unity
                panicMultiplier: 1.6,     // Beyond extreme chaos
                earlyCommitment: 0.20,    // Last moment (at 12s)
                responseDelay: 450,       // Extreme delay
                ignoreChance: 0.22,       // 22% chance to ignore
                movementSpeed: 0.78       // Very sluggish
            },
            11: { // 20-25% win rate - Legendary
                centeringStrength: 0.60,  // Oppressive centering
                cohesionMultiplier: 0.55, // Minimal unity
                panicMultiplier: 1.7,     // Maximum chaos
                earlyCommitment: 0.15,    // Desperate guess territory (at 9s)
                responseDelay: 500,       // Massive delay
                ignoreChance: 0.25,       // 25% chance to ignore
                movementSpeed: 0.75       // Extremely slow
            },
            12: { // 10-15% win rate - Nearly impossible but fair
                centeringStrength: 0.70,  // Absolute maximum centering
                cohesionMultiplier: 0.50, // Zero predictability
                panicMultiplier: 2.0,     // Total chaos
                earlyCommitment: 0.10,    // Final seconds only (at 6s)
                responseDelay: 600,       // Longest delay
                ignoreChance: 0.28,       // 28% chance to ignore
                movementSpeed: 0.72       // Painfully slow
            }
        };
        
        return configs[level] || configs[1]; // Default to level 1 if undefined
    }

    update(time, driftX, timeLeft, totalTime, activeLevel = 1, mudActive = false) {
        if (!this.body) return;
        
        // IMMUNE OUTLIER: Completely frozen - skip ALL updates
        if (this.isImmuneOutlier) {
            this.body.setVelocity(0, 0);
            this.setDepth(this.y);
            return;
        }
        
        // ZOMBIFIED SHEEP: Completely frozen - skip ALL updates
        if (this.isZombified) {
            this.body.setVelocity(0, 0);
            this.setDepth(this.y);
            return;
        }
        
        // Skip normal movement logic if grazing
        if (this.isGrazing) {
            this.body.setVelocity(0, 0);
            this.setDepth(this.y);
            return;
        }
        
        // === WIN RATE TUNING SYSTEM ===
        // Adjust sheep behavior per level to achieve target correct-prediction rates
        // All changes are visible through existing mechanics (wind, panic, cohesion)
        const levelConfig = this.getLevelBehaviorConfig(activeLevel, timeLeft, totalTime);
        
        // Debug log (only once per sheep at start of round)
        if (!this.configLogged && timeLeft === totalTime) {
            console.log(`🐑 Level ${activeLevel} Behavior Config:`);
            console.log(`   Centering=${levelConfig.centeringStrength}, Cohesion=${levelConfig.cohesionMultiplier}`);
            console.log(`   Panic=${levelConfig.panicMultiplier}, Commitment=${levelConfig.earlyCommitment}`);
            console.log(`   Response Delay=${levelConfig.responseDelay}ms, Ignore Chance=${(levelConfig.ignoreChance * 100).toFixed(0)}%`);
            console.log(`   Movement Speed=${(levelConfig.movementSpeed * 100).toFixed(0)}%`);
            this.configLogged = true;
        }
        
        // LAWN MOWER OBSTACLE AVOIDANCE (Level 3)
        if (activeLevel === 3 && this.scene.lawnMower && this.scene.lawnMower.active && this.scene.lawnMower.visible) {
            const lm = this.scene.lawnMower;
            const dx = this.x - lm.x;
            const dy = this.y - lm.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const avoidRadius = 120; // Larger radius to give sheep more space
            
            if (dist < avoidRadius) {
                // Push away from lawn mower
                const angle = Math.atan2(dy, dx);
                const pushForce = (avoidRadius - dist) / avoidRadius; // Stronger push when closer
                const pushSpeed = 300 * pushForce; // Increased push force
                
                this.body.velocity.x += Math.cos(angle) * pushSpeed;
                this.body.velocity.y += Math.sin(angle) * pushSpeed;
                
                // Cap max speed to avoid excessive velocity
                const maxSpeed = 350;
                const currentSpeed = Math.sqrt(this.body.velocity.x ** 2 + this.body.velocity.y ** 2);
                if (currentSpeed > maxSpeed) {
                    this.body.velocity.x = (this.body.velocity.x / currentSpeed) * maxSpeed;
                    this.body.velocity.y = (this.body.velocity.y / currentSpeed) * maxSpeed;
                }
                
                // Cancel any idle state to ensure sheep move away
                this.isIdling = false;
                this.nextDecisionTime = time;
            }
        }
        
        const speed = Math.sqrt(this.body.velocity.x ** 2 + this.body.velocity.y ** 2);
        
        // Y-Sorting: Depth is based on Y position
        this.setDepth(this.y);
        
        // WALLET ZONE AVOIDANCE: Push sheep away from wallet area (top-left corner)
        const walletZone = {
            x: 0,
            y: 0,
            width: 240,
            height: 180
        };
        
        if (this.x >= walletZone.x && this.x <= walletZone.x + walletZone.width &&
            this.y >= walletZone.y && this.y <= walletZone.y + walletZone.height) {
            // Push sheep away from wallet center (90, 87)
            const pushAngle = Phaser.Math.Angle.Between(90, 87, this.x, this.y);
            const pushSpeed = 200;
            this.body.velocity.x += Math.cos(pushAngle) * pushSpeed;
            this.body.velocity.y += Math.sin(pushAngle) * pushSpeed;
        }
        
        // LEVEL 4: MUD SLIPPING MECHANIC
        if (mudActive && speed > 30) {
            // Random chance to slip and slide uncontrollably
            if (!this.isSlipping && Math.random() < 0.02) { // 2% chance per frame when moving
                this.startMudSlip();
            }
        }
        
        // If currently slipping, maintain the slide
        if (this.isSlipping) {
            // Gradually slow down the slide (friction)
            this.body.velocity.x *= 0.98;
            this.body.velocity.y *= 0.98;
            
            // Stop slipping when velocity is low enough
            if (speed < 20) {
                this.isSlipping = false;
            }
        }
        
        // LEVEL 3-4: Puddle Splash Effects when moving through rain/mud
        if (activeLevel >= 3 && activeLevel <= 4 && speed > 50) {
            // Throttle splashes to avoid performance issues
            if (!this.lastSplashTime || time > this.lastSplashTime + 200) {
                // Use mud color if mud is active, otherwise water color
                if (mudActive) {
                    this.createMudSplash();
                } else {
                    this.createPuddleSplash();
                }
                this.lastSplashTime = time;
            }
        }

        // Update facing direction only if moving significantly
        // Higher threshold prevents rapid flipping and visual jitter
        if (Math.abs(this.body.velocity.x) > 50) {
            this.facingRight = this.body.velocity.x > 0;
        }

        // Change texture based on movement speed
        if (speed > 10) {
            this.setTexture('sheep_walk');
            // sheep_walk original faces left
            // if facingRight is true, we need to flip it (true)
            // if facingRight is false, we keep it as is (false)
            this.setFlipX(this.facingRight);
        } else {
            this.setTexture('sheep');
            // sheep original faces right
            // if facingRight is true, keep as is (false)
            // if facingRight is false, flip it (true)
            this.setFlipX(!this.facingRight);
        }

        // VICTORY MARCH LOGIC
        if (this.isVictoryMarching) {
            if (this.victoryMoving && this.victoryTarget) {
                const dx = this.victoryTarget.x - this.x;
                const dy = this.victoryTarget.y - this.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < 20) {
                    // Arrived
                    this.body.setVelocity(0, 0);
                    this.victoryMoving = false;
                } else {
                    // Move towards target
                    const angle = Math.atan2(dy, dx);
                    // Add slight wobble for organic feel
                    const wobble = Math.sin(time * 0.01) * 30;
                    
                    this.body.setVelocity(
                        Math.cos(angle) * this.victorySpeed, 
                        Math.sin(angle) * this.victorySpeed + wobble
                    );
                }
            } else {
                // Waiting for delay or arrived
                // Just stop
                this.body.setVelocity(0, 0);
            }
            return; // Skip normal AI
        }
        
        // COUNTDOWN FREEZE: When timeLeft is 0 (during READY SET GO), freeze sheep movement
        // This prevents panic behavior (high panicFactor) from causing glitching/shaking
        if (timeLeft <= 0) {
            // Let physics continue with current velocity (bouncing), but no AI decisions
            return;
        }

        if (time > this.nextDecisionTime) {
            // Panic/Unpredictability Factor based on time left
            // Apply level-specific panic multiplier for controlled chaos
            const basePanicFactor = Math.max(0, (totalTime - timeLeft) / totalTime); // 0.0 to 1.0
            const panicFactor = basePanicFactor * levelConfig.panicMultiplier;
            
            // Flocking logic
            const others = this.scene.sheep.getChildren();
            let avgX = 0;
            let avgY = 0;
            others.forEach(o => {
                avgX += o.x;
                avgY += o.y;
            });
            avgX /= others.length;
            avgY /= others.length;

            // Vector towards center of flock
            // Apply level-specific cohesion multiplier for flock unity control
            const cohesionStrength = 0.015 * (1 - panicFactor) * levelConfig.cohesionMultiplier; 
            const flockX = (avgX - this.x) * cohesionStrength;
            const flockY = (avgY - this.y) * cohesionStrength;

            // --- LEVEL-TUNED CENTERING LOGIC ---
            // "Suspense Mechanic": Keep sheep near the middle to maintain uncertainty
            // Strength controlled by level config to achieve target win rates
            // Higher levels have stronger centering = more uncertainty = lower win rates
            
            // Determine when centering stops (commitment phase begins)
            // earlyCommitment: 0.7 = release at 42s, 0.1 = release at 6s
            const commitmentThreshold = totalTime * levelConfig.earlyCommitment;
            
            let centerBias = 0;
            
            if (timeLeft > commitmentThreshold) {
                const timeRatio = Math.max(0, (timeLeft - commitmentThreshold) / (totalTime - commitmentThreshold));
                
                // Distance from center
                const distFromCenter = (this.scene.pastureWidth / 2) - this.x;
                
                // Rubber Band: Pull harder if they stray too far early in the round
                const isFar = Math.abs(distFromCenter) > 300;
                const baseStrength = isFar ? 0.2 : 0.1;
                
                // Apply level-specific centering strength
                const strength = baseStrength * levelConfig.centeringStrength;

                centerBias = distFromCenter * strength * timeRatio;
            }

            // Random movement + current market drift + flocking + centering
            // Apply level-specific movement speed multiplier for progressive difficulty
            const baseSpeed = (80 + (panicFactor * 180)) * levelConfig.movementSpeed;
            
            // "Idle Less Often" Logic - Revised
            // Strict Limit: Only 3 sheep TOTAL can idle per round (reduced from 6)
            // Reduced probability to 0.2% to make idling very rare
            const canIdle = this.scene.totalIdledCount < 3;
            
            // Central Idle Zone Check: Only allow idling in the middle 50% of the screen
            // x > 25% width AND x < 75% width
            const margin = this.scene.pastureWidth * 0.25;
            const inIdleZone = this.x > margin && this.x < (this.scene.pastureWidth - margin);
            
            const wantsToIdle = Math.random() < 0.002; // Reduced from 0.005 to 0.002 
            const isExplicitIdle = canIdle && inIdleZone && wantsToIdle;
            
            // Handle State Transition
            if (this.isIdling && !isExplicitIdle) {
                // Was idling, now waking up.
                // We DO NOT decrement the count. Once a sheep idles, that "slot" is used for the round.
                this.isIdling = false;
            }

            let vx, vy;

            if (isExplicitIdle) {
                // Starting to idle (or continuing if we got lucky and rolled idle again, which is rare)
                if (!this.isIdling) {
                    // New idle event: Increment the round counter
                    this.scene.totalIdledCount++;
                    this.isIdling = true;
                }

                // Rare Idle State: Just drift with the market/flock
                // Even when idling, apply a slight center bias to prevent "stuck at edge" drift
                vx = (driftX * 0.5) + flockX + (centerBias * 0.5);
                vy = flockY;
            } else {
                // Active State: Force significant movement with smooth pacing
                // If near edges, boost minimum movement to ensure they don't look "idle"
                const distFromCenter = Math.abs((this.scene.pastureWidth / 2) - this.x);
                const isEdge = distFromCenter > 350;
                const minMove = isEdge ? 100 : 60; // Gentler movement speeds
                
                const dirX = Math.random() < 0.5 ? -1 : 1;
                const magX = Phaser.Math.Between(minMove, baseSpeed);
                
                // Main velocity composition
                vx = (magX * dirX) + driftX + flockX + centerBias;

                const dirY = Math.random() < 0.5 ? -1 : 1;
                const magY = Phaser.Math.Between(minMove, baseSpeed * 0.7);
                vy = (magY * dirY) + flockY;
            }
            
            this.body.setVelocity(vx, vy);
            
            // Decisions happen at a steady pace to prevent glitchy/vibrating appearance
            const minDelay = 800 - (panicFactor * 300); // 800ms to 500ms
            const maxDelay = 2000 - (panicFactor * 800); // 2000ms to 1200ms
            this.nextDecisionTime = time + Phaser.Math.Between(minDelay, maxDelay);
        }
    }
}