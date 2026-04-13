import Phaser from 'phaser';
import { CONFIG } from '../config.js';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BLACK SHEEP - IMMUNE OUTLIER CREATOR (REVISED)
 * ═══════════════════════════════════════════════════════════════════════════
 * PURPOSE: Creates immune "outlier" sheep that freeze in place and ignore ALL forces
 * 
 * CORE BEHAVIOR:
 *   - Roams the pasture deliberately (NOT idle, NOT edge-hugging)
 *   - When near a regular sheep: converts it to an IMMUNE OUTLIER
 *   - Outlier sheep: Turn black, freeze permanently, immune to everything
 * 
 * IMMUNITY LIST (OUTLIERS IGNORE):
 *   ❌ Wind, Rain, Mud, Lightning
 *   ❌ Wolves (cannot be targeted, chased, attacked, or eaten)
 *   ❌ Panic, fear, herd logic
 *   ❌ Sheepdog influence
 *   ❌ Any environmental changes
 * 
 * VISUAL MARKERS:
 *   ✅ Black color (0x0a0a0a tint)
 *   ✅ Dark aura/glow
 *   ✅ Completely frozen (no movement, idle texture)
 *   ✅ Clear visual distinction from normal sheep
 * 
 * DURATION: 15 seconds (once per level usage)
 * ═══════════════════════════════════════════════════════════════════════════
 */
export class BlackSheep extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'sheep'); // Use regular sheep sprite as base
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(0.14); // LARGER than regular sheep (visual authority)
        this.setTint(0x0a0a0a); // DARKER tint for stronger presence
        
        // Circular body matching regular sheep
        this.body.setCircle(250);
        this.body.setOffset(this.width / 2 - 250, this.height / 2 - 100);
        
        // Disable collisions - black sheep should pass through sheep (only converts them)
        this.body.setCollideWorldBounds(true);
        this.body.setBounce(0);
        this.body.pushable = false; // Cannot be pushed by other bodies
        this.body.immovable = true; // Other bodies pass through it

        this.setDepth(10);
        
        // Movement properties - deliberate roaming
        this.body.setVelocity(0, 0);

        this.speed = 100; // Slow, deliberate movement
        this.nextDirectionChange = 0;
        this.facingRight = true;
        
        // Black Sheep specific properties
        this.immuneRadius = 150; // Conversion range (when sheep get converted to immune outliers)
        this.isRoaming = false; // Tracks if currently roaming
    }

    /**
     * Start roaming behavior
     * Black Sheep will move deliberately across the pasture
     */
    startRoaming() {
        this.isRoaming = true;
        this.nextDirectionChange = this.scene.time.now + Phaser.Math.Between(2000, 4000);
        this.chooseNewDirection();
    }
    
    /**
     * Choose a new random direction for roaming
     * Avoids edges and creates deliberate, purposeful movement
     */
    chooseNewDirection() {
        if (!this.body || !this.active) return;
        
        // Choose random angle for movement (avoid purely horizontal/vertical)
        const angle = Phaser.Math.Between(0, 360) * (Math.PI / 180);
        
        // Apply velocity in that direction
        const vx = Math.cos(angle) * this.speed;
        const vy = Math.sin(angle) * this.speed;
        
        this.body.setVelocity(vx, vy);
        
        // Schedule next direction change
        this.nextDirectionChange = this.scene.time.now + Phaser.Math.Between(2000, 4000);
    }

    update(time, sheepGroup) {
        if (!this.body || !this.active) return;
        
        // Y-Sorting (slightly higher to appear above regular sheep)
        this.setDepth(this.y + 1);
        
        const speed = Math.sqrt(this.body.velocity.x ** 2 + this.body.velocity.y ** 2);
        
        // Update facing direction
        if (Math.abs(this.body.velocity.x) > 20) {
            this.facingRight = this.body.velocity.x > 0;
        }

        // Change texture based on movement speed
        if (speed > 10) {
            this.setTexture('sheep_walk');
            this.setFlipX(this.facingRight);
        } else {
            this.setTexture('sheep');
            this.setFlipX(!this.facingRight);
        }
        
        // ROAMING BEHAVIOR: Change direction periodically
        if (this.isRoaming && time >= this.nextDirectionChange) {
            this.chooseNewDirection();
        }
        
        // IMMUNE CONVERSION: Convert nearby sheep to immune outliers
        if (this.isRoaming && sheepGroup) {
            this.convertNearbySheepToImmune(sheepGroup);
        }
    }

    /**
     * Convert nearby sheep to IMMUNE OUTLIERS
     * These sheep freeze in place and become immune to ALL forces
     */
    convertNearbySheepToImmune(sheepGroup) {
        const sheep = sheepGroup.getChildren();
        
        sheep.forEach(s => {
            // Skip if sheep is already converted, eaten, or is black sheep itself
            if (!s.active || s.isEaten || s === this || s.isImmuneOutlier) return;
            
            // Check distance to black sheep
            const dist = Phaser.Math.Distance.Between(this.x, this.y, s.x, s.y);
            
            if (dist < this.immuneRadius) {
                // CONVERT TO IMMUNE OUTLIER
                this.scene.convertSheepToImmuneOutlier(s);
            }
        });
    }
    
    destroy() {
        // Clean up tweens before destroying
        if (this.scalePulse) {
            this.scalePulse.stop();
            this.scalePulse = null;
        }
        
        super.destroy();
    }
}
