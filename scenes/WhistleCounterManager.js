/**
 * WhistleCounterManager.js
 * 
 * Clean, single-source-of-truth whistle counter system.
 * Completely rebuilt from scratch to fix multi-trigger bug.
 * 
 * RULES:
 * - One click = exactly +1 count
 * - Counts LEFT and RIGHT whistles independently
 * - Resets on level start/retry
 * - No duplicate counting, no multiplication
 */

export class WhistleCounterManager {
    constructor(hudScene) {
        this.hudScene = hudScene;
        
        // Single source of truth for whistle counts
        this.leftWhistleCount = 0;
        this.rightWhistleCount = 0;
        
        // Visual elements (created once)
        this.leftCountText = null;
        this.rightCountText = null;
        
        // Debounce to prevent rapid-fire duplicates (200ms window)
        this.lastLeftWhistleTime = 0;
        this.lastRightWhistleTime = 0;
        this.debounceMs = 200;
        
        console.log('🎯 WhistleCounterManager: Initialized');
    }
    
    /**
     * Create visual counter elements
     * Called once during HUD creation
     */
    createCounterDisplay(leftX, leftY, rightX, rightY) {
        // Clean up any existing displays
        if (this.leftCountText) {
            this.leftCountText.destroy();
            this.leftCountText = null;
        }
        if (this.rightCountText) {
            this.rightCountText.destroy();
            this.rightCountText = null;
        }
        
        const fontSize = 42;
        const textStyle = {
            font: `bold ${fontSize}px Inter`,
            stroke: '#000000',
            strokeThickness: 6
        };
        
        // LEFT counter
        this.leftCountText = this.hudScene.add.text(leftX, leftY, 'X 0', {
            ...textStyle,
            fill: '#7cb342'
        }).setOrigin(0.5).setDepth(60).setAlpha(0).setVisible(false);
        
        // RIGHT counter
        this.rightCountText = this.hudScene.add.text(rightX, rightY, 'X 0', {
            ...textStyle,
            fill: '#f64e60'
        }).setOrigin(0.5).setDepth(60).setAlpha(0).setVisible(false);
        
        console.log('🎯 WhistleCounterManager: Display created');
    }
    
    /**
     * Increment LEFT whistle count
     * SINGLE entry point for left whistle clicks
     */
    incrementLeft() {
        const now = this.hudScene.time.now;
        
        // Debounce check - prevent duplicate triggers within 200ms
        if (now - this.lastLeftWhistleTime < this.debounceMs) {
            console.log('🚫 WhistleCounterManager: LEFT debounced (duplicate prevented)');
            return false;
        }
        
        this.lastLeftWhistleTime = now;
        this.leftWhistleCount++;
        
        console.log(`✅ WhistleCounterManager: LEFT incremented to ${this.leftWhistleCount}`);
        
        this.updateDisplay();
        return true;
    }
    
    /**
     * Increment RIGHT whistle count
     * SINGLE entry point for right whistle clicks
     */
    incrementRight() {
        const now = this.hudScene.time.now;
        
        // Debounce check - prevent duplicate triggers within 200ms
        if (now - this.lastRightWhistleTime < this.debounceMs) {
            console.log('🚫 WhistleCounterManager: RIGHT debounced (duplicate prevented)');
            return false;
        }
        
        this.lastRightWhistleTime = now;
        this.rightWhistleCount++;
        
        console.log(`✅ WhistleCounterManager: RIGHT incremented to ${this.rightWhistleCount}`);
        
        this.updateDisplay();
        return true;
    }
    
    /**
     * Update visual display to match counts
     * ONLY called internally, never externally
     */
    updateDisplay() {
        if (!this.leftCountText || !this.rightCountText) return;
        
        // Update text
        this.leftCountText.setText(`X ${this.leftWhistleCount}`);
        this.rightCountText.setText(`X ${this.rightWhistleCount}`);
        
        // Show/hide LEFT counter
        if (this.leftWhistleCount > 0 && !this.leftCountText.visible) {
            this.leftCountText.setVisible(true);
            this.hudScene.tweens.add({
                targets: this.leftCountText,
                alpha: 0.95,
                duration: 300,
                ease: 'Power2'
            });
        } else if (this.leftWhistleCount === 0 && this.leftCountText.visible) {
            this.hudScene.tweens.add({
                targets: this.leftCountText,
                alpha: 0,
                duration: 200,
                ease: 'Power2',
                onComplete: () => this.leftCountText.setVisible(false)
            });
        }
        
        // Show/hide RIGHT counter
        if (this.rightWhistleCount > 0 && !this.rightCountText.visible) {
            this.rightCountText.setVisible(true);
            this.hudScene.tweens.add({
                targets: this.rightCountText,
                alpha: 0.95,
                duration: 300,
                ease: 'Power2'
            });
        } else if (this.rightWhistleCount === 0 && this.rightCountText.visible) {
            this.hudScene.tweens.add({
                targets: this.rightCountText,
                alpha: 0,
                duration: 200,
                ease: 'Power2',
                onComplete: () => this.rightCountText.setVisible(false)
            });
        }
        
        // Pulse animation on increment (only if count increased from previous frame)
        if (this.leftWhistleCount > 0) {
            this.hudScene.tweens.add({
                targets: this.leftCountText,
                scale: 1.3,
                duration: 150,
                yoyo: true,
                ease: 'Back.easeOut'
            });
        }
        
        if (this.rightWhistleCount > 0) {
            this.hudScene.tweens.add({
                targets: this.rightCountText,
                scale: 1.3,
                duration: 150,
                yoyo: true,
                ease: 'Back.easeOut'
            });
        }
    }
    
    /**
     * Reset all counts to zero
     * Called on level start, retry, or restart
     */
    reset() {
        this.leftWhistleCount = 0;
        this.rightWhistleCount = 0;
        this.lastLeftWhistleTime = 0;
        this.lastRightWhistleTime = 0;
        
        if (this.leftCountText) {
            this.leftCountText.setText('X 0');
            this.leftCountText.setVisible(false);
            this.leftCountText.setAlpha(0);
        }
        
        if (this.rightCountText) {
            this.rightCountText.setText('X 0');
            this.rightCountText.setVisible(false);
            this.rightCountText.setAlpha(0);
        }
        
        console.log('🎯 WhistleCounterManager: Reset to zero');
    }
    
    /**
     * Get current counts (read-only)
     */
    getCounts() {
        return {
            left: this.leftWhistleCount,
            right: this.rightWhistleCount,
            total: this.leftWhistleCount + this.rightWhistleCount
        };
    }
    
    /**
     * Clean up (called on scene shutdown)
     */
    destroy() {
        if (this.leftCountText) {
            this.leftCountText.destroy();
            this.leftCountText = null;
        }
        if (this.rightCountText) {
            this.rightCountText.destroy();
            this.rightCountText = null;
        }
        console.log('🎯 WhistleCounterManager: Destroyed');
    }
}
