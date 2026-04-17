import Phaser from 'phaser';

export class Dog extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Create dog sprite (Border Collie - sprite faces LEFT by default in the image)
        this.dogSprite = scene.add.sprite(0, 0, 'sheepdog');
        this.dogSprite.setScale(0.15); // Slightly larger for better visibility
        this.dogSprite.setFlipX(false); // Initially NOT flipped (sprite naturally faces left)
        this.add(this.dogSprite);
        
        // Create bone in mouth (positioned near mouth area, adjusts with facing)
        this.bone = scene.add.text(-20, -10, '🦴', {
            font: '24px Arial'
        }).setOrigin(0.5);
        this.bone.setRotation(0.2); // Slight tilt
        this.add(this.bone);
        
        this.setSize(this.dogSprite.width * 0.15, this.dogSprite.height * 0.15);
        this.setDepth(100);

        // Physics body
        this.body.setCircle(200);
        this.body.setOffset(-200, -200);
        this.body.setCollideWorldBounds(false);

        this.speed = 400;
        this.targetX = scene.scale.width / 2;
        this.targetY = scene.scale.height / 2 - 100;
        this.hasBone = true;
        this.isSitting = false;
        this.tailWagTween = null;
        
        // Spawn animation - fade in
        this.setAlpha(0);
        scene.tweens.add({
            targets: this,
            alpha: 1,
            duration: 500,
            ease: 'Power2.easeOut'
        });
        
        // NOTE: Bark sound removed from constructor
        // Only bark when entering scene (handled in spawnFriendlyDog)
    }

    update(time, delta, sheepGroup) {
        if (!this.active) return;
        
        // Y-Sort depth
        this.setDepth(this.y + 10);
        
        // FRIENDLY DOG: Does NOT scare sheep - it's a friendly dog with a bone!
        // Only the herding dog (created by handleHerdDog) scares and moves sheep
        // This prevents the dog from getting "blocked" by fleeing sheep
        
        if (!this.isSitting) {
            // Move toward target (center of pasture)
            const dist = Phaser.Math.Distance.Between(this.x, this.y, this.targetX, this.targetY);
            
            if (dist > 20) {
                // Calculate angle to target
                const angle = Phaser.Math.Angle.Between(this.x, this.y, this.targetX, this.targetY);
                
                // Move toward target
                this.scene.physics.velocityFromRotation(angle, this.speed, this.body.velocity);
                
                // Face direction of movement
                // The sprite image naturally faces LEFT, so flip it for RIGHT movement
                if (this.body.velocity.x > 0) {
                    this.dogSprite.setFlipX(true); // Moving right - flip to face right
                    this.bone.x = 20; // Bone on right side (front of mouth)
                    this.bone.setRotation(-0.2); // Tilt for right-facing
                } else if (this.body.velocity.x < 0) {
                    this.dogSprite.setFlipX(false); // Moving left - don't flip (sprite naturally left)
                    this.bone.x = -20; // Bone on left side (front of mouth)
                    this.bone.setRotation(0.2); // Tilt matches direction
                }
                
                // Tail wag animation while running
                if (!this.tailWagTween) {
                    this.startTailWag();
                }
            } else {
                // Reached center - stop and sit
                this.sit();
            }
        } else {
            // Sitting - keep velocity at zero
            this.body.setVelocity(0, 0);
        }
    }
    
    sit() {
        if (this.isSitting) return;
        
        this.isSitting = true;
        this.body.setVelocity(0, 0);
        
        // Face forward (toward player/camera)
        this.dogSprite.setFlipX(false);
        
        // Drop bone animation
        if (this.hasBone) {
            this.dropBone();
        }
        
        // Sitting pose - slightly lower the sprite
        this.scene.tweens.add({
            targets: this.dogSprite,
            y: 10,
            scaleY: 0.13,
            duration: 300,
            ease: 'Back.easeOut'
        });
        
        // Continue tail wagging while sitting (happy dog!)
        if (!this.tailWagTween) {
            this.startTailWag();
        }
    }
    
    dropBone() {
        this.hasBone = false;
        
        // Animate bone dropping - position it just below the dog
        const droppedBone = this.scene.add.text(this.x, this.y, '🦴', {
            font: '48px Arial'
        }).setOrigin(0.5);
        droppedBone.setDepth(this.depth + 10);
        
        // Bone drops and bounces to land below the dog
        this.scene.tweens.add({
            targets: droppedBone,
            y: this.y + 50, // Land 50px below the dog
            rotation: Math.PI * 2,
            duration: 400,
            ease: 'Bounce.easeOut',
            onComplete: () => {
                // Make bone clickable after it settles
                droppedBone.setInteractive({ useHandCursor: true });
                
                // Create "TAKE ME" speech bubble
                const bubbleWidth = 100;
                const bubbleHeight = 40;
                const bubbleX = droppedBone.x;
                const bubbleY = droppedBone.y - 80;
                
                // Create bubble background
                const bubble = this.scene.add.graphics();
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
                const bubbleText = this.scene.add.text(bubbleX, bubbleY, 'TAKE ME', {
                    fontFamily: 'Arial Black',
                    fontSize: '16px',
                    color: '#000000',
                    fontStyle: 'bold'
                });
                bubbleText.setOrigin(0.5);
                bubbleText.setDepth(10002);
                bubbleText.setAlpha(0);
                
                // Store bubble references on bone for cleanup
                droppedBone.bubble = bubble;
                droppedBone.bubbleText = bubbleText;
                
                // Animate bubble in
                this.scene.tweens.add({
                    targets: [bubble, bubbleText],
                    alpha: 1,
                    duration: 200,
                    ease: 'Back.easeOut'
                });
                
                // Remove bubble after 3 seconds
                const bubbleTimer = this.scene.time.delayedCall(3000, () => {
                    if (bubble && bubble.scene) {
                        this.scene.tweens.add({
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
                droppedBone.bubbleTimer = bubbleTimer;
                
                // Bounce animation
                this.scene.tweens.add({
                    targets: droppedBone,
                    y: droppedBone.y - 10,
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                
                // Click to collect bone
                droppedBone.on('pointerdown', () => {
                    // Clean up bubble immediately when clicked
                    if (droppedBone.bubbleTimer) {
                        droppedBone.bubbleTimer.remove();
                    }
                    if (droppedBone.bubble && droppedBone.bubble.scene) {
                        droppedBone.bubble.destroy();
                    }
                    if (droppedBone.bubbleText && droppedBone.bubbleText.scene) {
                        droppedBone.bubbleText.destroy();
                    }
                    this.scene.collectDogBone(droppedBone);
                });
            }
        });
        
        // Remove bone from dog's mouth
        this.bone.setVisible(false);
    }
    
    startTailWag() {
        // Tail wag effect using sprite rotation
        this.tailWagTween = this.scene.tweens.add({
            targets: this.dogSprite,
            rotation: { from: -0.1, to: 0.1 },
            duration: 200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    destroy() {
        if (this.tailWagTween) {
            this.tailWagTween.stop();
        }
        super.destroy();
    }
}
