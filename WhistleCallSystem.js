/**
 * WhistleCallSystem.js
 * 
 * GLOBAL WHISTLE CALL COUNTER - Single Source of Truth
 * 
 * RULES:
 * - One click = one call = +1 to counter
 * - Works globally across ALL levels
 * - Counter increments in EXACTLY ONE PLACE
 * - No level-specific logic
 * - No animation-based increments
 * - No timer-based increments
 * - No UI refresh increments
 */

class WhistleCallSystem {
    constructor() {
        // Single global counter
        this.callCount = 0;
        
        // UI element reference (set once)
        this.counterText = null;
        
        // Single-fire guard (prevents one click from triggering multiple times)
        this.lastCallTime = 0;
        this.minCallInterval = 100; // 100ms guard window
        
        console.log('🎺 WhistleCallSystem: Initialized (Global)');
    }
    
    /**
     * SINGLE ENTRY POINT: Register whistle call
     * This is the ONLY function that increments the counter
     */
    registerCall() {
        const now = Date.now();
        
        // Hard single-fire guard
        if (now - this.lastCallTime < this.minCallInterval) {
            console.log('🚫 WhistleCallSystem: Call blocked (too fast)');
            return false;
        }
        
        // Record time
        this.lastCallTime = now;
        
        // Increment counter (ONLY PLACE THIS HAPPENS)
        this.callCount++;
        
        console.log(`✅ WhistleCallSystem: Call registered → x${this.callCount}`);
        
        // Update UI immediately
        this.updateUI();
        
        return true;
    }
    
    /**
     * Update UI display
     * Reads directly from this.callCount
     */
    updateUI() {
        if (this.counterText) {
            this.counterText.setText(`x${this.callCount}`);
            
            // Show counter if count > 0, hide if 0
            if (this.callCount > 0) {
                if (!this.counterText.visible) {
                    this.counterText.setVisible(true);
                    // Fade in
                    if (this.counterText.scene && this.counterText.scene.tweens) {
                        this.counterText.scene.tweens.add({
                            targets: this.counterText,
                            alpha: 0.95,
                            duration: 300,
                            ease: 'Power2'
                        });
                    }
                }
                
                // Pulse animation on increment
                if (this.counterText.scene && this.counterText.scene.tweens) {
                    this.counterText.scene.tweens.add({
                        targets: this.counterText,
                        scale: 1.3,
                        duration: 100,
                        yoyo: true,
                        ease: 'Back.easeOut'
                    });
                }
            } else {
                // Hide when count is 0
                if (this.counterText.visible) {
                    if (this.counterText.scene && this.counterText.scene.tweens) {
                        this.counterText.scene.tweens.add({
                            targets: this.counterText,
                            alpha: 0,
                            duration: 200,
                            ease: 'Power2',
                            onComplete: () => {
                                this.counterText.setVisible(false);
                            }
                        });
                    } else {
                        this.counterText.setVisible(false);
                    }
                }
            }
        }
    }
    
    /**
     * Set UI element reference (called once during HUD creation)
     */
    setCounterUI(textElement) {
        this.counterText = textElement;
        this.updateUI(); // Initialize display
        console.log('🎺 WhistleCallSystem: UI element registered');
    }
    
    /**
     * Reset counter (called on level start or retry)
     */
    reset() {
        this.callCount = 0;
        this.lastCallTime = 0;
        this.updateUI();
        console.log('🎺 WhistleCallSystem: Counter reset → x0');
    }
    
    /**
     * Get current count (read-only)
     */
    getCount() {
        return this.callCount;
    }
}

// GLOBAL SINGLETON INSTANCE
// This instance persists across all levels, scenes, and restarts
export const whistleCallSystem = new WhistleCallSystem();
