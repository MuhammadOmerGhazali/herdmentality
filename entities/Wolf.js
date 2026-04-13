import Phaser from 'phaser';

export class Wolf extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'wolf');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(0.12); // Same size as sheep (0.12)
        this.setDepth(100); // Always on top of sheep

        this.body.setCircle(300); // Reasonable collision radius
        this.body.setOffset(this.width/2 - 300, this.height/2 - 300);
        
        this.body.setCollideWorldBounds(false); // Can run off screen
        this.body.setBounce(0); // No bouncing

        this.speed = 280; // Fast enough to catch fleeing sheep (sheep panic at 350-500 but tire quickly)
        this.huntTarget = null;
        this.sheepEaten = 0; // Track how many sheep this wolf has eaten
        this.maxSheepToEat = Phaser.Math.Between(3, 4); // Wolf leaves after eating 3-4 sheep
        
        // Bone distraction state
        this.isEatingBone = false;
        this.boneEatingStartTime = null;
        this.currentBoneTarget = null;
        this.isDistractedByBone = false; // New flag: wolf is actively going for bone (not sheep)
        
        // Check for existing bones in pasture on spawn
        this.checkForExistingBones();
        
        // Spawn Animation
        this.setAlpha(0);
        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            scale: { from: 0.1, to: 0.12 },
            duration: 1000,
            ease: 'Back.easeOut'
        });

        // Flag to track if entrance growl has been played
        this.hasPlayedEntranceGrowl = false;
    }

    checkForExistingBones() {
        // Called on spawn - check if any bones are already in the pasture
        if (this.scene.placedBones && this.scene.placedBones.length > 0) {
            // Find closest active bone
            let closestBone = null;
            let closestBoneDist = Infinity;
            
            this.scene.placedBones.forEach(boneData => {
                if (boneData.active && boneData.sprite && boneData.sprite.active) {
                    const dist = Phaser.Math.Distance.Between(this.x, this.y, boneData.x, boneData.y);
                    if (dist < closestBoneDist) {
                        closestBoneDist = dist;
                        closestBone = boneData;
                    }
                }
            });
            
            if (closestBone) {
                this.isDistractedByBone = true;
                this.currentBoneTarget = closestBone;
                console.log('🐺 Wolf spawned and immediately distracted by existing bone at', closestBone.x, closestBone.y);
            }
        }
    }

    update(time, delta, sheepGroup) {
        if (!this.active) return;
        
        // Play entrance growl when wolf enters visible pasture (only once, and only during active round)
        // STRICT GUARD: Only play if round is active, wolf is visible, AND actively hunting (not being eaten/disabled)
        // Also prevent during any placement modes to avoid audio conflicts with UI interactions
        const isInPlacementMode = this.scene.bonePlacementMode || 
                                  this.scene.grassPlacementMode || 
                                  this.scene.lawnMowerDragging;
        
        if (!this.hasPlayedEntranceGrowl && 
            this.x > 50 && 
            this.x < this.scene.scale.width - 50 && 
            this.scene.roundActive && 
            this.visible && 
            !this.isEatingBone &&
            !isInPlacementMode) {
            try {
                this.scene.playSound('wolf_growl', { volume: 0.8 });
                this.hasPlayedEntranceGrowl = true;
            } catch (e) {
                console.warn('Failed to play wolf growl:', e);
            }
        }
        
        // Y-Sort
        this.setDepth(this.y + 10); // Slightly above sheep at same Y

        // DOG DETECTION: Check if dog is chasing this wolf (HIGHEST PRIORITY)
        // Check new dog state system
        const dogIsChasing = this.scene.activeDogHerding && 
                            this.scene.activeDogHerding.dogState &&
                            this.scene.activeDogHerding.dogState.mode === 'CHASING_WOLF' &&
                            this.scene.activeDogHerding.dogState.targetWolf === this;
        
        // Debug logging (only log once per chase state change)
        if (dogIsChasing && !this.wasBeingChased) {
            console.log('🐺 Wolf is now being chased by dog!');
            this.wasBeingChased = true;
            this.isFleeing = true; // Start fleeing
            this.isFleeingFromDog = true; // Mark as fleeing from dog (won't stop until off-screen)
        } else if (!dogIsChasing && this.wasBeingChased) {
            console.log('🐺 Wolf is no longer being chased');
            this.wasBeingChased = false;
        }
        
        // If wolf is fleeing from dog, keep fleeing until off-screen
        if (this.isFleeingFromDog) {
            // Continue fleeing in the same direction until off-screen
            if (!this.fleeDirection) {
                // Set flee direction based on nearest edge
                const distToLeft = this.x;
                const distToRight = this.scene.scale.width - this.x;
                const distToTop = this.y;
                const distToBottom = this.scene.scale.height - this.y;
                
                const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
                
                if (minDist === distToLeft) {
                    this.fleeDirection = { x: -1, y: 0 };
                } else if (minDist === distToRight) {
                    this.fleeDirection = { x: 1, y: 0 };
                } else if (minDist === distToTop) {
                    this.fleeDirection = { x: 0, y: -1 };
                } else {
                    this.fleeDirection = { x: 0, y: -1 };
                }
            }
            
            // Flee at high speed toward edge
            const fleeSpeed = 450;
            this.body.setVelocity(
                this.fleeDirection.x * fleeSpeed,
                this.fleeDirection.y * fleeSpeed
            );
            
            // Stop eating if currently eating or distracted by bone
            if (this.isEatingBone || this.isDistractedByBone) {
                this.stopEatingEffects();
                this.isEatingBone = false;
                this.boneEatingStartTime = null;
                this.currentBoneTarget = null;
                this.isDistractedByBone = false;
                console.log('🐺 Wolf interrupted by dog - fleeing!');
            }
            
            // Visual feedback - wolf is scared
            if (!this.fleeEmote) {
                this.fleeEmote = this.scene.add.text(this.x, this.y - 70, '💨', {
                    font: 'bold 32px Arial',
                }).setOrigin(0.5).setDepth(200);
                
                // Follow wolf position
                this.scene.tweens.add({
                    targets: this.fleeEmote,
                    alpha: { from: 1, to: 0.5 },
                    duration: 400,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
            
            // Update emote position
            if (this.fleeEmote) {
                this.fleeEmote.x = this.x;
                this.fleeEmote.y = this.y - 70;
            }
            
            // Set facing based on flee direction
            if (!this.fleeDirectionSet) {
                this.setFlipX(this.fleeDirection.x > 0);
                this.fleeDirectionSet = true;
            }
            
            // Check if off-screen - destroy wolf
            if (this.x < -100 || this.x > this.scene.scale.width + 100 ||
                this.y < -100 || this.y > this.scene.scale.height + 100) {
                console.log('🐺 Wolf fled off-screen - destroyed');
                this.scene.events.emit('wolf-gone');
                this.destroy();
                return;
            }
            
            // Skip all other behavior - only flee from dog
            return;
        }
        
        // Clean up flee state if not being chased (legacy code - shouldn't reach here if isFleeingFromDog is true)
        if (this.isFleeing && !dogIsChasing && !this.isFleeingFromDog) {
            this.isFleeing = false;
            this.fleeDirectionSet = false;
            if (this.fleeEmote) {
                this.scene.tweens.killTweensOf(this.fleeEmote);
                this.fleeEmote.destroy();
                this.fleeEmote = null;
            }
        }

        // BONE DISTRACTION BEHAVIOR: Check if wolf is eating a bone
        if (this.isEatingBone) {
            // Stop all movement while eating
            this.body.setVelocity(0, 0);
            
            // Check if 5 seconds have passed
            if (time - this.boneEatingStartTime >= 5000) {
                // Finished eating - destroy bone and resume hunting
                if (this.currentBoneTarget && this.currentBoneTarget.sprite && this.currentBoneTarget.sprite.active) {
                    // Capture sprite reference before clearing currentBoneTarget
                    const boneSprite = this.currentBoneTarget.sprite;
                    this.scene.tweens.add({
                        targets: boneSprite,
                        scale: 0,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => {
                            if (boneSprite && boneSprite.active) {
                                boneSprite.destroy();
                            }
                        }
                    });
                }
                
                // Remove bone from array
                if (this.scene.placedBones && this.currentBoneTarget) {
                    const index = this.scene.placedBones.indexOf(this.currentBoneTarget);
                    if (index > -1) {
                        this.scene.placedBones.splice(index, 1);
                    }
                }
                
                // Stop eating effects
                this.stopEatingEffects();
                
                // Reset state - resume normal hunting (no longer distracted)
                this.isEatingBone = false;
                this.boneEatingStartTime = null;
                this.currentBoneTarget = null;
                this.isDistractedByBone = false; // Can now chase sheep
                console.log('🐺 Wolf finished eating bone - resuming sheep hunting');
            }
            
            // Skip all other hunting logic while eating
            return;
        }
        
        // Hunt Logic: Check for placed bones first, then chase sheep (ONLY if not exiting)
        if (!this.isExiting) {
            let targetX = null;
            let targetY = null;
            
            // PRIORITY 1: Check for placed bones (wolf distraction)
            // If wolf spawned with a bone already present OR finds a bone, maintain distraction
            if (this.scene.placedBones && this.scene.placedBones.length > 0) {
                // Find closest active bone
                let closestBone = null;
                let closestBoneDist = Infinity;
                
                this.scene.placedBones.forEach(boneData => {
                    if (boneData.active && boneData.sprite && boneData.sprite.active) {
                        const dist = Phaser.Math.Distance.Between(this.x, this.y, boneData.x, boneData.y);
                        if (dist < closestBoneDist) {
                            closestBoneDist = dist;
                            closestBone = boneData;
                        }
                    }
                });
                
                if (closestBone) {
                    // Mark wolf as distracted by bone (prevents sheep chasing)
                    this.isDistractedByBone = true;
                    this.currentBoneTarget = closestBone;
                    
                    targetX = closestBone.x;
                    targetY = closestBone.y;
                    
                    // If wolf reaches bone (within 50px), START EATING for 5 seconds
                    if (closestBoneDist < 50 && !this.isEatingBone) {
                        this.isEatingBone = true;
                        this.boneEatingStartTime = time;
                        this.currentBoneTarget = closestBone;
                        this.body.setVelocity(0, 0); // Stop immediately
                        console.log('🐺 Wolf started eating bone - distracted for 5 seconds');
                        
                        // Visual effects for eating
                        this.startEatingEffects();
                        
                        // Don't move anymore this frame
                        return;
                    }
                }
            } else {
                // No bones available anymore - reset distraction flag
                this.isDistractedByBone = false;
            }
            
            // PRIORITY 2: Chase sheep ONLY if no bone distraction is active
            if (!targetX && !this.isDistractedByBone && sheepGroup) {
                // If we don't have a target sheep yet, or our target is dead/eaten, find a new one
                if (!this.huntTarget || !this.huntTarget.active || this.huntTarget.isEaten) {
                    const sheep = sheepGroup.getChildren();
                    let closestSheep = null;
                    let closestDist = Infinity;

                    sheep.forEach(s => {
                        // ═══ BLACK SHEEP IMMUNITY: Skip immune outliers ═══
                        if (s.active && !s.isEaten && !s.isImmuneOutlier) {
                            const dist = Phaser.Math.Distance.Between(this.x, this.y, s.x, s.y);
                            if (dist < closestDist) {
                                closestDist = dist;
                                closestSheep = s;
                            }
                        }
                    });

                    // Lock onto this sheep as our target
                    this.huntTarget = closestSheep;
                }

                // Chase our locked target
                if (this.huntTarget && this.huntTarget.active && !this.huntTarget.isEaten) {
                    targetX = this.huntTarget.x;
                    targetY = this.huntTarget.y;
                }
            }
            
            // Move toward target (bone or sheep)
            if (targetX !== null && targetY !== null) {
                // WALLET ZONE AVOIDANCE: Check if wolf or target is in wallet zone
                const walletZone = {
                    x: 0,
                    y: 0,
                    width: 240,
                    height: 180
                };
                
                // Check if target is in wallet zone
                const targetInWalletZone = (
                    targetX >= walletZone.x && 
                    targetX <= walletZone.x + walletZone.width &&
                    targetY >= walletZone.y && 
                    targetY <= walletZone.y + walletZone.height
                );
                
                // Check if wolf is currently in wallet zone
                const wolfInWalletZone = (
                    this.x >= walletZone.x && 
                    this.x <= walletZone.x + walletZone.width &&
                    this.y >= walletZone.y && 
                    this.y <= walletZone.y + walletZone.height
                );
                
                // If wolf is in wallet zone, push it out
                if (wolfInWalletZone) {
                    // Push wolf away from wallet center (90, 87)
                    const pushAngle = Phaser.Math.Angle.Between(90, 87, this.x, this.y);
                    this.scene.physics.velocityFromRotation(pushAngle, this.speed * 1.5, this.body.velocity);
                } 
                // If target is in wallet zone, ignore it and find a new target
                else if (!targetInWalletZone) {
                    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
                    this.scene.physics.velocityFromRotation(angle, this.speed, this.body.velocity);
                }
                // If target is in wallet zone, stop moving toward it
                else {
                    this.body.setVelocity(0, 0);
                }
            }
        }
        
        // Life Time Logic
        if (!this.lifeTime) this.lifeTime = time + 8000; // 8 seconds of terror
        
        // Don't exit while eating bone - extend life time
        if (this.isEatingBone && time > this.lifeTime) {
            this.lifeTime = time + 1000; // Keep extending while eating
        }
        
        if (time > this.lifeTime && !this.isEatingBone) {
            // Run away (only if not eating)
            if (!this.isExiting) {
                this.isExiting = true;
                // Pick a side to leave
                const exitX = this.x < this.scene.scale.width / 2 ? -200 : this.scene.scale.width + 200;
                
                // Override movement to exit
                this.scene.physics.moveTo(this, exitX, this.y, 400); // Faster exit
            }
            
            // Destroy when off screen
            if (this.x < -250 || this.x > this.scene.scale.width + 250) {
                this.scene.events.emit('wolf-gone');
                this.destroy();
                return; // Stop update after destroy
            }
        }

        // Global Facing Logic: Face movement direction (only when hunting/moving)
        // Only update facing when velocity changes significantly
        if (Math.abs(this.body.velocity.x) > 50) {
            const shouldFaceRight = this.body.velocity.x > 0;
            if (this.flipX !== shouldFaceRight) {
                this.setFlipX(shouldFaceRight);
            }
        }
    }

    startEatingEffects() {
        // Wolf head bobbing animation (simulating eating motion)
        this.eatingTween = this.scene.tweens.add({
            targets: this,
            y: { from: this.y, to: this.y + 8 },
            scaleY: { from: this.scaleY, to: this.scaleY * 0.95 },
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Quad.easeInOut'
        });

        // Particle effects around the bone (crumbs/fragments)
        if (this.currentBoneTarget && this.currentBoneTarget.sprite) {
            this.createEatingParticles();
        }

        // Play eating/crunching sound effect periodically
        this.playEatingSounds();
    }

    createEatingParticles() {
        // Safety check - don't create particles if scene is destroyed
        if (!this.scene || !this.scene.add || !this.scene.time) {
            return;
        }

        const boneX = this.currentBoneTarget.x;
        const boneY = this.currentBoneTarget.y;

        // Create a simple pixel texture if it doesn't exist
        if (!this.scene.textures.exists('particle_pixel')) {
            const graphics = this.scene.add.graphics();
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('particle_pixel', 8, 8);
            graphics.destroy();
        }

        // Create bone crumb particles - continuous spray of white fragments
        // Position fixed over the bone location
        const emitter = this.scene.add.particles(boneX, boneY, 'particle_pixel', {
            speed: { min: 30, max: 80 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 0.1 },
            alpha: { start: 1, end: 0 },
            lifespan: 800,
            frequency: 100, // More frequent particles
            quantity: 3, // More particles per burst
            tint: [0xFFFFFF, 0xF5F5F5, 0xEEEEEE], // Pure white crumbs
            gravityY: 100, // Slight gravity so crumbs fall
            blendMode: 'ADD' // Bright white glow effect
        });

        this.eatingParticles = emitter;

        // No position update needed - particles stay fixed over the bone

        // Stop particles after 5 seconds
        this.scene.time.delayedCall(5000, () => {
            if (emitter && emitter.active) {
                emitter.stop();
                // Check if scene still exists before creating another delayed call
                if (this.scene && this.scene.time) {
                    this.scene.time.delayedCall(1000, () => {
                        if (emitter) emitter.destroy();
                    });
                } else if (emitter) {
                    // Scene is gone, destroy immediately
                    emitter.destroy();
                }
            }
        });
    }

    playEatingSounds() {
        // Play a low growl/munching sound periodically during eating
        const playSoundInterval = () => {
            // ONLY play sounds if wolf is still active and eating a bone
            if (this.isEatingBone && this.active && this.scene) {
                // Play a subtle growl/munch sound
                if (this.scene.sound && this.scene.sound.context) {
                    // Use existing wolf synth for low growl
                    const audioManager = this.scene.sys.game.registry.get('audioManager');
                    if (audioManager && !audioManager.isSoundMuted) {
                        try {
                            // Quick low growl
                            const Tone = window.Tone;
                            if (Tone && Tone.context.state === 'running') {
                                const synth = new Tone.Synth({
                                    oscillator: { type: 'sawtooth' },
                                    envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 }
                                }).toDestination();
                                synth.volume.value = -20;
                                synth.triggerAttackRelease('C2', '0.1');
                                
                                setTimeout(() => synth.dispose(), 300);
                            }
                        } catch (e) {
                            // Silently fail if audio not available
                        }
                    }
                }
                
                // Schedule next sound ONLY if still eating
                if (this.isEatingBone && this.active && this.scene && this.scene.time) {
                    this.scene.time.delayedCall(1000, playSoundInterval);
                }
            }
        };

        // Start the sound loop
        playSoundInterval();
    }

    stopEatingEffects() {
        // Stop particles
        if (this.eatingParticles) {
            this.eatingParticles.stop();
            // Check if scene still exists before creating delayed call
            if (this.scene && this.scene.time) {
                this.scene.time.delayedCall(1000, () => {
                    if (this.eatingParticles) {
                        this.eatingParticles.destroy();
                        this.eatingParticles = null;
                    }
                });
            } else if (this.eatingParticles) {
                // Scene is gone, destroy immediately
                this.eatingParticles.destroy();
                this.eatingParticles = null;
            }
        }

        // Stop eating tween and reset position
        if (this.eatingTween) {
            this.eatingTween.stop();
            this.setScale(0.12); // Reset to original scale
            this.eatingTween = null;
        }
    }
}